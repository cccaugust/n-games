import { pokemonData } from '../data/pokemonData.js';

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(s) {
  // Same escaping is fine for attribute values in double quotes.
  return escapeHtml(s);
}

/**
 * @typedef {{type:'emoji', emoji:string} | {type:'pokedex', id:string} | {type:'image', src:string}} AvatarParsed
 */

/**
 * Backward compatible avatar parser.
 * - emoji: plain string (default)
 * - pokedex:id
 * - data:image/... (or http(s) image url)
 * @param {string} avatar
 * @returns {AvatarParsed}
 */
export function parseAvatar(avatar) {
  const raw = String(avatar ?? '').trim();
  if (!raw) return { type: 'emoji', emoji: '👤' };

  if (raw.startsWith('pokedex:')) {
    const id = raw.slice('pokedex:'.length).trim();
    return { type: 'pokedex', id };
  }

  // Allow direct images (pixel art thumbnails etc)
  if (raw.startsWith('data:image/')) {
    return { type: 'image', src: raw };
  }
  if (/^https?:\/\//i.test(raw) && /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(raw)) {
    return { type: 'image', src: raw };
  }

  return { type: 'emoji', emoji: raw };
}

/**
 * Returns a small avatar HTML snippet safe to embed in template strings.
 * Note: this is intended for already-controlled sources (emoji / known assets / data URLs).
 * @param {string} avatar
 * @param {{sizePx?: number, title?: string}} [opts]
 */
export function avatarToHtml(avatar, opts = {}) {
  const sizePx = Number(opts.sizePx ?? 24);
  const title = opts.title ? String(opts.title) : '';
  const parsed = parseAvatar(avatar);

  if (parsed.type === 'pokedex') {
    const p = pokemonData.find((x) => String(x.id) === String(parsed.id));
    if (!p) {
      return `<span style="font-size:${sizePx}px; line-height:1; display:inline-flex; width:${sizePx}px; height:${sizePx}px; align-items:center; justify-content:center;" title="${escapeAttr(
        title
      )}">❓</span>`;
    }
    return `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(
      p.name
    )}" title="${escapeAttr(title || p.name)}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;image-rendering:pixelated;vertical-align:middle;" />`;
  }

  if (parsed.type === 'image') {
    return `<img src="${escapeAttr(parsed.src)}" alt="" title="${escapeAttr(
      title
    )}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;image-rendering:pixelated;vertical-align:middle;border-radius:6px;" />`;
  }

  return `<span style="font-size:${sizePx}px; line-height:1; display:inline-flex; width:${sizePx}px; height:${sizePx}px; align-items:center; justify-content:center;" title="${escapeAttr(
    title
  )}">${escapeHtml(parsed.emoji)}</span>`;
}

