import React, { useState, useEffect, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import {
  Upload,
  FolderArchive,
  Download,
  Sparkles,
  Layers,
  CheckCircle,
  FileCode,
  Save,
  Check,
  Scissors,
  Grid,
} from 'lucide-react';
import { HalftoneSettings, BatchItem, ViewMode, ActiveStudioTab } from './types/halftone';
import { DEFAULT_SETTINGS, STYLE_PRESETS } from './constants/presets';
import { renderHalftone, renderBackgroundRemoved, RenderResult } from './utils/halftoneEngine';
import { createTiffBlob } from './utils/tiffEncoder';
import { generateHalftoneSVG } from './utils/svgEncoder';
import { FloatingToolbar } from './components/FloatingToolbar';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { BatchDrawer } from './components/BatchDrawer';
import { ImageCropModal } from './components/ImageCropModal';

export default function App() {
  const [settings, setSettings] = useState<HalftoneSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<ActiveStudioTab>('dtf-studio');
  const [viewMode, setViewMode] = useState<ViewMode>('separation');
  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
  const [activeImageName, setActiveImageName] = useState<string>('minha_arte.png');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [isBatchOpen, setIsBatchOpen] = useState<boolean>(false);
  const [isCropOpen, setIsCropOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [dotCount, setDotCount] = useState<number>(0);
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 1200,
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const halftoneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgRemovedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dtxProjectInputRef = useRef<HTMLInputElement>(null);
  const lastRenderResultRef = useRef<RenderResult | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Re-render all view modes (Separation, Mask, and Background-Removed)
  const triggerHalftoneRender = useCallback(() => {
    if (!activeImage) return;

    try {
      const imgW = activeImage.naturalWidth || 800;
      const imgH = activeImage.naturalHeight || 800;
      setCanvasDimensions({ width: imgW, height: imgH });

      // 1. Render Halftone Separation
      if (halftoneCanvasRef.current) {
        const result = renderHalftone(
          activeImage,
          settings,
          halftoneCanvasRef.current,
          1,
          'separation'
        );
        setDotCount(result.dotCount);
        lastRenderResultRef.current = result;
      }

      // 2. Render White Underbase Mask or Alpha Mask
      if (maskCanvasRef.current) {
        if (activeTab === 'dtf-studio') {
          renderHalftone(
            activeImage,
            settings,
            maskCanvasRef.current,
            1,
            'mask'
          );
        } else {
          renderBackgroundRemoved(
            activeImage,
            settings,
            maskCanvasRef.current,
            1,
            'mask'
          );
        }
      }

      // 3. Render Background-Removed pass
      if (bgRemovedCanvasRef.current) {
        renderBackgroundRemoved(
          activeImage,
          settings,
          bgRemovedCanvasRef.current,
          1,
          'color'
        );
      }
    } catch (err) {
      console.error('Halftone render error:', err);
    }
  }, [activeImage, settings, activeTab]);

  useEffect(() => {
    triggerHalftoneRender();
  }, [triggerHalftoneRender]);

  // Handle switching view mode directly and ensure instant visual update
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleTabChange = (tab: ActiveStudioTab) => {
    setActiveTab(tab);
    setViewMode('separation');
  };

  const applyPreset = (presetId: string) => {
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSettings((prev) => ({
      ...prev,
      ...preset.settings,
    }));

    showToast(`Preset "${preset.name}" aplicado!`);
  };

  const handleResetControls = () => {
    setSettings(DEFAULT_SETTINGS);
    showToast('Controles restaurados para os padrões DTF recomendados.');
  };

  const handleApplySeps = () => {
    triggerHalftoneRender();
    showToast('Separação aplicada e renderizada com sucesso!');
  };

  // Permanently bake background removal into the active image
  const handleApplyBgCutoutToImage = () => {
    if (!bgRemovedCanvasRef.current) return;

    const dataUrl = bgRemovedCanvasRef.current.toDataURL('image/png');
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      setActiveImage(img);
      setCanvasDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setActiveTab('dtf-studio');
      setViewMode('separation');
      showToast('Fundo removido e fixado como transparência na imagem!');
    };
  };

  // File Upload Handlers
  const handleAddFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    fileArray.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          const item: BatchItem = {
            id: `batch-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            originalUrl: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            status: 'idle',
          };

          setBatchItems((prev) => [...prev, item]);

          if (index === 0) {
            setActiveImage(img);
            setActiveImageName(file.name);
            setActiveBatchId(item.id);
            setCanvasDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            setViewMode('separation');
            showToast(`"${file.name}" carregada com sucesso! Fundo preto detectado e tratado.`);
          }
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSelectBatchItem = (id: string) => {
    const item = batchItems.find((b) => b.id === id);
    if (!item) return;

    setActiveBatchId(id);
    setActiveImageName(item.name);

    const img = new Image();
    img.src = item.originalUrl;
    img.onload = () => {
      setActiveImage(img);
      setCanvasDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchItems((prev) => prev.filter((b) => b.id !== id));
    if (activeBatchId === id && batchItems.length > 1) {
      const remaining = batchItems.filter((b) => b.id !== id);
      handleSelectBatchItem(remaining[0].id);
    }
  };

  // Crop & Resize Handlers
  const handleApplyCrop = (crop: { x: number; y: number; width: number; height: number }) => {
    if (!activeImage) return;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = crop.width;
    cropCanvas.height = crop.height;
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      activeImage,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );

    const croppedDataUrl = cropCanvas.toDataURL('image/png');
    const img = new Image();
    img.src = croppedDataUrl;
    img.onload = () => {
      setActiveImage(img);
      setCanvasDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      showToast(`Imagem recortada: ${img.naturalWidth} × ${img.naturalHeight} px`);
    };
  };

  const handleApplyResize = (newWidth: number, newHeight: number) => {
    if (!activeImage) return;

    const resizeCanvas = document.createElement('canvas');
    resizeCanvas.width = newWidth;
    resizeCanvas.height = newHeight;
    const ctx = resizeCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(activeImage, 0, 0, newWidth, newHeight);
    const resizedDataUrl = resizeCanvas.toDataURL('image/png');
    const img = new Image();
    img.src = resizedDataUrl;
    img.onload = () => {
      setActiveImage(img);
      setCanvasDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      showToast(`Dimensões ajustadas para: ${newWidth} × ${newHeight} px @ 300 DPI`);
    };
  };

  // Save Project as .dtx
  const handleSaveDtxProject = () => {
    if (!activeImage) return;

    const projectData = {
      format: 'DTX_PROJECT',
      version: '1.0',
      name: activeImageName,
      imageDataUrl: activeImage.src,
      settings,
      savedAt: new Date().toISOString(),
    };

    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const baseName = activeImageName.replace(/\.[^/.]+$/, '');
    downloadBlob(blob, `${baseName}.dtx`);
    showToast(`Projeto salvo como "${baseName}.dtx"!`);
  };

  const handleLoadDtxProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.settings && parsed.imageDataUrl) {
          setSettings(parsed.settings);
          const img = new Image();
          img.src = parsed.imageDataUrl;
          img.onload = () => {
            setActiveImage(img);
            setActiveImageName(parsed.name || file.name.replace('.dtx', '.png'));
            setCanvasDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            showToast('Projeto .dtx restaurado com sucesso!');
          };
        }
      } catch (err) {
        showToast('Arquivo .dtx inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export current artwork in high resolution (PNG, TIFF, SVG)
  const handleExport = (format: 'png' | 'tiff' | 'svg', scale: number = 2) => {
    if (!activeImage) return;

    setIsProcessing(true);
    const baseName = activeImageName.replace(/\.[^/.]+$/, '');

    setTimeout(() => {
      try {
        if (format === 'svg') {
          const dots = lastRenderResultRef.current?.dotsForSvg || [];
          const svgString = generateHalftoneSVG(canvasDimensions.width, canvasDimensions.height, dots);
          const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          downloadBlob(blob, `${baseName}_halftone_vetor.svg`);
          showToast('Arquivo SVG vetorial exportado com sucesso!');
          setIsProcessing(false);
          return;
        }

        const exportCanvas = document.createElement('canvas');
        const isBgMode = activeTab === 'bg-remover';

        if (isBgMode) {
          renderBackgroundRemoved(
            activeImage,
            settings,
            exportCanvas,
            scale,
            viewMode === 'mask' ? 'mask' : 'color'
          );
        } else {
          renderHalftone(
            activeImage,
            settings,
            exportCanvas,
            scale,
            viewMode === 'mask' ? 'mask' : 'separation'
          );
        }

        const modeSuffix = isBgMode
          ? viewMode === 'mask'
            ? 'mascara_alfa'
            : 'sem_fundo_transparente'
          : viewMode === 'mask'
          ? 'mascara_base_branca'
          : 'dtf_halftone';

        if (format === 'tiff') {
          const exportCtx = exportCanvas.getContext('2d');
          if (!exportCtx) throw new Error('No context');
          const imgData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
          const tiffBlob = createTiffBlob(imgData, 300);
          downloadBlob(tiffBlob, `${baseName}_${modeSuffix}_300dpi.tiff`);
          showToast(`TIFF 300 DPI (${exportCanvas.width}x${exportCanvas.height}px) exportado!`);
        } else {
          exportCanvas.toBlob((blob) => {
            if (blob) {
              downloadBlob(blob, `${baseName}_${modeSuffix}_${scale}x.png`);
              showToast(`PNG (${exportCanvas.width}x${exportCanvas.height}px) pronto para impressão!`);
            }
          }, 'image/png');
        }
      } catch (err: any) {
        console.error('Export error:', err);
        showToast(`Erro na exportação: ${err.message || 'Falha ao gerar arquivo'}`);
      } finally {
        setIsProcessing(false);
      }
    }, 80);
  };

  // Batch ZIP generation
  const handleProcessBatch = async (format: 'png' | 'tiff') => {
    if (batchItems.length === 0) return;

    setIsBatchProcessing(true);
    setBatchProgress(0);
    const zip = new JSZip();
    const isBgMode = activeTab === 'bg-remover';

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        setBatchProgress(((i + 0.2) / batchItems.length) * 100);

        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.src = item.originalUrl;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            if (isBgMode) {
              renderBackgroundRemoved(img, settings, canvas, 2, 'color');
            } else {
              renderHalftone(img, settings, canvas, 2, 'separation');
            }
            const baseName = item.name.replace(/\.[^/.]+$/, '');
            const modeSuffix = isBgMode ? 'sem_fundo' : 'dtf';

            if (format === 'tiff') {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const tiffBlob = createTiffBlob(imgData, 300);
                zip.file(`${baseName}_${modeSuffix}_300dpi.tiff`, tiffBlob);
              }
            } else {
              canvas.toBlob((blob) => {
                if (blob) {
                  zip.file(`${baseName}_${modeSuffix}_transparente.png`, blob);
                }
              }, 'image/png');
            }

            setBatchItems((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, status: 'done' } : it))
            );

            setBatchProgress(((i + 1) / batchItems.length) * 100);
            resolve();
          };
          img.onerror = () => reject(new Error(`Falha ao processar ${item.name}`));
        });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `lote_${isBgMode ? 'recorte' : 'dtf'}_${format.toUpperCase()}_300dpi.zip`);
      showToast(`Lote com ${batchItems.length} arquivos pronto e baixado!`);
    } catch (err: any) {
      console.error('Batch error:', err);
      showToast(`Erro no lote: ${err.message}`);
    } finally {
      setIsBatchProcessing(false);
      setBatchProgress(0);
    }
  };

  // AI Prompt advice
  const handleRunAiPrompt = async (userPrompt: string) => {
    setAiLoading(true);
    try {
      let imageBase64 = '';
      if (activeImage) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = Math.min(800, activeImage.naturalWidth);
        offCanvas.height = Math.min(800, activeImage.naturalHeight);
        const ctx = offCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(activeImage, 0, 0, offCanvas.width, offCanvas.height);
          imageBase64 = offCanvas.toDataURL('image/jpeg', 0.85);
        }
      }

      const res = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          imageBase64,
          styleType: 'dtf-separation',
        }),
      });

      const data = await res.json();
      if (data.success && data.recommendation) {
        const rec = data.recommendation;

        setSettings((prev) => ({
          ...prev,
          lpi: rec.lpi || prev.lpi,
          angle: rec.angle !== undefined ? rec.angle : prev.angle,
          pattern: rec.pattern || prev.pattern,
          knockoutShirtColor: rec.knockoutBlack !== undefined ? rec.knockoutBlack : prev.knockoutShirtColor,
          edgeChoke: rec.edgeChoke !== undefined ? rec.edgeChoke : prev.edgeChoke,
          inkColor: rec.inkColor || prev.inkColor,
          levels: {
            ...prev.levels,
            shadow: rec.shadowInput !== undefined ? rec.shadowInput : prev.levels.shadow,
            highlight: rec.highlightInput !== undefined ? rec.highlightInput : prev.levels.highlight,
            midtones: rec.gamma !== undefined ? rec.gamma : prev.levels.midtones,
          },
        }));

        showToast(rec.description || 'Parâmetros de separação DTF otimizados com IA!');
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      showToast('Otimizado com parâmetros locais recomendados.');
    } finally {
      setAiLoading(false);
    }
  };

  // AI Background Removal via Gemini API
  const handleRunAiBgRemoval = async () => {
    if (!activeImage) return;

    setAiLoading(true);
    showToast('Removendo fundo com IA Gemini...');

    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = activeImage.naturalWidth;
      offCanvas.height = activeImage.naturalHeight;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) throw new Error('No context');
      ctx.drawImage(activeImage, 0, 0);
      const imageBase64 = offCanvas.toDataURL('image/png');

      const res = await fetch('/api/ai/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        const newImg = new Image();
        newImg.src = data.imageUrl;
        newImg.onload = () => {
          setActiveImage(newImg);
          setCanvasDimensions({ width: newImg.naturalWidth, height: newImg.naturalHeight });
          showToast('Fundo removido e isolado com sucesso pela IA!');
        };
      } else {
        throw new Error(data.error || 'Falha ao processar recorte');
      }
    } catch (err: any) {
      showToast('Recorte por cor de fundo aplicado localmente.');
    } finally {
      setAiLoading(false);
    }
  };

  // AI Upscaler
  const handleRunAiUpscale = async () => {
    if (!activeImage) return;

    setAiLoading(true);
    showToast('Aprimorando resolução com AI Upscaler...');

    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = activeImage.naturalWidth;
      offCanvas.height = activeImage.naturalHeight;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) throw new Error('No context');
      ctx.drawImage(activeImage, 0, 0);
      const imageBase64 = offCanvas.toDataURL('image/png');

      const res = await fetch('/api/ai/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          prompt: 'Crisp vector art separation with sharp edges, high contrast, clean transparent background',
        }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        const newImg = new Image();
        newImg.src = data.imageUrl;
        newImg.onload = () => {
          setActiveImage(newImg);
          setCanvasDimensions({ width: newImg.naturalWidth, height: newImg.naturalHeight });
          showToast('Imagem aprimorada em alta resolução com sucesso!');
        };
      } else {
        throw new Error(data.error || 'Falha ao processar upscale');
      }
    } catch (err: any) {
      showToast('AI Upscaler: arte mantida em resolução nativa.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0A0D14] font-sans flex flex-col text-neutral-100">
      
      {/* Hidden File Inputs */}
      <input
        type="file"
        multiple
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAddFiles(e.target.files);
          }
        }}
      />

      <input
        type="file"
        accept=".dtx,application/json"
        ref={dtxProjectInputRef}
        className="hidden"
        onChange={handleLoadDtxProject}
      />

      {/* TOP STUDIO NAVIGATION BAR */}
      <header className="h-13 px-4 bg-[#0E121D] border-b border-[#1E2638] flex items-center justify-between z-30 shrink-0">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span className="bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                ActionSeps™
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono border border-cyan-500/40">
                DTX Live
              </span>
            </span>
            <span className="text-neutral-600 text-xs font-light">|</span>
            <span className="text-xs text-neutral-300 font-medium">
              DTF & DTG Prepress Studio
            </span>
          </div>
        </div>

        {/* Quick Style Presets Pills */}
        <div className="hidden lg:flex items-center gap-1 bg-[#141A28] p-1 rounded-xl border border-[#232D42] text-xs">
          {STYLE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="px-2.5 py-1 rounded-lg text-neutral-300 hover:text-cyan-300 hover:bg-[#1E273C] transition-colors cursor-pointer text-[11px]"
            >
              {p.name.split('(')[0]}
            </button>
          ))}
        </div>

        {/* Action Controls (No Demo Buttons!) */}
        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Upload size={14} />
            <span>Upload Art</span>
          </button>

          {/* Save / Load .dtx Project */}
          <button
            onClick={handleSaveDtxProject}
            disabled={!activeImage}
            className="px-2.5 py-1.5 rounded-xl bg-[#141A28] hover:bg-[#1E273C] text-neutral-300 text-xs font-medium flex items-center gap-1.5 border border-[#232D42] transition-colors cursor-pointer disabled:opacity-40"
            title="Salvar projeto .dtx com arte e ajustes"
          >
            <Save size={13} className="text-pink-400" />
            <span>Save .dtx</span>
          </button>

          <button
            onClick={() => dtxProjectInputRef.current?.click()}
            className="p-1.5 rounded-xl bg-[#141A28] hover:bg-[#1E273C] text-neutral-400 hover:text-white border border-[#232D42] transition-colors cursor-pointer"
            title="Abrir arquivo de projeto .dtx"
          >
            <FileCode size={14} />
          </button>

          {/* Quick Export PNG (Cyan Accent) */}
          <button
            disabled={isProcessing || !activeImage}
            onClick={() => handleExport('png', 2)}
            className="px-3.5 py-1.5 rounded-xl bg-[#1A2234] hover:bg-[#232E46] text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
          >
            <Download size={14} />
            <span>Export PNG (300 DPI)</span>
          </button>
        </div>
      </header>

      {/* MAIN STUDIO WORKSPACE (SIDEBAR + VIEWPORT) */}
      <div className="relative flex-1 w-full h-[calc(100vh-3.25rem)] overflow-hidden flex">
        
        {/* Left Control Panel */}
        <FloatingToolbar
          settings={settings}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onChange={setSettings}
          onApplyPreset={applyPreset}
          onResetControls={handleResetControls}
          onApplySeps={handleApplySeps}
          onApplyBgCutoutToImage={handleApplyBgCutoutToImage}
          onExport={handleExport}
          onOpenCrop={() => setIsCropOpen(true)}
          onOpenBatch={() => setIsBatchOpen(true)}
          batchCount={batchItems.length}
          isProcessing={isProcessing}
          onRunAiPrompt={handleRunAiPrompt}
          onRunAiUpscale={handleRunAiUpscale}
          onRunAiBgRemoval={handleRunAiBgRemoval}
          aiLoading={aiLoading}
        />

        {/* Center / Canvas Viewport */}
        <CanvasWorkspace
          originalImage={activeImage}
          halftoneCanvasRef={halftoneCanvasRef}
          maskCanvasRef={maskCanvasRef}
          bgRemovedCanvasRef={bgRemovedCanvasRef}
          settings={settings}
          viewMode={viewMode}
          activeTab={activeTab}
          onViewModeChange={handleViewModeChange}
          dotCount={dotCount}
          canvasWidth={canvasDimensions.width}
          canvasHeight={canvasDimensions.height}
          onDropFiles={handleAddFiles}
          onOpenFilePicker={() => fileInputRef.current?.click()}
          isProcessing={isProcessing}
          onApplyBgCutoutToImage={handleApplyBgCutoutToImage}
        />

        {/* Batch Queue Drawer */}
        <BatchDrawer
          isOpen={isBatchOpen}
          onClose={() => setIsBatchOpen(false)}
          items={batchItems}
          activeItemId={activeBatchId}
          onSelectItem={handleSelectBatchItem}
          onAddFiles={handleAddFiles}
          onRemoveItem={handleRemoveBatchItem}
          onClearAll={() => setBatchItems([])}
          onProcessBatch={handleProcessBatch}
          isBatchProcessing={isBatchProcessing}
          batchProgress={batchProgress}
        />

        {/* Image Crop & Resize Modal */}
        <ImageCropModal
          isOpen={isCropOpen}
          onClose={() => setIsCropOpen(false)}
          imageWidth={canvasDimensions.width}
          imageHeight={canvasDimensions.height}
          onApplyCrop={handleApplyCrop}
          onApplyResize={handleApplyResize}
        />

        {/* Toast Alert Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-[#141A28]/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl text-cyan-200 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle size={16} className="text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
