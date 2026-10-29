const REFERENCE_EDGE_M = 0.9;

export interface FabricImagePayload {
  image: HTMLImageElement;
  aspect: number;
  width: number;
  height: number;
}

export function clothDimensionsFromAspect(aspect: number): {
  width: number;
  height: number;
  aspectRatio: number;
} {
  if (aspect >= 1.0) {
    return {
      width: REFERENCE_EDGE_M,
      height: REFERENCE_EDGE_M / aspect,
      aspectRatio: aspect,
    };
  }
  return {
    width: REFERENCE_EDGE_M * aspect,
    height: REFERENCE_EDGE_M,
    aspectRatio: aspect,
  };
}

function decodeImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(new Error('Could not read file.'));
    };
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('Invalid file format.'));
        return;
      }
      const img = new Image();
      img.onerror = () => {
        reject(new Error('Could not decode image.'));
      };
      img.onload = () => {
        resolve(img);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export async function loadFabricImageFromFile(file: File): Promise<FabricImagePayload> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (PNG, JPEG, …).');
  }

  const image = await decodeImageFromFile(file);
  if (image.width < 1 || image.height < 1) {
    throw new Error('Image has no valid resolution.');
  }

  const aspect = image.width / image.height;
  const { width, height } = clothDimensionsFromAspect(aspect);

  return { image, aspect, width, height };
}
