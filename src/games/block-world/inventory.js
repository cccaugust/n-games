/**
 * インベントリ：ホットバー 9 + 持ちもの 27、クラフト
 */
import { getDef, getIcon, isBlock, CREATIVE_PALETTE, RECIPES, B } from './blocks.js';

const STACK = 64;

export class Inventory {
  constructor(mode) {
    this.mode = mode;
    this.hotbar = new Array(9).fill(null);
    this.main = new Array(27).fill(null);
    this.selected = 0;
    this.onChange = null;
    if (mode === 'creative') {
      [B.GRASS, B.STONE, B.PLANKS, B.LOG_OAK, B.GLASS, B.TORCH, B.WOOL_RED, B.STONE_BRICKS, B.WATER].forEach((id, i) => { this.hotbar[i] = { id, count: 1 }; });
    }
  }

  get selectedItem() { return this.hotbar[this.selected]; }
  get selectedId() { const s = this.hotbar[this.selected]; return s ? s.id : 0; }

  select(i) { this.selected = ((i % 9) + 9) % 9; this.changed(); }
  changed() { if (this.onChange) this.onChange(); }

  count(id) {
    let n = 0;
    for (const s of this.hotbar) if (s && s.id === id) n += s.count;
    for (const s of this.main) if (s && s.id === id) n += s.count;
    return n;
  }

  /** 追加。入りきらなかった数を返す */
  add(id, count = 1) {
    if (this.mode === 'creative') return 0;
    let left = count;
    const tryStack = (arr) => {
      for (const s of arr) if (s && s.id === id && s.count < STACK && left > 0) { const n = Math.min(STACK - s.count, left); s.count += n; left -= n; }
    };
    const tryEmpty = (arr) => {
      for (let i = 0; i < arr.length && left > 0; i++) if (!arr[i]) { const n = Math.min(STACK, left); arr[i] = { id, count: n }; left -= n; }
    };
    tryStack(this.hotbar); tryStack(this.main); tryEmpty(this.hotbar); tryEmpty(this.main);
    this.changed();
    return left;
  }

  /** 選択中のアイテムを 1 つ減らす */
  consumeSelected(n = 1) {
    if (this.mode === 'creative') return;
    const s = this.hotbar[this.selected];
    if (!s) return;
    s.count -= n;
    if (s.count <= 0) this.hotbar[this.selected] = null;
    this.changed();
  }

  remove(id, count) {
    let left = count;
    const take = (arr) => {
      for (let i = 0; i < arr.length && left > 0; i++) {
        const s = arr[i];
        if (s && s.id === id) { const n = Math.min(s.count, left); s.count -= n; left -= n; if (s.count <= 0) arr[i] = null; }
      }
    };
    take(this.main); take(this.hotbar);
    this.changed();
    return left === 0;
  }

  canCraft(recipe) {
    if (this.mode === 'creative') return true;
    return recipe.in.every(i => this.count(i.id) >= i.count);
  }

  craft(recipe) {
    if (!this.canCraft(recipe)) return false;
    if (this.mode !== 'creative') for (const i of recipe.in) this.remove(i.id, i.count);
    const left = this.mode === 'creative' ? 0 : this.add(recipe.out.id, recipe.out.count);
    if (this.mode === 'creative') this.hotbar[this.selected] = { id: recipe.out.id, count: 1 };
    this.changed();
    return left === 0;
  }

  toJSON() { return { hotbar: this.hotbar, main: this.main, selected: this.selected }; }
  fromJSON(d) {
    if (!d) return;
    if (Array.isArray(d.hotbar)) this.hotbar = d.hotbar.slice(0, 9).concat(new Array(9).fill(null)).slice(0, 9);
    if (Array.isArray(d.main)) this.main = d.main.slice(0, 27).concat(new Array(27).fill(null)).slice(0, 27);
    if (typeof d.selected === 'number') this.selected = d.selected;
  }
}

/* ---------- UI ---------- */
export class InventoryUI {
  constructor(inv, els, audio) {
    this.inv = inv;
    this.els = els;   // { hotbar, panel, panelGrid, panelHotbar, craftList, tabs, closeBtn, title, cursor }
    this.audio = audio;
    this.held = null; // 持ち上げ中のスタック
    this.tab = 'items';
    this.onClose = null;
    this.onEat = null;
    this.buildHotbar();
    this.bindPanel();
    inv.onChange = () => this.refresh();
    this.refresh();
  }

  buildHotbar() {
    const hb = this.els.hotbar;
    hb.innerHTML = '';
    this.slotEls = [];
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('button');
      s.className = 'slot';
      s.type = 'button';
      s.innerHTML = '<img alt="" draggable="false"><span class="count"></span>';
      s.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.inv.select(i); this.audio.click(); });
      hb.appendChild(s);
      this.slotEls.push(s);
    }
  }

  refresh() {
    for (let i = 0; i < 9; i++) {
      const s = this.inv.hotbar[i];
      const el = this.slotEls[i];
      el.classList.toggle('is-selected', i === this.inv.selected);
      this.fillSlot(el, s, this.inv.mode === 'creative');
    }
    const sel = this.inv.selectedItem;
    this.els.itemName.textContent = sel ? getDef(sel.id).name : '';
    this.els.itemName.classList.toggle('is-visible', !!sel);
    clearTimeout(this._nameTimer);
    this._nameTimer = setTimeout(() => this.els.itemName.classList.remove('is-visible'), 1600);
    if (this.isOpen()) this.renderPanel();
  }

  fillSlot(el, s, hideCount = false) {
    const img = el.querySelector('img'), cnt = el.querySelector('.count');
    if (s) { img.src = getIcon(s.id); img.style.visibility = 'visible'; cnt.textContent = (hideCount || s.count <= 1) ? '' : s.count; el.title = getDef(s.id).name; }
    else { img.style.visibility = 'hidden'; cnt.textContent = ''; el.title = ''; }
  }

  setInventory(inv) {
    this.inv = inv;
    this.held = null;
    this.tab = 'items';
    inv.onChange = () => this.refresh();
    this.refresh();
  }

  isOpen() { return !this.els.panel.classList.contains('is-hidden'); }

  open(tab) {
    if (tab) this.tab = tab;
    this.els.panel.classList.remove('is-hidden');
    this.renderPanel();
  }
  close() {
    if (this.held) { this.inv.add(this.held.id, this.held.count); this.held = null; }
    this.els.panel.classList.add('is-hidden');
    if (this.onClose) this.onClose();
  }
  toggle() { this.isOpen() ? this.close() : this.open(); }

  bindPanel() {
    this.els.closeBtn.addEventListener('click', () => this.close());
    this.els.panel.addEventListener('click', (e) => { if (e.target === this.els.panel) this.close(); });
    for (const t of this.els.tabs) t.addEventListener('click', () => { this.tab = t.dataset.tab; this.audio.click(); this.renderPanel(); });
  }

  renderPanel() {
    const { panelGrid, panelHotbar, craftList, tabs, title } = this.els;
    for (const t of tabs) t.classList.toggle('is-active', t.dataset.tab === this.tab);
    const creative = this.inv.mode === 'creative';
    title.textContent = this.tab === 'craft' ? 'クラフト' : creative ? 'ブロック' : 'もちもの';
    panelGrid.innerHTML = '';
    craftList.innerHTML = '';
    panelGrid.classList.toggle('is-hidden', this.tab === 'craft');
    craftList.classList.toggle('is-hidden', this.tab !== 'craft');

    // ホットバー（パネル内）
    panelHotbar.innerHTML = '';
    this.inv.hotbar.forEach((s, i) => {
      const el = this.makeSlot(s, creative);
      el.classList.toggle('is-selected', i === this.inv.selected);
      el.addEventListener('click', () => this.clickSlot(this.inv.hotbar, i));
      panelHotbar.appendChild(el);
    });

    if (this.tab === 'craft') {
      for (const r of RECIPES) {
        const can = this.inv.canCraft(r);
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'recipe' + (can ? '' : ' is-disabled');
        const ins = r.in.map(i => `<span class="ing ${this.inv.count(i.id) >= i.count || creative ? 'ok' : 'ng'}"><img src="${getIcon(i.id)}" alt=""><b>${creative ? '' : this.inv.count(i.id) + '/'}${i.count}</b></span>`).join('<span class="plus">+</span>');
        row.innerHTML = `<div class="recipe-out"><img src="${getIcon(r.out.id)}" alt=""><span class="n">${r.out.count > 1 ? '×' + r.out.count : ''}</span></div>
          <div class="recipe-body"><div class="recipe-name">${getDef(r.out.id).name}</div><div class="recipe-ings">${ins}</div><div class="recipe-hint">${r.hint}</div></div>
          <div class="recipe-go">${can ? 'つくる' : ''}</div>`;
        row.addEventListener('click', () => {
          if (!this.inv.canCraft(r)) { this.audio.click(); return; }
          this.inv.craft(r); this.audio.craft(); this.renderPanel();
        });
        craftList.appendChild(row);
      }
      return;
    }

    if (creative) {
      for (const id of CREATIVE_PALETTE) {
        const el = this.makeSlot({ id, count: 1 }, true);
        el.addEventListener('click', () => {
          this.inv.hotbar[this.inv.selected] = { id, count: 1 };
          this.inv.changed(); this.audio.pop();
        });
        panelGrid.appendChild(el);
      }
    } else {
      this.inv.main.forEach((s, i) => {
        const el = this.makeSlot(s, false);
        el.addEventListener('click', () => this.clickSlot(this.inv.main, i));
        panelGrid.appendChild(el);
      });
    }
    this.updateCursor();
  }

  makeSlot(s, hideCount) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'slot';
    el.innerHTML = '<img alt="" draggable="false"><span class="count"></span>';
    this.fillSlot(el, s, hideCount);
    return el;
  }

  /** サバイバル：クリックで持ち上げ / 置く / 入れ替え */
  clickSlot(arr, i) {
    const s = arr[i];
    if (!this.held) {
      if (s) {
        // りんごは食べる
        if (getDef(s.id).food && this.onEat && this.onEat(s.id)) { s.count--; if (s.count <= 0) arr[i] = null; this.inv.changed(); return; }
        if (this.inv.mode === 'creative') { this.inv.select(this.inv.hotbar.indexOf(s)); return; }
        this.held = s; arr[i] = null; this.audio.click();
      } else if (this.inv.mode === 'creative' && arr === this.inv.hotbar) { this.inv.select(i); }
    } else {
      if (!s) { arr[i] = this.held; this.held = null; }
      else if (s.id === this.held.id) { const n = Math.min(STACK - s.count, this.held.count); s.count += n; this.held.count -= n; if (this.held.count <= 0) this.held = null; }
      else { arr[i] = this.held; this.held = s; }
      this.audio.click();
    }
    this.inv.changed();
    this.renderPanel();
  }

  updateCursor() {
    const c = this.els.cursor;
    if (this.held) { c.classList.remove('is-hidden'); c.querySelector('img').src = getIcon(this.held.id); c.querySelector('.count').textContent = this.held.count > 1 ? this.held.count : ''; }
    else c.classList.add('is-hidden');
  }

  moveCursor(x, y) {
    if (this.held) { this.els.cursor.style.left = x + 'px'; this.els.cursor.style.top = y + 'px'; }
  }
}
