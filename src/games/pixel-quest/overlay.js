// Simple overlay (modal) for Pixel Quest pages

export function initOverlay({
  overlayId = 'overlay',
  titleId = 'overlayTitle',
  textId = 'overlayText',
  extraId = 'overlayExtra',
  closeId = 'overlayClose'
} = {}) {
  const overlay = document.getElementById(overlayId);
  const overlayTitle = document.getElementById(titleId);
  const overlayText = document.getElementById(textId);
  const overlayExtra = document.getElementById(extraId);
  const overlayClose = document.getElementById(closeId);

  function showOverlay(title, text, html = '', { closable = true } = {}) {
    if (!overlay) return;
    if (overlayTitle) overlayTitle.textContent = title ?? '';
    if (overlayText) overlayText.textContent = text ?? '';
    if (overlayExtra) overlayExtra.innerHTML = html || '';
    overlay.style.display = 'flex';
    if (overlayClose) overlayClose.style.display = closable ? 'inline-flex' : 'none';
    overlay.dataset.closable = closable ? '1' : '0';
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.style.display = 'none';
  }

  overlayClose?.addEventListener('click', closeOverlay);
  overlay?.addEventListener('click', (e) => {
    const canClose = overlay.dataset.closable !== '0';
    if (canClose && e.target === overlay) closeOverlay();
  });

  return { showOverlay, closeOverlay };
}

