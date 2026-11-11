import { SignalGeneratorParams, SeismicWaveletType } from './types';

// Pseudo-random Gaussian generator (Box-Muller transform)
export class GaussianRandom {
  private hasSpare: boolean = false;
  private spare: number = 0;

  public next(mean: number = 0, std: number = 1): number {
    if (this.hasSpare) {
      this.hasSpare = false;
      return mean + std * this.spare;
    }
    this.hasSpare = true;
    let u = 0, v = 0, s = 0;
    do {
      u = Math.random() * 2 - 1;
      v = Math.random() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const mul = Math.sqrt(-2.0 * Math.log(s) / s);
    this.spare = v * mul;
    return mean + std * (u * mul);
  }
}

/**
 * Computes Ricker wavelet value at time delta (t - t0)
 */
export function rickerWavelet(tDiff: number, f0: number): number {
  const p = Math.PI * f0 * tDiff;
  const p2 = p * p;
  return (1.0 - 2.0 * p2) * Math.exp(-p2);
}

export interface SyntheticSignalOutput {
  time: Float64Array;
  cleanSeismic: Float64Array;
  noiseComponent: Float64Array;
  rawSignal: Float64Array;
  fMaxPresent: number;
}

export function generateSyntheticTelemetry(
  params: SignalGeneratorParams,
  seedRandom: boolean = false
): SyntheticSignalOutput {
  const {
    fs,
    N,
    f0,
    seismicAmplitude,
    waveletType,
    noise60HzEnabled,
    amp60Hz,
    harmonicsEnabled,
    ampHarmonics,
    burstNoiseEnabled,
    burstFreq,
    burstAmp,
    burstDurationMs,
    awgnEnabled,
    awgnStd
  } = params;

  const dt = 1.0 / fs;
  const totalDuration = N * dt;

  const time = new Float64Array(N);
  const cleanSeismic = new Float64Array(N);
  const noiseComponent = new Float64Array(N);
  const rawSignal = new Float64Array(N);

  const rng = new GaussianRandom();

  // Determine active highest frequency to evaluate Nyquist
  let fMaxPresent = f0;
  if (noise60HzEnabled) {
    if (60 > fMaxPresent) fMaxPresent = 60;
    if (harmonicsEnabled) {
      if (180 > fMaxPresent) fMaxPresent = 180;
    }
  }
  if (burstNoiseEnabled) {
    if (burstFreq > fMaxPresent) fMaxPresent = burstFreq;
  }

  // Pre-calculate Wi-Fi / switching bursts positions in time
  // E.g. burst every ~35% and ~75% of total duration or repetitive beacon
  const burstIntervalSec = totalDuration * 0.4;
  const burstDurationSec = Math.max(0.005, burstDurationMs / 1000.0);
  const burstCenters = [totalDuration * 0.25, totalDuration * 0.65];

  // Seismic event centers: main shock at 30% and aftershock at 70%
  const seismicCenter1 = totalDuration * 0.32;
  const seismicCenter2 = totalDuration * 0.72;

  for (let n = 0; n < N; n++) {
    const t = n * dt;
    time[n] = t;

    // 1. GENERATE SEISMIC SIGNAL
    let sVal = 0.0;
    switch (waveletType) {
      case 'ricker': {
        const w1 = rickerWavelet(t - seismicCenter1, f0);
        const w2 = 0.6 * rickerWavelet(t - seismicCenter2, f0 * 1.1);
        sVal = seismicAmplitude * (w1 + w2);
        break;
      }
      case 'exponential_decay': {
        // P/S wave packet: rising front and exponential decay
        const dt1 = t - seismicCenter1;
        const dt2 = t - seismicCenter2;
        let p1 = 0;
        let p2 = 0;
        if (dt1 >= 0) {
          p1 = Math.exp(-dt1 * f0 * 0.8) * Math.sin(2 * Math.PI * f0 * dt1);
        }
        if (dt2 >= 0) {
          p2 = 0.5 * Math.exp(-dt2 * f0 * 0.9) * Math.sin(2 * Math.PI * f0 * 1.15 * dt2);
        }
        sVal = seismicAmplitude * (p1 + p2);
        break;
      }
      case 'modulated_sine': {
        // Seismic wave train modulated by gaussian envelope
        const env1 = Math.exp(-Math.pow((t - seismicCenter1) / (3.0 / f0), 2));
        const env2 = 0.5 * Math.exp(-Math.pow((t - seismicCenter2) / (2.5 / f0), 2));
        sVal = seismicAmplitude * (env1 * Math.sin(2 * Math.PI * f0 * t) + env2 * Math.sin(2 * Math.PI * f0 * 1.05 * t + 0.5));
        break;
      }
      case 'continuous_burst':
      default: {
        // Continuous oscillatory telemetry carrier with slight tremor
        const tremor = 1.0 + 0.15 * Math.sin(2 * Math.PI * 0.5 * t);
        sVal = seismicAmplitude * tremor * Math.sin(2 * Math.PI * f0 * t);
        break;
      }
    }
    cleanSeismic[n] = sVal;

    // 2. GENERATE ELECTROMAGNETIC INTERFERENCES & NOISE
    let noiseVal = 0.0;

    // A) 60 Hz Power line coupling
    if (noise60HzEnabled) {
      // 60 Hz hum with phase drift
      noiseVal += amp60Hz * Math.sin(2 * Math.PI * 60.0 * t + 0.4);
      
      // Harmonics 120 Hz and 180 Hz from fluorescent ballasts/rectifiers
      if (harmonicsEnabled) {
        noiseVal += (ampHarmonics * 0.6) * Math.sin(2 * Math.PI * 120.0 * t + 1.1);
        noiseVal += (ampHarmonics * 0.35) * Math.sin(2 * Math.PI * 180.0 * t + 2.3);
      }
    }

    // B) Wi-Fi bursts / High-frequency switching
    if (burstNoiseEnabled) {
      for (const bCenter of burstCenters) {
        const bDist = Math.abs(t - bCenter);
        if (bDist < burstDurationSec) {
          // Packet burst window (Tukey or Hann envelope)
          const env = 0.5 * (1.0 + Math.cos((Math.PI * bDist) / burstDurationSec));
          const burstCarrier = Math.sin(2 * Math.PI * burstFreq * t);
          // High frequency transients
          noiseVal += burstAmp * env * burstCarrier;
        }
      }
    }

    // C) AWGN (Additive White Gaussian Noise)
    if (awgnEnabled && awgnStd > 0) {
      noiseVal += rng.next(0, awgnStd);
    }

    noiseComponent[n] = noiseVal;
    rawSignal[n] = sVal + noiseVal;
  }

  return {
    time,
    cleanSeismic,
    noiseComponent,
    rawSignal,
    fMaxPresent
  };
}
