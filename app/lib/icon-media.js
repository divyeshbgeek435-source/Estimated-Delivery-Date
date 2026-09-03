export function isCustomImage(value) {
  return /^(https?:\/\/|data:image\/|blob:|\/\/)/i.test(String(value || "").trim());
}

export function isIconEnabled(icons, key) {
  return icons?.[`${key}Enabled`] !== false;
}

export function safeImageSrc(value) {
  const src = String(value || "").trim();
  if (!isCustomImage(src)) return "";
  if (src.startsWith("data:image/") && src.length > 180000) return "";
  return src;
}

export function resizeImageFile(file, { size = 128 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("Choose a PNG, JPG, or WebP image."));
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      reject(new Error("Keep images under 2.5 MB."));
      return;
    }
    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read that image."));
      reader.readAsDataURL(file);
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
