import { FirFilterParams, WindowType } from './types';
import { getWindowCoefficients } from './windows';

export interface FirDesignResult {
  coeffs: Float64Array;
  freqs: Float64Array;
  magDb: Float64Array;
  phaseDeg: Float64Array;
  groupDelaySamples: number;
}

/**
 * Designs an FIR Filter using the Windowed Sinc Method.
 * Guarantees Type I Linear Phase FIR (odd number of taps M, symmetric coefficients).
 */
export function designFirFilter(
  params: FirFilterParams,
  fs: number,
  numEvalPoints: number = 512
): FirDesignResult {
  let { filterType, fLow, fHigh, taps, window } = params;

  // Enforce odd number of taps for symmetric bandpass Type I
  let M = Math.floor(taps);
  if (M % 2 === 0) M += 1;
  if (M < 5) M = 5;

  const alpha = (M - 1) / 2.0;
  const hIdeal = new Float64Array(M);

  // Normalize cutoffs to [0, 1] where 1.0 is Nyquist (fs / 2)
  const nyquist = fs / 2.0;
  const clampedFLow = Math.max(0.1, Math.min(fLow, nyquist - 1.0));
  const clampedFHigh = Math.max(clampedFLow + 1.0, Math.min(fHigh, nyquist - 0.5));

  const w1 = (2.0 * Math.PI * clampedFLow) / fs;
  const w2 = (2.0 * Math.PI * clampedFHigh) / fs;

  for (let n = 0; n < M; n++) {
    const diff = n - alpha;
    if (Math.abs(diff) < 1e-7) {
      if (filterType === 'bandpass') {
        hIdeal[n] = (w2 - w1) / Math.PI;
      } else if (filterType === 'lowpass') {
        hIdeal[n] = w2 / Math.PI;
      } else { // highpass
        hIdeal[n] = 1.0 - (w1 / Math.PI);
      }
    } else {
      if (filterType === 'bandpass') {
        const sinc2 = Math.sin(w2 * diff) / (Math.PI * diff);
        const sinc1 = Math.sin(w1 * diff) / (Math.PI * diff);
        hIdeal[n] = sinc2 - sinc1;
      } else if (filterType === 'lowpass') {
        hIdeal[n] = Math.sin(w2 * diff) / (Math.PI * diff);
      } else { // highpass
        const sinc1 = Math.sin(w1 * diff) / (Math.PI * diff);
        hIdeal[n] = -sinc1;
      }
    }
  }

  // Apply Window
  const w = getWindowCoefficients(window, M);
  const coeffs = new Float64Array(M);
  for (let n = 0; n < M; n++) {
    coeffs[n] = hIdeal[n] * w[n];
  }

  // Normalize filter gain to 0 dB at center frequency
  const fCenter = (clampedFLow + clampedFHigh) / 2.0;
  const wCenter = (2.0 * Math.PI * fCenter) / fs;
  let reCenter = 0.0;
  let imCenter = 0.0;
  for (let n = 0; n < M; n++) {
    const angle = -wCenter * n;
    reCenter += coeffs[n] * Math.cos(angle);
    imCenter += coeffs[n] * Math.sin(angle);
  }
  const gainCenter = Math.sqrt(reCenter * reCenter + imCenter * imCenter);
  if (gainCenter > 1e-9) {
    for (let n = 0; n < M; n++) {
      coeffs[n] /= gainCenter;
    }
  }

  // Compute Frequency Response H(f)
  const freqs = new Float64Array(numEvalPoints);
  const magDb = new Float64Array(numEvalPoints);
  const phaseDeg = new Float64Array(numEvalPoints);

  const df = nyquist / (numEvalPoints - 1);
  const eps = 1e-12;

  for (let k = 0; k < numEvalPoints; k++) {
    const f = k * df;
    freqs[k] = f;
    const omega = (2.0 * Math.PI * f) / fs;

    let re = 0.0;
    let im = 0.0;
    for (let n = 0; n < M; n++) {
      const angle = -omega * n;
      re += coeffs[n] * Math.cos(angle);
      im += coeffs[n] * Math.sin(angle);
    }

    const mag = Math.sqrt(re * re + im * im);
    magDb[k] = 20.0 * Math.log10(Math.max(mag, eps));
    phaseDeg[k] = (Math.atan2(im, re) * 180.0) / Math.PI;
  }

  return {
    coeffs,
    freqs,
    magDb,
    phaseDeg,
    groupDelaySamples: alpha
  };
}

/**
 * Filter an input array with FIR coefficients.
 * Optional zero-phase / delay compensation shifts the signal backwards by alpha = (M-1)/2
 * so that the filtered seismic events line up with x[n] in the oscilloscope.
 */
export function applyFirFilter(
  signal: Float64Array,
  coeffs: Float64Array,
  compensateDelay: boolean = true
): Float64Array {
  const N = signal.length;
  const M = coeffs.length;
  const output = new Float64Array(N);
  const alpha = Math.floor((M - 1) / 2);

  // Standard causal convolution
  const temp = new Float64Array(N + M);
  for (let n = 0; n < N; n++) {
    const xVal = signal[n];
    if (xVal !== 0) {
      for (let k = 0; k < M; k++) {
        temp[n + k] += coeffs[k] * xVal;
      }
    }
  }

  if (compensateDelay) {
    // Shift by alpha to align peak phases
    for (let n = 0; n < N; n++) {
      output[n] = temp[n + alpha];
    }
  } else {
    for (let n = 0; n < N; n++) {
      output[n] = temp[n];
    }
  }

  return output;
}
