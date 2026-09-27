import { HalftoneSettings } from '../types/halftone';

/**
 * Generates an SVG vector representation of halftone dots with transparent background
 */
export function generateHalftoneSVG(
  width: number,
  height: number,
  dots: Array<{ x: number; y: number; size: number; shape: string; color: string }>
): string {
  const elements = dots
    .filter((d) => d.size > 0.3)
    .map((d) => {
      const r = (d.size / 2).toFixed(2);
      const cx = d.x.toFixed(2);
      const cy = d.y.toFixed(2);

      if (d.shape === 'circle' || d.shape === 'ellipse') {
        const ry = d.shape === 'ellipse' ? (d.size * 0.7).toFixed(2) : r;
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${d.color}" />`;
      } else if (d.shape === 'diamond') {
        const s = (d.size / 2).toFixed(2);
        return `<polygon points="${cx},${(d.y - Number(s)).toFixed(2)} ${(d.x + Number(s)).toFixed(2)},${cy} ${cx},${(d.y + Number(s)).toFixed(2)} ${(d.x - Number(s)).toFixed(2)},${cy}" fill="${d.color}" />`;
      } else if (d.shape === 'square') {
        const s = d.size.toFixed(2);
        const x = (d.x - d.size / 2).toFixed(2);
        const y = (d.y - d.size / 2).toFixed(2);
        return `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${d.color}" />`;
      } else if (d.shape === 'line') {
        const w = (d.size * 1.5).toFixed(2);
        const h = (d.size * 0.35).toFixed(2);
        const x = (d.x - Number(w) / 2).toFixed(2);
        const y = (d.y - Number(h) / 2).toFixed(2);
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${d.color}" />`;
      } else {
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${d.color}" />`;
      }
    })
    .join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Halftone Studio Pro Vector Export - Transparent Background -->
  <g id="halftone-screen">
  ${elements}
  </g>
</svg>`;
}
