import { HalftoneSettings, ViewMode } from '../types/halftone';

export interface RenderResult {
  width: number;
  height: number;
  dotCount: number;
  dotsForSvg: Array<{ x: number; y: number; size: number; shape: string; color: string }>;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function lpiToCellSize(lpi: number, scale: number = 1): number {
  const baseDpi = 300;
  const size = (baseDpi / Math.max(10, lpi)) * (scale * 0.9);
  return Math.max(2, size);
}

/**
 * Adjusts RGB by Hue, Saturation, Lightness, and Contrast
 */
function adjustColor(
  r: number,
  g: number,
  b: number,
  hue: number,
  sat: number,
  light: number,
  contrast: number
): { r: number; g: number; b: number } {
  let rNorm = r / 255;
  let gNorm = g / 255;
  let bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  h = (h + hue / 360 + 1) % 1;
  s = Math.max(0, Math.min(1, s * (1 + sat / 100)));
  l = Math.max(0, Math.min(1, l + light / 200));

  let newR: number, newG: number, newB: number;
  if (s === 0) {
    newR = newG = newB = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    newR = hue2rgb(p, q, h + 1 / 3);
    newG = hue2rgb(p, q, h);
    newB = hue2rgb(p, q, h - 1 / 3);
  }

  let adjR = ((newR - 0.5) * contrast + 0.5) * 255;
  let adjG = ((newG - 0.5) * contrast + 0.5) * 255;
  let adjB = ((newB - 0.5) * contrast + 0.5) * 255;

  return {
    r: Math.max(0, Math.min(255, Math.round(adjR))),
    g: Math.max(0, Math.min(255, Math.round(adjG))),
    b: Math.max(0, Math.min(255, Math.round(adjB))),
  };
}

/**
 * Dedicated Background Removal Renderer
 * Takes an image (even one with black background halftone or normal artwork)
 * and produces a clean transparent PNG image without halftoning, OR an alpha matte mask.
 */
export function renderBackgroundRemoved(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  settings: HalftoneSettings,
  targetCanvas: HTMLCanvasElement,
  scale: number = 1,
  mode: 'color' | 'mask' = 'color'
): void {
  const origW = sourceImage instanceof HTMLImageElement ? sourceImage.naturalWidth : sourceImage.width;
  const origH = sourceImage instanceof HTMLImageElement ? sourceImage.naturalHeight : sourceImage.height;

  const width = Math.round(origW * scale);
  const height = Math.round(origH * scale);

  targetCanvas.width = width;
  targetCanvas.height = height;

  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  offCtx.drawImage(sourceImage, 0, 0, width, height);
  const imgData = offCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const targetRgb = hexToRgb(settings.bgRemoval.targetColor || '#000000');
  const tolRatio = Math.max(0.01, settings.bgRemoval.tolerance / 100);
  const tolDist = tolRatio * 255;
  const tolDistSq = tolDist * tolDist;
  const featherDist = ((settings.bgRemoval.feather * 3) / 100) * 255;
  const edgeChoke = settings.bgRemoval.edgeChoke || 0;

  // Pass 1: Knockout detection & initial alpha masking
  const alphaMask = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (a < 10) {
      alphaMask[i] = 0;
      continue;
    }

    // Distance to target knockout color
    const dr = r - targetRgb.r;
    const dg = g - targetRgb.g;
    const db = b - targetRgb.b;
    const distSq = dr * dr + dg * dg + db * db;
    const dist = Math.sqrt(distSq);

    // Auto-detect black background: neutral & dark luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const isNeutral = Math.abs(r - g) < 25 && Math.abs(g - b) < 25;
    const isBlackBg = settings.bgRemoval.autoDetectBlack && isNeutral && lum <= tolRatio * 110;

    let pixelAlpha = a;

    if (distSq <= tolDistSq || isBlackBg) {
      pixelAlpha = 0;
    } else if (featherDist > 0 && dist < tolDist + featherDist) {
      const alphaFactor = (dist - tolDist) / featherDist;
      pixelAlpha = Math.round(a * Math.min(1, Math.max(0, alphaFactor)));
    }

    alphaMask[i] = pixelAlpha;
  }

  // Pass 2: Edge Choke (Morphological erosion to destroy white haze / dark halo around borders)
  let finalAlpha = alphaMask;
  if (edgeChoke > 0) {
    finalAlpha = new Uint8Array(alphaMask);
    const chokeRadius = edgeChoke;
    for (let y = chokeRadius; y < height - chokeRadius; y++) {
      for (let x = chokeRadius; x < width - chokeRadius; x++) {
        const currentAlpha = alphaMask[y * width + x];
        if (currentAlpha === 0) continue;

        let minNeighborAlpha = currentAlpha;
        for (let dy = -chokeRadius; dy <= chokeRadius; dy++) {
          for (let dx = -chokeRadius; dx <= chokeRadius; dx++) {
            const nAlpha = alphaMask[(y + dy) * width + (x + dx)];
            if (nAlpha < minNeighborAlpha) {
              minNeighborAlpha = nAlpha;
            }
          }
        }
        finalAlpha[y * width + x] = minNeighborAlpha;
      }
    }
  }

  // Pass 3: Despeckle / stray dot noise filter (only if explicitly enabled)
  if (settings.bgRemoval.despeckle) {
    const despeckled = new Uint8Array(finalAlpha);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (finalAlpha[idx] > 0) {
          let neighborCount = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (finalAlpha[(y + dy) * width + (x + dx)] > 20) {
                neighborCount++;
              }
            }
          }
          if (neighborCount === 0) {
            despeckled[idx] = 0;
          }
        }
      }
    }
    finalAlpha = despeckled;
  }

  // Pass 4: Apply to output canvas
  for (let i = 0; i < width * height; i++) {
    const pIdx = i * 4;
    const a = finalAlpha[i];

    if (mode === 'mask') {
      // White on Black mask
      data[pIdx] = a;
      data[pIdx + 1] = a;
      data[pIdx + 2] = a;
      data[pIdx + 3] = 255;
    } else {
      // Color with transparent background
      data[pIdx + 3] = a;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Core Halftone & Separation Engine
 */
export function renderHalftone(
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  settings: HalftoneSettings,
  targetCanvas: HTMLCanvasElement,
  scale: number = 1,
  forcedViewMode?: ViewMode
): RenderResult {
  const origW = sourceImage instanceof HTMLImageElement ? sourceImage.naturalWidth : sourceImage.width;
  const origH = sourceImage instanceof HTMLImageElement ? sourceImage.naturalHeight : sourceImage.height;

  const width = Math.round(origW * scale);
  const height = Math.round(origH * scale);

  targetCanvas.width = width;
  targetCanvas.height = height;

  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not get 2D context');
  }

  if (forcedViewMode === 'mask') {
    // DTF White Underbase Mask: Solid black film background with white dots
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  } else {
    // Separation / Standard: Transparent background
    ctx.clearRect(0, 0, width, height);
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) {
    throw new Error('Could not get offscreen 2D context');
  }
  offCtx.drawImage(sourceImage, 0, 0, width, height);
  const srcImageData = offCtx.getImageData(0, 0, width, height);
  const pixels = srcImageData.data;

  const cellSize = lpiToCellSize(settings.lpi, scale);
  const angleRad = (settings.angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const centerX = width / 2;
  const centerY = height / 2;
  const diag = Math.sqrt(width * width + height * height);
  const halfDiag = diag / 2;

  // Colors & Levels
  const spotInkRgb = hexToRgb(settings.inkColor || '#00E5FF');
  const targetBgRgb = hexToRgb(settings.bgRemoval.targetColor || '#000000');

  const shadowInput = (settings.levels.shadow / 100) * 255;
  const highlightInput = settings.levels.highlight;
  const gamma = Math.max(0.1, settings.levels.midtones);
  const contrastFactor = settings.colorAdjust.contrast;
  const brightnessOffset = (settings.colorAdjust.lightness / 100) * 255;
  const knockoutThreshold = (settings.knockoutThreshold / 100) * 255;
  const bgTolVal = (settings.bgRemoval.tolerance / 100) * 255;

  const dotsForSvg: Array<{ x: number; y: number; size: number; shape: string; color: string }> = [];
  let dotCount = 0;

  // Iterate over rotated grid coordinates
  for (let yGrid = -halfDiag; yGrid <= halfDiag; yGrid += cellSize) {
    for (let xGrid = -halfDiag; xGrid <= halfDiag; xGrid += cellSize) {
      const px = Math.round(centerX + xGrid * cosA - yGrid * sinA);
      const py = Math.round(centerY + xGrid * sinA + yGrid * cosA);

      if (px < 0 || px >= width || py < 0 || py >= height) {
        continue;
      }

      // Sample 3x3 box for anti-aliased accuracy
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
      let sampleCount = 0;
      const sampleStep = Math.max(1, Math.floor(cellSize / 3));

      for (let sy = -sampleStep; sy <= sampleStep; sy += sampleStep) {
        for (let sx = -sampleStep; sx <= sampleStep; sx += sampleStep) {
          const spx = Math.min(width - 1, Math.max(0, px + sx));
          const spy = Math.min(height - 1, Math.max(0, py + sy));
          const idx = (spy * width + spx) * 4;

          sumR += pixels[idx];
          sumG += pixels[idx + 1];
          sumB += pixels[idx + 2];
          sumA += pixels[idx + 3];
          sampleCount++;
        }
      }

      const avgR = sumR / sampleCount;
      const avgG = sumG / sampleCount;
      const avgB = sumB / sampleCount;
      const avgA = sumA / sampleCount;

      // Transparent pixel check: skip if source pixel is already transparent
      if (avgA < 20) {
        continue;
      }

      // Luminance BT.601
      const lum = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB;

      // SMART BACKGROUND REMOVAL / BLACK BOX KNOCKOUT:
      // Automatically removes black box background so artwork blends seamlessly with garment!
      if (settings.bgRemoval.enabled || settings.knockoutShirtColor) {
        const dr = avgR - targetBgRgb.r;
        const dg = avgG - targetBgRgb.g;
        const db = avgB - targetBgRgb.b;
        const colorDist = Math.sqrt(dr * dr + dg * dg + db * db);

        // Auto-detect black background: if average luminance is dark and close to black
        if (
          (settings.bgRemoval.autoDetectBlack && lum <= bgTolVal) ||
          colorDist <= knockoutThreshold
        ) {
          continue; // Transparent background: NO dot drawn!
        }

        // Edge Choke: tighten cutout boundary to eliminate white haze/fringe
        if (settings.bgRemoval.edgeChoke > 0) {
          if (colorDist < knockoutThreshold + settings.bgRemoval.edgeChoke * 12) {
            continue;
          }
        }
      }

      // LEVELS & CONTRAST CURVE
      let normLum = (lum - shadowInput) / Math.max(1, highlightInput - shadowInput);
      normLum = Math.max(0, Math.min(1, normLum));

      // Gamma midtones
      normLum = Math.pow(normLum, 1 / gamma);

      // Contrast
      let adjusted = (normLum - 0.5) * contrastFactor + 0.5 + brightnessOffset / 255;
      adjusted = Math.max(0, Math.min(1, adjusted));

      const dotIntensity = adjusted;
      if (dotIntensity < 0.04) {
        continue;
      }

      const maxDotRadius = (cellSize / Math.SQRT2) * settings.dotScale;
      let dotRadius = Math.max(0, dotIntensity * maxDotRadius);

      // White base choke in mask mode
      if (forcedViewMode === 'mask' && settings.whiteBase.choke > 0) {
        dotRadius = Math.max(0.2, dotRadius - settings.whiteBase.choke * 0.4);
      }

      if (dotRadius < 0.35) {
        continue;
      }

      dotCount++;

      // COLOR DETERMINATION:
      // BY DEFAULT: 'original-colors' retains 100% true colors of the artwork!
      let dotColorStyle = '';
      let svgHex = '';

      if (forcedViewMode === 'mask') {
        // White Underbase Mask mode: draws white density on black film
        const maskDensity = Math.min(255, Math.round(dotIntensity * 255));
        dotColorStyle = `rgb(${maskDensity}, ${maskDensity}, ${maskDensity})`;
        svgHex = '#FFFFFF';
      } else if (settings.inkMode === 'original-colors') {
        // True original artwork colors!
        let finalR = Math.round(avgR);
        let finalG = Math.round(avgG);
        let finalB = Math.round(avgB);

        if (
          settings.colorAdjust.hue !== 0 ||
          settings.colorAdjust.saturation !== 0 ||
          settings.colorAdjust.lightness !== 0 ||
          settings.colorAdjust.contrast !== 1.0
        ) {
          const adj = adjustColor(
            avgR,
            avgG,
            avgB,
            settings.colorAdjust.hue,
            settings.colorAdjust.saturation,
            settings.colorAdjust.lightness,
            settings.colorAdjust.contrast
          );
          finalR = adj.r;
          finalG = adj.g;
          finalB = adj.b;
        }

        dotColorStyle = `rgb(${finalR}, ${finalG}, ${finalB})`;
        svgHex = `#${finalR.toString(16).padStart(2, '0')}${finalG.toString(16).padStart(2, '0')}${finalB.toString(16).padStart(2, '0')}`;
      } else {
        // Preset spot color (e.g. Ouro, Branco, Preto, Rosa, Ciano, Verde)
        dotColorStyle = `rgb(${spotInkRgb.r}, ${spotInkRgb.g}, ${spotInkRgb.b})`;
        svgHex = settings.inkColor;
      }

      ctx.fillStyle = dotColorStyle;

      if (scale === 1 && dotsForSvg.length < 50000) {
        dotsForSvg.push({
          x: px,
          y: py,
          size: dotRadius * 2,
          shape: settings.pattern,
          color: svgHex,
        });
      }

      drawDotShape(ctx, px, py, dotRadius, settings.pattern, angleRad);
    }
  }

  return {
    width,
    height,
    dotCount,
    dotsForSvg,
  };
}

/**
 * Draws halftone shape
 */
function drawDotShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  pattern: string,
  angleRad: number
) {
  ctx.beginPath();

  switch (pattern) {
    case 'circle':
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'ellipse':
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRad);
      ctx.ellipse(0, 0, r * 1.35, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;

    case 'diamond': {
      ctx.moveTo(cx, cy - r * 1.25);
      ctx.lineTo(cx + r * 1.25, cy);
      ctx.lineTo(cx, cy + r * 1.25);
      ctx.lineTo(cx - r * 1.25, cy);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'square': {
      const s = r * 1.6;
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
      break;
    }

    case 'line': {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRad);
      const thickness = Math.max(1, r * 1.5);
      const len = r * 3.6;
      ctx.fillRect(-len / 2, -thickness / 2, len, thickness);
      ctx.restore();
      break;
    }

    default:
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}
