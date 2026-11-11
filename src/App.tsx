import { useState, useMemo } from 'react';
import type {
  SignalGeneratorParams,
  FirFilterParams,
  WelchParams,
  WindowType,
  HackathonGroupInfo
} from './dsp/types';
import { runDSPPipeline } from './dsp/dspPipeline';
import { generatePythonScript } from './dsp/pythonExport';
import { getWindowMetrics } from './dsp/windows';

import { HeaderControlBar } from './components/HeaderControlBar';
import { SignalControlPanel } from './components/SignalControlPanel';
import { AntennaNetworkVisualizer } from './components/AntennaNetworkVisualizer';
import { OscilloscopeChart } from './components/OscilloscopeChart';
import { SpectralLeakageChart } from './components/SpectralLeakageChart';
import { WelchPSDChart } from './components/WelchPSDChart';
import { FirFilterResponseChart } from './components/FirFilterResponseChart';
import { DispatchModule } from './components/DispatchModule';
import { ReportModal } from './components/ReportModal';

import { LayoutGrid, Maximize2, Radio, Activity, Sparkles } from 'lucide-react';

export function App() {
  // 1. Global Signal Generator State
  const [signalParams, setSignalParams] = useState<SignalGeneratorParams>({
    fs: 1000,
    N: 2048,
    f0: 25,
    seismicAmplitude: 1.0,
    waveletType: 'ricker',
    seismicBurstRate: 1,

    // Electromagnetic noise sources
    noise60HzEnabled: true,
    amp60Hz: 0.85,
    harmonicsEnabled: true,
    ampHarmonics: 0.45,

    burstNoiseEnabled: true,
    burstFreq: 220,
    burstAmp: 0.6,
    burstDurationMs: 30,

    awgnEnabled: true,
    awgnStd: 0.2
  });

  // 2. FIR Filter Parameters State
  const [firParams, setFirParams] = useState<FirFilterParams>({
    enabled: true,
    filterType: 'bandpass',
    fLow: 12,
    fHigh: 40,
    taps: 63,
    window: 'hamming'
  });

  // 3. Welch PSD Parameters State
  const [welchParams] = useState<WelchParams>({
    windowSize: 256,
    overlapPercent: 50,
    window: 'hamming'
  });

  // 4. Selected Spectral Window
  const [selectedWindow, setSelectedWindow] = useState<WindowType>('hamming');

  // 5. Main Experience Mode: 'antenna_simulator' | 'dsp_instruments'
  const [mainView, setMainView] = useState<'antenna_simulator' | 'dsp_instruments'>('antenna_simulator');

  // 6. Layout Mode inside instruments: 2x2 Grid or Tabbed
  const [instrumentLayout, setInstrumentLayout] = useState<'grid' | 'tabs'>('grid');
  const [activeTab, setActiveTab] = useState<'time' | 'fft' | 'welch' | 'fir'>('time');

  // 7. Hackathon Group Metadata
  const [groupInfo, setGroupInfo] = useState<HackathonGroupInfo>({
    groupNumber: 'Grupo 01',
    teamMembers: 'Carlos Rodríguez & Andrea Gómez',
    institution: 'Fundación Universitaria San Mateo',
    course: 'Procesamiento Digital de Señales (PDS)',
    currentPhase: 1
  });

  // 8. Report Modal
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // 9. Execute Real-Time DSP Pipeline
  const dspOutput = useMemo(() => {
    return runDSPPipeline(signalParams, firParams, welchParams, selectedWindow);
  }, [signalParams, firParams, welchParams, selectedWindow]);

  // Window metrics list for report
  const windowMetricsList = useMemo(() => {
    const list: WindowType[] = ['rectangular', 'hamming', 'blackman_harris', 'hann'];
    return list.map((w) => getWindowMetrics(w, signalParams.N));
  }, [signalParams.N]);

  // Handler for Python Script Download
  const handleDownloadPython = () => {
    const pyCode = generatePythonScript(
      signalParams,
      firParams,
      welchParams,
      selectedWindow,
      groupInfo,
      dspOutput.metrics
    );
    const blob = new Blob([pyCode], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const groupSlug = (groupInfo.groupNumber || 'grupo01').toLowerCase().replace(/\s+/g, '_');
    a.download = `script_pds_${groupSlug}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUpdateGroupInfo = (info: Partial<HackathonGroupInfo>) => {
    setGroupInfo((prev) => ({ ...prev, ...info }));
  };

  // Seismic shock trigger animation & amplitude boost
  const handleTriggerSeismicEvent = () => {
    setSignalParams((prev) => ({
      ...prev,
      seismicAmplitude: 1.8,
      waveletType: 'ricker'
    }));
    setTimeout(() => {
      setSignalParams((prev) => ({
        ...prev,
        seismicAmplitude: 1.0
      }));
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Header Control Bar & Nyquist Real-Time Monitor */}
      <HeaderControlBar
        fs={signalParams.fs}
        N={signalParams.N}
        metrics={dspOutput.metrics}
        groupInfo={groupInfo}
        onUpdateGroupInfo={handleUpdateGroupInfo}
        onOpenReportModal={() => setIsReportOpen(true)}
        onDownloadPython={handleDownloadPython}
      />

      {/* Main Mission Control Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 md:p-6 space-y-4">
        
        {/* Navigation Mode Switcher: Antenna Visualizer vs DSP Instrument Center */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMainView('antenna_simulator')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                mainView === 'antenna_simulator'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Radio className="w-4 h-4 text-cyan-300" />
              🛰️ Simulador Visual de Antenas & Taller Guiado
            </button>

            <button
              onClick={() => setMainView('dsp_instruments')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                mainView === 'dsp_instruments'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-300" />
              📊 Consola de Auditoría Avanzada (Osciloscopio, FFT, Welch & FIR)
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-slate-400">
            <span className="text-emerald-400 font-bold">ΔSNR: +{dspOutput.metrics.deltaSnrDb.toFixed(2)} dB</span>
            <span>•</span>
            <span className="text-cyan-400 font-bold">f₀ = {signalParams.f0.toFixed(0)} Hz</span>
          </div>
        </div>

        {/* VIEW 1: INTERACTIVE ANTENNA NETWORK SIMULATOR & WORKSHOP GUIDE */}
        {mainView === 'antenna_simulator' && (
          <div className="space-y-4">
            {/* Interactive Antenna Network Canvas & Explanations */}
            <AntennaNetworkVisualizer
              signalParams={signalParams}
              onChangeSignalParams={setSignalParams}
              firParams={firParams}
              onChangeFirParams={setFirParams}
              metrics={dspOutput.metrics}
              selectedWindow={selectedWindow}
              onChangeSelectedWindow={setSelectedWindow}
              onTriggerSeismicEvent={handleTriggerSeismicEvent}
            />

            {/* Real-time Oscilloscope & Welch PSD preview underneath */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-[280px]">
                <OscilloscopeChart
                  time={dspOutput.time}
                  rawSignal={dspOutput.rawSignal}
                  filteredSignal={dspOutput.filteredSignal}
                  cleanSeismic={dspOutput.cleanSeismic}
                  fs={signalParams.fs}
                />
              </div>

              <div className="h-[280px]">
                <WelchPSDChart
                  freqs={dspOutput.welch.freqs}
                  psdRawDb={dspOutput.welch.psdRawDb}
                  psdFilteredDb={dspOutput.welch.psdFilteredDb}
                  peaks={dspOutput.welch.peaks}
                  f0={signalParams.f0}
                  nyquistFreq={dspOutput.metrics.nyquistFreq}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: PROFESSIONAL DSP LAB AUDIT CONSOLE */}
        {mainView === 'dsp_instruments' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Parameter & Generator Panel (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <SignalControlPanel
                signalParams={signalParams}
                onChangeSignalParams={setSignalParams}
                firParams={firParams}
                onChangeFirParams={setFirParams}
                selectedWindow={selectedWindow}
                onChangeSelectedWindow={setSelectedWindow}
              />
            </div>

            {/* Right Column: DSP Processing Instruments (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* View Layout Selector Bar */}
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">DISPOSICIÓN:</span>
                  <button
                    onClick={() => setInstrumentLayout('grid')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                      instrumentLayout === 'grid'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Cuadrícula 2x2
                  </button>
                  <button
                    onClick={() => setInstrumentLayout('tabs')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                      instrumentLayout === 'tabs'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Pestañas Maximizadas
                  </button>
                </div>

                {instrumentLayout === 'tabs' && (
                  <div className="flex bg-slate-950 border border-slate-800 rounded p-0.5">
                    <button
                      onClick={() => setActiveTab('time')}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                        activeTab === 'time' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      1. Tiempo
                    </button>
                    <button
                      onClick={() => setActiveTab('fft')}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                        activeTab === 'fft' ? 'bg-slate-800 text-emerald-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      2. FFT
                    </button>
                    <button
                      onClick={() => setActiveTab('welch')}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                        activeTab === 'welch' ? 'bg-slate-800 text-amber-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      3. Welch
                    </button>
                    <button
                      onClick={() => setActiveTab('fir')}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                        activeTab === 'fir' ? 'bg-slate-800 text-purple-300 font-bold' : 'text-slate-400'
                      }`}
                    >
                      4. FIR
                    </button>
                  </div>
                )}
              </div>

              {/* Instruments Render: Grid 2x2 or Single Tab */}
              {instrumentLayout === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-[310px]">
                    <OscilloscopeChart
                      time={dspOutput.time}
                      rawSignal={dspOutput.rawSignal}
                      filteredSignal={dspOutput.filteredSignal}
                      cleanSeismic={dspOutput.cleanSeismic}
                      fs={signalParams.fs}
                    />
                  </div>

                  <div className="h-[310px]">
                    <SpectralLeakageChart
                      windowSpectra={dspOutput.windowSpectra}
                      selectedWindow={selectedWindow}
                      onSelectWindow={setSelectedWindow}
                      nyquistFreq={dspOutput.metrics.nyquistFreq}
                    />
                  </div>

                  <div className="h-[310px]">
                    <WelchPSDChart
                      freqs={dspOutput.welch.freqs}
                      psdRawDb={dspOutput.welch.psdRawDb}
                      psdFilteredDb={dspOutput.welch.psdFilteredDb}
                      peaks={dspOutput.welch.peaks}
                      f0={signalParams.f0}
                      nyquistFreq={dspOutput.metrics.nyquistFreq}
                    />
                  </div>

                  <div className="h-[310px]">
                    <FirFilterResponseChart
                      freqs={dspOutput.firResponse.freqs}
                      magDb={dspOutput.firResponse.magDb}
                      phaseDeg={dspOutput.firResponse.phaseDeg}
                      coeffs={dspOutput.firResponse.coeffs}
                      firParams={firParams}
                      metrics={dspOutput.metrics}
                      fs={signalParams.fs}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-[520px]">
                  {activeTab === 'time' && (
                    <OscilloscopeChart
                      time={dspOutput.time}
                      rawSignal={dspOutput.rawSignal}
                      filteredSignal={dspOutput.filteredSignal}
                      cleanSeismic={dspOutput.cleanSeismic}
                      fs={signalParams.fs}
                    />
                  )}
                  {activeTab === 'fft' && (
                    <SpectralLeakageChart
                      windowSpectra={dspOutput.windowSpectra}
                      selectedWindow={selectedWindow}
                      onSelectWindow={setSelectedWindow}
                      nyquistFreq={dspOutput.metrics.nyquistFreq}
                    />
                  )}
                  {activeTab === 'welch' && (
                    <WelchPSDChart
                      freqs={dspOutput.welch.freqs}
                      psdRawDb={dspOutput.welch.psdRawDb}
                      psdFilteredDb={dspOutput.welch.psdFilteredDb}
                      peaks={dspOutput.welch.peaks}
                      f0={signalParams.f0}
                      nyquistFreq={dspOutput.metrics.nyquistFreq}
                    />
                  )}
                  {activeTab === 'fir' && (
                    <FirFilterResponseChart
                      freqs={dspOutput.firResponse.freqs}
                      magDb={dspOutput.firResponse.magDb}
                      phaseDeg={dspOutput.firResponse.phaseDeg}
                      coeffs={dspOutput.firResponse.coeffs}
                      firParams={firParams}
                      metrics={dspOutput.metrics}
                      fs={signalParams.fs}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Dispatch & Export Module (Full width bottom) */}
        <DispatchModule
          signalParams={signalParams}
          firParams={firParams}
          selectedWindow={selectedWindow}
          metrics={dspOutput.metrics}
          groupInfo={groupInfo}
          onUpdateGroupInfo={handleUpdateGroupInfo}
          onDownloadPython={handleDownloadPython}
          onOpenReportModal={() => setIsReportOpen(true)}
        />

      </main>

      {/* Printable Technical Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        signalParams={signalParams}
        firParams={firParams}
        selectedWindow={selectedWindow}
        metrics={dspOutput.metrics}
        groupInfo={groupInfo}
        peaks={dspOutput.welch.peaks}
        windowMetricsList={windowMetricsList}
        onDownloadPython={handleDownloadPython}
      />
    </div>
  );
}

export default App;
