import { describe, expect, it } from 'vitest';
import {
  buildExportDownloadFilename,
  formatExportDateTimeSuffix,
  viewportExportDownloadFilename,
} from './export-image';

describe('export download filenames', () => {
  const fixed = new Date(2026, 9, 11, 16, 5, 7);

  it('formats local date-time with seconds', () => {
    expect(formatExportDateTimeSuffix(fixed)).toBe('20261011160507');
  });

  it('builds base name + suffix + extension', () => {
    expect(buildExportDownloadFilename('mockup', 'png', fixed)).toBe(
      'mockup-20261011160507.png',
    );
    expect(buildExportDownloadFilename('scene', '.json', fixed)).toBe(
      'scene-20261011160507.json',
    );
  });

  it('maps viewport export formats', () => {
    expect(viewportExportDownloadFilename('png-transparent', fixed)).toBe(
      'mockup-20261011160507.png',
    );
    expect(viewportExportDownloadFilename('jpeg', fixed)).toBe(
      'mockup-20261011160507.jpg',
    );
  });
});
