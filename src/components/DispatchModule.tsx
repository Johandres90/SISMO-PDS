import React, { useState } from 'react';
import {
  SignalGeneratorParams,
  FirFilterParams,
  WindowType,
  PerformanceMetrics,
  HackathonGroupInfo
} from '../dsp/types';
import { generateExecutiveSummary } from '../dsp/summaryGenerator';
import {
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  Users,
  Award,
  Sparkles,
  Terminal
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DispatchModuleProps {
  signalParams: SignalGeneratorParams;
  firParams: FirFilterParams;
  selectedWindow: WindowType;
  metrics: PerformanceMetrics;
  groupInfo: HackathonGroupInfo;
  onUpdateGroupInfo: (info: Partial<HackathonGroupInfo>) => void;
  onDownloadPython: () => void;
  onOpenReportModal: () => void;
}

export const DispatchModule: React.FC<DispatchModuleProps> = ({
  signalParams,
  firParams,
  selectedWindow,
  metrics,
  groupInfo,
  onUpdateGroupInfo,
  onDownloadPython,
  onOpenReportModal
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const { text: summaryText, wordCount } = generateExecutiveSummary(
    signalParams,
    firParams,
    selectedWindow,
    metrics,
    groupInfo
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCelebrateDownload = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.8 }
    });
    onDownloadPython();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 shadow-xl backdrop-blur-sm space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-semibold text-emerald-400 tracking-wider uppercase">
            MÓDULO DE DESPACHO Y PROTOCOLO DE ENVÍO
          </span>
        </div>

        {/* Word count badge */}
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
              wordCount <= 150
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
            }`}
          >
            {wordCount} / 150 palabras (Rúbrica OK)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Column 1: Team & Group Config */}
        <div className="space-y-2 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            Datos de Entrega del Hackathon
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Identificador de Grupo:</label>
            <input
              type="text"
              value={groupInfo.groupNumber}
              onChange={(e) => onUpdateGroupInfo({ groupNumber: e.target.value })}
              placeholder="Ej. Grupo 03 - PDS"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Integrantes:</label>
            <input
              type="text"
              value={groupInfo.teamMembers}
              onChange={(e) => onUpdateGroupInfo({ teamMembers: e.target.value })}
              placeholder="Nombres y Códigos de los estudiantes"
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="pt-1 flex gap-2">
            <button
              onClick={handleCelebrateDownload}
              className="flex-1 py-1.5 px-2 bg-cyan-600/90 hover:bg-cyan-500 text-slate-950 font-bold rounded flex items-center justify-center gap-1.5 transition-all text-xs shadow-lg shadow-cyan-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar .py
            </button>
            <button
              onClick={onOpenReportModal}
              className="flex-1 py-1.5 px-2 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-1.5 transition-all text-xs shadow-lg shadow-emerald-600/20"
            >
              <Printer className="w-3.5 h-3.5" />
              Informe PDF
            </button>
          </div>
        </div>

        {/* Column 2 & 3: Auto Executive Summary ready to copy */}
        <div className="lg:col-span-2 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 flex flex-col justify-between font-mono">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Resumen Ejecutivo Automatizado (Listo para Rúbrica)
              </span>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado al Portapapeles' : 'Copiar Párrafo'}
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-300 bg-slate-900/90 p-2 rounded border border-slate-800 select-all">
              {summaryText}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓ fs: {signalParams.fs} Hz</span>
              <span>•</span>
              <span className="text-cyan-400 font-bold">✓ f0: {signalParams.f0.toFixed(1)} Hz</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">✓ Ventana: {selectedWindow}</span>
              <span>•</span>
              <span className="text-emerald-300 font-bold">✓ ΔSNR: +{metrics.deltaSnrDb.toFixed(2)} dB</span>
            </div>
            <span className="text-slate-500">Fundación Universitaria San Mateo</span>
          </div>
        </div>
      </div>
    </div>
  );
};
