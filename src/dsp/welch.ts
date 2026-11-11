import { WelchParams, SpectralPeak } from './types';
import { getWindowCoefficients, computeWindowGains } from './windows';
import { fftRadix2, nextPowerOf2, isPowerOf2 } from './fft';

export interface WelchResult {
  freqs: Float64Array;
  psdLinear: Float64Array;
  psdDb: Float64Array;
  peaks: SpectralPeak[];
}

export function computeWelchPSD(
  signal: Float64Array,
  fs: number,
  params: WelchParams,
  expectedF0?: number
): WelchResult {
  const N = signal.length;
  let L = params.windowSize;
  if (!isPowerOf2(L)) {
    L = nextPowerOf2(L);
  }
  if (L > N) {
    L = Math.max(64, nextPowerOf2(Math.floor(N / 2)));
  }

  const step = Math.floor(L * (1.0 - (params.overlapPercent / 100.0)));
  const w = getWindowCoefficients(params.window, L);
  const { s2 } = computeWindowGains(w);

  const numSegments = Math.max(1, Math.floor((N - L) / step) + 1);
  const halfL = (L >> 1) + 1;
  const psdAccum = new Float64Array(halfL);

  const segReal = new Float64Array(L);
  const segImag = new Float64Array(L);

  for (let k = 0; k < numSegments; k++) {
    const startIdx = k * step;
    for (let n = 0; n < L; n++) {
      segReal[n] = signal[startIdx + n] * w[n];
      segImag[n] = 0.0;
    }

    fftRadix2(segReal, segImag, false);

    // Periodogram scaling: 1 / (fs * s2)
    const norm = 1.0 / (fs * s2);

    for (let i = 0; i < halfL; i++) {
      const r = segReal[i];
      const im = segImag[i];
      let p = (r * r + im * im) * norm;
      // Single-sided adjustment: double power for bins between 0 and Nyquist
      if (i > 0 && i < halfL - 1) {
        p *= 2.0;
      }
      psdAccum[i] += p;
    }
  }

  const freqs = new Float64Array(halfL);
  const psdLinear = new Float64Array(halfL);
  const psdDb = new Float64Array(halfL);
  const df = fs / L;

  const eps = 1e-15;
  for (let i = 0; i < halfL; i++) {
    freqs[i] = i * df;
    const avgPsd = psdAccum[i] / numSegments;
    psdLinear[i] = avgPsd;
    psdDb[i] = 10.0 * Math.log10(Math.max(avgPsd, eps));
  }

  // Automatic Peak Detection
  const peaks = detectSpectralPeaks(freqs, psdDb, expectedF0);

  return {
    freqs,
    psdLinear,
    psdDb,
    peaks
  };
}

function detectSpectralPeaks(
  freqs: Float64Array,
  psdDb: Float64Array,
  expectedF0?: number
): SpectralPeak[] {
  const peaks: SpectralPeak[] = [];
  const len = psdDb.length;
  if (len < 5) return peaks;

  // Find dynamic threshold
  let maxDb = -999;
  let minDb = 999;
  for (let i = 0; i < len; i++) {
    if (psdDb[i] > maxDb) maxDb = psdDb[i];
    if (psdDb[i] < minDb) minDb = psdDb[i];
  }
  const threshold = maxDb - 35.0; // Peak within 35 dB of maximum

  const candidatePeaks: { idx: number; freq: number; powerDb: number }[] = [];

  for (let i = 2; i < len - 2; i++) {
    const val = psdDb[i];
    if (val > threshold && val > psdDb[i - 1] && val > psdDb[i + 1] && val > psdDb[i - 2] && val > psdDb[i + 2]) {
      candidatePeaks.push({
        idx: i,
        freq: freqs[i],
        powerDb: val
      });
    }
  }

  // Sort descending by power
  candidatePeaks.sort((a, b) => b.powerDb - a.powerDb);

  // Take top peaks and label them
  const topCandidates = candidatePeaks.slice(0, 6);

  for (const cand of topCandidates) {
    const f = cand.freq;
    let label = `${f.toFixed(1)} Hz`;
    let isSeismic = false;
    let isInterference = false;

    // Check if close to 60 Hz or harmonics
    if (Math.abs(f - 60) <= 3.0) {
      label = `Interferencia Red (60 Hz)`;
      isInterference = true;
    } else if (Math.abs(f - 120) <= 4.0) {
      label = `Armónico Red (120 Hz)`;
      isInterference = true;
    } else if (Math.abs(f - 180) <= 5.0) {
      label = `Armónico Red (180 Hz)`;
      isInterference = true;
    } else if (expectedF0 && Math.abs(f - expectedF0) <= Math.max(4.0, expectedF0 * 0.15)) {
      label = `Portadora Sísmica (${f.toFixed(1)} Hz)`;
      isSeismic = true;
    } else if (f > 190) {
      label = `Espurio Ráfaga Wi-Fi (${f.toFixed(1)} Hz)`;
      isInterference = true;
    } else {
      label = `Componente ${f.toFixed(1)} Hz`;
    }

    peaks.push({
      freq: Math.round(f * 10) / 10,
      powerDb: Math.round(cand.powerDb * 10) / 10,
      label,
      isSeismic,
      isInterference
    });
  }

  return peaks;
}
