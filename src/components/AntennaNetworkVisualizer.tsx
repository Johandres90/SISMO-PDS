import React, { useRef, useEffect, useState } from 'react';
import {
  SignalGeneratorParams,
  FirFilterParams,
  PerformanceMetrics,
  WindowType
} from '../dsp/types';
import {
  Radio,
  Zap,
  Wifi,
  Shield,
  Activity,
  Flame,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface AntennaNetworkVisualizerProps {
  signalParams: SignalGeneratorParams;
  onChangeSignalParams: (params: SignalGeneratorParams) => void;
  firParams: FirFilterParams;
  onChangeFirParams: (params: FirFilterParams) => void;
  metrics: PerformanceMetrics;
  selectedWindow: WindowType;
  onChangeSelectedWindow: (w: WindowType) => void;
  onTriggerSeismicEvent: () => void;
}

export const AntennaNetworkVisualizer: React.FC<AntennaNetworkVisualizerProps> = ({
  signalParams,
  onChangeSignalParams,
  firParams,
  onChangeFirParams,
  metrics,
  selectedWindow,
  onChangeSelectedWindow,
  onTriggerSeismicEvent
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pulseAnimation, setPulseAnimation] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isSeismicShocking, setIsSeismicShocking] = useState<boolean>(false);

  // Trigger pulse animation
  const handleTriggerShock = () => {
    setIsSeismicShocking(true);
    onTriggerSeismicEvent();
    setTimeout(() => setIsSeismicShocking(false), 2000);
  };

  useEffect(() => {
    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.035;
      setPulseAnimation(t);

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

      // 1. Clear background
      ctx.fillStyle = '#030712'; // slate-950
      ctx.fillRect(0, 0, width, height);

      // 2. Draw subtle grid in background
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Positions of Key Entities
      const txPos = { x: width * 0.14, y: height * 0.55 };
      const rxPos = { x: width * 0.86, y: height * 0.55 };
      const powerLinePos = { x: width * 0.42, y: height * 0.22 };
      const wifiPos = { x: width * 0.62, y: height * 0.82 };

      // 3. Draw Telemetry Wireless RF Beam (Link)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(txPos.x, txPos.y);
      ctx.lineTo(rxPos.x, rxPos.y);
      ctx.stroke();

      // Animated traveling wave packets along the telemetry link
      const numParticles = 16;
      for (let i = 0; i < numParticles; i++) {
        const progress = ((t * 0.7 + i / numParticles) % 1.0);
        const px = txPos.x + (rxPos.x - txPos.x) * progress;
        
        // Base sine oscillation of carrier
        let py = txPos.y + Math.sin(progress * Math.PI * 8 + t * 4) * 12;

        // Add 60 Hz distortion if power line is active
        if (signalParams.noise60HzEnabled) {
          const distTo60 = Math.abs(px - powerLinePos.x);
          if (distTo60 < width * 0.35) {
            const influence = (1 - distTo60 / (width * 0.35)) * signalParams.amp60Hz;
            py += Math.sin(progress * Math.PI * 24 + t * 12) * (14 * influence);
          }
        }

        // Add Wi-Fi jitter if burst active
        if (signalParams.burstNoiseEnabled) {
          const distToWifi = Math.abs(px - wifiPos.x);
          if (distToWifi < width * 0.28) {
            const influence = (1 - distToWifi / (width * 0.28)) * signalParams.burstAmp;
            py += (Math.random() - 0.5) * 18 * influence;
          }
        }

        // Draw particle
        const isDirty = (signalParams.noise60HzEnabled || signalParams.burstNoiseEnabled) && progress > 0.35;
        ctx.fillStyle = isSeismicShocking
          ? '#10b981'
          : isDirty
          ? '#f59e0b'
          : '#22d3ee';

        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isSeismicShocking ? 12 : 6;
        ctx.beginPath();
        ctx.arc(px, py, isSeismicShocking ? 4.5 : 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 4. Draw Power Line 60 Hz Interference Waves
      if (signalParams.noise60HzEnabled) {
        const waveRadius = ((t * 35) % 110);
        for (let r = 0; r < 3; r++) {
          const currentR = (waveRadius + r * 35) % 110;
          const alpha = Math.max(0, 1 - currentR / 110) * 0.45;
          ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(powerLinePos.x, powerLinePos.y, currentR, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Ray down into the link
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(powerLinePos.x, powerLinePos.y);
        ctx.lineTo(width * 0.46, txPos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 5. Draw Wi-Fi Bursts Waves
      if (signalParams.burstNoiseEnabled) {
        const waveRadius = ((t * 60) % 90);
        for (let r = 0; r < 2; r++) {
          const currentR = (waveRadius + r * 45) % 90;
          const alpha = Math.max(0, 1 - currentR / 90) * 0.5;
          ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`; // purple
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(wifiPos.x, wifiPos.y, currentR, 0, 2 * Math.PI);
          ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(wifiPos.x, wifiPos.y);
        ctx.lineTo(width * 0.62, txPos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 6. Draw FIR DSP Shield Barrier at the Receiver
      const shieldX = rxPos.x - width * 0.08;
      if (firParams.enabled) {
        const shieldAlpha = 0.6 + 0.3 * Math.sin(t * 3);
        ctx.strokeStyle = `rgba(16, 185, 129, ${shieldAlpha})`;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(shieldX + 15, rxPos.y, 42, -Math.PI * 0.45, Math.PI * 0.45, false);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Shield label
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ESCUDO FIR', shieldX + 15, rxPos.y - 48);
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(`[${firParams.fLow}-${firParams.fHigh}Hz]`, shieldX + 15, rxPos.y + 54);
      }

      // 7. Draw Waves Transmitted from TX Antenna
      const txWaveR = ((t * 40) % 70);
      for (let w = 0; w < 3; w++) {
        const curR = (txWaveR + w * 25) % 70;
        const alpha = Math.max(0, 1 - curR / 70) * (isSeismicShocking ? 0.9 : 0.4);
        ctx.strokeStyle = isSeismicShocking ? `rgba(16, 185, 129, ${alpha})` : `rgba(6, 182, 212, ${alpha})`;
        ctx.lineWidth = isSeismicShocking ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(txPos.x, txPos.y, curR, -Math.PI * 0.35, Math.PI * 0.35, false);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [signalParams, firParams, isSeismicShocking]);

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-2xl backdrop-blur space-y-4">
      {/* Header Bar with Explanatory Mission Guide Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase flex items-center gap-2">
              SIMULADOR DE RED DE ANTENAS & ENLACE DE TELEMETRÍA
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-normal">
                Interactivo en Vivo
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans">
              Interactúa directamente con las antenas y fuentes de ruido para entender cómo se rescata la señal sísmica.
            </p>
          </div>
        </div>

        {/* Big Action: Trigger Seismic Tremor */}
        <button
          onClick={handleTriggerShock}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
            isSeismicShocking
              ? 'bg-emerald-500 text-slate-950 scale-105 shadow-emerald-500/50'
              : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-cyan-600/30 hover:scale-[1.02]'
          }`}
        >
          <Flame className={`w-4 h-4 ${isSeismicShocking ? 'animate-bounce text-slate-950' : 'text-slate-950'}`} />
          {isSeismicShocking ? '¡DISPARANDO SISMO (RICKER)!' : 'DISPARAR SISMO DE PRUEBA'}
        </button>
      </div>

      {/* Main Interactive Antenna Visualizer Canvas Area with Node Overlays */}
      <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
        {/* Animated Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* NODE 1: Antena Sísmica Remota (Estación Geofísica) */}
        <div className="absolute left-[3%] top-[40%] flex flex-col items-center">
          <div className="relative group">
            <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
              isSeismicShocking
                ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_25px_#10b981]'
                : 'bg-slate-900/90 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
            }`}>
              <Radio className={`w-7 h-7 ${isSeismicShocking ? 'text-emerald-300 animate-spin' : 'text-cyan-400 animate-pulse'}`} />
            </div>
            {/* Status dot */}
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-4 ring-slate-950 animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-950"></span>
          </div>

          <div className="mt-2 text-center bg-slate-950/90 border border-slate-800 px-2 py-1 rounded shadow-lg">
            <span className="font-mono text-[10px] font-bold text-cyan-300 block">ANTENA SÍSMICA (TX)</span>
            <span className="font-mono text-[9px] text-slate-400">f₀ = {signalParams.f0.toFixed(1)} Hz</span>
          </div>

          <button
            onClick={handleTriggerShock}
            className="mt-1 px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-800 border border-cyan-500/50 text-cyan-300 font-mono text-[9px] transition-all"
          >
            Pulso Sismo
          </button>
        </div>

        {/* NODE 2: Red Eléctrica 60 Hz (Interferencia de Aula) */}
        <div className="absolute left-[35%] top-[6%] flex flex-col items-center">
          <button
            onClick={() => onChangeSignalParams({ ...signalParams, noise60HzEnabled: !signalParams.noise60HzEnabled })}
            className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-1.5 shadow-lg ${
              signalParams.noise60HzEnabled
                ? 'bg-amber-950/80 border-amber-500 shadow-amber-500/30'
                : 'bg-slate-900/80 border-slate-700 opacity-60'
            }`}
          >
            <Zap className={`w-5 h-5 ${signalParams.noise60HzEnabled ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
            <div className="text-left font-mono">
              <span className={`text-[10px] font-bold block ${signalParams.noise60HzEnabled ? 'text-amber-300' : 'text-slate-400'}`}>
                RED 60 Hz {signalParams.noise60HzEnabled ? '[ACTIVA]' : '[OFF]'}
              </span>
              <span className="text-[9px] text-slate-400">Acople de Aula</span>
            </div>
          </button>

          {/* Quick toggle for 120/180 Hz harmonics */}
          {signalParams.noise60HzEnabled && (
            <button
              onClick={() => onChangeSignalParams({ ...signalParams, harmonicsEnabled: !signalParams.harmonicsEnabled })}
              className={`mt-1 font-mono text-[9px] px-2 py-0.5 rounded border ${
                signalParams.harmonicsEnabled
                  ? 'bg-amber-900/60 border-amber-500/50 text-amber-300'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              Armónicos 120/180Hz: {signalParams.harmonicsEnabled ? 'SI' : 'NO'}
            </button>
          )}
        </div>

        {/* NODE 3: Wi-Fi / Conmutador Digital (Ráfagas Espurias) */}
        <div className="absolute left-[54%] bottom-[6%] flex flex-col items-center">
          <button
            onClick={() => onChangeSignalParams({ ...signalParams, burstNoiseEnabled: !signalParams.burstNoiseEnabled })}
            className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-1.5 shadow-lg ${
              signalParams.burstNoiseEnabled
                ? 'bg-purple-950/80 border-purple-500 shadow-purple-500/30'
                : 'bg-slate-900/80 border-slate-700 opacity-60'
            }`}
          >
            <Wifi className={`w-5 h-5 ${signalParams.burstNoiseEnabled ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
            <div className="text-left font-mono">
              <span className={`text-[10px] font-bold block ${signalParams.burstNoiseEnabled ? 'text-purple-300' : 'text-slate-400'}`}>
                WI-FI ESPURIO {signalParams.burstNoiseEnabled ? '[ACTIVO]' : '[OFF]'}
              </span>
              <span className="text-[9px] text-slate-400">{signalParams.burstFreq} Hz / Ráfagas</span>
            </div>
          </button>
        </div>

        {/* NODE 4: Antena Receptora & Estación Base San Mateo */}
        <div className="absolute right-[3%] top-[40%] flex flex-col items-center">
          <div className="relative group">
            <div className="w-14 h-14 rounded-2xl bg-slate-900/90 border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
              <Radio className="w-7 h-7 text-emerald-400" />
            </div>
            {/* DSP active shield indicator */}
            <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-cyan-400 ring-2 ring-slate-950"></span>
          </div>

          <div className="mt-2 text-center bg-slate-950/90 border border-slate-800 px-2 py-1 rounded shadow-lg">
            <span className="font-mono text-[10px] font-bold text-emerald-300 block">ESTACIÓN RECEPTORA (RX)</span>
            <span className="font-mono text-[9px] text-slate-400">Campus San Mateo</span>
          </div>

          {/* FIR Filter Toggle directly on Antenna */}
          <button
            onClick={() => onChangeFirParams({ ...firParams, enabled: !firParams.enabled })}
            className={`mt-1 font-mono text-[9px] px-2 py-0.5 rounded border transition-all flex items-center gap-1 ${
              firParams.enabled
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-red-950 border-red-500 text-red-300'
            }`}
          >
            <Shield className="w-2.5 h-2.5" />
            Filtro FIR: {firParams.enabled ? 'ACTIVO' : 'BYPASS'}
          </button>
        </div>

        {/* Visual Link Legend floating in center bottom */}
        <div className="absolute left-[38%] bottom-[2%] bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-mono text-slate-400 flex items-center gap-2 backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          Enlace RF Telemetría Sísmica (Espacio Libre del Aula)
        </div>
      </div>

      {/* SNR Health & Power Balance Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-xl font-mono">
        {/* Gauge 1: Input Signal Quality (SNR in) */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              SNR de Entrada (Antena Contaminada):
            </span>
            <span className="text-amber-400 font-bold text-sm">
              {metrics.snrInDb.toFixed(1)} dB
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.max(5, Math.min(100, (metrics.snrInDb + 20) * 2))}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Afectada por acople de red y ráfagas espurias.
          </span>
        </div>

        {/* Gauge 2: Output Signal Quality (SNR out) */}
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              SNR de Salida (Tras Filtro FIR):
            </span>
            <span className="text-cyan-300 font-bold text-sm">
              {metrics.snrOutDb.toFixed(1)} dB
            </span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_8px_#06b6d4]"
              style={{ width: `${Math.max(5, Math.min(100, (metrics.snrOutDb + 20) * 2))}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Ruido atenuado en banda de rechazo.
          </span>
        </div>

        {/* Gauge 3: NET SNR GAIN (ΔSNR) */}
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-950/60 to-cyan-950/60 border border-emerald-500/40 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              GANANCIA NETA DE TELEMETRÍA (ΔSNR):
            </span>
            <span className="text-lg font-extrabold text-emerald-300">
              +{metrics.deltaSnrDb.toFixed(2)} dB
            </span>
          </div>
          <p className="text-[10px] text-emerald-200/80 mt-1 font-sans">
            ¡El filtro FIR recuperó con éxito la componente sísmica {signalParams.f0.toFixed(0)} Hz suprimiendo el ruido en {metrics.deltaSnrDb.toFixed(1)} decibelios!
          </p>
        </div>
      </div>

      {/* STEP-BY-STEP EXPLANATORY WORKSHOP GUIDE (El Taller Explicado de Forma Sencilla) */}
      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <span className="font-mono text-xs font-bold text-slate-200 uppercase">
              GUÍA DIDÁCTICA DEL TALLER: PASO A PASO EXPLICADO FÁCIL
            </span>
          </div>

          {/* Step Pills */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            {[1, 2, 3, 4, 5].map((step) => (
              <button
                key={step}
                onClick={() => setActiveStep(step)}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-all ${
                  activeStep === step
                    ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-400 shadow-[0_0_10px_#06b6d4]'
                    : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {step}
              </button>
            ))}
          </div>
        </div>

        {/* Step Content Card */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-sans leading-relaxed">
          {activeStep === 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                <Radio className="w-4 h-4" />
                <span>PASO 1: LA TRANSMISIÓN DE TELEMETRÍA SÍSMICA</span>
              </div>
              <p className="text-slate-300">
                Imagina que tienes una antena sismológica instalada cerca de una falla tectónica (a la izquierda). Cuando la tierra vibra, genera una oscilación sísmica a una frecuencia baja ({signalParams.f0} Hz) llamada <strong>señal útil</strong> $s[n]$. Esta señal se transmite por radiofrecuencia hacia la estación receptora de la San Mateo.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleTriggerShock}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold rounded shadow transition-all"
                >
                  Probar: Disparar Sismo en Antena
                </button>
                <span className="text-[11px] text-slate-400 font-mono">
                  Observa las ondas cian y verdes viajando por el enlace.
                </span>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold font-mono">
                <Zap className="w-4 h-4" />
                <span>PASO 2: EL PROBLEMA DEL RUIDO ELECTROMAGNÉTICO EN EL AULA</span>
              </div>
              <p className="text-slate-300">
                En el laboratorio hay cables eléctricos y transformadores que vibran a <strong>60 Hz</strong> (y armónicos en 120 y 180 Hz), además de routers Wi-Fi transmitiendo paquetes. Estas ondas electromagnéticas se <strong>acoplan</strong> en el aire e invaden la señal de la antena. Por eso, lo que llega a la antena receptora es una señal contaminada <span className="font-mono text-amber-300">x[n] = s[n] + e[n]</span> (señal sísmica + ruido electromagnético).
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                <button
                  onClick={() => onChangeSignalParams({ ...signalParams, noise60HzEnabled: !signalParams.noise60HzEnabled })}
                  className="px-2.5 py-1 bg-amber-500/20 border border-amber-500 text-amber-300 rounded hover:bg-amber-500/30"
                >
                  Toggle Ruido 60 Hz
                </button>
                <button
                  onClick={() => onChangeSignalParams({ ...signalParams, burstNoiseEnabled: !signalParams.burstNoiseEnabled })}
                  className="px-2.5 py-1 bg-purple-500/20 border border-purple-500 text-purple-300 rounded hover:bg-purple-500/30"
                >
                  Toggle Ráfagas Wi-Fi
                </button>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>PASO 3: EL CRITERIO DE NYQUIST (¡EVITAR FANTASMAS!)</span>
              </div>
              <p className="text-slate-300">
                Para que el conversor analógico-digital (ADC) de la antena entienda la señal sin equivocarse, debe tomar muestras a una velocidad suficiente: <span className="font-mono text-cyan-300">fs ≥ 2 × f_max</span>. Si muestreamos muy lento (por ejemplo, a menos de 200 Hz cuando hay ruido de 180 o 220 Hz), las frecuencias altas se disfrazan de frecuencias bajas, creando un fenómeno destructivo llamado <strong>Aliasing</strong>.
              </p>
              <div className="flex items-center gap-3 pt-1 font-mono text-[11px]">
                <span className={`px-2 py-0.5 rounded font-bold ${metrics.nyquistSatisfied ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' : 'bg-red-950 text-red-300 border border-red-500'}`}>
                  {metrics.nyquistSatisfied ? '✓ Nyquist Cumplido' : '✗ Violación de Nyquist'}
                </span>
                <button
                  onClick={() => onChangeSignalParams({ ...signalParams, fs: metrics.nyquistSatisfied ? 200 : 1000 })}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700"
                >
                  {metrics.nyquistSatisfied ? 'Simular Falla de Nyquist (fs=200Hz)' : 'Restaurar Nyquist Seguro (fs=1000Hz)'}
                </button>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-violet-400 font-bold font-mono">
                <Sparkles className="w-4 h-4" />
                <span>PASO 4: LA FUGA ESPECTRAL (SPECTRAL LEAKAGE) Y LAS VENTANAS</span>
              </div>
              <p className="text-slate-300">
                Cuando calculamos la FFT, tomamos un pedazo de tiempo finito. Cortar la señal en seco (ventana <strong>Rectangular</strong>) genera bordes abruptos que desparraman energía a las frecuencias vecinas como una fuga de agua (lóbulos laterales a solo -13 dB). Al usar ventanas suaves como <strong>Hamming</strong> (-43 dB) o <strong>Blackman-Harris</strong> (-92 dB), los bordes van a cero suavemente y la fuga desaparece, permitiéndonos ver la señal sísmica nítida sin que los 60 Hz la tapen.
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                {(['rectangular', 'hamming', 'blackman_harris'] as WindowType[]).map((wKey) => (
                  <button
                    key={wKey}
                    onClick={() => onChangeSelectedWindow(wKey)}
                    className={`px-3 py-1 rounded border transition-all ${
                      selectedWindow === wKey
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    {wKey === 'rectangular' ? 'Rectangular (-13dB)' : wKey === 'hamming' ? 'Hamming (-43dB)' : 'Blackman-Harris (-92dB)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeStep === 5 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
                <Shield className="w-4 h-4" />
                <span>PASO 5: EL FILTRO FIR PASA-BANDA (RESCATE DEL SISMO & GANANCIA SNR)</span>
              </div>
              <p className="text-slate-300">
                Para entregar la señal limpia a los sismólogos, activamos un <strong>filtro digital FIR pasa-banda</strong> calibrado entre {firParams.fLow} Hz y {firParams.fHigh} Hz. Como la señal sísmica está en {signalParams.f0} Hz, el filtro la deja pasar intacta con 0 dB de atenuación, mientras que el acople de 60 Hz y el Wi-Fi quedan fuera de la banda y son destruidos. Esto produce una ganancia neta de <strong>+{metrics.deltaSnrDb.toFixed(2)} dB</strong> en la calidad de la telemetría.
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                <button
                  onClick={() => onChangeFirParams({ ...firParams, enabled: !firParams.enabled })}
                  className={`px-3 py-1 rounded font-bold transition-all ${
                    firParams.enabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {firParams.enabled ? '✓ Filtro FIR Activado (+ΔSNR)' : 'Filtro en Bypass (Señal Sucia)'}
                </button>
                <span className="text-slate-400">
                  Banda calibrada: [{firParams.fLow} - {firParams.fHigh}] Hz | Orden: {firParams.taps} taps
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
