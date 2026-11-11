import React, { useRef, useEffect, useState } from 'react';
import { WindowType, WindowMetrics } from '../dsp/types';
import { Layers, HelpCircle, BarChart3, TrendingDown } from 'lucide-react';

interface SpectralLeakageChartProps {
  windowSpectra: Record<WindowType, {
    freqs: Float64Array;
    magDb: Float64Array;
    metrics: WindowMetrics;
  }>;
  selectedWindow: WindowType;
  onSelectWindow: (w: WindowType) => void;
  nyquistFreq: number;
}

export const SpectralLeakageChart: React.FC<SpectralLeakageChartProps> = ({
  windowSpectra,
  selectedWindow,
  onSelectWindow,
  nyquistFreq
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [overlayAll, setOverlayAll] = useState<boolean>(true);
  const [scaleMode, setScaleMode] = useState<'dB' | 'linear'>('dB');
  const [hoverData, setHoverData] = useState<{ freq: number; dbVal: number; x: number; y: number } | null>(null);

  const windowColors: Record<WindowType, { stroke: string; label: string; text: string }> = {
    rectangular: { stroke: '#ef4444', label: 'Rectangular (-13 dB)', text: 'text-red-400' },
    hamming: { stroke: '#f59e0b', label: 'Hamming (-43 dB)', text: 'text-amber-400' },
    blackman_harris: { stroke: '#10b981', label: 'Blackman-Harris (-92 dB)', text: 'text-emerald-400' },
    hann: { stroke: '#3b82f6', label: 'Hann (-32 dB)', text: 'text-blue-400' }
  };

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

    // Draw Grid
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

    const minDb = -100;
    const maxDb = 10;
    const dbRange = maxDb - minDb;

    const freqs = windowSpectra[selectedWindow]?.freqs;
    if (!freqs || freqs.length === 0) return;

    const maxFreq = freqs[freqs.length - 1] || nyquistFreq;

    const mapX = (f: number) => (f / maxFreq) * width;
    const mapY = (db: number) => {
      if (scaleMode === 'linear') {
        const lin = Math.pow(10, db / 20.0);
        return height - Math.min(height, Math.max(0, lin * height * 0.9));
      }
      const clamped = Math.max(minDb, Math.min(maxDb, db));
      return height - ((clamped - minDb) / dbRange) * height;
    };

    // Render Windows: Either all in overlay or only selected
    const windowsToRender: WindowType[] = overlayAll
      ? (['rectangular', 'hamming', 'blackman_harris'] as WindowType[])
      : [selectedWindow];

    // Draw lines with order: rectangular first (background), then hamming, then blackman-harris
    windowsToRender.forEach((wType) => {
      const spec = windowSpectra[wType];
      if (!spec) return;

      const isSelected = wType === selectedWindow;
      ctx.strokeStyle = windowColors[wType].stroke;
      ctx.lineWidth = isSelected ? 2.2 : 1.2;
      ctx.globalAlpha = isSelected ? 1.0 : 0.6;

      ctx.beginPath();
      for (let i = 0; i < spec.freqs.length; i++) {
        const x = mapX(spec.freqs[i]);
        const y = mapY(spec.magDb[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    // Draw frequency & scale labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0 Hz', 8, height - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${maxFreq.toFixed(0)} Hz (Nyquist)`, width - 8, height - 8);

    // Y Axis labels
    ctx.textAlign = 'left';
    if (scaleMode === 'dB') {
      ctx.fillText(`${maxDb} dB`, 8, 14);
      ctx.fillText(`-40 dB`, 8, mapY(-40));
      ctx.fillText(`${minDb} dB`, 8, height - 20);
    } else {
      ctx.fillText(`1.0 (Lineal)`, 8, 14);
      ctx.fillText(`0.0`, 8, height - 20);
    }

    // Secondary Sidelobe Marker Line at -13.3 dB (Rectangular limit)
    if (scaleMode === 'dB') {
      const yRectLimit = mapY(-13.3);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, yRectLimit);
      ctx.lineTo(width, yRectLimit);
      ctx.stroke();

      const yHammLimit = mapY(-42.7);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, yHammLimit);
      ctx.lineTo(width, yHammLimit);
      ctx.stroke();

      const yBhLimit = mapY(-92.0);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, yBhLimit);
      ctx.lineTo(width, yBhLimit);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Hover line
    if (hoverData) {
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hoverData.x, 0);
      ctx.lineTo(hoverData.x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [windowSpectra, selectedWindow, overlayAll, scaleMode, hoverData, nyquistFreq]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const spec = windowSpectra[selectedWindow];
    if (!spec || spec.freqs.length === 0) return;

    const maxFreq = spec.freqs[spec.freqs.length - 1];
    const hoverFreq = (x / rect.width) * maxFreq;

    // Find nearest bin
    const binIdx = Math.max(0, Math.min(spec.freqs.length - 1, Math.round((hoverFreq / maxFreq) * (spec.freqs.length - 1))));

    setHoverData({
      freq: spec.freqs[binIdx],
      dbVal: spec.magDb[binIdx],
      x,
      y
    });
  };

  const currentMetrics = windowSpectra[selectedWindow]?.metrics;

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-semibold text-emerald-400 tracking-wider uppercase">
            ESPECTRO FFT & MITIGACIÓN DE LEAKAGE
          </span>
        </div>

        {/* Window Selector & Mode toggles */}
        <div className="flex items-center gap-2">
          {/* Window Buttons */}
          <div className="flex bg-slate-950 border border-slate-800 rounded p-0.5">
            {(['rectangular', 'hamming', 'blackman_harris'] as WindowType[]).map((wKey) => (
              <button
                key={wKey}
                onClick={() => onSelectWindow(wKey)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                  selectedWindow === wKey
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {wKey === 'rectangular' ? 'Rect.' : wKey === 'hamming' ? 'Hamming' : 'Blackman-H.'}
              </button>
            ))}
          </div>

          {/* Overlay Toggle */}
          <button
            onClick={() => setOverlayAll(!overlayAll)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
              overlayAll
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
            title="Comparar las 3 ventanas simultáneamente"
          >
            Superponer
          </button>

          {/* dB / Linear toggle */}
          <button
            onClick={() => setScaleMode(scaleMode === 'dB' ? 'linear' : 'dB')}
            className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-300 rounded text-[10px] font-mono hover:text-cyan-300"
          >
            {scaleMode}
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      {currentMetrics && (
        <div className="grid grid-cols-3 gap-2 mb-2 p-1.5 bg-slate-950/70 border border-slate-800/80 rounded font-mono text-[10px]">
          <div>
            <span className="text-slate-500 block">Lóbulo Principal:</span>
            <span className="text-cyan-300 font-bold">{currentMetrics.mainlobeWidthBins} bins</span>
          </div>
          <div>
            <span className="text-slate-500 block">Atenuación Secundarios:</span>
            <span className={`font-bold ${currentMetrics.sidelobeAttenuationDb <= -90 ? 'text-emerald-400' : currentMetrics.sidelobeAttenuationDb <= -40 ? 'text-amber-400' : 'text-red-400'}`}>
              {currentMetrics.sidelobeAttenuationDb} dB
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Pérdida Scalloping:</span>
            <span className="text-slate-300 font-bold">{currentMetrics.scallopingLossDb} dB</span>
          </div>
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

        {/* Legend pills in bottom */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 pointer-events-none">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300">
            ■ Rectangular (-13 dB)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
            ■ Hamming (-43 dB)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
            ■ Blackman-Harris (-92 dB)
          </span>
        </div>

        {/* Hover telemetry */}
        {hoverData && (
          <div className="absolute top-2 right-2 bg-slate-950/90 border border-emerald-500/40 rounded px-2 py-1 font-mono text-[10px] pointer-events-none shadow-lg">
            <div className="text-slate-400">f: <span className="text-emerald-300">{hoverData.freq.toFixed(1)} Hz</span></div>
            <div className="text-emerald-400">|X(f)|: {hoverData.dbVal.toFixed(1)} dB</div>
          </div>
        )}
      </div>
    </div>
  );
};
