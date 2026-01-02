const IMAGE_PREFIX = 'img:';

export function isImageAvatar(avatar) {
  return typeof avatar === 'string' && avatar.startsWith(IMAGE_PREFIX);
}

export function getImageAvatarSrc(avatar) {
  if (!isImageAvatar(avatar)) return null;
  const src = avatar.slice(IMAGE_PREFIX.length).trim();
  return isSafeImageSrc(src) ? src : null;
}

export function makeImageAvatar(src) {
  const s = String(src || '').trim();
  if (!s) return '';
  return `${IMAGE_PREFIX}${s}`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function avatarToHtml(avatar, { size = 24, className = 'avatar-img', alt = '' } = {}) {
  const imgSrc = getImageAvatarSrc(avatar);
  if (imgSrc) {
    const safeAlt = escapeHtml(alt);
    const safeClass = escapeHtml(className);
    const px = Math.max(8, Number(size) || 24);
    return `<img class="${safeClass}" src="${escapeHtml(imgSrc)}" alt="${safeAlt}" width="${px}" height="${px}" loading="lazy" decoding="async">`;
  }
  const text = String(avatar || '').trim() || '👤';
  return `<span class="${escapeHtml(className)}" aria-hidden="true">${escapeHtml(text)}</span>`;
}

export function renderAvatarInto(containerEl, avatar, { size = 24, className = 'avatar-img', alt = '' } = {}) {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  const imgSrc = getImageAvatarSrc(avatar);
  if (imgSrc) {
    const img = document.createElement('img');
    img.className = className;
    img.src = imgSrc;
    img.alt = alt;
    const px = Math.max(8, Number(size) || 24);
    img.width = px;
    img.height = px;
    img.decoding = 'async';
    img.loading = 'lazy';
    containerEl.appendChild(img);
    return;
  }

  const span = document.createElement('span');
  span.className = className;
  span.textContent = String(avatar || '').trim() || '👤';
  span.setAttribute('aria-hidden', 'true');
  containerEl.appendChild(span);
}

export function isSafeImageSrc(src) {
  const s = String(src || '').trim();
  if (!s) return false;
  if (s.startsWith('data:')) {
    return /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(s);
  }
  try {
    const u = new URL(s, window.location.origin);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

