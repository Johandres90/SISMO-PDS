import {
  SignalGeneratorParams,
  FirFilterParams,
  WelchParams,
  DSPProcessingOutput,
  WindowType,
  WindowMetrics
} from './types';
import { generateSyntheticTelemetry } from './signalGenerator';
import { designFirFilter } from './firFilter';
import { computeRealFftSpectrum } from './fft';
import { computeWelchPSD } from './welch';
import { computeSNRMetrics } from './snrMetrics';
import { getWindowCoefficients, getWindowMetrics } from './windows';

export function runDSPPipeline(
  signalParams: SignalGeneratorParams,
  firParams: FirFilterParams,
  welchParams: WelchParams,
  selectedWindow: WindowType = 'hamming'
): DSPProcessingOutput {
  const { fs, N, f0 } = signalParams;

  // 1. Synthesize signal and noises
  const { time, cleanSeismic, noiseComponent, rawSignal, fMaxPresent } =
    generateSyntheticTelemetry(signalParams);

  // 2. Design FIR Filter
  const firResponse = designFirFilter(firParams, fs, 512);

  // 3. Filter signal & Compute SNR metrics
  const { metrics, filteredSignal } = computeSNRMetrics(
    cleanSeismic,
    noiseComponent,
    firResponse.coeffs,
    fs,
    N,
    fMaxPresent
  );

  // 4. Compute FFT of raw signal with selected window
  const wSelected = getWindowCoefficients(selectedWindow, N);
  const windowedRaw = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    windowedRaw[i] = rawSignal[i] * wSelected[i];
  }

  const rawSpectrum = computeRealFftSpectrum(windowedRaw, fs, N);

  // Compute FFT of filtered signal
  const windowedFiltered = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    windowedFiltered[i] = filteredSignal[i] * wSelected[i];
  }
  const filteredSpectrum = computeRealFftSpectrum(windowedFiltered, fs, N);

  // 5. Compare Windowing for Spectral Leakage analysis
  const windowTypes: WindowType[] = ['rectangular', 'hamming', 'blackman_harris', 'hann'];
  const windowSpectra: Record<WindowType, {
    freqs: Float64Array;
    magDb: Float64Array;
    metrics: WindowMetrics;
  }> = {} as any;

  for (const winType of windowTypes) {
    const w = getWindowCoefficients(winType, N);
    const winRaw = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      winRaw[i] = rawSignal[i] * w[i];
    }
    const spec = computeRealFftSpectrum(winRaw, fs, N);
    windowSpectra[winType] = {
      freqs: spec.freqs,
      magDb: spec.magDb,
      metrics: getWindowMetrics(winType, N)
    };
  }

  // 6. Compute Welch PSD for raw and filtered signals
  const welchRaw = computeWelchPSD(rawSignal, fs, welchParams, f0);
  const welchFiltered = computeWelchPSD(filteredSignal, fs, welchParams, f0);

  return {
    time,
    rawSignal,
    cleanSeismic,
    interferenceNoise: noiseComponent,
    filteredSignal,
    fftFreqs: rawSpectrum.freqs,
    fftRawMag: rawSpectrum.mag,
    fftRawMagDb: rawSpectrum.magDb,
    fftFilteredMagDb: filteredSpectrum.magDb,
    windowSpectra,
    welch: {
      freqs: welchRaw.freqs,
      psdRawDb: welchRaw.psdDb,
      psdFilteredDb: welchFiltered.psdDb,
      peaks: welchRaw.peaks
    },
    firResponse: {
      coeffs: firResponse.coeffs,
      freqs: firResponse.freqs,
      magDb: firResponse.magDb,
      phaseDeg: firResponse.phaseDeg
    },
    metrics
  };
}
