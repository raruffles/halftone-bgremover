export type DotPattern = 
  | 'circle' 
  | 'ellipse' 
  | 'diamond' 
  | 'square' 
  | 'line';

export type ViewMode = 'original' | 'separation' | 'split' | 'mask';

export type ActiveStudioTab = 'dtf-studio' | 'bg-remover';

export interface LevelsSettings {
  shadow: number;      // 0 to 100 (Black Point / Input Shadows)
  midtones: number;    // 0.2 to 2.5 (Gamma curve, default 1.0)
  highlight: number;   // 150 to 255 (White Point / Input Highlights)
}

export interface ColorAdjustSettings {
  hue: number;         // -180 to 180
  saturation: number;  // -100 to 100
  lightness: number;   // -100 to 100
  contrast: number;    // 0.5 to 3.0
}

export interface WhiteBaseSettings {
  enabled: boolean;
  choke: number;       // 0 to 3 px (eliminates white haze/halo)
  minDensity: number;  // 0 to 50%
}

export interface BackgroundRemovalSettings {
  enabled: boolean;
  targetColor: string;     // Color to knockout (e.g. #000000 for black background)
  tolerance: number;       // 1 to 100% (range of color matching)
  feather: number;         // 0 to 10 px (soft blend transition)
  edgeChoke: number;       // 0 to 5 px (tightens mask to kill white haze / fringe)
  despeckle: boolean;      // Cleans stray isolated dots
  autoDetectBlack: boolean;// Automatically knocks out dark pixels from black-background halftones
}

export interface HalftoneSettings {
  // Halftone Screen Controls
  enableHalftone: boolean;
  lpi: number;         // 15, 20, 25, 30, 35, 40, 45, 50, 55 (Lines Per Inch)
  angle: number;       // 0, 22.5, 45, 60
  pattern: DotPattern;
  dotScale: number;    // 0.6 to 1.4

  // Shirt Color & Knockout (Eliminates Black Box & White Haze)
  shirtColor: string;
  shirtColorPreview: boolean;
  knockoutShirtColor: boolean; // Knocks out shirt color so artwork blends into fabric
  knockoutThreshold: number;   // 0 to 100%
  edgeChoke: number;           // 0 to 4 px (Tightens cutout to eliminate fringe)

  // Dedicated Background Removal tab settings
  bgRemoval: BackgroundRemovalSettings;

  // Levels & Image Adjustments
  levels: LevelsSettings;
  colorAdjust: ColorAdjustSettings;

  // White Underbase Control
  whiteBase: WhiteBaseSettings;

  // Ink Color Mode: 'original-colors' (default) preserves the artwork's real colors!
  inkMode: 'original-colors' | 'spot';
  inkColor: string;            // Preset spot color (e.g. gold, white, pink, cyan, green, purple)
}

export interface ColorPreset {
  id: string;
  name: string;
  category: 'original' | 'neon' | 'classico' | 'mono';
  hex: string;
  description: string;
  badge?: string;
}

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  category: string;
  settings: Partial<HalftoneSettings>;
}

export interface BatchItem {
  id: string;
  name: string;
  originalUrl: string;
  width: number;
  height: number;
  status: 'idle' | 'processing' | 'done' | 'error';
  processedDataUrl?: string;
  error?: string;
}
