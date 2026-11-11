import React, { useState } from 'react';
import {
  SignalGeneratorParams,
  FirFilterParams,
  WindowType,
  SeismicWaveletType
} from '../dsp/types';
import {
  Sliders,
  Radio,
  Zap,
  Wifi,
  Volume2,
  Filter,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  Flame
} from 'lucide-react';

interface SignalControlPanelProps {
  signalParams: SignalGeneratorParams;
  onChangeSignalParams: (params: SignalGeneratorParams) => void;
  firParams: FirFilterParams;
  onChangeFirParams: (params: FirFilterParams) => void;
  selectedWindow: WindowType;
  onChangeSelectedWindow: (w: WindowType) => void;
}

export const SignalControlPanel: React.FC<SignalControlPanelProps> = ({
  signalParams,
  onChangeSignalParams,
  firParams,
  onChangeFirParams,
  selectedWindow,
  onChangeSelectedWindow
}) => {
  const [activeTab, setActiveTab] = useState<'seismic' | 'noise' | 'filter' | 'presets'>('seismic');

  const updateSignal = (partial: Partial<SignalGeneratorParams>) => {
    onChangeSignalParams({ ...signalParams, ...partial });
  };

  const updateFir = (partial: Partial<FirFilterParams>) => {
    onChangeFirParams({ ...firParams, ...partial });
  };

  // Presets for the Hackathon Scenarios
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'default':
        onChangeSignalParams({
          ...signalParams,
          fs: 1000,
          N: 2048,
          f0: 25,
          seismicAmplitude: 1.0,
          waveletType: 'ricker',
          noise60HzEnabled: true,
          amp60Hz: 0.8,
          harmonicsEnabled: true,
          ampHarmonics: 0.4,
          burstNoiseEnabled: true,
          burstFreq: 220,
          burstAmp: 0.5,
          burstDurationMs: 30,
          awgnEnabled: true,
          awgnStd: 0.25
        });
        onChangeFirParams({
          ...firParams,
          fLow: 10,
          fHigh: 45,
          taps: 63,
          window: 'hamming'
        });
        onChangeSelectedWindow('hamming');
        break;

      case 'heavy_60hz':
        onChangeSignalParams({
          ...signalParams,
          fs: 1000,
          f0: 22,
          seismicAmplitude: 0.8,
          waveletType: 'exponential_decay',
          noise60HzEnabled: true,
          amp60Hz: 2.0,
          harmonicsEnabled: true,
          ampHarmonics: 1.0,
          burstNoiseEnabled: false,
          awgnEnabled: true,
          awgnStd: 0.15
        });
        onChangeFirParams({
          ...firParams,
          fLow: 12,
          fHigh: 38,
          taps: 101,
          window: 'blackman_harris'
        });
        onChangeSelectedWindow('blackman_harris');
        break;

      case 'wifi_bursts':
        onChangeSignalParams({
          ...signalParams,
          fs: 1200,
          f0: 35,
          seismicAmplitude: 1.0,
          waveletType: 'ricker',
          noise60HzEnabled: true,
          amp60Hz: 0.4,
          burstNoiseEnabled: true,
          burstFreq: 280,
          burstAmp: 1.5,
          burstDurationMs: 40,
          awgnEnabled: true,
          awgnStd: 0.3
        });
        onChangeFirParams({
          ...firParams,
          fLow: 20,
          fHigh: 50,
          taps: 75,
          window: 'hamming'
        });
        onChangeSelectedWindow('hamming');
        break;

      case 'aliasing_demo':
        // Intentionally set low fs to trigger Nyquist violation
        onChangeSignalParams({
          ...signalParams,
          fs: 200, // < 2 * 180 Hz or 2 * 220 Hz
          f0: 45,
          noise60HzEnabled: true,
          amp60Hz: 1.0,
          harmonicsEnabled: true,
          ampHarmonics: 0.8,
          burstNoiseEnabled: true,
          burstFreq: 160,
          burstAmp: 0.8
        });
        break;

      case 'optimal_solution':
        // Finely tuned parameters for maximum Delta SNR gain
        onChangeSignalParams({
          ...signalParams,
          fs: 1000,
          N: 2048,
          f0: 20,
          seismicAmplitude: 1.2,
          waveletType: 'ricker',
          noise60HzEnabled: true,
          amp60Hz: 1.2,
          harmonicsEnabled: true,
          ampHarmonics: 0.6,
          burstNoiseEnabled: true,
          burstFreq: 240,
          burstAmp: 0.9,
          awgnEnabled: true,
          awgnStd: 0.2
        });
        onChangeFirParams({
          ...firParams,
          fLow: 10,
          fHigh: 32, // Narrow band cleanly isolating 20 Hz and cutting 60 Hz completely
          taps: 127, // High order for sharp cutoff
          window: 'blackman_harris'
        });
        onChangeSelectedWindow('blackman_harris');
        break;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 shadow-xl backdrop-blur-sm flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 mb-3 gap-1 pb-1">
        <button
          onClick={() => setActiveTab('seismic')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-mono font-medium transition-all ${
            activeTab === 'seismic'
              ? 'bg-slate-800/90 text-cyan-300 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          Señal Sísmica
        </button>

        <button
          onClick={() => setActiveTab('noise')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-mono font-medium transition-all ${
            activeTab === 'noise'
              ? 'bg-slate-800/90 text-amber-300 border-b-2 border-amber-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Ruido & Red 60Hz
        </button>

        <button
          onClick={() => setActiveTab('filter')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-mono font-medium transition-all ${
            activeTab === 'filter'
              ? 'bg-slate-800/90 text-emerald-300 border-b-2 border-emerald-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Filter className="w-3.5 h-3.5 text-emerald-400" />
          Filtro FIR
        </button>

        <button
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-mono font-medium transition-all ${
            activeTab === 'presets'
              ? 'bg-slate-800/90 text-violet-300 border-b-2 border-violet-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          Escenarios
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* TAB 1: SEÑAL SÍSMICA */}
        {activeTab === 'seismic' && (
          <div className="space-y-3 font-mono text-xs">
            {/* Wavelet type selection */}
            <div>
              <label className="text-slate-400 text-[11px] block mb-1">Morfología de Evento Sísmico:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'ricker', label: 'Pulso Ricker' },
                  { id: 'exponential_decay', label: 'Decay Exponencial' },
                  { id: 'modulated_sine', label: 'Modulada Gaussiana' },
                  { id: 'continuous_burst', label: 'Senoidal Continua' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => updateSignal({ waveletType: type.id as SeismicWaveletType })}
                    className={`px-2 py-1.5 rounded text-[10px] text-left border transition-all ${
                      signalParams.waveletType === type.id
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Carrier frequency f0 slider */}
            <div className="p-2 bg-slate-950/60 border border-slate-800/80 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300">Frecuencia Sísmica (f0):</span>
                <span className="text-cyan-400 font-bold">{signalParams.f0.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min={1}
                max={150}
                step={0.5}
                value={signalParams.f0}
                onChange={(e) => updateSignal({ f0: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span>1 Hz (Infrasónico)</span>
                <span>50 Hz</span>
                <span>150 Hz</span>
              </div>
            </div>

            {/* Amplitude slider */}
            <div className="p-2 bg-slate-950/60 border border-slate-800/80 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300">Amplitud Sísmica Pico:</span>
                <span className="text-cyan-400 font-bold">{signalParams.seismicAmplitude.toFixed(2)} V</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={3.0}
                step={0.05}
                value={signalParams.seismicAmplitude}
                onChange={(e) => updateSignal({ seismicAmplitude: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Global Sampling fs slider (Nyquist experiment) */}
            <div className="p-2 bg-slate-950/60 border border-slate-800/80 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300">Frec. de Muestreo (fs):</span>
                <span className="text-amber-400 font-bold">{signalParams.fs} Hz</span>
              </div>
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={signalParams.fs}
                onChange={(e) => updateSignal({ fs: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <span className="text-red-400">100 Hz (Aliasing)</span>
                <span>1000 Hz</span>
                <span>2000 Hz</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RUIDO & INTERFERENCIAS ELECTROMAGNÉTICAS */}
        {activeTab === 'noise' && (
          <div className="space-y-3 font-mono text-xs">
            {/* 60 Hz Hum & Harmonics */}
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signalParams.noise60HzEnabled}
                    onChange={(e) => updateSignal({ noise60HzEnabled: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span className="text-amber-300 font-bold">Acople de Red 60 Hz</span>
                </label>
                <span className="text-slate-400 text-[10px]">Amp: {signalParams.amp60Hz.toFixed(2)} V</span>
              </div>

              {signalParams.noise60HzEnabled && (
                <>
                  <input
                    type="range"
                    min={0.1}
                    max={3.0}
                    step={0.05}
                    value={signalParams.amp60Hz}
                    onChange={(e) => updateSignal({ amp60Hz: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={signalParams.harmonicsEnabled}
                        onChange={(e) => updateSignal({ harmonicsEnabled: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-700 text-amber-500"
                      />
                      Armónicos (120 Hz, 180 Hz)
                    </label>
                    <span className="text-slate-500 text-[9px]">{signalParams.ampHarmonics.toFixed(2)} V</span>
                  </div>
                </>
              )}
            </div>

            {/* High-Frequency Wi-Fi Bursts */}
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signalParams.burstNoiseEnabled}
                    onChange={(e) => updateSignal({ burstNoiseEnabled: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-cyan-300 font-bold flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Ráfagas Wi-Fi / Conmutación
                  </span>
                </label>
                <span className="text-slate-400 text-[10px]">{signalParams.burstFreq} Hz</span>
              </div>

              {signalParams.burstNoiseEnabled && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Frecuencia Portadora Ráfaga:</span>
                    <span className="text-cyan-300">{signalParams.burstFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min={150}
                    max={400}
                    step={10}
                    value={signalParams.burstFreq}
                    onChange={(e) => updateSignal({ burstFreq: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Amplitud de Ráfaga:</span>
                    <span className="text-cyan-300">{signalParams.burstAmp.toFixed(2)} V</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={2.5}
                    step={0.05}
                    value={signalParams.burstAmp}
                    onChange={(e) => updateSignal({ burstAmp: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              )}
            </div>

            {/* Additive White Gaussian Noise (AWGN) */}
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signalParams.awgnEnabled}
                    onChange={(e) => updateSignal({ awgnEnabled: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-purple-500 focus:ring-0"
                  />
                  <span className="text-purple-300 font-bold flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> Ruido Blanco Gaussiano (AWGN)
                  </span>
                </label>
                <span className="text-slate-400 text-[10px]">σ: {signalParams.awgnStd.toFixed(2)}</span>
              </div>

              {signalParams.awgnEnabled && (
                <input
                  type="range"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={signalParams.awgnStd}
                  onChange={(e) => updateSignal({ awgnStd: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
                />
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DISEÑO DE FILTRO FIR PASA-BANDA */}
        {activeTab === 'filter' && (
          <div className="space-y-3 font-mono text-xs">
            {/* Cutoff Frequencies */}
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-semibold">Banda de Paso Deseada:</span>
                <span className="text-cyan-400 font-bold">[{firParams.fLow} - {firParams.fHigh}] Hz</span>
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Corte Inferior (f_low):</span>
                  <span className="text-cyan-300">{firParams.fLow} Hz</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={Math.min(100, firParams.fHigh - 2)}
                  step={1}
                  value={firParams.fLow}
                  onChange={(e) => updateFir({ fLow: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Corte Superior (f_high):</span>
                  <span className="text-cyan-300">{firParams.fHigh} Hz</span>
                </div>
                <input
                  type="range"
                  min={firParams.fLow + 2}
                  max={Math.min(180, (signalParams.fs / 2) - 5)}
                  step={1}
                  value={firParams.fHigh}
                  onChange={(e) => updateFir({ fHigh: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>

            {/* Filter Order / Number of Taps */}
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-semibold">Orden del Filtro (M taps):</span>
                <span className="text-emerald-400 font-bold">{firParams.taps} taps</span>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {[31, 63, 101, 127].map((tVal) => (
                  <button
                    key={tVal}
                    onClick={() => updateFir({ taps: tVal })}
                    className={`py-1 rounded text-[10px] border transition-all ${
                      firParams.taps === tVal
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {tVal}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min={15}
                max={151}
                step={2}
                value={firParams.taps}
                onChange={(e) => updateFir({ taps: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <span className="text-[9px] text-slate-500 block">
                *Número impar garantiza Simetría de Fase Lineal Tipo I (retardo de grupo entero).
              </span>
            </div>

            {/* Window selection for FIR design */}
            <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded space-y-1.5">
              <label className="text-slate-300 block font-semibold text-[11px]">
                Ventana de Diseño FIR:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'hamming', name: 'Hamming (-43dB)' },
                  { id: 'blackman_harris', name: 'Blackman-H. (-92dB)' },
                  { id: 'hann', name: 'Hann (-32dB)' },
                  { id: 'rectangular', name: 'Rectangular (-13dB)' }
                ].map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      updateFir({ window: w.id as WindowType });
                      onChangeSelectedWindow(w.id as WindowType);
                    }}
                    className={`px-2 py-1.5 rounded text-[10px] text-left border transition-all ${
                      firParams.window === w.id
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ESCENARIOS Y PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-2 font-mono text-xs">
            <span className="text-[11px] text-slate-400 block mb-1">
              Casos de Estudio Rápidos de Hackathon:
            </span>

            <button
              onClick={() => applyPreset('default')}
              className="w-full p-2 rounded border border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-cyan-950/20 text-left transition-all group"
            >
              <div className="font-bold text-cyan-400 flex items-center justify-between">
                <span>1. Caso Base: Aula Estándar</span>
                <span className="text-[10px] text-slate-500">f0=25Hz</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Acople 60 Hz + Armónicos + Ráfagas Wi-Fi 220Hz + AWGN suave.
              </div>
            </button>

            <button
              onClick={() => applyPreset('heavy_60hz')}
              className="w-full p-2 rounded border border-slate-800 bg-slate-950/60 hover:border-amber-500/50 hover:bg-amber-950/20 text-left transition-all group"
            >
              <div className="font-bold text-amber-400 flex items-center justify-between">
                <span>2. Interferencia Severa 60Hz</span>
                <span className="text-[10px] text-slate-500">Amp=2.0V</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Alta contaminación de red de alta potencia. Requiere filtro Blackman-Harris de orden alto.
              </div>
            </button>

            <button
              onClick={() => applyPreset('wifi_bursts')}
              className="w-full p-2 rounded border border-slate-800 bg-slate-950/60 hover:border-cyan-500/50 hover:bg-cyan-950/20 text-left transition-all group"
            >
              <div className="font-bold text-cyan-300 flex items-center justify-between">
                <span>3. Ráfagas Wi-Fi + Transitorios</span>
                <span className="text-[10px] text-slate-500">280Hz</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Interferencia asíncrona de conmutación de antenas de alta frecuencia.
              </div>
            </button>

            <button
              onClick={() => applyPreset('aliasing_demo')}
              className="w-full p-2 rounded border border-red-500/40 bg-red-950/20 hover:border-red-500 text-left transition-all group"
            >
              <div className="font-bold text-red-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> 4. Experimento Aliasing
                </span>
                <span className="text-[10px] text-red-300">fs=200Hz</span>
              </div>
              <div className="text-[10px] text-red-300/80 mt-0.5">
                Submuestreo intencional para ver el solapamiento y violación de Nyquist en vivo.
              </div>
            </button>

            <button
              onClick={() => applyPreset('optimal_solution')}
              className="w-full p-2 rounded border border-emerald-500/60 bg-emerald-950/30 hover:border-emerald-400 text-left transition-all group shadow-lg shadow-emerald-950/40"
            >
              <div className="font-bold text-emerald-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-emerald-400" /> 5. Solución Óptima Hackathon
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">Máx ΔSNR</span>
              </div>
              <div className="text-[10px] text-emerald-200/80 mt-0.5">
                Ajuste fino de corte [10 - 32 Hz], M=127 y Blackman-Harris para máxima ganancia espectral.
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
