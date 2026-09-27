import React, { useRef } from 'react';
import {
  FolderArchive,
  Upload,
  X,
  Play,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { BatchItem } from '../types/halftone';

interface BatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: BatchItem[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onProcessBatch: (format: 'png' | 'tiff') => Promise<void>;
  isBatchProcessing: boolean;
  batchProgress: number; // 0 to 100
}

export const BatchDrawer: React.FC<BatchDrawerProps> = ({
  isOpen,
  onClose,
  items,
  activeItemId,
  onSelectItem,
  onAddFiles,
  onRemoveItem,
  onClearAll,
  onProcessBatch,
  isBatchProcessing,
  batchProgress,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-neutral-950/95 backdrop-blur-2xl border-t border-neutral-800 shadow-2xl p-4 transition-all duration-300 max-h-[45vh] flex flex-col text-neutral-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <FolderArchive className="text-amber-400" size={20} />
          <div>
            <h3 className="font-semibold text-sm text-neutral-100 flex items-center gap-2">
              Processamento em Lote (Batch Workflow)
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-amber-300 font-mono">
                {items.length} {items.length === 1 ? 'imagem' : 'imagens'}
              </span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              Aplique os mesmos parâmetros de retícula, cor e fundo transparente a múltiplas imagens e baixe tudo em um pacote ZIP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onAddFiles(e.target.files);
              }
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 border border-neutral-700 transition-colors"
          >
            <Upload size={14} />
            <span>Adicionar Arquivos</span>
          </button>

          {items.length > 0 && (
            <button
              onClick={onClearAll}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-red-950/50 hover:text-red-400 text-neutral-400 text-xs flex items-center gap-1 border border-neutral-800 transition-colors"
              title="Limpar todos"
            >
              <Trash2 size={14} />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors ml-2"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress Bar (if processing) */}
      {isBatchProcessing && (
        <div className="py-2">
          <div className="flex justify-between text-xs mb-1 font-mono text-amber-400">
            <span className="flex items-center gap-2">
              <Loader2 size={13} className="animate-spin" />
              Processando lote de retículas em alta resolução...
            </span>
            <span>{Math.round(batchProgress)}%</span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-200 rounded-full"
              style={{ width: `${batchProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Items Scrollable List */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden py-3 flex gap-3 items-center">
        {items.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-neutral-800 hover:border-amber-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-neutral-900/30"
          >
            <Upload className="text-neutral-500" size={24} />
            <div className="text-xs text-neutral-400 font-medium">
              Arraste e solte várias imagens aqui ou clique para selecionar
            </div>
            <div className="text-[10px] text-neutral-500">
              Formatos suportados: PNG, JPG, WEBP, SVG
            </div>
          </div>
        ) : (
          items.map((item) => {
            const isActive = item.id === activeItemId;
            return (
              <div
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className={`relative group shrink-0 w-32 h-28 rounded-xl border overflow-hidden cursor-pointer transition-all flex flex-col ${
                  isActive
                    ? 'border-amber-400 ring-2 ring-amber-500/30 shadow-lg'
                    : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                }`}
              >
                {/* Thumbnail */}
                <div className="flex-1 bg-black/40 overflow-hidden relative flex items-center justify-center">
                  <img
                    src={item.originalUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  {isActive && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-bold uppercase tracking-wider">
                      Ativa
                    </span>
                  )}
                  {item.status === 'done' && (
                    <span className="absolute top-1.5 right-1.5 p-1 rounded-full bg-emerald-500/90 text-white">
                      <CheckCircle2 size={12} />
                    </span>
                  )}
                </div>

                {/* Name / Info footer */}
                <div className="p-1.5 bg-neutral-950/90 text-[10px] truncate flex items-center justify-between">
                  <span className="truncate text-neutral-300 font-mono">{item.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions */}
      {items.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
          <div className="text-xs text-neutral-400">
            Total na fila: <span className="font-semibold text-neutral-200">{items.length} itens</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={isBatchProcessing}
              onClick={() => onProcessBatch('png')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              <Download size={14} />
              <span>Baixar Todos em ZIP (PNG Transparente)</span>
            </button>

            <button
              disabled={isBatchProcessing}
              onClick={() => onProcessBatch('tiff')}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs flex items-center gap-1.5 border border-neutral-700 transition-colors disabled:opacity-50"
            >
              <Download size={14} className="text-amber-400" />
              <span>Baixar Todos em ZIP (TIFF 300 DPI)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
