import { WindowType, WindowMetrics } from './types';

export function getWindowCoefficients(type: WindowType, N: number): Float64Array {
  const w = new Float64Array(N);
  if (N <= 0) return w;
  if (N === 1) {
    w[0] = 1.0;
    return w;
  }

  const denom = N - 1;
  const twoPi = 2.0 * Math.PI;

  switch (type) {
    case 'rectangular':
      w.fill(1.0);
      break;

    case 'hamming':
      for (let n = 0; n < N; n++) {
        w[n] = 0.54 - 0.46 * Math.cos((twoPi * n) / denom);
      }
      break;

    case 'blackman_harris':
      // 4-term Blackman-Harris (Nutall / Blackman-Harris 92dB)
      const a0 = 0.35875;
      const a1 = 0.48829;
      const a2 = 0.14128;
      const a3 = 0.01168;
      for (let n = 0; n < N; n++) {
        const theta = (twoPi * n) / denom;
        w[n] = a0 - a1 * Math.cos(theta) + a2 * Math.cos(2 * theta) - a3 * Math.cos(3 * theta);
      }
      break;

    case 'hann':
      for (let n = 0; n < N; n++) {
        w[n] = 0.5 * (1.0 - Math.cos((twoPi * n) / denom));
      }
      break;
  }

  return w;
}

export function computeWindowGains(w: Float64Array): { s1: number; s2: number; enbw: number } {
  let s1 = 0;
  let s2 = 0;
  const N = w.length;
  for (let i = 0; i < N; i++) {
    const val = w[i];
    s1 += val;
    s2 += val * val;
  }
  const enbw = s1 !== 0 ? (N * s2) / (s1 * s1) : 1;
  return { s1, s2, enbw };
}

export function getWindowMetrics(type: WindowType, N: number): WindowMetrics {
  const w = getWindowCoefficients(type, N);
  const { s1, s2 } = computeWindowGains(w);

  switch (type) {
    case 'rectangular':
      return {
        name: 'rectangular',
        label: 'Rectangular (Dirichlet)',
        mainlobeWidthBins: 2.0,
        sidelobeAttenuationDb: -13.3,
        scallopingLossDb: 3.92,
        coherentGain: s1 / N,
        powerGain: s2 / N
      };
    case 'hamming':
      return {
        name: 'hamming',
        label: 'Hamming (Cos 0.54/0.46)',
        mainlobeWidthBins: 4.0,
        sidelobeAttenuationDb: -42.7,
        scallopingLossDb: 1.78,
        coherentGain: s1 / N,
        powerGain: s2 / N
      };
    case 'blackman_harris':
      return {
        name: 'blackman_harris',
        label: 'Blackman-Harris (4-term 92dB)',
        mainlobeWidthBins: 8.0,
        sidelobeAttenuationDb: -92.0,
        scallopingLossDb: 0.83,
        coherentGain: s1 / N,
        powerGain: s2 / N
      };
    case 'hann':
      return {
        name: 'hann',
        label: 'Hann (Hanning)',
        mainlobeWidthBins: 4.0,
        sidelobeAttenuationDb: -31.5,
        scallopingLossDb: 1.42,
        coherentGain: s1 / N,
        powerGain: s2 / N
      };
  }
}
