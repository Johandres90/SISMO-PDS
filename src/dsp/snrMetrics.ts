import { PerformanceMetrics } from './types';
import { applyFirFilter } from './firFilter';

export function computePower(signal: Float64Array): number {
  let sum = 0.0;
  const N = signal.length;
  for (let i = 0; i < N; i++) {
    const v = signal[i];
    sum += v * v;
  }
  return N > 0 ? sum / N : 0.0;
}

export function computeSNRMetrics(
  cleanSeismic: Float64Array,
  interferenceNoise: Float64Array,
  firCoeffs: Float64Array,
  fs: number,
  N: number,
  fMaxPresent: number
): {
  metrics: PerformanceMetrics;
  filteredSignal: Float64Array;
  filteredSeismic: Float64Array;
  filteredNoise: Float64Array;
} {
  // Input powers
  const pSignalIn = Math.max(1e-12, computePower(cleanSeismic));
  const pNoiseIn = Math.max(1e-12, computePower(interferenceNoise));
  const snrInDb = 10.0 * Math.log10(pSignalIn / pNoiseIn);

  // Apply FIR filter to each component (linear time-invariant system)
  const filteredSeismic = applyFirFilter(cleanSeismic, firCoeffs, true);
  const filteredNoise = applyFirFilter(interferenceNoise, firCoeffs, true);

  // Total filtered output y[n] = s_filt[n] + e_filt[n]
  const filteredSignal = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    filteredSignal[i] = filteredSeismic[i] + filteredNoise[i];
  }

  // Output powers
  const pSignalOut = Math.max(1e-12, computePower(filteredSeismic));
  const pNoiseOut = Math.max(1e-12, computePower(filteredNoise));
  const snrOutDb = 10.0 * Math.log10(pSignalOut / pNoiseOut);

  const deltaSnrDb = snrOutDb - snrInDb;

  // Nyquist audit
  const nyquistFreq = fs / 2.0;
  const nyquistSatisfied = fs >= 2.0 * fMaxPresent;
  const spectralResolution = fs / N;

  let aliasingWarning = '';
  if (!nyquistSatisfied) {
    aliasingWarning = `¡VIOLACIÓN DE CRITERIO DE NYQUIST! fs (${fs} Hz) < 2 × f_max (${(2 * fMaxPresent).toFixed(1)} Hz). Generación de frecuencias imagen/aliasing en banda base.`;
  }

  return {
    metrics: {
      pSignalIn,
      pNoiseIn,
      snrInDb,
      pSignalOut,
      pNoiseOut,
      snrOutDb,
      deltaSnrDb,
      fMaxPresent,
      nyquistFreq,
      nyquistSatisfied,
      aliasingWarning,
      spectralResolution
    },
    filteredSignal,
    filteredSeismic,
    filteredNoise
  };
}
