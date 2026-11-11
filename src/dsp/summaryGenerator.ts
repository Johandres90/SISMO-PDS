import {
  SignalGeneratorParams,
  FirFilterParams,
  WindowType,
  PerformanceMetrics,
  HackathonGroupInfo
} from './types';

export function generateExecutiveSummary(
  signalParams: SignalGeneratorParams,
  firParams: FirFilterParams,
  selectedWindow: WindowType,
  metrics: PerformanceMetrics,
  groupInfo: HackathonGroupInfo
): {
  text: string;
  wordCount: number;
} {
  const windowNames: Record<WindowType, string> = {
    rectangular: 'Rectangular (sin ponderación)',
    hamming: 'Hamming (atenuación -43 dB)',
    blackman_harris: 'Blackman-Harris de 4 términos (atenuación -92 dB)',
    hann: 'Hann'
  };

  const nyquistStatus = metrics.nyquistSatisfied
    ? `satisfaciendo rigurosamente el Criterio de Nyquist (f_s >= 2·f_max, margen de ${(metrics.nyquistFreq - metrics.fMaxPresent).toFixed(1)} Hz)`
    : `evidenciando una condición crítica de submuestreo con aliasing espectral`;

  const paragraph = 
`En la presente auditoría espectral de telemetría sísmica ejecutada por el ${groupInfo.groupNumber || 'Grupo 01'}, se digitalizó y procesó el registro a una frecuencia de muestreo f_s = ${signalParams.fs} Hz (N = ${signalParams.N} muestras, Δf = ${metrics.spectralResolution.toFixed(3)} Hz), ${nyquistStatus}. La descomposición espectral mediante Welch y FFT identificó con precisión la componente sísmica útil en f_0 = ${signalParams.f0.toFixed(1)} Hz, inmersa en severo acople electromagnético de red (60 Hz y armónicos) e interferencia espuria. La aplicación de la ventana espectral ${windowNames[selectedWindow]} mitigó drásticamente la fuga espectral (spectral leakage), permitiendo diseñar e implementar un filtro digital FIR pasa-banda Tipo I (orden M = ${firParams.taps}, banda [${firParams.fLow} - ${firParams.fHigh}] Hz) con retardo de grupo constante. El sistema elevó el SNR desde ${metrics.snrInDb.toFixed(2)} dB hasta ${metrics.snrOutDb.toFixed(2)} dB, logrando una ganancia neta validada de ΔSNR = ${metrics.deltaSnrDb.toFixed(2)} dB y restaurando íntegramente la morfología de la onda sísmica.`;

  // Count words
  const words = paragraph.trim().split(/\s+/).filter(Boolean);
  return {
    text: paragraph,
    wordCount: words.length
  };
}
