import React, { useState, useEffect } from 'react';
import {
  Clock,
  Radio,
  AlertOctagon,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Activity,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { PerformanceMetrics, HackathonGroupInfo } from '../dsp/types';

interface HeaderControlBarProps {
  fs: number;
  N: number;
  metrics: PerformanceMetrics;
  groupInfo: HackathonGroupInfo;
  onUpdateGroupInfo: (info: Partial<HackathonGroupInfo>) => void;
  onOpenReportModal: () => void;
  onDownloadPython: () => void;
}

export const HeaderControlBar: React.FC<HeaderControlBarProps> = ({
  fs,
  N,
  metrics,
  groupInfo,
  onUpdateGroupInfo,
  onOpenReportModal,
  onDownloadPython
}) => {
  // Hackathon 150-minute Timer (Fases 1 a 4)
  const TOTAL_SECONDS = 150 * 60; // 150 minutes
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TOTAL_SECONDS);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const elapsedSeconds = TOTAL_SECONDS - secondsRemaining;
  const progressPercent = Math.min(100, (elapsedSeconds / TOTAL_SECONDS) * 100);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Determine current phase based on elapsed time or selection
  const phases = [
    { num: 1, name: 'Calibración & Nyquist', dur: 30 },
    { num: 2, name: 'Auditoría Espectral & Leakage', dur: 40 },
    { num: 3, name: 'Caracterización PSD Welch', dur: 40 },
    { num: 4, name: 'Filtro FIR & Validación SNR', dur: 40 }
  ];

  return (
    <header className="bg-slate-950/95 border-b border-slate-800 text-slate-100 p-3 shadow-2xl backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Brand & Team Identity */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm font-bold tracking-wider text-cyan-300">
                  SISMOLOG-DSP <span className="text-[10px] bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 px-1.5 py-0.2 rounded">v2.0</span>
                </h1>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">| Hackathon Telemetría</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                <span className="text-amber-400 font-semibold">{groupInfo.groupNumber || 'Grupo 01'}</span>
                <span>•</span>
                <span className="text-slate-300">San Mateo PDS</span>
              </div>
            </div>
          </div>

          {/* Action Buttons for Mobile/Responsive */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={onDownloadPython}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-[11px] font-bold rounded shadow transition-all"
            >
              .py
            </button>
            <button
              onClick={onOpenReportModal}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold rounded shadow transition-all"
            >
              PDF
            </button>
          </div>
        </div>

        {/* Live Global Telemetry Parameters & Nyquist Alert */}
        <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-auto">
          {/* fs */}
          <div className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 font-mono text-center">
            <span className="text-[9px] text-slate-500 block">FREC. MUESTREO (fs)</span>
            <span className="text-xs font-bold text-cyan-300">{fs} Hz</span>
          </div>

          {/* N */}
          <div className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 font-mono text-center">
            <span className="text-[9px] text-slate-500 block">LONGITUD (N)</span>
            <span className="text-xs font-bold text-slate-200">{N} pts</span>
          </div>

          {/* Spectral Resolution Delta f */}
          <div className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 font-mono text-center">
            <span className="text-[9px] text-slate-500 block">RESOLUCIÓN (Δf)</span>
            <span className="text-xs font-bold text-slate-200">{metrics.spectralResolution.toFixed(3)} Hz</span>
          </div>

          {/* Interactive Nyquist / Aliasing Indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded border font-mono text-xs transition-all ${
              metrics.nyquistSatisfied
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'bg-red-950/80 border-red-500 text-red-200 animate-pulse-fast shadow-[0_0_18px_rgba(239,68,68,0.5)]'
            }`}
            title={metrics.aliasingWarning || 'Criterio de Nyquist cumplido: fs >= 2 * f_max'}
          >
            {metrics.nyquistSatisfied ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[10px] font-bold tracking-wide">NYQUIST OK</div>
                  <div className="text-[9px] text-emerald-400/80">f_Nyq: {metrics.nyquistFreq.toFixed(0)} Hz &gt; f_max</div>
                </div>
              </>
            ) : (
              <>
                <AlertOctagon className="w-4 h-4 text-red-400 animate-bounce" />
                <div>
                  <div className="text-[10px] font-extrabold tracking-wider text-red-300">¡ALIASING DETECTADO!</div>
                  <div className="text-[9px] text-red-200">fs &lt; 2·f_max ({metrics.fMaxPresent.toFixed(0)} Hz)</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Hackathon Mission Timer & Phase Progress */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-300">
                  {formatTime(secondsRemaining)}
                </span>
                <span className="text-[9px] font-mono text-slate-500">/ 150m</span>
              </div>
              {/* Progress bar */}
              <div className="w-24 h-1.5 bg-slate-950 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Timer controls */}
            <div className="flex items-center gap-1 border-l border-slate-800 pl-1.5">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="p-1 hover:text-cyan-300 text-slate-400 transition-colors"
                title={isRunning ? 'Pausar Cronómetro' : 'Reanudar'}
              >
                {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setSecondsRemaining(TOTAL_SECONDS)}
                className="p-1 hover:text-amber-300 text-slate-400 transition-colors"
                title="Reiniciar a 150m"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Export Header CTA */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={onDownloadPython}
              className="px-3 py-1.5 bg-cyan-600/90 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold rounded shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-1.5 hover:scale-[1.02]"
            >
              <Zap className="w-3.5 h-3.5" />
              Script .py
            </button>
            <button
              onClick={onOpenReportModal}
              className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1.5 hover:scale-[1.02]"
            >
              <Activity className="w-3.5 h-3.5" />
              Informe PDF
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
