import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, Eye, Layers, Activity } from 'lucide-react';

interface OscilloscopeChartProps {
  time: Float64Array;
  rawSignal: Float64Array;
  filteredSignal: Float64Array;
  cleanSeismic: Float64Array;
  fs: number;
}

export const OscilloscopeChart: React.FC<OscilloscopeChartProps> = ({
  time,
  rawSignal,
  filteredSignal,
  cleanSeismic,
  fs
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [showRaw, setShowRaw] = useState<boolean>(true);
  const [showFiltered, setShowFiltered] = useState<boolean>(true);
  const [showClean, setShowClean] = useState<boolean>(false);
  const [hoverData, setHoverData] = useState<{ t: number; raw: number; filt: number; clean: number; x: number; y: number } | null>(null);

  const totalSamples = rawSignal.length;
  const visibleSamples = Math.max(32, Math.floor(totalSamples / zoom));
  const maxPan = Math.max(0, totalSamples - visibleSamples);
  const currentPan = Math.min(panOffset, maxPan);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina display resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background
    ctx.fillStyle = '#030712'; // slate-950
    ctx.fillRect(0, 0, width, height);

    // Draw Oscilloscope Grid
    const numGridX = 10;
    const numGridY = 8;
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // Subgrid dots/crosses
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

    // Center crosshair axis
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Scale factors
    const startIdx = currentPan;
    const endIdx = Math.min(totalSamples, startIdx + visibleSamples);
    const count = endIdx - startIdx;

    if (count <= 1) return;

    // Find min and max for auto-scaling vertical axis
    let minVal = -1.5;
    let maxVal = 1.5;
    for (let i = startIdx; i < endIdx; i++) {
      const r = rawSignal[i];
      const f = filteredSignal[i];
      if (r < minVal) minVal = r;
      if (r > maxVal) maxVal = r;
      if (f < minVal) minVal = f;
      if (f > maxVal) maxVal = f;
    }
    const margin = (maxVal - minVal) * 0.15 || 0.5;
    const yMin = minVal - margin;
    const yMax = maxVal + margin;
    const yRange = yMax - yMin;

    const mapX = (idx: number) => ((idx - startIdx) / (count - 1)) * width;
    const mapY = (val: number) => height - ((val - yMin) / yRange) * height;

    // 1. Draw Clean Seismic Reference (Green dashed)
    if (showClean) {
      ctx.strokeStyle = '#22c55e'; // emerald-500
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = startIdx; i < endIdx; i++) {
        const x = mapX(i);
        const y = mapY(cleanSeismic[i]);
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Draw Raw Contaminated Signal (Amber/Orange)
    if (showRaw) {
      ctx.strokeStyle = '#f59e0b'; // amber-500
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = startIdx; i < endIdx; i++) {
        const x = mapX(i);
        const y = mapY(rawSignal[i]);
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 3. Draw Filtered Signal (Bright Cyan)
    if (showFiltered) {
      ctx.shadowColor = 'rgba(6, 182, 212, 0.5)';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#06b6d4'; // cyan-500
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = startIdx; i < endIdx; i++) {
        const x = mapX(i);
        const y = mapY(filteredSignal[i]);
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw Time scale labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`t = ${time[startIdx]?.toFixed(3) ?? 0} s`, 10, height - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`t = ${time[endIdx - 1]?.toFixed(3) ?? 0} s`, width - 10, height - 8);

    // Draw Y axis scale
    ctx.textAlign = 'left';
    ctx.fillText(`+${yMax.toFixed(2)} V`, 8, 14);
    ctx.fillText(`${yMin.toFixed(2)} V`, 8, height - 22);

    // Draw cursor if hovered
    if (hoverData && hoverData.x >= 0 && hoverData.x <= width) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hoverData.x, 0);
      ctx.lineTo(hoverData.x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [time, rawSignal, filteredSignal, cleanSeismic, zoom, currentPan, showRaw, showFiltered, showClean, hoverData]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const startIdx = currentPan;
    const endIdx = Math.min(totalSamples, startIdx + visibleSamples);
    const count = endIdx - startIdx;

    const sampleIdx = Math.round(startIdx + (x / rect.width) * (count - 1));
    const clampedIdx = Math.max(0, Math.min(totalSamples - 1, sampleIdx));

    setHoverData({
      t: time[clampedIdx],
      raw: rawSignal[clampedIdx],
      filt: filteredSignal[clampedIdx],
      clean: cleanSeismic[clampedIdx],
      x,
      y
    });
  };

  const handleMouseLeave = () => setHoverData(null);

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-lg p-3 shadow-xl backdrop-blur-sm">
      {/* Header with Title & Interactive Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-semibold text-cyan-400 tracking-wider uppercase">
            OSCILOSCOPIO TEMPORAL | x[n] vs y[n]
          </span>
        </div>

        {/* Toggles & Zoom Buttons */}
        <div className="flex items-center gap-2">
          {/* Legend / Toggles */}
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 border transition-all ${
              showRaw
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Bruta x[n]
          </button>

          <button
            onClick={() => setShowFiltered(!showFiltered)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 border transition-all ${
              showFiltered
                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
            Filtrada y[n]
          </button>

          <button
            onClick={() => setShowClean(!showClean)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 border transition-all ${
              showClean
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-800/40 border-slate-700 text-slate-500'
            }`}
            title="Mostrar componente sísmica pura para auditoría"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Pura s[n]
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-1 py-0.5">
            <button
              onClick={() => setZoom(Math.max(1, zoom / 1.5))}
              className="p-1 hover:text-cyan-400 text-slate-400 transition-colors"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] px-1 text-slate-300 min-w-[32px] text-center">
              {zoom.toFixed(1)}x
            </span>
            <button
              onClick={() => setZoom(Math.min(16, zoom * 1.5))}
              className="p-1 hover:text-cyan-400 text-slate-400 transition-colors"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="relative flex-1 min-h-[220px] w-full oscilloscope-screen rounded border border-slate-800/80 bg-slate-950">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-0 w-full h-full cursor-crosshair"
        />

        {/* Hover telemetry badge */}
        {hoverData && (
          <div className="absolute top-2 right-2 bg-slate-950/90 border border-cyan-500/40 rounded px-2.5 py-1.5 font-mono text-[10px] pointer-events-none shadow-lg backdrop-blur">
            <div className="text-slate-400">t: <span className="text-cyan-300">{(hoverData.t * 1000).toFixed(1)} ms</span></div>
            {showRaw && <div className="text-amber-400">x[n]: {hoverData.raw.toFixed(3)} V</div>}
            {showFiltered && <div className="text-cyan-300">y[n]: {hoverData.filt.toFixed(3)} V</div>}
            {showClean && <div className="text-emerald-400">s[n]: {hoverData.clean.toFixed(3)} V</div>}
          </div>
        )}
      </div>

      {/* Panning Scrollbar if zoomed */}
      {zoom > 1 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500">VENTANA:</span>
          <input
            type="range"
            min={0}
            max={maxPan}
            value={currentPan}
            onChange={(e) => setPanOffset(parseInt(e.target.value))}
            className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      )}
    </div>
  );
};
