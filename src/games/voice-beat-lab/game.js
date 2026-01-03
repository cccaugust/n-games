const PAD_COUNT = 4;
const STEPS = 8;
const RECORD_MS = 1000;

const padMeta = [
  { id: 'A', color: '#6C5CE7', emoji: '🟣' },
  { id: 'B', color: '#00CEC9', emoji: '🟢' },
  { id: 'C', color: '#FD79A8', emoji: '🩷' },
  { id: 'D', color: '#FDCB6E', emoji: '🟡' },
];

const els = {
  micBtn: document.getElementById('micBtn'),
  micStatus: document.getElementById('micStatus'),
  audioStatus: document.getElementById('audioStatus'),
  pads: document.getElementById('pads'),
  funMode: document.getElementById('funMode'),
  clearBtn: document.getElementById('clearBtn'),
  playBtn: document.getElementById('playBtn'),
  stopBtn: document.getElementById('stopBtn'),
  bpm: document.getElementById('bpm'),
  bpmLabel: document.getElementById('bpmLabel'),
  sequencer: document.getElementById('sequencer'),
  panicBtn: document.getElementById('panicBtn'),
  helpBtn: document.getElementById('helpBtn'),
  helpOverlay: document.getElementById('helpOverlay'),
  closeHelpBtn: document.getElementById('closeHelpBtn'),
  floatingLayer: document.getElementById('floatingLayer'),
};

/** @type {AudioContext|null} */
let audioCtx = null;
/** @type {MediaStream|null} */
let micStream = null;
/** @type {AnalyserNode|null} */
let micAnalyser = null;
/** @type {GainNode|null} */
let masterGain = null;
/** @type {DynamicsCompressorNode|null} */
let limiter = null;

let recording = false;
let isPlaying = false;
let schedulerTimer = 0;
let nextStepTime = 0;
let currentStep = 0;
let uiStepTimeouts = [];

const state = {
  /** @type {{buffer: AudioBuffer|null, reversed: AudioBuffer|null}[]} */
  samples: Array.from({ length: PAD_COUNT }, () => ({ buffer: null, reversed: null })),
  /** @type {boolean[][]} */
  pattern: Array.from({ length: PAD_COUNT }, () => Array.from({ length: STEPS }, () => false)),
};

function supportsMic() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function supportsRecorder() {
  return typeof window.MediaRecorder !== 'undefined';
}

function pickMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  if (!supportsRecorder()) return '';
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return '';
}

function setStatus() {
  const micOk = !!micStream;
  els.micStatus.textContent = micOk ? '🎤 マイク: OK' : '🎤 マイク: まだ';
  els.audioStatus.textContent = audioCtx ? '🔊 音: OK' : '🔊 音: まだ';
  els.panicBtn.disabled = !(micOk && audioCtx);
}

function ensureAudio() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error('AudioContext is not supported');
  audioCtx = new AC();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.85;

  limiter = audioCtx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 12;
  limiter.ratio.value = 10;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.08;

  masterGain.connect(limiter);
  limiter.connect(audioCtx.destination);
  setStatus();
  return audioCtx;
}

async function resumeAudioIfNeeded() {
  if (!audioCtx) return;
  if (audioCtx.state !== 'running') {
    try {
      await audioCtx.resume();
    } catch {
      // ignore
    }
  }
}

async function initMic() {
  if (!supportsMic()) {
    els.micStatus.textContent = '🎤 マイク: このブラウザは非対応';
    return;
  }
  if (!supportsRecorder()) {
    els.micStatus.textContent = '🎤 マイク: 録音ができない';
    return;
  }

  ensureAudio();
  await resumeAudioIfNeeded();

  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (e) {
    els.micStatus.textContent = '🎤 マイク: だめだった…（許可してね）';
    return;
  }

  const source = audioCtx.createMediaStreamSource(micStream);
  micAnalyser = audioCtx.createAnalyser();
  micAnalyser.fftSize = 1024;
  source.connect(micAnalyser);

  setStatus();
  renderPads();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeBuffer(buffer) {
  // Light normalization to avoid super quiet recordings.
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > peak) peak = a;
    }
  }
  if (peak < 0.001) return buffer;

  const target = 0.85;
  const gain = clamp(target / peak, 1, 8);
  if (gain <= 1.01) return buffer;

  const out = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < src.length; i++) dst[i] = clamp(src[i] * gain, -1, 1);
  }
  return out;
}

function reverseBuffer(buffer) {
  const out = audioCtx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < src.length; i++) dst[i] = src[src.length - 1 - i];
  }
  return out;
}

function createWaveShaper(amount = 12) {
  const node = audioCtx.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  const k = typeof amount === 'number' ? amount : 12;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  node.curve = curve;
  node.oversample = '2x';
  return node;
}

function chooseEffect() {
  if (!els.funMode.checked) return { kind: 'normal', rate: 1 };
  const r = Math.random();
  if (r < 0.34) return { kind: 'chipmunk', rate: 1.65 };
  if (r < 0.68) return { kind: 'robot', rate: 0.78 };
  return { kind: 'reverse', rate: 1.0 };
}

function playSample(padIndex, when = null) {
  if (!audioCtx) return;
  const s = state.samples[padIndex];
  if (!s.buffer) return;

  const effect = chooseEffect();
  const buffer = effect.kind === 'reverse' ? (s.reversed || (s.reversed = reverseBuffer(s.buffer))) : s.buffer;

  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = effect.rate;

  const hitGain = audioCtx.createGain();
  hitGain.gain.value = 0.95;

  const filter = audioCtx.createBiquadFilter();
  filter.type = effect.kind === 'robot' ? 'lowpass' : 'highpass';
  filter.frequency.value = effect.kind === 'robot' ? 1800 : 70;
  filter.Q.value = effect.kind === 'robot' ? 0.9 : 0.7;

  const shaper = effect.kind === 'robot' ? createWaveShaper(16) : null;

  // Connect chain
  src.connect(hitGain);
  if (shaper) {
    hitGain.connect(shaper);
    shaper.connect(filter);
  } else {
    hitGain.connect(filter);
  }
  filter.connect(masterGain);

  const t = when ?? audioCtx.currentTime;
  src.start(t);

  const delayMs = Math.max(0, (t - audioCtx.currentTime) * 1000);
  window.setTimeout(() => bumpPad(padIndex), delayMs);
}

function bumpPad(padIndex) {
  const el = document.querySelector(`[data-pad="${padIndex}"]`);
  if (!el) return;
  el.classList.remove('bump');
  // Force reflow to restart animation
  void el.offsetWidth;
  el.classList.add('bump');
}

function spawnFloat(text) {
  const el = document.createElement('div');
  el.className = 'float';
  el.textContent = text;
  const x = 12 + Math.random() * 76;
  const y = 55 + Math.random() * 25;
  el.style.left = `${x}%`;
  el.style.top = `${y}%`;
  els.floatingLayer.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

async function recordPad(padIndex) {
  if (recording) return;
  if (!micStream) return;
  if (!supportsRecorder()) return;

  ensureAudio();
  await resumeAudioIfNeeded();

  recording = true;
  renderPads();

  const mimeType = pickMimeType();
  /** @type {BlobPart[]} */
  const chunks = [];

  let recorder;
  try {
    recorder = new MediaRecorder(micStream, mimeType ? { mimeType } : undefined);
  } catch {
    recorder = new MediaRecorder(micStream);
  }

  recorder.addEventListener('dataavailable', (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  });

  const padEl = document.querySelector(`[data-pad="${padIndex}"]`);
  const meterFill = padEl?.querySelector('.meter > div');
  const badgeEl = padEl?.querySelector('.badge');
  if (badgeEl) badgeEl.textContent = '録音中…';

  const startedAt = performance.now();
  let raf = 0;
  const updateMeter = () => {
    const t = performance.now() - startedAt;
    const p = clamp((t / RECORD_MS) * 100, 0, 100);
    if (meterFill) meterFill.style.width = `${p}%`;
    raf = requestAnimationFrame(updateMeter);
  };
  raf = requestAnimationFrame(updateMeter);

  recorder.start();
  setTimeout(() => {
    try {
      recorder.stop();
    } catch {
      // ignore
    }
  }, RECORD_MS);

  await new Promise((resolve) => recorder.addEventListener('stop', resolve, { once: true }));
  cancelAnimationFrame(raf);
  if (meterFill) meterFill.style.width = '0%';

  const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
  const buf = await blob.arrayBuffer();

  let decoded = null;
  try {
    decoded = await audioCtx.decodeAudioData(buf.slice(0));
  } catch {
    decoded = null;
  }

  if (!decoded) {
    if (badgeEl) badgeEl.textContent = '失敗…';
    recording = false;
    renderPads();
    return;
  }

  const normalized = normalizeBuffer(decoded);
  state.samples[padIndex].buffer = normalized;
  state.samples[padIndex].reversed = null;

  recording = false;
  renderPads();
  renderSequencer();
  updateTransportEnabled();
}

function renderPads() {
  els.pads.innerHTML = '';
  for (let i = 0; i < PAD_COUNT; i++) {
    const meta = padMeta[i];
    const hasSample = !!state.samples[i].buffer;

    const pad = document.createElement('div');
    pad.className = 'pad';
    pad.dataset.pad = String(i);
    pad.style.borderColor = `${meta.color}33`;

    pad.innerHTML = `
      <div class="spark" style="background: radial-gradient(circle at 30% 30%, ${meta.color}55, transparent);"></div>
      <div class="pad-title">
        <div class="name">${meta.emoji} ${meta.id} パッド</div>
        <div class="badge" style="background:${meta.color}1a; color:${meta.color};">${hasSample ? 'OK!' : 'まだ'}</div>
      </div>
      <div class="pad-actions">
        <button class="rec" type="button" ${!micStream || recording ? 'disabled' : ''}>● とる！</button>
        <button class="play" type="button" ${!hasSample || recording ? 'disabled' : ''}>▶︎ ならす</button>
      </div>
      <div class="meter" aria-hidden="true"><div></div></div>
    `;

    const recBtn = pad.querySelector('.rec');
    const playBtn = pad.querySelector('.play');

    recBtn?.addEventListener('click', () => recordPad(i));
    playBtn?.addEventListener('click', async () => {
      ensureAudio();
      await resumeAudioIfNeeded();
      playSample(i);
    });

    // Tap the card area to play quickly (kids-friendly)
    pad.addEventListener('pointerdown', async (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (target.closest('button')) return;
      if (!state.samples[i].buffer) return;
      ensureAudio();
      await resumeAudioIfNeeded();
      playSample(i);
    });

    els.pads.appendChild(pad);
  }
}

function renderSequencer() {
  els.sequencer.innerHTML = '';

  // Header row (empty label cell)
  const headLabel = document.createElement('div');
  headLabel.className = 'seq-row-label';
  headLabel.textContent = '';
  els.sequencer.appendChild(headLabel);

  for (let step = 0; step < STEPS; step++) {
    const h = document.createElement('div');
    h.className = 'step';
    h.textContent = String(step + 1);
    h.dataset.header = '1';
    h.dataset.step = String(step);
    h.setAttribute('aria-hidden', 'true');
    els.sequencer.appendChild(h);
  }

  for (let row = 0; row < PAD_COUNT; row++) {
    const label = document.createElement('div');
    label.className = 'seq-row-label';
    label.textContent = padMeta[row].id;
    label.style.border = `2px solid ${padMeta[row].color}33`;
    els.sequencer.appendChild(label);

    for (let col = 0; col < STEPS; col++) {
      const cell = document.createElement('div');
      cell.className = 'step';
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.dataset.step = String(col);
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('aria-label', `${padMeta[row].id} の ${col + 1} を切り替え`);

      if (state.pattern[row][col]) cell.classList.add('on');
      cell.style.borderColor = `${padMeta[row].color}22`;

      const toggle = () => {
        if (!state.samples[row].buffer) return;
        state.pattern[row][col] = !state.pattern[row][col];
        cell.classList.toggle('on', state.pattern[row][col]);
      };

      cell.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        toggle();
      }, { passive: false });

      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });

      els.sequencer.appendChild(cell);
    }
  }
}

function setPlayhead(stepIndex) {
  const all = els.sequencer.querySelectorAll('.step');
  all.forEach((el) => el.classList.remove('playhead'));
  if (stepIndex < 0) return;

  const header = els.sequencer.querySelector(`.step[data-header="1"][data-step="${stepIndex}"]`);
  header?.classList.add('playhead');

  const cells = els.sequencer.querySelectorAll(`.step[data-step="${stepIndex}"][data-row]`);
  cells.forEach((el) => el.classList.add('playhead'));
}

function stepDurationSeconds() {
  const bpm = Number(els.bpm.value) || 110;
  // 8 steps = eighth notes over 4 beats (1 bar)
  return (60 / bpm) / 2;
}

function scheduleStep(stepIndex, time) {
  // Schedule audio
  for (let row = 0; row < PAD_COUNT; row++) {
    if (!state.pattern[row][stepIndex]) continue;
    if (!state.samples[row].buffer) continue;
    playSample(row, time);
  }

  // Schedule UI highlight near that time
  const ms = Math.max(0, (time - audioCtx.currentTime) * 1000);
  const id = window.setTimeout(() => setPlayhead(stepIndex), ms);
  uiStepTimeouts.push(id);
}

function scheduler() {
  const lookAhead = 0.14;
  while (nextStepTime < audioCtx.currentTime + lookAhead) {
    scheduleStep(currentStep, nextStepTime);
    nextStepTime += stepDurationSeconds();
    currentStep = (currentStep + 1) % STEPS;
  }
}

function clearScheduledUi() {
  for (const id of uiStepTimeouts) clearTimeout(id);
  uiStepTimeouts = [];
}

async function start() {
  if (isPlaying) return;
  if (!audioCtx) ensureAudio();
  await resumeAudioIfNeeded();

  isPlaying = true;
  els.playBtn.disabled = true;
  els.stopBtn.disabled = false;

  clearScheduledUi();
  currentStep = 0;
  nextStepTime = audioCtx.currentTime + 0.05;
  schedulerTimer = window.setInterval(scheduler, 25);
  setPlayhead(0);
}

function stop() {
  if (!isPlaying) return;
  isPlaying = false;
  clearInterval(schedulerTimer);
  schedulerTimer = 0;
  clearScheduledUi();
  setPlayhead(-1);

  els.playBtn.disabled = false;
  els.stopBtn.disabled = true;
}

function updateTransportEnabled() {
  const anySample = state.samples.some((s) => !!s.buffer);
  els.playBtn.disabled = !anySample || isPlaying;
  els.stopBtn.disabled = !isPlaying;
}

function clearAll() {
  stop();
  for (let i = 0; i < PAD_COUNT; i++) {
    state.samples[i].buffer = null;
    state.samples[i].reversed = null;
    for (let s = 0; s < STEPS; s++) state.pattern[i][s] = false;
  }
  renderPads();
  renderSequencer();
  updateTransportEnabled();
}

async function panic() {
  ensureAudio();
  await resumeAudioIfNeeded();
  spawnFloat('ぎゃはは！');

  // Tiny chaotic burst
  const t0 = audioCtx.currentTime + 0.02;
  for (let i = 0; i < PAD_COUNT; i++) {
    if (!state.samples[i].buffer) continue;
    const dt = i * 0.06 + Math.random() * 0.03;
    playSample(i, t0 + dt);
  }
}

function openHelp() {
  els.helpOverlay.classList.remove('hidden');
}
function closeHelp() {
  els.helpOverlay.classList.add('hidden');
}

// Boot UI
els.bpmLabel.textContent = String(els.bpm.value);
els.bpm.addEventListener('input', () => {
  els.bpmLabel.textContent = String(els.bpm.value);
});

els.micBtn.addEventListener('click', initMic);
els.clearBtn.addEventListener('click', clearAll);
els.playBtn.addEventListener('click', start);
els.stopBtn.addEventListener('click', stop);
els.panicBtn.addEventListener('click', panic);

els.helpBtn.addEventListener('click', openHelp);
els.closeHelpBtn.addEventListener('click', closeHelp);
els.helpOverlay.addEventListener('pointerdown', (e) => {
  if (e.target === els.helpOverlay) closeHelp();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.helpOverlay.classList.contains('hidden')) closeHelp();
});

window.addEventListener('beforeunload', () => {
  try {
    stop();
    micStream?.getTracks()?.forEach((t) => t.stop());
  } catch {
    // ignore
  }
});

// Initial render
renderPads();
renderSequencer();
updateTransportEnabled();
setStatus();

