export type CoverFit = Readonly<{focus_x: number; focus_y: number; zoom: number}>;
export const DEFAULT_COVER_FIT: CoverFit = Object.freeze({focus_x: 500, focus_y: 500, zoom: 1000});

export function validCoverFit(value: CoverFit): boolean {
  return Number.isInteger(value.focus_x) && value.focus_x >= 0 && value.focus_x <= 1000
    && Number.isInteger(value.focus_y) && value.focus_y >= 0 && value.focus_y <= 1000
    && Number.isInteger(value.zoom) && value.zoom >= 1000 && value.zoom <= 2000;
}
export function clampCoverFit(value: CoverFit): CoverFit {
  const bounded = (n: number, min: number, max: number, fallback: number) =>
    Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
  return Object.freeze({focus_x: bounded(value.focus_x, 0, 1000, 500), focus_y: bounded(value.focus_y, 0, 1000, 500),
    zoom: bounded(value.zoom, 1000, 2000, 1000)});
}
export function sameCoverFit(a: CoverFit, b: CoverFit) {
  return a.focus_x === b.focus_x && a.focus_y === b.focus_y && a.zoom === b.zoom;
}
/** Position is a fraction of the available crop, independent of viewport pixels. */
export function coverGeometry(imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number, input: CoverFit) {
  if (![imageWidth, imageHeight, viewportWidth, viewportHeight].every(n => Number.isFinite(n) && n > 0)) return null;
  const fit = clampCoverFit(input), scale = Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight) * fit.zoom / 1000;
  const width = imageWidth * scale, height = imageHeight * scale;
  const overflowX = Math.max(0, width - viewportWidth), overflowY = Math.max(0, height - viewportHeight);
  return {width, height, overflowX, overflowY, left: -overflowX * fit.focus_x / 1000, top: -overflowY * fit.focus_y / 1000};
}
export function dragCoverFit(start: CoverFit, dx: number, dy: number,
  imageWidth: number, imageHeight: number, viewportWidth: number, viewportHeight: number): CoverFit {
  const geometry = coverGeometry(imageWidth, imageHeight, viewportWidth, viewportHeight, start);
  if (!geometry || !Number.isFinite(dx) || !Number.isFinite(dy)) return clampCoverFit(start);
  return clampCoverFit({...start,
    focus_x: geometry.overflowX > 0.5 ? start.focus_x - dx * 1000 / geometry.overflowX : start.focus_x,
    focus_y: geometry.overflowY > 0.5 ? start.focus_y - dy * 1000 / geometry.overflowY : start.focus_y});
}
