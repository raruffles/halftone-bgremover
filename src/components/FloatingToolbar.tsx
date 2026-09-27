import React, { useState } from 'react';
import {
  Sliders,
  Grid,
  Shirt,
  Sparkles,
  Download,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Maximize2,
  FolderArchive,
  Layers,
  Scissors,
  Wand2,
  RefreshCw,
  Palette,
  ArrowRight,
  Sun,
  Contrast,
} from 'lucide-react';
import { HalftoneSettings, DotPattern, ActiveStudioTab } from '../types/halftone';
import { COLOR_PRESETS } from '../constants/presets';

interface FloatingToolbarProps {
  settings: HalftoneSettings;
  activeTab: ActiveStudioTab;
  onTabChange: (tab: ActiveStudioTab) => void;
  onChange: (newSettings: HalftoneSettings) => void;
  onApplyPreset: (presetId: string) => void;
  onResetControls: () => void;
  onApplySeps: () => void;
  onApplyBgCutoutToImage: () => void;
  onExport: (format: 'png' | 'tiff' | 'svg', scale: number) => void;
  onOpenCrop: () => void;
  onOpenBatch: () => void;
  batchCount: number;
  isProcessing: boolean;
  onRunAiPrompt: (prompt: string) => Promise<void>;
  onRunAiUpscale: () => Promise<void>;
  onRunAiBgRemoval: () => Promise<void>;
  aiLoading: boolean;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  settings,
  activeTab,
  onTabChange,
  onChange,
  onApplyPreset,
  onResetControls,
  onApplySeps,
  onApplyBgCutoutToImage,
  onExport,
  onOpenCrop,
  onOpenBatch,
  batchCount,
  isProcessing,
  onRunAiPrompt,
  onRunAiUpscale,
  onRunAiBgRemoval,
  aiLoading,
}) => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    colors: true,
    halftone: true,
    shirtColor: false,
    levels: false,
    whiteBase: false,
    ai: false,
  });

  const [aiPrompt, setAiPrompt] = useState<string>('');

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateSetting = <K extends keyof HalftoneSettings>(key: K, value: HalftoneSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const updateBgRemoval = <K extends keyof HalftoneSettings['bgRemoval']>(
    key: K,
    value: HalftoneSettings['bgRemoval'][K]
  ) => {
    onChange({
      ...settings,
      bgRemoval: {
        ...settings.bgRemoval,
        [key]: value,
      },
    });
  };

  const updateLevels = <K extends keyof HalftoneSettings['levels']>(
    key: K,
    value: HalftoneSettings['levels'][K]
  ) => {
    onChange({
      ...settings,
      levels: {
        ...settings.levels,
        [key]: value,
      },
    });
  };

  const updateColorAdjust = <K extends keyof HalftoneSettings['colorAdjust']>(
    key: K,
    value: HalftoneSettings['colorAdjust'][K]
  ) => {
    onChange({
      ...settings,
      colorAdjust: {
        ...settings.colorAdjust,
        [key]: value,
      },
    });
  };

  const updateWhiteBase = <K extends keyof HalftoneSettings['whiteBase']>(
    key: K,
    value: HalftoneSettings['whiteBase'][K]
  ) => {
    onChange({
      ...settings,
      whiteBase: {
        ...settings.whiteBase,
        [key]: value,
      },
    });
  };

  return (
    <aside className="w-88 bg-[#0D111A]/95 backdrop-blur-xl border-r border-[#1E2638] flex flex-col h-full text-neutral-200 select-none z-20 shrink-0">
      
      {/* TOP TAB SWITCHER: DTF STUDIO VS REMOVER FUNDO */}
      <div className="p-3 bg-[#080B12] border-b border-[#1E2638]">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#121724] rounded-xl border border-[#20293D]">
          {/* TAB 1: DTF & HALFTONE */}
          <button
            onClick={() => onTabChange('dtf-studio')}
            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'dtf-studio'
                ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Grid size={14} />
            <span>DTF & Halftone</span>
          </button>

          {/* TAB 2: REMOVER FUNDO */}
          <button
            onClick={() => onTabChange('bg-remover')}
            className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'bg-remover'
                ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Scissors size={14} />
            <span>Remover Fundo</span>
          </button>
        </div>
      </div>

      {/* ACCORDION PANELS */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar text-xs">
        
        {/* ========================================================================= */}
        {/* MODO 1: REMOÇÃO DE FUNDO PRIORITÁRIA (SEM FORÇAR HALFTONE) */}
        {/* ========================================================================= */}
        {activeTab === 'bg-remover' && (
          <div className="space-y-3">
            {/* Background Removal Controls Card */}
            <div className="bg-[#121724]/90 border border-pink-500/40 rounded-2xl p-3.5 space-y-3.5 shadow-xl shadow-pink-500/5">
              
              <div className="flex items-center justify-between border-b border-[#20293D] pb-2">
                <div className="flex items-center gap-2 text-pink-400 font-bold text-xs">
                  <Scissors size={15} />
                  <span>Isolamento & Remoção de Fundo</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 font-mono text-[10px] border border-pink-500/30 font-semibold">
                  Knockout Limpo
                </span>
              </div>

              {/* Auto Detect Black Background (Handles black-bg halftones seamlessly!) */}
              <div className="p-3 bg-[#0A0D15] rounded-xl border border-pink-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block text-xs flex items-center gap-1.5">
                      <span>Auto-Remover Fundo Preto</span>
                      <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 text-[9px] font-mono">
                        Essencial
                      </span>
                    </span>
                    <span className="text-[10px] text-pink-300/80 leading-tight block mt-0.5">
                      Ideal para imagens com retícula ou arte já existente sobre fundo preto não transparente.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.bgRemoval.autoDetectBlack}
                    onChange={(e) => updateBgRemoval('autoDetectBlack', e.target.checked)}
                    className="w-4 h-4 accent-pink-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Knockout Color Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-neutral-300 font-medium">
                  <span>Cor do Fundo a Remover:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.bgRemoval.targetColor}
                      onChange={(e) => updateBgRemoval('targetColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={settings.bgRemoval.targetColor}
                      onChange={(e) => updateBgRemoval('targetColor', e.target.value)}
                      className="w-20 px-2 py-0.5 text-xs font-mono bg-[#0A0D15] border border-neutral-700 rounded-lg text-center"
                    />
                  </div>
                </div>

                <div className="flex gap-1.5 pt-1">
                  {[
                    { label: 'Preto (#000000)', hex: '#000000' },
                    { label: 'Branco (#FFFFFF)', hex: '#FFFFFF' },
                    { label: 'Cinza (#1A1A1A)', hex: '#1A1A1A' },
                  ].map((preset) => (
                    <button
                      key={preset.hex}
                      onClick={() => updateBgRemoval('targetColor', preset.hex)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        settings.bgRemoval.targetColor.toLowerCase() === preset.hex.toLowerCase()
                          ? 'border-pink-500 bg-pink-500/20 text-pink-300 font-bold shadow-sm'
                          : 'border-neutral-800 bg-[#0A0D15] text-neutral-400 hover:text-white'
                      }`}
                    >
                      {preset.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tolerance / Range Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] text-neutral-300">
                  <span>Tolerância de Cor (Range)</span>
                  <span className="font-mono text-pink-400 font-semibold">
                    {settings.bgRemoval.tolerance}%
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="65"
                  value={settings.bgRemoval.tolerance}
                  onChange={(e) => updateBgRemoval('tolerance', parseFloat(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-neutral-500">
                  <span>Apenas cor exata</span>
                  <span>Elimina tons escuros próximos</span>
                </div>
              </div>

              {/* Edge Choke (Crucial for eliminating white haze / fringe) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] text-neutral-300">
                  <span className="flex items-center gap-1">
                    <span>Edge Choke (Estrangulamento)</span>
                    <span className="text-[10px] text-cyan-400">Anti-Halo</span>
                  </span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    {settings.bgRemoval.edgeChoke} px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={settings.bgRemoval.edgeChoke}
                  onChange={(e) => updateBgRemoval('edgeChoke', parseInt(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <span className="text-[9px] text-neutral-400 leading-tight block">
                  Encolhe a borda do corte em pixels para exterminar a névoa branca residual.
                </span>
              </div>

              {/* Feather / Edge Softness */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] text-neutral-300">
                  <span>Suavização de Borda (Feather)</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {settings.bgRemoval.feather} px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  value={settings.bgRemoval.feather}
                  onChange={(e) => updateBgRemoval('feather', parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Stray Dot Despeckle Filter */}
              <div className="flex items-center justify-between p-2.5 bg-[#0A0D15] rounded-xl border border-neutral-800">
                <div>
                  <span className="text-neutral-200 font-medium block text-xs">
                    Limpar Ruído / Pontos Soltos
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Remove pixels isolados do fundo
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.bgRemoval.despeckle}
                  onChange={(e) => updateBgRemoval('despeckle', e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* AI Gemini Smart Cutout */}
              <button
                disabled={aiLoading}
                onClick={onRunAiBgRemoval}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Recortando com IA...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    <span>Remover Fundo Complexo com IA Gemini</span>
                  </>
                )}
              </button>

              {/* Apply Background Cutout permanently to art & switch to DTF */}
              <button
                onClick={onApplyBgCutoutToImage}
                className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Check size={16} />
                <span>Fixar Transparência e Abrir DTF Halftone</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODO 2: DTF & HALFTONE STUDIO (PREPARAÇÃO DE IMPRESSÃO & RETÍCULA) */}
        {/* ========================================================================= */}
        {activeTab === 'dtf-studio' && (
          <>
            {/* SECTION 1: CORES DE IMPRESSÃO (PADRÃO: CORES REAIS DA ARTE!) */}
            <div className="bg-[#121724]/90 border border-cyan-500/40 rounded-2xl overflow-hidden shadow-xl shadow-cyan-500/5">
              <button
                onClick={() => toggleSection('colors')}
                className="w-full px-3 py-2.5 flex items-center justify-between font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Palette size={15} className="text-cyan-400" />
                  <span>Cores de Impressão da Retícula</span>
                </div>
                {openSections.colors ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {openSections.colors && (
                <div className="p-3 pt-0 space-y-3 border-t border-[#20293D] mt-1">
                  
                  {/* DEFAULT BUTTON: CORES ORIGINAIS DA ARTE! */}
                  <button
                    onClick={() => updateSetting('inkMode', 'original-colors')}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      settings.inkMode === 'original-colors'
                        ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                        : 'border-neutral-800 bg-[#0A0D15] text-neutral-300 hover:border-neutral-700 hover:bg-[#141B2B]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-pink-500 via-cyan-400 to-amber-300 flex items-center justify-center shadow-inner">
                        {settings.inkMode === 'original-colors' && (
                          <Check size={14} className="text-black font-black" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-xs">Cores Originais da Arte</div>
                        <div className="text-[10px] text-cyan-300/80 font-normal">
                          Mantém 100% as cores e gradientes reais
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-black text-[9px] font-black uppercase tracking-wider">
                      Padrão
                    </span>
                  </button>

                  {/* PRESET SPOT COLORS (OURO, BRANCO, PRETO, ROSA, AZUL, ETC.) */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-neutral-300 block">
                      Ou Escolha uma Cor de Tinta Spot:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {COLOR_PRESETS.filter((p) => p.id !== 'original-colors').map((c) => {
                        const isSel =
                          settings.inkMode === 'spot' &&
                          settings.inkColor.toLowerCase() === c.hex.toLowerCase();
                        return (
                          <button
                            key={c.id}
                            onClick={() => {
                              onChange({
                                ...settings,
                                inkMode: 'spot',
                                inkColor: c.hex,
                              });
                            }}
                            className={`p-2 rounded-xl border flex items-center gap-2 transition-all text-left cursor-pointer ${
                              isSel
                                ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold shadow-md shadow-cyan-500/10'
                                : 'border-neutral-800 bg-[#0A0D15] hover:bg-[#161E30] text-neutral-300'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-md border border-white/20 shrink-0 flex items-center justify-center shadow-inner"
                              style={{ backgroundColor: c.hex }}
                            >
                              {isSel && (
                                <Check
                                  size={10}
                                  className={c.hex === '#FFFFFF' ? 'text-black' : 'text-white'}
                                />
                              )}
                            </span>
                            <span className="text-[11px] truncate font-medium">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CUSTOM COLOR PICKER */}
                  <div className="pt-2 border-t border-[#20293D] flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400">Mais Cores (Custom):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={settings.inkColor}
                        onChange={(e) => {
                          onChange({
                            ...settings,
                            inkMode: 'spot',
                            inkColor: e.target.value,
                          });
                        }}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={settings.inkColor}
                        onChange={(e) => {
                          onChange({
                            ...settings,
                            inkMode: 'spot',
                            inkColor: e.target.value,
                          });
                        }}
                        className="w-20 px-1.5 py-0.5 text-[11px] font-mono bg-[#0A0D15] border border-neutral-700 rounded text-center"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: HALFTONE SCREEN */}
            <div className="bg-[#121724]/90 border border-[#20293D] rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSection('halftone')}
                className="w-full px-3 py-2.5 flex items-center justify-between font-semibold text-neutral-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Grid size={15} className="text-cyan-400" />
                  <span>Configurações da Retícula</span>
                </div>
                {openSections.halftone ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {openSections.halftone && (
                <div className="p-3 pt-0 space-y-3 border-t border-[#20293D] mt-1">
                  {/* Enable Halftone Toggle */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-neutral-200 font-medium block">Ativar Halftone</span>
                      <span className="text-[10px] text-neutral-400">
                        Cria pontos de retícula com fundo transparente
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSetting('enableHalftone', !settings.enableHalftone)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        settings.enableHalftone ? 'bg-cyan-500' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          settings.enableHalftone ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dot Size (LPI) */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] text-neutral-300">
                      <span>Tamanho do Ponto (LPI)</span>
                      <span className="font-mono text-cyan-400 font-semibold">{settings.lpi} LPI</span>
                    </div>
                    <select
                      value={settings.lpi}
                      onChange={(e) => updateSetting('lpi', parseFloat(e.target.value))}
                      className="w-full bg-[#0A0D15] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 outline-none focus:border-cyan-400"
                    >
                      <option value={15}>15 LPI - Pontos Grandes (Estilo Pôster / Retrô)</option>
                      <option value={20}>20 LPI - Pontos Marcantes</option>
                      <option value={25}>25 LPI - Bold Serigráfico</option>
                      <option value={30}>30 LPI - Padrão Recomendado (DTF & DTG)</option>
                      <option value={35}>35 LPI - Médio Fino</option>
                      <option value={40}>40 LPI - Fino</option>
                      <option value={45}>45 LPI - Fine Art</option>
                      <option value={50}>50 LPI - Micro Pontos</option>
                      <option value={55}>55 LPI - Ultra Fino</option>
                    </select>
                  </div>

                  {/* Angle */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] text-neutral-300">
                      <span>Ângulo da Retícula</span>
                      <span className="font-mono text-cyan-400 font-semibold">{settings.angle}°</span>
                    </div>
                    <select
                      value={settings.angle}
                      onChange={(e) => updateSetting('angle', parseFloat(e.target.value))}
                      className="w-full bg-[#0A0D15] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 outline-none focus:border-cyan-400"
                    >
                      <option value={22.5}>22.5° (Padrão Otimizado DTF)</option>
                      <option value={45}>45.0° (Padrão Serigráfico Canal K)</option>
                      <option value={60}>60.0°</option>
                      <option value={0}>0.0° (Grid Reto)</option>
                    </select>
                  </div>

                  {/* Halftone Shape */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-neutral-300 block">Formato dos Pontos</span>
                    <select
                      value={settings.pattern}
                      onChange={(e) => updateSetting('pattern', e.target.value as DotPattern)}
                      className="w-full bg-[#0A0D15] border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-100 outline-none focus:border-cyan-400"
                    >
                      <option value="circle">Círculo Clássico (Circle)</option>
                      <option value="ellipse">Elíptico Suave (Ellipse)</option>
                      <option value="diamond">Losango Serigráfico (Diamond)</option>
                      <option value="square">Quadrados Modernos (Square)</option>
                      <option value="line">Linhas Paralelas (Line / Gravura)</option>
                    </select>
                  </div>

                  {/* Dot Scale */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] text-neutral-300">
                      <span>Escala / Cobertura do Ponto</span>
                      <span className="font-mono text-cyan-400 font-semibold">
                        {Math.round(settings.dotScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.4"
                      step="0.05"
                      value={settings.dotScale}
                      onChange={(e) => updateSetting('dotScale', parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: SHIRT COLOR & KNOCKOUT */}
            <div className="bg-[#121724]/90 border border-[#20293D] rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSection('shirtColor')}
                className="w-full px-3 py-2.5 flex items-center justify-between font-semibold text-neutral-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Shirt size={15} className="text-amber-400" />
                  <span>Simulação da Camisa & Knockout</span>
                </div>
                {openSections.shirtColor ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {openSections.shirtColor && (
                <div className="p-3 pt-0 space-y-3 border-t border-[#20293D] mt-1">
                  {/* Shirt Color Picker */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-neutral-300 font-medium">Cor da Camisa</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.shirtColor}
                        onChange={(e) => updateSetting('shirtColor', e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={settings.shirtColor}
                        onChange={(e) => updateSetting('shirtColor', e.target.value)}
                        className="w-20 px-2 py-0.5 text-xs font-mono bg-[#0A0D15] border border-neutral-700 rounded-lg text-center"
                      />
                    </div>
                  </div>

                  {/* Quick garment swatches */}
                  <div className="flex gap-1.5">
                    {[
                      { name: 'Preta', hex: '#050505' },
                      { name: 'Branca', hex: '#FFFFFF' },
                      { name: 'Cinza', hex: '#374151' },
                      { name: 'Marinho', hex: '#0F172A' },
                      { name: 'Bordô', hex: '#581C25' },
                    ].map((garment) => (
                      <button
                        key={garment.hex}
                        onClick={() => updateSetting('shirtColor', garment.hex)}
                        className={`text-[10px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          settings.shirtColor.toLowerCase() === garment.hex.toLowerCase()
                            ? 'border-amber-400 bg-amber-400/20 text-amber-300 font-bold'
                            : 'border-neutral-800 bg-[#0A0D15] text-neutral-400 hover:text-white'
                        }`}
                      >
                        {garment.name}
                      </button>
                    ))}
                  </div>

                  {/* Shirt Color Preview toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-neutral-200 font-medium block">Preview da Camisa</span>
                      <span className="text-[10px] text-neutral-400">
                        Mostra tecido atrás da estampa
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateSetting('shirtColorPreview', !settings.shirtColorPreview)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        settings.shirtColorPreview
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {settings.shirtColorPreview ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Knockout Black Box Background toggle */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#20293D]">
                    <div>
                      <span className="text-neutral-200 font-medium block">Eliminar Caixa Preta</span>
                      <span className="text-[10px] text-cyan-400">
                        Mescla a arte suavemente na camisa
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSetting('knockoutShirtColor', !settings.knockoutShirtColor)
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        settings.knockoutShirtColor
                          ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/50'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {settings.knockoutShirtColor ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Knockout Threshold */}
                  {settings.knockoutShirtColor && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px] text-neutral-300">
                        <span>Tolerância do Knockout</span>
                        <span className="font-mono text-cyan-400 font-semibold">
                          {settings.knockoutThreshold}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={settings.knockoutThreshold}
                        onChange={(e) =>
                          updateSetting('knockoutThreshold', parseFloat(e.target.value))
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 4: LEVELS & CONTRAST */}
            <div className="bg-[#121724]/90 border border-[#20293D] rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSection('levels')}
                className="w-full px-3 py-2.5 flex items-center justify-between font-semibold text-neutral-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sliders size={15} className="text-emerald-400" />
                  <span>Níveis & Ajustes de Imagem</span>
                </div>
                {openSections.levels ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {openSections.levels && (
                <div className="p-3 pt-0 space-y-3 border-t border-[#20293D] mt-1">
                  {/* Shadows */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between items-center text-[11px] text-neutral-300">
                      <span>Shadows (Black Point)</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {settings.levels.shadow}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      value={settings.levels.shadow}
                      onChange={(e) => updateLevels('shadow', parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Midtones Gamma */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] text-neutral-300">
                      <span>Midtones (Gamma)</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {settings.levels.midtones.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={settings.levels.midtones}
                      onChange={(e) => updateLevels('midtones', parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Highlights */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] text-neutral-300">
                      <span>Highlights (White Point)</span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {settings.levels.highlight}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="170"
                      max="255"
                      value={settings.levels.highlight}
                      onChange={(e) => updateLevels('highlight', parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1 pt-1 border-t border-[#20293D]">
                    <div className="flex justify-between items-center text-[11px] text-neutral-300">
                      <span>Contraste</span>
                      <span className="font-mono text-neutral-200 font-semibold">
                        {settings.colorAdjust.contrast.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="2.2"
                      step="0.05"
                      value={settings.colorAdjust.contrast}
                      onChange={(e) => updateColorAdjust('contrast', parseFloat(e.target.value))}
                      className="w-full accent-neutral-300 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: WHITE BASE UNDERBASE */}
            <div className="bg-[#121724]/90 border border-[#20293D] rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSection('whiteBase')}
                className="w-full px-3 py-2.5 flex items-center justify-between font-semibold text-neutral-200 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-purple-400" />
                  <span>Base Branca (White Underbase)</span>
                </div>
                {openSections.whiteBase ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {openSections.whiteBase && (
                <div className="p-3 pt-0 space-y-3 border-t border-[#20293D] mt-1">
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between items-center text-[11px] text-neutral-300">
                      <span>White Underbase Choke (Recuo)</span>
                      <span className="font-mono text-purple-400 font-semibold">
                        {settings.whiteBase.choke} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="1"
                      value={settings.whiteBase.choke}
                      onChange={(e) => updateWhiteBase('choke', parseInt(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                    <span className="text-[9px] text-neutral-400 leading-tight block">
                      Recua a camada de tinta branca para não vazar sob as cores na estampa DTF.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-3 bg-[#080B12] border-t border-[#1E2638] space-y-2 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <button
            onClick={onResetControls}
            className="flex items-center gap-1 hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Resetar</span>
          </button>

          <button
            onClick={onOpenCrop}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer font-medium"
          >
            <Maximize2 size={13} />
            <span>Redimensionar & Crop</span>
          </button>
        </div>

        {/* APPLY SEPS BUTTON */}
        <button
          onClick={onApplySeps}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
        >
          <Check size={16} />
          <span>Aplicar Separação DTF</span>
        </button>

        {/* EXPORT BUTTONS */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            disabled={isProcessing}
            onClick={() => onExport('png', 2)}
            className="py-2 px-2 rounded-xl bg-[#141B2A] hover:bg-[#1E273C] text-cyan-300 font-bold text-xs flex items-center justify-center gap-1 border border-cyan-500/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download size={13} />
            <span>Export PNG</span>
          </button>

          <button
            disabled={isProcessing}
            onClick={() => onExport('tiff', 2)}
            className="py-2 px-2 rounded-xl bg-[#141B2A] hover:bg-[#1E273C] text-amber-300 font-bold text-xs flex items-center justify-center gap-1 border border-amber-500/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download size={13} />
            <span>TIFF 300 DPI</span>
          </button>
        </div>

        {/* BATCH CTA */}
        <button
          onClick={onOpenBatch}
          className="w-full py-1.5 rounded-lg bg-[#0F1420] hover:bg-[#182033] text-neutral-300 border border-[#1E2638] text-[11px] font-medium flex items-center justify-between px-2.5 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <FolderArchive size={13} className="text-amber-400" />
            <span>Processamento em Lote</span>
          </div>
          {batchCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
              {batchCount}
            </span>
          )}
        </button>
      </div>

    </aside>
  );
};
