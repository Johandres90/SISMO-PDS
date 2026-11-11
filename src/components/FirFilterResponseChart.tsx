import React, { useRef, useEffect, useState } from 'react';
import { Sliders, Zap, CheckCircle2, Award } from 'lucide-react';
import { PerformanceMetrics, FirFilterParams } from '../dsp/types';

interface FirFilterResponseChartProps {
  freqs: Float64Array;
  magDb: Float64Array;
  phaseDeg: Float64Array;
  coeffs: Float64Array;
  firParams: FirFilterParams;
  metrics: PerformanceMetrics;
  fs: number;
}

export const FirFilterResponseChart: React.FC<FirFilterResponseChartProps> = ({
  freqs,
  magDb,
  phaseDeg,
  coeffs,
  firParams,
  metrics,
  fs
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const impulseCanvasRef = useRef<HTMLCanvasElement>(null);

  const [viewMode, setViewMode] = useState<'magnitude' | 'phase' | 'impulse'>('magnitude');
  const [hoverFreq, setHoverFreq] = useState<{ freq: number; db: number; phase: number; x: number } | null>(null);

  const nyquist = fs / 2;

  // Main Frequency Response Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewMode === 'impulse') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Grid
    const numGridX = 10;
    const numGridY = 6;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    for (let i = 0; i <= numGridX; i++) {
      const gx = (i / numGridX) * width;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let j = 0; j <= numGridY; j++) {
      const gy = (j / numGridY) * height;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    if (!freqs || freqs.length === 0) return;
    const maxFreq = freqs[freqs.length - 1] || nyquist;

    const mapX = (f: number) => (f / maxFreq) * width;

    // Highlight Passband
    const xLow = mapX(firParams.fLow);
    const xHigh = mapX(firParams.fHigh);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.fillRect(xLow, 0, xHigh - xLow, height);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.strokeRect(xLow, 0, xHigh - xLow, height);

    // Mark 60 Hz line
    const x60 = mapX(60.0);
    if (x60 <= width) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x60, 0);
      ctx.lineTo(x60, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (viewMode === 'magnitude') {
      const minDb = -80;
      const maxDb = 5;
      const dbRange = maxDb - minDb;
      const mapY = (db: number) => {
        const clamped = Math.max(minDb, Math.min(maxDb, db));
        return height - ((clamped - minDb) / dbRange) * height;
      };

      // 0 dB reference line
      const y0 = mapY(0);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(width, y0);
      ctx.stroke();
      ctx.setLineDash([]);

      // -3 dB cutoff level
      const y3 = mapY(-3);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, y3);
      ctx.lineTo(width, y3);
      ctx.stroke();
      ctx.setLineDash([]);

      // Magnitude Curve
      ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
      ctx.shadowBlur = 4;
      ctx.strokeStyle = '#06b6d4'; // cyan
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < freqs.length; i++) {
        const x = mapX(freqs[i]);
        const y = mapY(magDb[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Labels
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${maxDb} dB`, 8, 14);
      ctx.fillText('0 dB', 8, y0 - 4);
      ctx.fillText('-3 dB', 8, y3 - 4);
      ctx.fillText(`${minDb} dB`, 8, height - 8);
    } else if (viewMode === 'phase') {
      // Phase curve: -180 to +180 deg
      const mapPhaseY = (deg: number) => height / 2 - (deg / 180.0) * (height / 2);

      ctx.strokeStyle = '#a855f7'; // violet-500
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < freqs.length; i++) {
        const x = mapX(freqs[i]);
        const y = mapPhaseY(phaseDeg[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('+180°', 8, 14);
      ctx.fillText('0°', 8, height / 2 - 4);
      ctx.fillText('-180°', 8, height - 8);
    }

    // X Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0 Hz', 8, height - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${maxFreq.toFixed(0)} Hz`, width - 8, height - 8);

    // Passband label
    ctx.fillStyle = '#06b6d4';
    ctx.textAlign = 'center';
    ctx.fillText(`Pasa-Banda [${firParams.fLow} - ${firParams.fHigh} Hz]`, (xLow + xHigh) / 2, 20);

    // Hover
    if (hoverFreq) {
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hoverFreq.x, 0);
      ctx.lineTo(hoverFreq.x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [freqs, magDb, phaseDeg, firParams, viewMode, hoverFreq, nyquist]);

  // Impulse Response Canvas (when mode === 'impulse')
  useEffect(() => {
    const canvas = impulseCanvasRef.current;
    if (!canvas || viewMode !== 'impulse') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Center horizontal axis
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const M = coeffs.length;
    let maxCoeff = 1e-6;
    for (let i = 0; i < M; i++) {
      if (Math.abs(coeffs[i]) > maxCoeff) maxCoeff = Math.abs(coeffs[i]);
    }

    const stepX = width / (M + 1);
    ctx.strokeStyle = '#06b6d4';
    ctx.fillStyle = '#22d3ee';
    ctx.lineWidth = 1.5;

    for (let n = 0; n < M; n++) {
      const cx = (n + 1) * stepX;
      const cy = height / 2 - (coeffs[n] / maxCoeff) * (height * 0.42);

      // Stem line
      ctx.beginPath();
      ctx.moveTo(cx, height / 2);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      // Stem dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`h[n] Coeficientes FIR (M = ${M} taps, Simetría Tipo I)`, 10, 16);
  }, [coeffs, viewMode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (!freqs || freqs.length === 0) return;
    const maxFreq = freqs[freqs.length - 1];
    const hoverF = (x / rect.width) * maxFreq;
    const idx = Math.max(0, Math.min(freqs.length - 1, Math.round((hoverF / maxFreq) * (freqs.length - 1))));

    setHoverFreq({
      freq: freqs[idx],
      db: magDb[idx],
      phase: phaseDeg[idx],
      x
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-semibold text-cyan-400 tracking-wider uppercase">
            FILTRO FIR PASA-BANDA & MÉTRICAS SNR
          </span>
        </div>

        {/* View mode toggle */}
        <div className="flex bg-slate-950 border border-slate-800 rounded p-0.5">
          <button
            onClick={() => setViewMode('magnitude')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
              viewMode === 'magnitude'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            |H(f)| dB
          </button>
          <button
            onClick={() => setViewMode('phase')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
              viewMode === 'phase'
                ? 'bg-slate-800 text-purple-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fase Lineal
          </button>
          <button
            onClick={() => setViewMode('impulse')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
              viewMode === 'impulse'
                ? 'bg-slate-800 text-emerald-300 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            h[n] Impulso
          </button>
        </div>
      </div>

      {/* SNR Metrics Dashboard Cards */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        <div className="bg-slate-950/80 border border-slate-800 p-2 rounded">
          <span className="text-[10px] font-mono text-slate-500 block">SNR Entrada:</span>
          <span className="text-sm font-mono font-bold text-amber-400">
            {metrics.snrInDb.toFixed(2)} dB
          </span>
        </div>
        <div className="bg-slate-950/80 border border-slate-800 p-2 rounded">
          <span className="text-[10px] font-mono text-slate-500 block">SNR Salida:</span>
          <span className="text-sm font-mono font-bold text-cyan-300">
            {metrics.snrOutDb.toFixed(2)} dB
          </span>
        </div>
        <div className="col-span-2 bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/40 p-2 rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-emerald-400 block font-semibold flex items-center gap-1">
              <Award className="w-3 h-3" /> GANANCIA ΔSNR:
            </span>
            <span className="text-lg font-mono font-extrabold text-emerald-300 tracking-tight">
              +{metrics.deltaSnrDb.toFixed(2)} dB
            </span>
          </div>
          <div className="text-right font-mono text-[9px] text-slate-400">
            <div>M = {firParams.taps} taps</div>
            <div className="text-emerald-400">Fase Lineal Tipo I</div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 min-h-[170px] w-full oscilloscope-screen rounded border border-slate-800/80 bg-slate-950">
        {viewMode === 'impulse' ? (
          <canvas ref={impulseCanvasRef} className="absolute inset-0 w-full h-full" />
        ) : (
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverFreq(null)}
            className="absolute inset-0 w-full h-full cursor-crosshair"
          />
        )}

        {hoverFreq && viewMode !== 'impulse' && (
          <div className="absolute top-2 right-2 bg-slate-950/90 border border-cyan-500/40 rounded px-2.5 py-1.5 font-mono text-[10px] pointer-events-none shadow-lg">
            <div className="text-slate-400">f: <span className="text-cyan-300">{hoverFreq.freq.toFixed(1)} Hz</span></div>
            {viewMode === 'magnitude' ? (
              <div className="text-cyan-400">Ganancia: {hoverFreq.db.toFixed(2)} dB</div>
            ) : (
              <div className="text-purple-400">Fase: {hoverFreq.phase.toFixed(1)}°</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
