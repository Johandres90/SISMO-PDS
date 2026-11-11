export type WindowType = 'rectangular' | 'hamming' | 'blackman_harris' | 'hann';

export type SeismicWaveletType = 'ricker' | 'exponential_decay' | 'continuous_burst' | 'modulated_sine';

export interface SignalGeneratorParams {
  fs: number;               // Frecuencia de muestreo (Hz), ej: 500, 1000, 2000
  N: number;                // Número de muestras, potencia de 2 (ej: 1024, 2048, 4096)
  
  // Señal sísmica útil
  f0: number;               // Frecuencia portadora sísmica (Hz) [1 - 150 Hz]
  seismicAmplitude: number; // Amplitud pico sísmica
  waveletType: SeismicWaveletType;
  seismicBurstRate: number; // Tasa de eventos / dispersión temporal

  // Fuentes de interferencia / ruido
  noise60HzEnabled: boolean;
  amp60Hz: number;
  harmonicsEnabled: boolean; // 120 Hz, 180 Hz
  ampHarmonics: number;

  burstNoiseEnabled: boolean; // Ráfagas tipo Wi-Fi / conmutación digital
  burstFreq: number;          // Frecuencia de modulación de la ráfaga (ej: 220 Hz)
  burstAmp: number;
  burstDurationMs: number;

  awgnEnabled: boolean;
  awgnStd: number;            // Desviación estándar del ruido blanco gaussiano
}

export interface FirFilterParams {
  enabled: boolean;
  filterType: 'bandpass' | 'lowpass' | 'highpass';
  fLow: number;               // Frecuencia de corte inferior (Hz)
  fHigh: number;              // Frecuencia de corte superior (Hz)
  taps: number;               // Número de coeficientes (debe ser impar para simetría Fase Lineal Tipo I)
  window: WindowType;
}

export interface WelchParams {
  windowSize: number;         // Tamaño de segmento (potencia de 2, ej. 256, 512)
  overlapPercent: number;     // 50%
  window: WindowType;
}

export interface SpectralPeak {
  freq: number;
  powerDb: number;
  label: string;
  isSeismic: boolean;
  isInterference: boolean;
}

export interface PerformanceMetrics {
  pSignalIn: number;          // Potencia señal pura en entrada
  pNoiseIn: number;           // Potencia ruido en entrada
  snrInDb: number;            // SNR de entrada (dB)
  pSignalOut: number;         // Potencia señal pura preservada
  pNoiseOut: number;          // Potencia residual de ruido tras filtrado
  snrOutDb: number;           // SNR de salida (dB)
  deltaSnrDb: number;         // Ganancia SNR (dB) = snrOutDb - snrInDb
  
  // Nyquist
  fMaxPresent: number;        // Máxima frecuencia presente en la señal
  nyquistFreq: number;        // fs / 2
  nyquistSatisfied: boolean;  // fs >= 2 * fMax
  aliasingWarning: string;
  spectralResolution: number; // delta_f = fs / N
}

export interface WindowMetrics {
  name: WindowType;
  label: string;
  mainlobeWidthBins: number;  // Ancho lóbulo principal (bins)
  sidelobeAttenuationDb: number; // Atenuación máxima lóbulo secundario (dB)
  scallopingLossDb: number;
  coherentGain: number;
  powerGain: number;
}

export interface DSPProcessingOutput {
  time: Float64Array;
  rawSignal: Float64Array;             // x[n]
  cleanSeismic: Float64Array;          // s[n] componente pura para auditoría
  interferenceNoise: Float64Array;     // e[n] ruido puro
  filteredSignal: Float64Array;        // y[n]
  
  // FFT dominio frecuencial
  fftFreqs: Float64Array;
  fftRawMag: Float64Array;
  fftRawMagDb: Float64Array;
  fftFilteredMagDb: Float64Array;
  
  // Comparativa de Ventanas para Spectral Leakage
  windowSpectra: Record<WindowType, {
    freqs: Float64Array;
    magDb: Float64Array;
    metrics: WindowMetrics;
  }>;

  // PSD Welch
  welch: {
    freqs: Float64Array;
    psdRawDb: Float64Array;
    psdFilteredDb: Float64Array;
    peaks: SpectralPeak[];
  };

  // Respuesta en frecuencia del filtro FIR
  firResponse: {
    coeffs: Float64Array;
    freqs: Float64Array;
    magDb: Float64Array;
    phaseDeg: Float64Array;
  };

  metrics: PerformanceMetrics;
}

export interface HackathonGroupInfo {
  groupNumber: string;
  teamMembers: string;
  institution: string;
  course: string;
  currentPhase: number;
}
