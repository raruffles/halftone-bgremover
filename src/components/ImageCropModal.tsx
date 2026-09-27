import React, { useState } from 'react';
import { Maximize2, Crop, Check, X, Link, Unlink } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageWidth: number;
  imageHeight: number;
  onApplyCrop: (crop: { x: number; y: number; width: number; height: number }) => void;
  onApplyResize: (newWidth: number, newHeight: number) => void;
}

type Unit = 'inches' | 'cm' | 'mm';

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageWidth,
  imageHeight,
  onApplyCrop,
  onApplyResize,
}) => {
  const [unit, setUnit] = useState<Unit>('inches');
  const [aspectLocked, setAspectLocked] = useState<boolean>(true);
  const [isCropping, setIsCropping] = useState<boolean>(false);

  // 300 DPI measurements
  const dpi = 300;
  const inchesW = (imageWidth / dpi);
  const inchesH = (imageHeight / dpi);

  const [inputWidth, setInputWidth] = useState<string>(inchesW.toFixed(2));
  const [inputHeight, setInputHeight] = useState<string>(inchesH.toFixed(2));

  // Crop inset percentages (0 to 100)
  const [cropInset, setCropInset] = useState<{ top: number; right: number; bottom: number; left: number }>({
    top: 5,
    right: 5,
    bottom: 5,
    left: 5,
  });

  if (!isOpen) return null;

  const handleUnitChange = (newUnit: Unit) => {
    setUnit(newUnit);
    let factor = 1;
    if (newUnit === 'cm') factor = 2.54;
    if (newUnit === 'mm') factor = 25.4;

    setInputWidth((inchesW * factor).toFixed(2));
    setInputHeight((inchesH * factor).toFixed(2));
  };

  const handleApplySize = () => {
    let factor = 1;
    if (unit === 'cm') factor = 2.54;
    if (unit === 'mm') factor = 25.4;

    const wInches = parseFloat(inputWidth) / factor;
    const hInches = parseFloat(inputHeight) / factor;

    const targetW = Math.round(wInches * dpi);
    const targetH = Math.round(hInches * dpi);

    if (targetW > 100 && targetH > 100) {
      onApplyResize(targetW, targetH);
      onClose();
    }
  };

  const handleConfirmCrop = () => {
    const x = Math.round((cropInset.left / 100) * imageWidth);
    const y = Math.round((cropInset.top / 100) * imageHeight);
    const w = Math.round(((100 - cropInset.left - cropInset.right) / 100) * imageWidth);
    const h = Math.round(((100 - cropInset.top - cropInset.bottom) / 100) * imageHeight);

    if (w > 50 && h > 50) {
      onApplyCrop({ x, y, width: w, height: h });
      setIsCropping(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl w-full max-w-md p-5 text-neutral-200 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Maximize2 size={18} className="text-sky-400" />
            <h3 className="font-semibold text-sm text-neutral-100">Image Size & Crop Control</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pixel Dimensions */}
        <div className="flex justify-between items-center text-xs bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800 font-mono">
          <span className="text-neutral-400">Pixel Dimensions</span>
          <span className="text-sky-400 font-semibold">{imageWidth} × {imageHeight} px</span>
        </div>

        {/* Image Size @ 300 DPI */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-neutral-300 block">
            Image Size @ 300 DPI
          </span>

          <div className="grid grid-cols-5 gap-2 items-center">
            <div className="col-span-2">
              <label className="text-[10px] text-neutral-400 block mb-1">Width</label>
              <input
                type="number"
                step="0.1"
                value={inputWidth}
                onChange={(e) => {
                  setInputWidth(e.target.value);
                  if (aspectLocked) {
                    const ratio = imageHeight / imageWidth;
                    setInputHeight((parseFloat(e.target.value || '0') * ratio).toFixed(2));
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-100 font-mono focus:border-sky-400 outline-none"
              />
            </div>

            <div className="col-span-1 flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setAspectLocked(!aspectLocked)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  aspectLocked
                    ? 'border-sky-500/50 bg-sky-500/20 text-sky-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-500'
                }`}
                title="Lock / Unlock Aspect Ratio"
              >
                {aspectLocked ? <Link size={14} /> : <Unlink size={14} />}
              </button>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-neutral-400 block mb-1">Height</label>
              <input
                type="number"
                step="0.1"
                value={inputHeight}
                onChange={(e) => {
                  setInputHeight(e.target.value);
                  if (aspectLocked) {
                    const ratio = imageWidth / imageHeight;
                    setInputWidth((parseFloat(e.target.value || '0') * ratio).toFixed(2));
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-100 font-mono focus:border-sky-400 outline-none"
              />
            </div>
          </div>

          {/* Units Selector */}
          <div>
            <label className="text-[10px] text-neutral-400 block mb-1">Units</label>
            <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              {(['inches', 'cm', 'mm'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => handleUnitChange(u)}
                  className={`py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                    unit === u
                      ? 'bg-neutral-800 text-sky-400 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleApplySize}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors"
          >
            Apply Size
          </button>
        </div>

        {/* Crop Controls */}
        <div className="pt-3 border-t border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Crop size={14} className="text-amber-400" />
              Recortar Imagem (Crop Margins)
            </span>
            <button
              onClick={() => setIsCropping(!isCropping)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isCropping
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-300'
              }`}
            >
              {isCropping ? 'Ativo' : 'Ajustar'}
            </button>
          </div>

          {isCropping && (
            <div className="space-y-2 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-neutral-400">Cortar Topo: {cropInset.top}%</span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={cropInset.top}
                    onChange={(e) => setCropInset((prev) => ({ ...prev, top: parseInt(e.target.value) }))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400">Cortar Base: {cropInset.bottom}%</span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={cropInset.bottom}
                    onChange={(e) => setCropInset((prev) => ({ ...prev, bottom: parseInt(e.target.value) }))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400">Cortar Esquerda: {cropInset.left}%</span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={cropInset.left}
                    onChange={(e) => setCropInset((prev) => ({ ...prev, left: parseInt(e.target.value) }))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400">Cortar Direita: {cropInset.right}%</span>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={cropInset.right}
                    onChange={(e) => setCropInset((prev) => ({ ...prev, right: parseInt(e.target.value) }))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsCropping(false)}
                  className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCrop}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
                >
                  Confirm Crop
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
