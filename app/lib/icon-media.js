export function isCustomImage(value) {
  return /^(https?:\/\/|data:image\/|blob:|\/\/)/i.test(String(value || "").trim());
}

export function isIconEnabled(icons, key) {
  return icons?.[`${key}Enabled`] !== false;
}

export function safeImageSrc(value) {
  const src = String(value || "").trim();
  if (!isCustomImage(src)) return "";
  if (src.startsWith("data:image/") && src.length > 400000) return "";
  return src;
}

export function isAnimatedSrc(value) {
  const src = String(value || "").trim().toLowerCase();
  if (!src) return false;
  if (src.startsWith("data:image/gif")) return true;
  if (/\.gif($|\?)/i.test(src)) return true;
  if (src.startsWith("data:image/webp") && src.includes("animated")) return true;
  if (/\.apng($|\?)/i.test(src)) return true;
  return false;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

export function resizeImageFile(file, { size = 128 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Choose a PNG, JPG, WebP, GIF, or SVG image."));
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      reject(new Error("Keep images under 2.5 MB."));
      return;
    }

    // Keep GIF / SVG animation or vectors intact.
    if (file.type === "image/gif" || file.type === "image/svg+xml") {
      readFileAsDataUrl(file).then(resolve).catch(reject);
      return;
    }

    const image = new Image();
    const blobUrl = URL.createObjectURL(file);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.clearRect(0, 0, size, size);
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error("Could not read that image."));
    };
    image.src = blobUrl;
  });
}

export function createLibraryIcon({ src, label = "Custom icon", kind } = {}) {
  const value = String(src || "").trim();
  if (!value) return null;
  return {
    id: `icon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    src: value,
    kind: kind || (isAnimatedSrc(value) ? "animated" : "static"),
    label: String(label || "Custom icon").trim().slice(0, 40) || "Custom icon",
    addedAt: new Date().toISOString(),
  };
}

export function normalizeIconLibrary(list = []) {
  const seen = new Set();
  const next = [];
  for (const item of Array.isArray(list) ? list : []) {
    const src = String(item?.src || item?.value || "").trim();
    if (!src || !isCustomImage(src)) continue;
    const key = src.slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({
      id: String(item.id || `icon_${next.length + 1}`),
      src,
      kind: item.kind === "animated" || isAnimatedSrc(src) ? "animated" : "static",
      label: String(item.label || "Custom icon").trim().slice(0, 40) || "Custom icon",
      addedAt: item.addedAt || null,
    });
    if (next.length >= 40) break;
  }
  return next;
}

export function mergeIconLibraries(...lists) {
  return normalizeIconLibrary(lists.flatMap((list) => (Array.isArray(list) ? list : [])));
}
