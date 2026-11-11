/**
 * High-performance Radix-2 Cooley-Tukey FFT implementation
 * Uses TypedArrays for in-place or optimized bit-reversal and butterfly operations.
 */

export function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) {
    p <<= 1;
  }
  return p;
}

export function isPowerOf2(n: number): boolean {
  return (n > 0) && ((n & (n - 1)) === 0);
}

/**
 * Complex FFT in-place on Float64Arrays (real & imag)
 * Length N MUST be a power of 2.
 * invert = true computes IFFT (scaled by 1/N).
 */
export function fftRadix2(real: Float64Array, imag: Float64Array, invert: boolean = false): void {
  const n = real.length;
  if (!isPowerOf2(n)) {
    throw new Error(`FFT length must be a power of 2, received ${n}`);
  }

  // Bit reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      const tempI = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = tempR;
      imag[j] = tempI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey decimation in time
  const pi = invert ? Math.PI : -Math.PI;
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (2 * pi) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1.0;
      let wI = 0.0;
      for (let k = 0; k < halfLen; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];

        const vR = real[i + k + halfLen] * wR - imag[i + k + halfLen] * wI;
        const vI = real[i + k + halfLen] * wI + imag[i + k + halfLen] * wR;

        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;

        real[i + k + halfLen] = uR - vR;
        imag[i + k + halfLen] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }

  // Scaling if IFFT
  if (invert) {
    const scale = 1 / n;
    for (let i = 0; i < n; i++) {
      real[i] *= scale;
      imag[i] *= scale;
    }
  }
}

/**
 * Computes single-sided FFT spectrum of real input signal
 * with optional zero-padding to targetN (power of 2)
 */
export function computeRealFftSpectrum(
  signal: Float64Array,
  fs: number,
  targetN?: number
): {
  freqs: Float64Array;
  mag: Float64Array;
  magDb: Float64Array;
  phase: Float64Array;
  real: Float64Array;
  imag: Float64Array;
} {
  const originalN = signal.length;
  const N = targetN ? nextPowerOf2(targetN) : (isPowerOf2(originalN) ? originalN : nextPowerOf2(originalN));
  
  const real = new Float64Array(N);
  const imag = new Float64Array(N);
  real.set(signal.subarray(0, Math.min(originalN, N)));

  fftRadix2(real, imag, false);

  const halfN = (N >> 1) + 1;
  const freqs = new Float64Array(halfN);
  const mag = new Float64Array(halfN);
  const magDb = new Float64Array(halfN);
  const phase = new Float64Array(halfN);

  const df = fs / N;
  let maxMag = 1e-12;

  for (let k = 0; k < halfN; k++) {
    freqs[k] = k * df;
    const r = real[k];
    const i = imag[k];
    const m = Math.sqrt(r * r + i * i);
    // Scale for single-sided spectrum: DC and Nyquist x1, other bins x2, normalized by originalN
    const scaleFactor = (k === 0 || k === halfN - 1) ? (1.0 / originalN) : (2.0 / originalN);
    const scaledMag = m * scaleFactor;
    mag[k] = scaledMag;
    if (scaledMag > maxMag) maxMag = scaledMag;

    phase[k] = Math.atan2(i, r);
  }

  // Convert to dB relative to full scale / peak
  const eps = 1e-12;
  for (let k = 0; k < halfN; k++) {
    const normalized = Math.max(mag[k], eps);
    // Relative to 1.0 or normalized peak
    magDb[k] = 20 * Math.log10(normalized);
  }

  return { freqs, mag, magDb, phase, real, imag };
}
