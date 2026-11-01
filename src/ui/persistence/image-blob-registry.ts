/** In-memory file data of user images (object URLs alone cannot be stored). */
const blobs = new Map<string, Blob>();

export function registerImageBlob(imageId: string, blob: Blob): void {
  blobs.set(imageId, blob);
}

export function getImageBlob(imageId: string): Blob | undefined {
  return blobs.get(imageId);
}
