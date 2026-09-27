import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Split,
  Eye,
  Shirt,
  Upload,
  Layers,
  Sparkles,
  Grid,
  Scissors,
  Check,
  ArrowRight,
  MoveHorizontal,
} from 'lucide-react';
import { HalftoneSettings, ViewMode, ActiveStudioTab } from '../types/halftone';
import { renderHalftone, renderBackgroundRemoved } from '../utils/halftoneEngine';

interface CanvasWorkspaceProps {
  originalImage: HTMLImageElement | null;
  halftoneCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  maskCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  bgRemovedCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  settings: HalftoneSettings;
  viewMode: ViewMode;
  activeTab: ActiveStudioTab;
  onViewModeChange: (mode: ViewMode) => void;
  dotCount: number;
  canvasWidth: number;
  canvasHeight: number;
  onDropFiles: (files: FileList | File[]) => void;
  onOpenFilePicker: () => void;
  isProcessing: boolean;
  onApplyBgCutoutToImage?: () => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  originalImage,
  halftoneCanvasRef,
  maskCanvasRef,
  bgRemovedCanvasRef,
  settings,
  viewMode,
  activeTab,
  onViewModeChange,
  dotCount,
  canvasWidth,
  canvasHeight,
  onDropFiles,
  onOpenFilePicker,
  isProcessing,
  onApplyBgCutoutToImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const artworkBoxRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [splitPos, setSplitPos] = useState<number>(50); // percentage 0 to 100
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Exact true dimensions of the uploaded image to strictly preserve native aspect ratio
  const imgW = originalImage ? (originalImage.naturalWidth || 800) : (canvasWidth || 1200);
  const imgH = originalImage ? (originalImage.naturalHeight || 800) : (canvasHeight || 1200);

  // Auto-fit to viewport without distortion or clipping
  const fitToView = useCallback(() => {
    if (originalImage && containerRef.current) {
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;
      if (!containerW || !containerH) return;

      const w = originalImage.naturalWidth || 800;
      const h = originalImage.naturalHeight || 800;

      // Keep comfortable margin around the canvas (64px horizontal, 80px vertical)
      const availW = Math.max(100, containerW - 64);
      const availH = Math.max(100, containerH - 80);

      const scaleW = availW / w;
      const scaleH = availH / h;
      const fitScale = Math.min(scaleW, scaleH);

      setZoom(Math.max(0.05, Math.min(3.0, fitScale)));
      setPan({ x: 0, y: 0 });
    }
  }, [originalImage]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  // Window resize tracking
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      // Re-fit on container dimension change
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // LIVE CANVAS RENDERING:
  // Updates Halftone, Background-Removed, and Mask layers whenever image or settings change!
  useEffect(() => {
    if (!originalImage) return;

    try {
      // 1. Draw Halftone Separation Canvas (Active in DTF Studio)
      if (halftoneCanvasRef.current) {
        renderHalftone(originalImage, settings, halftoneCanvasRef.current, 1, 'separation');
      }

      // 2. Draw Background Removed Canvas (Active in Remover Fundo mode)
      if (bgRemovedCanvasRef.current) {
        renderBackgroundRemoved(originalImage, settings, bgRemovedCanvasRef.current, 1, 'color');
      }

      // 3. Draw Mask Canvas
      if (maskCanvasRef.current) {
        if (activeTab === 'dtf-studio') {
          // DTF White Underbase Mask (White dots on solid black film)
          renderHalftone(originalImage, settings, maskCanvasRef.current, 1, 'mask');
        } else {
          // Alpha Matte Mask (White artwork silhouette on solid black)
          renderBackgroundRemoved(originalImage, settings, maskCanvasRef.current, 1, 'mask');
        }
      }
    } catch (err) {
      console.error('Canvas workspace render error:', err);
    }
  }, [originalImage, settings, activeTab, imgW, imgH]);

  // Smooth & precise dragging for split view slider with direct artwork box tracking (Mouse & Touch)
  useEffect(() => {
    if (!isDraggingSplit) return;

    const handlePointerMove = (clientX: number) => {
      if (artworkBoxRef.current) {
        const rect = artworkBoxRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          const relativeX = clientX - rect.left;
          const percent = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
          setSplitPos(percent);
        }
      }
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX);
      }
    };

    const handleWindowEnd = () => {
      setIsDraggingSplit(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowEnd);
    window.addEventListener('touchmove', handleWindowTouchMove);
    window.addEventListener('touchend', handleWindowEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowEnd);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowEnd);
    };
  }, [isDraggingSplit]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isDraggingSplit) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.max(0.05, Math.min(4.0, prev * factor)));
  };

  // Backdrop background
  const getCanvasBackdropStyle = () => {
    if (activeTab === 'dtf-studio' && settings.shirtColorPreview) {
      return { backgroundColor: settings.shirtColor };
    }
    return {};
  };

  // Dynamic View Mode Labels depending on active studio mode
  const viewModeButtons =
    activeTab === 'dtf-studio'
      ? [
          { id: 'separation' as ViewMode, label: 'Separation (Retícula)', icon: Grid },
          { id: 'original' as ViewMode, label: 'Original', icon: Eye },
          { id: 'split' as ViewMode, label: 'Split View', icon: Split },
          { id: 'mask' as ViewMode, label: 'Mask (Base Branca)', icon: Layers },
        ]
      : [
          { id: 'separation' as ViewMode, label: 'Recortada (Sem Fundo)', icon: Scissors },
          { id: 'original' as ViewMode, label: 'Com Fundo Original', icon: Eye },
          { id: 'split' as ViewMode, label: 'Split View', icon: Split },
          { id: 'mask' as ViewMode, label: 'Máscara Alfa (P&B)', icon: Layers },
        ];

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onDropFiles(e.dataTransfer.files);
        }
      }}
      className={`relative flex-1 h-full overflow-hidden select-none cursor-grab active:cursor-grabbing transition-colors duration-200 ${
        activeTab === 'dtf-studio' && settings.shirtColorPreview ? '' : 'bg-checkerboard'
      }`}
      style={getCanvasBackdropStyle()}
    >
      {/* DRAG AND DROP OVERLAY */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-cyan-500/20 backdrop-blur-sm border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center gap-3">
          <Layers size={48} className="text-cyan-300 animate-bounce" />
          <div className="text-lg font-bold text-white shadow-sm">
            Solte sua imagem para carregar no estúdio SCRW Halftone!
          </div>
        </div>
      )}

      {/* TOP VIEW MODE SELECTOR BAR (ORIGINAL / SEPARATION / SPLIT VIEW / MASK) */}
      {originalImage && (
        <div className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
          {/* View mode toggle buttons with instant reactive state */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900/90 backdrop-blur-xl border border-neutral-700/80 rounded-xl shadow-xl pointer-events-auto">
            {viewModeButtons.map((mode) => {
              const isSel = viewMode === mode.id;
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => onViewModeChange(mode.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSel
                      ? activeTab === 'bg-remover'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30 font-bold'
                        : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-md shadow-cyan-500/25 font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Icon size={13} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active status & mode indicator */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {activeTab === 'bg-remover' && onApplyBgCutoutToImage && (
              <button
                onClick={onApplyBgCutoutToImage}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Aplica o recorte à imagem e abre a retícula DTF"
              >
                <Check size={14} />
                <span>Fixar e Abrir DTF</span>
                <ArrowRight size={13} />
              </button>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900/90 backdrop-blur-xl border border-neutral-700/80 rounded-xl shadow-xl">
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  activeTab === 'bg-remover' ? 'bg-pink-400' : 'bg-cyan-400'
                }`}
              />
              <span className="text-xs font-mono text-neutral-300">
                {activeTab === 'bg-remover'
                  ? 'Modo: Remoção de Fundo Prioritária'
                  : 'Modo: DTF & Retícula Halftone'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY STATE DROPZONE (IF NO IMAGE LOADED YET) */}
      {!originalImage ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
          <div
            onClick={onOpenFilePicker}
            className="w-full max-w-lg p-10 border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-3xl bg-neutral-900/40 backdrop-blur-md flex flex-col items-center justify-center gap-4 cursor-pointer transition-all hover:bg-cyan-500/5 group shadow-2xl"
          >
            <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-pink-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-lg shadow-cyan-500/10">
              <Upload size={32} />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                Carregar Imagem ou Arte para Impressão
              </h2>
              <p className="text-xs text-neutral-400 max-w-sm">
                Arraste seu arquivo para cá ou clique para selecionar. Se a imagem tiver fundo preto (mesmo já reticulada), o fundo é removido automaticamente sem estragar os pontos!
              </p>
            </div>

            <div className="flex gap-2">
              <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-[10px] text-neutral-400 font-mono">
                PNG
              </span>
              <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-[10px] text-neutral-400 font-mono">
                JPG
              </span>
              <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-[10px] text-neutral-400 font-mono">
                WEBP
              </span>
              <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-[10px] text-neutral-400 font-mono">
                TIFF
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* MAIN VIEWPORT WITH 100% PRESERVED ASPECT RATIO AND NO DEFORMATION */
        <div
          className="w-full h-full flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.04s ease-out',
          }}
        >
          {/* ARTWORK CONTAINER: flex: none, flexShrink: 0 and aspectRatio strictly prevent flexbox from deforming the image */}
          <div
            ref={artworkBoxRef}
            className="relative shadow-2xl rounded-lg overflow-hidden border border-white/10 pointer-events-auto flex-none shrink-0"
            style={{
              width: `${imgW}px`,
              height: `${imgH}px`,
              aspectRatio: `${imgW} / ${imgH}`,
              flex: 'none',
              flexShrink: 0,
              maxWidth: 'none',
              maxHeight: 'none',
            }}
          >
            {/* ========================================================================= */}
            {/* 1. HALFTONE SEPARATION CANVAS (DTF Studio mode)                           */}
            {/* Visible in 'separation' mode (full) AND in 'split' mode (as base layer)   */}
            {/* ========================================================================= */}
            <canvas
              ref={halftoneCanvasRef as any}
              width={imgW}
              height={imgH}
              className={`absolute top-0 left-0 w-full h-full block pointer-events-none ${
                activeTab === 'dtf-studio' && (viewMode === 'separation' || viewMode === 'split')
                  ? 'z-10 opacity-100'
                  : 'z-0 opacity-0 pointer-events-none'
              }`}
              style={{
                width: `${imgW}px`,
                height: `${imgH}px`,
                aspectRatio: `${imgW} / ${imgH}`,
                flex: 'none',
              }}
            />

            {/* ========================================================================= */}
            {/* 2. BACKGROUND REMOVED CANVAS (Remover Fundo mode)                          */}
            {/* Visible in 'separation' mode (full) AND in 'split' mode (as base layer)   */}
            {/* ========================================================================= */}
            <canvas
              ref={bgRemovedCanvasRef as any}
              width={imgW}
              height={imgH}
              className={`absolute top-0 left-0 w-full h-full block pointer-events-none ${
                activeTab === 'bg-remover' && (viewMode === 'separation' || viewMode === 'split')
                  ? 'z-10 opacity-100'
                  : 'z-0 opacity-0 pointer-events-none'
              }`}
              style={{
                width: `${imgW}px`,
                height: `${imgH}px`,
                aspectRatio: `${imgW} / ${imgH}`,
                flex: 'none',
              }}
            />

            {/* ========================================================================= */}
            {/* 3. COM FUNDO ORIGINAL IMAGE (Full in 'original' mode)                     */}
            {/* ========================================================================= */}
            <img
              src={originalImage.src}
              alt="Arte Original com Fundo"
              className={`absolute top-0 left-0 w-full h-full block pointer-events-none object-fill ${
                viewMode === 'original'
                  ? 'z-20 opacity-100'
                  : 'z-0 opacity-0 pointer-events-none'
              }`}
              style={{
                width: `${imgW}px`,
                height: `${imgH}px`,
                aspectRatio: `${imgW} / ${imgH}`,
                flex: 'none',
              }}
            />

            {/* ========================================================================= */}
            {/* 4. MASK CANVAS (Full in 'mask' mode)                                      */}
            {/* ========================================================================= */}
            <canvas
              ref={maskCanvasRef as any}
              width={imgW}
              height={imgH}
              className={`absolute top-0 left-0 w-full h-full block pointer-events-none bg-black ${
                viewMode === 'mask'
                  ? 'z-20 opacity-100'
                  : 'z-0 opacity-0 pointer-events-none'
              }`}
              style={{
                width: `${imgW}px`,
                height: `${imgH}px`,
                aspectRatio: `${imgW} / ${imgH}`,
                flex: 'none',
              }}
            />

            {/* ========================================================================= */}
            {/* 5. SPLIT VIEW OVERLAY (ONLY ACTIVE IN SPLIT VIEW)                         */}
            {/* In Split View:                                                            */}
            {/* Base (z-10): Processed Canvas (already rendered above and visible on right)*/}
            {/* Overlay (z-20): Original Image clipped from 0% to splitPos% on the left   */}
            {/* Draggable divider & handle box to compare before and after seamlessly!     */}
            {/* ========================================================================= */}
            {viewMode === 'split' && (
              <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
                {/* 5A: Top Original Layer (clipped to splitPos% from the left) */}
                <div
                  className="absolute top-0 bottom-0 left-0 overflow-hidden pointer-events-none"
                  style={{ width: `${splitPos}%` }}
                >
                  <img
                    src={originalImage.src}
                    alt="Original com Fundo"
                    className="absolute top-0 left-0 block pointer-events-none object-fill max-w-none"
                    style={{
                      width: `${imgW}px`,
                      height: `${imgH}px`,
                      aspectRatio: `${imgW} / ${imgH}`,
                      flex: 'none',
                    }}
                  />
                </div>

                {/* Left Badge: Original (Com Fundo) */}
                <div className="absolute top-4 left-4 z-30 px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md text-white font-mono text-[11px] font-semibold border border-white/20 shadow-xl pointer-events-none flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/70" />
                  <span>Original (Com Fundo)</span>
                </div>

                {/* Right Badge: Processed (Sem Fundo / Retícula DTX) */}
                <div
                  className={`absolute top-4 right-4 z-30 px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold shadow-xl pointer-events-none flex items-center gap-1.5 ${
                    activeTab === 'bg-remover'
                      ? 'bg-pink-500 text-white shadow-pink-500/40 ring-1 ring-pink-400'
                      : 'bg-cyan-400 text-black shadow-cyan-500/40 ring-1 ring-cyan-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeTab === 'bg-remover' ? 'bg-white' : 'bg-black'
                    }`}
                  />
                  <span>
                    {activeTab === 'bg-remover' ? 'Recortada (Sem Fundo)' : 'Retícula SCRW'}
                  </span>
                </div>

                {/* Vertical Divider Guide Line */}
                <div
                  className={`absolute top-0 bottom-0 pointer-events-none z-30 ${
                    activeTab === 'bg-remover'
                      ? 'w-[2px] bg-gradient-to-b from-pink-400 via-pink-500 to-rose-500 shadow-[0_0_12px_rgba(236,72,153,0.9)]'
                      : 'w-[2px] bg-gradient-to-b from-cyan-300 via-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.9)]'
                  }`}
                  style={{ left: `${splitPos}%`, transform: 'translateX(-50%)' }}
                />

                {/* Full-height draggable zone + ergonomic center box handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setIsDraggingSplit(true);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setIsDraggingSplit(true);
                  }}
                  className="absolute top-0 bottom-0 z-40 w-16 -ml-8 cursor-ew-resize pointer-events-auto flex items-center justify-center group"
                  style={{ left: `${splitPos}%` }}
                  title="Arraste para a esquerda ou direita para comparar"
                >
                  {/* The Box Handle ("uma box boa para arrastar para direita esquerda") */}
                  <div
                    className={`px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 border cursor-ew-resize select-none backdrop-blur-xl transition-all group-hover:scale-110 group-active:scale-95 ${
                      activeTab === 'bg-remover'
                        ? 'bg-neutral-950/95 border-pink-500 text-pink-300 shadow-pink-500/50 ring-2 ring-pink-500/30'
                        : 'bg-neutral-950/95 border-cyan-400 text-cyan-300 shadow-cyan-500/50 ring-2 ring-cyan-400/30'
                    }`}
                  >
                    <span className="text-xs font-bold">◀</span>
                    <div className="flex flex-col items-center leading-none px-1">
                      <MoveHorizontal size={14} className="mb-0.5 text-white" />
                      <span className="font-mono text-[10px] font-black tracking-tight text-white">
                        {Math.round(splitPos)}%
                      </span>
                    </div>
                    <span className="text-xs font-bold">▶</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM VIEWPORT BAR (DIMENSIONS, ZOOM SLIDER, 100%, FIT TO VIEW) */}
      {originalImage && (
        <div className="absolute bottom-3 right-4 z-30 flex items-center gap-3 pointer-events-none">
          <div className="flex items-center gap-2 p-1.5 px-3 bg-neutral-900/90 backdrop-blur-xl border border-neutral-700/80 rounded-xl shadow-xl text-neutral-300 font-mono text-xs pointer-events-auto">
            {/* Dimensions */}
            <span className="text-neutral-400">
              {imgW} × {imgH} px
            </span>

            {activeTab === 'dtf-studio' && (
              <>
                <span className="text-neutral-600">|</span>
                <span className="text-cyan-400 font-medium">
                  {dotCount.toLocaleString()} pontos
                </span>
              </>
            )}

            <span className="text-neutral-600">|</span>

            {/* Zoom percentage */}
            <span className="min-w-10 text-center font-semibold text-white">
              {Math.round(zoom * 100)}%
            </span>

            {/* Zoom Out (-) */}
            <button
              onClick={() => setZoom((z) => Math.max(0.05, z - 0.15))}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>

            {/* Zoom Slider */}
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className={`w-20 cursor-pointer ${
                activeTab === 'bg-remover' ? 'accent-pink-500' : 'accent-cyan-500'
              }`}
            />

            {/* Zoom In (+) */}
            <button
              onClick={() => setZoom((z) => Math.min(3.5, z + 0.15))}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>

            <span className="text-neutral-600">|</span>

            {/* 100% Zoom */}
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="px-2 py-0.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] cursor-pointer"
            >
              100%
            </button>

            {/* Fit to View */}
            <button
              onClick={fitToView}
              className="px-2 py-0.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
              title="Ajustar à tela"
            >
              <Maximize2 size={12} />
              <span>Fit</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
