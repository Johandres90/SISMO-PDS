import React, { useRef, useEffect, useState } from 'react';
import { SpectralPeak } from '../dsp/types';
import { Radio, AlertTriangle, CheckCircle, Tag } from 'lucide-react';

interface WelchPSDChartProps {
  freqs: Float64Array;
  psdRawDb: Float64Array;
  psdFilteredDb: Float64Array;
  peaks: SpectralPeak[];
  f0: number;
  nyquistFreq: number;
}

export const WelchPSDChart: React.FC<WelchPSDChartProps> = ({
  freqs,
  psdRawDb,
  psdFilteredDb,
  peaks,
  f0,
  nyquistFreq
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showPeaks, setShowPeaks] = useState<boolean>(true);
  const [hoverData, setHoverData] = useState<{ freq: number; rawPsd: number; filtPsd: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    const maxFreq = freqs[freqs.length - 1] || nyquistFreq;

    // Dynamic Y scaling from PSD min/max
    let minDb = -120;
    let maxDb = 0;
    for (let i = 0; i < psdRawDb.length; i++) {
      if (psdRawDb[i] > maxDb) maxDb = psdRawDb[i];
      if (psdRawDb[i] < minDb) minDb = psdRawDb[i];
    }
    maxDb = Math.ceil(maxDb / 10) * 10 + 5;
    minDb = Math.floor(minDb / 10) * 10 - 5;
    const dbRange = maxDb - minDb || 100;

    const mapX = (f: number) => (f / maxFreq) * width;
    const mapY = (db: number) => {
      const clamped = Math.max(minDb, Math.min(maxDb, db));
      return height - ((clamped - minDb) / dbRange) * height;
    };

    // 1. Raw PSD (Salmon / Coral translucent fill)
    ctx.strokeStyle = '#f87171'; // red-400
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < freqs.length; i++) {
      const x = mapX(freqs[i]);
      const y = mapY(psdRawDb[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 2. Filtered PSD (Cyan bright)
    ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
    ctx.shadowBlur = 4;
    ctx.strokeStyle = '#06b6d4'; // cyan-500
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let i = 0; i < freqs.length; i++) {
      const x = mapX(freqs[i]);
      const y = mapY(psdFilteredDb[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3. Mark 60 Hz line
    const x60 = mapX(60.0);
    if (x60 <= width) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x60, 0);
      ctx.lineTo(x60, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw Peak Markers
    if (showPeaks && peaks.length > 0) {
      peaks.forEach((peak) => {
        const px = mapX(peak.freq);
        const py = mapY(peak.powerDb);
        if (px < 0 || px > width) return;

        // Pin icon / dot
        ctx.fillStyle = peak.isSeismic ? '#10b981' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Callout text badge
        ctx.fillStyle = peak.isSeismic ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)';
        const tagText = `${peak.freq}Hz`;
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        const tagWidth = ctx.measureText(tagText).width + 6;
        const tagY = Math.max(14, py - 10);

        ctx.fillRect(px - tagWidth / 2, tagY - 9, tagWidth, 12);
        ctx.fillStyle = '#020617';
        ctx.textAlign = 'center';
        ctx.fillText(tagText, px, tagY);
      });
    }

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0 Hz', 8, height - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${maxFreq.toFixed(0)} Hz`, width - 8, height - 8);

    ctx.textAlign = 'left';
    ctx.fillText(`${maxDb} dB/Hz`, 8, 14);
    ctx.fillText(`${minDb} dB/Hz`, 8, height - 20);

    // Hover crosshair
    if (hoverData) {
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hoverData.x, 0);
      ctx.lineTo(hoverData.x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [freqs, psdRawDb, psdFilteredDb, peaks, showPeaks, hoverData, nyquistFreq]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!freqs || freqs.length === 0) return;
    const maxFreq = freqs[freqs.length - 1];
    const hoverFreq = (x / rect.width) * maxFreq;
    const idx = Math.max(0, Math.min(freqs.length - 1, Math.round((hoverFreq / maxFreq) * (freqs.length - 1))));

    setHoverData({
      freq: freqs[idx],
      rawPsd: psdRawDb[idx],
      filtPsd: psdFilteredDb[idx],
      x,
      y
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs font-semibold text-cyan-400 tracking-wider uppercase">
            DENSIDAD ESPECTRAL DE POTENCIA (PSD WELCH 50% OVERLAP)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend toggles */}
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-2 h-0.5 bg-red-400"></span>
              PSD Bruta
            </span>
            <span className="flex items-center gap-1 text-cyan-300">
              <span className="w-2 h-0.5 bg-cyan-400"></span>
              PSD Filtrada
            </span>
          </div>

          <button
            onClick={() => setShowPeaks(!showPeaks)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 transition-all ${
              showPeaks
                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
          >
            <Tag className="w-3 h-3" />
            Marcadores
          </button>
        </div>
      </div>

      {/* Detected Peaks Chips */}
      {peaks && peaks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2 p-1.5 bg-slate-950/70 border border-slate-800/80 rounded font-mono text-[10px]">
          <span className="text-slate-500 mr-1">PICOS DETECTADOS:</span>
          {peaks.map((p, idx) => (
            <span
              key={idx}
              className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                p.isSeismic
                  ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-950/70 border-amber-500/50 text-amber-300'
              }`}
            >
              {p.isSeismic ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
              {p.label}: {p.powerDb.toFixed(1)} dB/Hz
            </span>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="relative flex-1 min-h-[200px] w-full oscilloscope-screen rounded border border-slate-800/80 bg-slate-950">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverData(null)}
          className="absolute inset-0 w-full h-full cursor-crosshair"
        />

        {hoverData && (
          <div className="absolute top-2 right-2 bg-slate-950/90 border border-cyan-500/40 rounded px-2.5 py-1.5 font-mono text-[10px] pointer-events-none shadow-lg">
            <div className="text-slate-400">f: <span className="text-cyan-300">{hoverData.freq.toFixed(1)} Hz</span></div>
            <div className="text-red-400">PSD Bruta: {hoverData.rawPsd.toFixed(1)} dB/Hz</div>
            <div className="text-cyan-300">PSD Filtrada: {hoverData.filtPsd.toFixed(1)} dB/Hz</div>
          </div>
        )}
      </div>
    </div>
  );
};
