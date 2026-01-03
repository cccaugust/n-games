import { createEmptyAsset, hexToRgbaInt, putPixelAsset, rgbaIntToHex, pixelsToImageData } from '../pixelAssets.js';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function rgbaIntToRgba(rgba) {
  const v = (rgba >>> 0);
  const a = (v >>> 24) & 255;
  const r = (v >>> 16) & 255;
  const g = (v >>> 8) & 255;
  const b = v & 255;
  return { r, g, b, a };
}

function rgbToHsl(r, g, b) {
  const rn = (r & 255) / 255;
  const gn = (g & 255) / 255;
  const bn = (b & 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hh < 60) [r1, g1, b1] = [c, x, 0];
  else if (hh < 120) [r1, g1, b1] = [x, c, 0];
  else if (hh < 180) [r1, g1, b1] = [0, c, x];
  else if (hh < 240) [r1, g1, b1] = [0, x, c];
  else if (hh < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const rOut = Math.round((r1 + m) * 255);
  const gOut = Math.round((g1 + m) * 255);
  const bOut = Math.round((b1 + m) * 255);
  return {
    r: clamp(rOut, 0, 255),
    g: clamp(gOut, 0, 255),
    b: clamp(bOut, 0, 255)
  };
}

function hueRotateRgbaInt(rgba, deg) {
  const v = (rgba >>> 0);
  if (v === 0) return 0;
  const { r, g, b, a } = rgbaIntToRgba(v);
  const { h, s, l } = rgbToHsl(r, g, b);
  const { r: nr, g: ng, b: nb } = hslToRgb(h + deg, s, l);
  return ((((a & 255) << 24) | ((nr & 255) << 16) | ((ng & 255) << 8) | (nb & 255)) >>> 0);
}

function basePalette() {
  return [
    '#000000',
    '#222034',
    '#45283c',
    '#663931',
    '#8f563b',
    '#df7126',
    '#d9a066',
    '#fbf236',
    '#99e550',
    '#6abe30',
    '#37946e',
    '#4b692f',
    '#3f3f74',
    '#306082',
    '#5b6ee1',
    '#cbdbfc',
    '#ffffff',
    '#d04648',
    '#ac3232',
    '#d95763',
    '#76428a',
    '#847e87',
    '#c2c3c7',
    '#5fcde4',
    '#73eff7',
    '#257179',
    '#29366f',
    '#3b5dc9',
    '#41a6f6',
    '#ffcd75',
    '#a7f070',
    '#38b764'
  ];
}

function stopBodyScroll(stop) {
  document.body.style.overflow = stop ? 'hidden' : '';
}

function renderToCanvas(ctx, pixels, w, h) {
  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(pixelsToImageData(pixels, w, h), 0, 0);
}

function eventToPixel(canvas, w, h, e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) * w) / rect.width);
  const y = Math.floor(((e.clientY - rect.top) * h) / rect.height);
  if (x < 0 || y < 0 || x >= w || y >= h) return { x: -1, y: -1, index: -1 };
  return { x, y, index: y * w + x };
}

function floodFill(pixels, w, h, startIndex, replacementRgba) {
  if (startIndex < 0 || startIndex >= pixels.length) return 0;
  const target = pixels[startIndex] >>> 0;
  const replacement = replacementRgba >>> 0;
  if (target === replacement) return 0;
  let changed = 0;
  const stack = [startIndex];
  while (stack.length) {
    const idx = stack.pop();
    if (idx == null) continue;
    if ((pixels[idx] >>> 0) !== target) continue;
    pixels[idx] = replacement;
    changed++;
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x > 0) stack.push(idx - 1);
    if (x < w - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - w);
    if (y < h - 1) stack.push(idx + w);
  }
  return changed;
}

/**
 * Reusable pixel-art editor modal.
 *
 * @param {{
 *  ownerId: string,
 *  title?: string,
 *  kind?: 'character'|'object'|'tile',
 *  width?: number,
 *  height?: number,
 *  name?: string,
 *  initialPixels?: Uint32Array | number[] | null,
 *  showHue?: boolean,
 *  onSaved?: (asset:any) => void
 * }} options
 * @returns {Promise<import('../pixelAssets.js').PixelAsset|null>}
 */
export function openPixelArtModal(options) {
  const {
    ownerId,
    title = 'ドット絵をつくる',
    kind = 'character',
    width = 32,
    height = 32,
    name = 'あたらしいドット',
    initialPixels = null,
    showHue = true,
    onSaved
  } = options || {};

  if (!ownerId) throw new Error('openPixelArtModal: ownerId is required');

  const w = clamp(Number(width) || 32, 8, 256);
  const h = clamp(Number(height) || 32, 8, 256);

  /** @type {(value: any) => void} */
  let resolvePromise = () => {};
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  let asset = createEmptyAsset({ ownerId, kind, width: w, height: h, name: String(name || 'あたらしいドット') });
  if (initialPixels) {
    const arr = initialPixels instanceof Uint32Array ? initialPixels : new Uint32Array(initialPixels);
    if (arr.length === w * h) asset.pixels = new Uint32Array(arr);
  }

  /** @type {'pen'|'eraser'|'fill'|'picker'} */
  let tool = 'pen';
  let currentHex = '#333333';
  let currentColor = hexToRgbaInt(currentHex);
  let isDown = false;
  let lastIndex = -1;

  let zoom = 16;
  let gridOn = true;
  let huePreviewDeg = 0;

  // DOM
  const backdrop = document.createElement('div');
  backdrop.className = 'ng-modal-backdrop';

  const card = document.createElement('div');
  card.className = 'ng-modal-card';

  card.innerHTML = `
    <div class="ng-modal-head">
      <div>
        <div class="ng-modal-title">${title}</div>
        <div class="ng-pa-note">ペンで描いて「保存」すると、ドット絵メーカーの作品としても使えます。</div>
      </div>
      <button class="ng-modal-close" type="button" aria-label="閉じる">× 閉じる</button>
    </div>
    <div class="ng-modal-body">
      <div class="ng-pa-canvas-wrap">
        <div class="ng-pa-canvas-head">
          <div class="ng-pa-tools" aria-label="ツール">
            <button class="ng-pa-tool" data-tool="pen" type="button">✏️ ペン</button>
            <button class="ng-pa-tool" data-tool="eraser" type="button">🧽 消し</button>
            <button class="ng-pa-tool" data-tool="fill" type="button">🪣 塗り</button>
            <button class="ng-pa-tool" data-tool="picker" type="button">🎯 色</button>
          </div>
          <div class="ng-pa-row">
            <span class="ng-pa-chip" id="sizeChip">${w}×${h}</span>
            <label class="ng-pa-chip" style="cursor:pointer;">
              <input id="gridToggle" type="checkbox" ${gridOn ? 'checked' : ''} />
              線
            </label>
            <label class="ng-pa-chip">
              ズーム
              <input id="zoomRange" class="ng-pa-range" type="range" min="8" max="32" step="1" value="${zoom}" />
            </label>
          </div>
        </div>
        <div class="ng-pa-canvas-frame grid" id="canvasFrame">
          <canvas id="pixelCanvas"></canvas>
        </div>
      </div>

      <div class="ng-pa-side">
        <div class="ng-pa-field">
          <label for="nameInput">なまえ</label>
          <input id="nameInput" type="text" maxlength="40" value="${escapeHtmlForAttr(asset.name)}" />
        </div>

        <div class="ng-pa-field">
          <label>色</label>
          <div class="ng-pa-row" style="justify-content: space-between;">
            <input id="colorInput" type="color" value="${escapeHtmlForAttr(currentHex)}" />
            <span class="ng-pa-chip" id="colorHex">${currentHex}</span>
          </div>
          <div class="ng-pa-hr"></div>
          <div class="ng-pa-palette" id="palette"></div>
        </div>

        <div class="ng-pa-field" id="hueWrap" style="${showHue ? '' : 'display:none;'}">
          <label>色相（プレビュー）</label>
          <div class="ng-pa-row" style="justify-content: space-between;">
            <span class="ng-pa-chip" id="hueValue">0°</span>
            <button class="ng-pa-btn" id="hueResetBtn" type="button">リセット</button>
          </div>
          <input id="hueRange" class="ng-pa-range" type="range" min="-180" max="180" step="1" value="0" />
          <div class="ng-pa-row" style="margin-top: 10px;">
            <button class="ng-pa-btn" id="hueApplyBtn" type="button">適用</button>
          </div>
          <div class="ng-pa-note">※「適用」でピクセルの色を確定します。</div>
        </div>

        <div class="ng-pa-hr"></div>

        <div class="ng-pa-row" style="justify-content: space-between;">
          <button class="ng-pa-btn danger" id="clearBtn" type="button">全消し</button>
          <button class="ng-pa-btn primary" id="saveBtn" type="button">保存</button>
        </div>
      </div>
    </div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
  stopBodyScroll(true);

  const closeBtn = card.querySelector('.ng-modal-close');
  const canvasFrame = card.querySelector('#canvasFrame');
  const canvas = card.querySelector('#pixelCanvas');
  const nameInput = card.querySelector('#nameInput');
  const gridToggle = card.querySelector('#gridToggle');
  const zoomRange = card.querySelector('#zoomRange');
  const colorInput = card.querySelector('#colorInput');
  const colorHex = card.querySelector('#colorHex');
  const palette = card.querySelector('#palette');
  const hueWrap = card.querySelector('#hueWrap');
  const hueRange = card.querySelector('#hueRange');
  const hueValue = card.querySelector('#hueValue');
  const hueResetBtn = card.querySelector('#hueResetBtn');
  const hueApplyBtn = card.querySelector('#hueApplyBtn');
  const clearBtn = card.querySelector('#clearBtn');
  const saveBtn = card.querySelector('#saveBtn');

  /** @type {CanvasRenderingContext2D} */
  const ctx = canvas.getContext('2d');
  canvas.width = w;
  canvas.height = h;

  function setZoom(next) {
    zoom = clamp(Number(next) || 16, 8, 32);
    canvas.style.width = `${w * zoom}px`;
    canvas.style.height = `${h * zoom}px`;
    canvasFrame.style.setProperty('--cell', `${zoom}px`);
  }

  function setGrid(next) {
    gridOn = Boolean(next);
    canvasFrame.classList.toggle('grid', gridOn);
  }

  function setTool(nextTool) {
    tool = nextTool;
    card.querySelectorAll('.ng-pa-tool[data-tool]').forEach((btn) => {
      const t = btn.getAttribute('data-tool');
      btn.dataset.active = t === tool ? 'true' : 'false';
    });
    canvas.style.cursor = tool === 'picker' ? 'copy' : 'crosshair';
  }

  function setColorHex(hex) {
    const safe = String(hex || '#333333');
    currentHex = safe;
    currentColor = hexToRgbaInt(safe);
    colorInput.value = safe;
    colorHex.textContent = safe.toLowerCase();
    palette.querySelectorAll('.ng-pa-swatch').forEach((el) => {
      el.dataset.selected = el.dataset.hex === safe.toLowerCase() ? 'true' : 'false';
    });
  }

  function setHuePreview(deg) {
    huePreviewDeg = clamp(Number(deg) || 0, -180, 180);
    if (hueRange) hueRange.value = String(Math.round(huePreviewDeg));
    if (hueValue) hueValue.textContent = `${Math.round(huePreviewDeg)}°`;
    canvas.style.filter = huePreviewDeg ? `hue-rotate(${huePreviewDeg}deg)` : '';
  }

  function render() {
    renderToCanvas(ctx, asset.pixels, w, h);
  }

  function applyAtIndex(index) {
    if (index < 0 || index >= asset.pixels.length) return;
    if (tool !== 'picker' && index === lastIndex) return;
    lastIndex = index;

    if (tool === 'picker') {
      const v = asset.pixels[index] >>> 0;
      if (v !== 0) setColorHex(rgbaIntToHex(v));
      return;
    }

    if (tool === 'fill') {
      const changed = floodFill(asset.pixels, w, h, index, tool === 'eraser' ? 0 : currentColor);
      if (changed > 0) render();
      return;
    }

    const next = tool === 'eraser' ? 0 : currentColor;
    const prev = asset.pixels[index] >>> 0;
    if (prev !== (next >>> 0)) {
      asset.pixels[index] = next >>> 0;
      render();
    }
  }

  function onDown(e) {
    isDown = true;
    canvas.setPointerCapture?.(e.pointerId);
    lastIndex = -1;
    const { index } = eventToPixel(canvas, w, h, e);
    applyAtIndex(index);
    e.preventDefault();
  }
  function onMove(e) {
    if (!isDown) return;
    const { index } = eventToPixel(canvas, w, h, e);
    if (index < 0) return;
    applyAtIndex(index);
    e.preventDefault();
  }
  function onUp() {
    isDown = false;
    lastIndex = -1;
  }

  function mountPalette() {
    palette.innerHTML = '';
    basePalette().forEach((hex) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ng-pa-swatch';
      btn.style.background = hex;
      btn.dataset.hex = hex.toLowerCase();
      btn.dataset.selected = hex.toLowerCase() === currentHex.toLowerCase() ? 'true' : 'false';
      btn.addEventListener('click', () => setColorHex(hex));
      palette.appendChild(btn);
    });
  }

  function close(result) {
    document.removeEventListener('keydown', onKeydown);
    stopBodyScroll(false);
    backdrop.remove();
    resolvePromise(result);
  }

  function onBackdropClick(e) {
    if (e.target === backdrop) close(null);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close(null);
  }

  async function doSave() {
    const nm = String(nameInput.value || '').trim();
    if (!nm) {
      alert('なまえをいれてね！');
      return;
    }
    asset.name = nm;
    if (Array.isArray(asset.frames) && asset.frames.length > 0) {
      const f0 = asset.frames.find((f) => (f.index ?? 0) === 0) || asset.frames[0];
      if (f0) {
        f0.width = asset.width;
        f0.height = asset.height;
        f0.pixels = new Uint32Array(asset.pixels);
      }
    }
    saveBtn.disabled = true;
    try {
      const saved = await putPixelAsset(asset);
      try {
        if (typeof onSaved === 'function') onSaved(saved);
      } catch {
        // ignore callback errors
      }
      close(saved);
    } catch (e) {
      console.warn(e);
      alert('保存に失敗しました。もう一度ためしてね。');
    } finally {
      saveBtn.disabled = false;
    }
  }

  function doClear() {
    if (!confirm('ぜんぶ消しますか？')) return;
    asset.pixels.fill(0);
    render();
  }

  function applyHue() {
    const deg = clamp(Number(hueRange?.value ?? 0) || 0, -180, 180);
    if (!deg) return;
    let changed = 0;
    for (let i = 0; i < asset.pixels.length; i++) {
      const prev = asset.pixels[i] >>> 0;
      if (prev === 0) continue;
      const next = hueRotateRgbaInt(prev, deg);
      if (next !== prev) {
        asset.pixels[i] = next;
        changed++;
      }
    }
    if (changed > 0) {
      render();
      setHuePreview(0);
    }
  }

  // Wire
  closeBtn.addEventListener('click', () => close(null));
  backdrop.addEventListener('click', onBackdropClick);
  document.addEventListener('keydown', onKeydown);

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onUp);

  card.querySelectorAll('.ng-pa-tool[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => setTool(btn.getAttribute('data-tool')));
  });

  gridToggle.addEventListener('change', () => setGrid(gridToggle.checked));
  zoomRange.addEventListener('input', () => setZoom(zoomRange.value));
  colorInput.addEventListener('input', () => setColorHex(colorInput.value));
  nameInput.addEventListener('input', () => {
    asset.name = String(nameInput.value || '');
  });

  if (hueWrap && hueRange && hueValue && hueResetBtn && hueApplyBtn) {
    hueRange.addEventListener('input', () => setHuePreview(Number(hueRange.value)));
    hueResetBtn.addEventListener('click', () => setHuePreview(0));
    hueApplyBtn.addEventListener('click', applyHue);
  }

  clearBtn.addEventListener('click', doClear);
  saveBtn.addEventListener('click', () => void doSave());

  // Init
  setTool('pen');
  setZoom(zoom);
  setGrid(true);
  setColorHex(currentHex);
  mountPalette();
  setHuePreview(0);
  render();

  nameInput.focus();

  return promise;
}

function escapeHtmlForAttr(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

