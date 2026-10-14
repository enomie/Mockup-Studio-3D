import type { ImageOrientation } from '@/data/image-assets';

const FIELD_SEP = '--';
const SIZE_SQUARE = 'square';
const SIZE_WXH = /^(\d+)x(\d+)$/;

const ORIENTATION_FORMATS = new Set<string>(['portrait', 'landscape', 'square']);

export interface ParsedBuiltinImageBasename {
  logicalName: string;
  logicalFormat: string;
  sizeToken: string;
}

export function parseBuiltinImageBasename(basename: string): ParsedBuiltinImageBasename {
  const parts = basename.split(FIELD_SEP);
  if (parts.length !== 3) {
    throw new Error(
      `Builtin image basename must be name--format--pixelsize (got ${parts.length - 1} "--" separators): ${basename}`,
    );
  }

  const [logicalName, logicalFormat, sizeToken] = parts;
  if (!logicalName.length || !logicalFormat.length || !sizeToken.length) {
    throw new Error(`Builtin image basename has empty field: ${basename}`);
  }

  if (sizeToken !== SIZE_SQUARE && !SIZE_WXH.test(sizeToken)) {
    throw new Error(
      `Builtin image pixelsize must be "square" or WxH (e.g. 772x1031): ${basename}`,
    );
  }

  return { logicalName, logicalFormat, sizeToken };
}

export function sizeTokenToDimensions(
  sizeToken: string,
  fileDimensions?: { width: number; height: number },
): { width: number; height: number } {
  if (sizeToken === SIZE_SQUARE) {
    if (!fileDimensions) {
      throw new Error('sizeToken "square" requires file dimensions from disk');
    }
    if (fileDimensions.width !== fileDimensions.height) {
      throw new Error(
        `sizeToken "square" but image is ${fileDimensions.width}x${fileDimensions.height}`,
      );
    }
    return fileDimensions;
  }

  const match = SIZE_WXH.exec(sizeToken);
  if (!match) {
    throw new Error(`Invalid size token: ${sizeToken}`);
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 1 || height < 1) {
    throw new Error(`Invalid dimensions in size token: ${sizeToken}`);
  }

  return { width, height };
}

export function orientationFromFormat(format: string): ImageOrientation | null {
  if (!ORIENTATION_FORMATS.has(format)) {return null;}
  return format as ImageOrientation;
}

export function assertFormatMatchesOrientation(
  logicalFormat: string,
  orientation: ImageOrientation,
  basename: string,
): void {
  const expected = orientationFromFormat(logicalFormat);
  if (expected === null) {return;}
  if (expected !== orientation) {
    throw new Error(
      `Builtin image format "${logicalFormat}" does not match orientation "${orientation}" (${basename})`,
    );
  }
}
