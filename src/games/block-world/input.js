/**
 * 入力：キーボード / マウス（ポインターロック）/ タッチ（スティック・視点ドラッグ・ボタン）
 */

export class Input {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.keys = new Set();
    this.lookDx = 0; this.lookDy = 0;
    this.sensitivity = 1;
    this.enabled = false;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.pointerLocked = false;
    this.onPointerLockLost = null;
    this.onAction = null;        // (name) => void  : 'inventory' | 'pause' | 'fly' | 'drop' | 'pick' | 'hotbar:n' | 'scroll:dir'
    this.mouseBreak = false;
    this.mousePlace = false;
    this.placeTap = false;       // 1回押しの「置く」
    this.jumpTapTimes = [];
    this.touchBreak = false;
    this.touchJump = false;
    this.touchSneak = false;
    this.joy = { active: false, id: -1, cx: 0, cy: 0, x: 0, z: 0, sprint: false };
    this.look = { active: false, id: -1, lastX: 0, lastY: 0, startX: 0, startY: 0, startTime: 0, moved: false, holdTimer: null, holding: false };
    this.sprintToggle = false;
    this.lastW = 0;
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) { return; }
      if (e.code === 'Escape' && !this.enabled) { this.emit('pause'); return; }
      if (!this.enabled) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      this.keys.add(e.code);
      if (e.code === 'KeyW') {
        const now = performance.now();
        if (now - this.lastW < 280) this.sprintToggle = true;
        this.lastW = now;
      }
      if (e.code === 'Space') {
        const now = performance.now();
        this.jumpTapTimes.push(now);
        this.jumpTapTimes = this.jumpTapTimes.filter(t => now - t < 320);
        if (this.jumpTapTimes.length >= 2) { this.jumpTapTimes = []; this.emit('fly'); }
      }
      if (e.code.startsWith('Digit')) { const n = parseInt(e.code.slice(5), 10); if (n >= 1 && n <= 9) this.emit('hotbar:' + (n - 1)); }
      if (e.code === 'KeyE') this.emit('inventory');
      if (e.code === 'KeyF') this.emit('fly');
      if (e.code === 'Escape') this.emit('pause');
      if (e.code === 'KeyQ') this.emit('drop');
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'KeyW') this.sprintToggle = false;
    });
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseBreak = false; this.mousePlace = false; });

    // マウス
    const onMouseDown = (e) => {
      if (!this.enabled) return;
      if (this.isTouch && e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      if (!this.pointerLocked) { this.requestPointerLock(); return; }
      if (e.button === 0) this.mouseBreak = true;
      if (e.button === 2) { this.mousePlace = true; this.placeTap = true; }
      if (e.button === 1) { e.preventDefault(); this.emit('pick'); }
    };
    for (const el of [this.canvas, this.ui.touchLayer]) {
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      el.addEventListener('mousedown', onMouseDown);
    }
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseBreak = false;
      if (e.button === 2) this.mousePlace = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked || !this.enabled) return;
      this.lookDx += e.movementX * 0.0022 * this.sensitivity;
      this.lookDy += e.movementY * 0.0022 * this.sensitivity;
    });
    window.addEventListener('wheel', (e) => {
      if (!this.enabled || !this.pointerLocked) return;
      this.emit(e.deltaY > 0 ? 'scroll:1' : 'scroll:-1');
    }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      const was = this.pointerLocked;
      this.pointerLocked = locked;
      if (was && !locked && this.onPointerLockLost) this.onPointerLockLost();
    });

    if (this.isTouch) this.bindTouch();
  }

  requestPointerLock() {
    if (this.isTouch && !window.matchMedia('(pointer: fine)').matches) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { this.canvas.requestPointerLock(); } catch (_) { /* noop */ } });
    } catch (_) {
      try { this.canvas.requestPointerLock(); } catch (__) { /* noop */ }
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  emit(name) { if (this.onAction) this.onAction(name); }

  /* ---------- タッチ ---------- */
  bindTouch() {
    const ui = this.ui;
    const area = ui.touchLayer;
    this.isTouchPointer = false;
    area.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      if (e.pointerType === 'mouse') return;
      this.isTouchPointer = true;
      const rect = area.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (x < rect.width * 0.42 && !this.joy.active) {
        // スティック
        this.joy.active = true; this.joy.id = e.pointerId; this.joy.cx = x; this.joy.cy = y; this.joy.x = 0; this.joy.z = 0;
        ui.joyBase.style.left = x + 'px'; ui.joyBase.style.top = y + 'px';
        ui.joyBase.classList.add('is-active');
        ui.joyKnob.style.transform = 'translate(-50%, -50%)';
        area.setPointerCapture(e.pointerId);
      } else if (!this.look.active) {
        const L = this.look;
        L.active = true; L.id = e.pointerId; L.lastX = e.clientX; L.lastY = e.clientY; L.startX = e.clientX; L.startY = e.clientY;
        L.startTime = performance.now(); L.moved = false; L.holding = false;
        area.setPointerCapture(e.pointerId);
        clearTimeout(L.holdTimer);
        L.holdTimer = setTimeout(() => { if (L.active && !L.moved) { L.holding = true; this.touchBreak = true; } }, 320);
      }
    });
    area.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joy.id && this.joy.active) {
        const rect = area.getBoundingClientRect();
        const dx = (e.clientX - rect.left) - this.joy.cx, dy = (e.clientY - rect.top) - this.joy.cy;
        const R = 52;
        const len = Math.hypot(dx, dy);
        const cl = Math.min(len, R);
        const nx = len > 0 ? dx / len : 0, ny = len > 0 ? dy / len : 0;
        ui.joyKnob.style.transform = `translate(calc(-50% + ${nx * cl}px), calc(-50% + ${ny * cl}px))`;
        const mag = Math.min(1, len / R);
        this.joy.x = nx * mag; this.joy.z = ny * mag;
        this.joy.sprint = len > R * 1.35;
      } else if (e.pointerId === this.look.id && this.look.active) {
        const L = this.look;
        const dx = e.clientX - L.lastX, dy = e.clientY - L.lastY;
        L.lastX = e.clientX; L.lastY = e.clientY;
        if (!L.moved && Math.hypot(e.clientX - L.startX, e.clientY - L.startY) > 12) {
          L.moved = true;
          if (!L.holding) clearTimeout(L.holdTimer);
        }
        if (L.holding) {
          // 長押し中は視点を動かしつつ壊し続ける
        }
        this.lookDx += dx * 0.0045 * this.sensitivity;
        this.lookDy += dy * 0.0045 * this.sensitivity;
      }
    });
    const end = (e) => {
      if (e.pointerId === this.joy.id) {
        this.joy.active = false; this.joy.id = -1; this.joy.x = 0; this.joy.z = 0; this.joy.sprint = false;
        ui.joyBase.classList.remove('is-active');
      } else if (e.pointerId === this.look.id) {
        const L = this.look;
        clearTimeout(L.holdTimer);
        const dt = performance.now() - L.startTime;
        if (!L.moved && !L.holding && dt < 300) this.placeTap = true;
        L.active = false; L.id = -1; L.holding = false;
        this.touchBreak = false;
      }
    };
    area.addEventListener('pointerup', end);
    area.addEventListener('pointercancel', end);

    const hold = (el, on, off) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); on(e); el.classList.add('is-down'); });
      const up = (e) => { off(e); el.classList.remove('is-down'); };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    };
    hold(ui.btnJump, () => {
      this.touchJump = true;
      const now = performance.now();
      this.jumpTapTimes.push(now);
      this.jumpTapTimes = this.jumpTapTimes.filter(t => now - t < 320);
      if (this.jumpTapTimes.length >= 2) { this.jumpTapTimes = []; this.emit('fly'); }
    }, () => { this.touchJump = false; });
    hold(ui.btnSneak, () => { this.touchSneak = true; }, () => { this.touchSneak = false; });
    hold(ui.btnBreak, () => { this.touchBreak = true; }, () => { this.touchBreak = false; });
    hold(ui.btnPlace, () => { this.placeTap = true; this.mousePlace = true; }, () => { this.mousePlace = false; });
  }

  /** 1 フレームぶんの入力をまとめて返す */
  poll() {
    const k = this.keys;
    let mx = 0, mz = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) mz -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) mz += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) mx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) mx += 1;
    if (this.joy.active) { mx += this.joy.x; mz += this.joy.z; }
    const state = {
      move: { x: mx, z: mz },
      jump: k.has('Space') || this.touchJump,
      sneak: k.has('ShiftLeft') || k.has('ShiftRight') || this.touchSneak,
      sprint: k.has('ControlLeft') || k.has('ControlRight') || this.sprintToggle || this.joy.sprint,
      breakHeld: this.mouseBreak || this.touchBreak,
      placeHeld: this.mousePlace,
      placeTap: this.placeTap,
      lookDx: this.lookDx,
      lookDy: this.lookDy
    };
    this.placeTap = false;
    this.lookDx = 0; this.lookDy = 0;
    return state;
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) { this.keys.clear(); this.mouseBreak = false; this.mousePlace = false; this.touchBreak = false; this.touchJump = false; this.touchSneak = false; this.joy.active = false; this.joy.x = this.joy.z = 0; if (this.ui.joyBase) this.ui.joyBase.classList.remove('is-active'); }
  }
}
