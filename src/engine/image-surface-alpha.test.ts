import { describe, expect, it } from 'vitest';
import { imageFormatMayHaveAlpha } from './image-surface-alpha';

describe('imageFormatMayHaveAlpha', () => {
  it('returns true for common alpha-capable extensions', () => {
    expect(imageFormatMayHaveAlpha('label.png')).toBe(true);
    expect(imageFormatMayHaveAlpha('photo.webp')).toBe(true);
    expect(imageFormatMayHaveAlpha('anim.gif')).toBe(true);
    expect(imageFormatMayHaveAlpha('shot.avif')).toBe(true);
  });

  it('returns false for jpeg and unknown', () => {
    expect(imageFormatMayHaveAlpha('photo.jpg')).toBe(false);
    expect(imageFormatMayHaveAlpha('photo.jpeg')).toBe(false);
    expect(imageFormatMayHaveAlpha(undefined)).toBe(false);
  });
});
