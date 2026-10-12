export async function preparePhoto(file: File): Promise<Blob> {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 20 MB.");
  let bitmap: ImageBitmap | HTMLImageElement;
  let imageUrl: string | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Some Safari versions decode images through <img> but not ImageBitmap.
    imageUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = imageUrl;
      await image.decode();
      bitmap = image;
    } catch {
      URL.revokeObjectURL(imageUrl);
      throw new Error(
        "This image could not be opened. Take a photo with the camera, or upload a JPEG, PNG or WebP. For HEIC photos, export a JPEG first.",
      );
    }
  }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare this photo.");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(new Error("Could not prepare this photo.")),
        "image/jpeg",
        0.85,
      ),
    );
    if (blob.size > 4 * 1024 * 1024)
      throw new Error("Crop the photo to one question and try again.");
    return blob;
  } finally {
    if ("close" in bitmap) bitmap.close();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }
}
