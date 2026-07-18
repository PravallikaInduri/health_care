/*
Resize an image File to a square thumbnail data URL (default 256x256, JPEG ~85%).
Result is base64 — small enough to store in the existing patients.photo_url /
providers.photo_url TEXT columns and safe to round-trip through any <img src=...>.
*/
export const fileToThumbnailDataUrl = (
  file: File,
  size = 256,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please select an image file"));
      return;
    }

    const reader = new FileReader();

    reader.onload = (ev) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }

        /* Cover crop: keep aspect ratio, fill the square. */
        const ratio = Math.max(
          size / img.width,
          size / img.height
        );
        const w = img.width * ratio;
        const h = img.height * ratio;
        const x = (size - w) / 2;
        const y = (size - h) / 2;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, x, y, w, h);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = () =>
        reject(new Error("Could not read image"));

      img.src = ev.target?.result as string;
    };

    reader.onerror = () =>
      reject(new Error("Could not read file"));

    reader.readAsDataURL(file);
  });
};
