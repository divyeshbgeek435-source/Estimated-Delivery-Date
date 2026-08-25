export function openStorefrontPage(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function openProductPageEditor(url) {
  openStorefrontPage(url);
}
