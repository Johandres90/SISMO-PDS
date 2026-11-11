import {
  SignalGeneratorParams,
  FirFilterParams,
  WelchParams,
  WindowType,
  HackathonGroupInfo,
  PerformanceMetrics
} from './types';

export function generatePythonScript(
  signalParams: SignalGeneratorParams,
  firParams: FirFilterParams,
  welchParams: WelchParams,
  selectedWindow: WindowType,
  groupInfo: HackathonGroupInfo,
  metrics: PerformanceMetrics
): string {
  const windowScipyMap: Record<WindowType, string> = {
    rectangular: "'boxcar'",
    hamming: "'hamming'",
    blackman_harris: "('blackmanharris')",
    hann: "'hann'"
  };

  const code = `"""
================================================================================
HACKATHON DE AUDITORÍA ESPECTRAL DE TELEMETRÍA SÍSMICA
FUNDACIÓN UNIVERSITARIA SAN MATEO - INGENIERÍA / PDS
--------------------------------------------------------------------------------
Grupo: ${groupInfo.groupNumber || 'Grupo 01'}
Integrantes: ${groupInfo.teamMembers || 'Equipo de Investigación Sísmica'}
Fecha de Generación: ${new Date().toLocaleString()}
Simulador: SISMOLOG-DSP v2.0
================================================================================
Parámetros de Calibración:
- Frecuencia de muestreo (fs): ${signalParams.fs} Hz
- Número de muestras (N): ${signalParams.N}
- Frecuencia portadora sísmica (f0): ${signalParams.f0} Hz
- Ventana espectral seleccionada: ${selectedWindow}
- Filtro FIR Pasa-Banda: [${firParams.fLow} Hz - ${firParams.fHigh} Hz], Orden M = ${firParams.taps}
- Ganancia SNR obtenida (Delta SNR): ${metrics.deltaSnrDb.toFixed(2)} dB
================================================================================
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy import signal
from scipy.signal import welch, firwin, lfilter

def ricker_wavelet(t_diff, f0):
    """Calcula el pulso de Ricker centrado."""
    p = np.pi * f0 * t_diff
    p2 = p ** 2
    return (1.0 - 2.0 * p2) * np.exp(-p2)

# ==========================================
# 1. PARÁMETROS GLOBALES Y GENERACIÓN DE SEÑAL
# ==========================================
fs = ${signalParams.fs}          # Frecuencia de muestreo (Hz)
N = ${signalParams.N}            # Longitud del registro
dt = 1.0 / fs                    # Período de muestreo (s)
t = np.arange(N) * dt            # Vector temporal (s)
f0 = ${signalParams.f0}          # Frecuencia portadora sísmica (Hz)
A_seismic = ${signalParams.seismicAmplitude}

# A. Generar componente sísmica útil pura s[n]
t_c1 = (N * dt) * 0.32
t_c2 = (N * dt) * 0.72

${
  signalParams.waveletType === 'ricker'
    ? `s_clean = A_seismic * (ricker_wavelet(t - t_c1, f0) + 0.6 * ricker_wavelet(t - t_c2, f0 * 1.1))`
    : signalParams.waveletType === 'exponential_decay'
    ? `dt1 = np.maximum(0, t - t_c1)
dt2 = np.maximum(0, t - t_c2)
s_clean = A_seismic * (np.exp(-dt1 * f0 * 0.8) * np.sin(2 * np.pi * f0 * dt1) + 
                      0.5 * np.exp(-dt2 * f0 * 0.9) * np.sin(2 * np.pi * f0 * 1.15 * dt2))`
    : `s_clean = A_seismic * np.sin(2 * np.pi * f0 * t)`
}

# B. Generar fuentes de ruido / interferencia electromagnética
noise = np.zeros(N)

# 1. Acople de red eléctrica de 60 Hz y armónicos
${
  signalParams.noise60HzEnabled
    ? `noise += ${signalParams.amp60Hz} * np.sin(2 * np.pi * 60.0 * t + 0.4)`
    : `# Acople 60 Hz desactivado`
}
${
  signalParams.noise60HzEnabled && signalParams.harmonicsEnabled
    ? `noise += (${signalParams.ampHarmonics} * 0.6) * np.sin(2 * np.pi * 120.0 * t + 1.1)
noise += (${signalParams.ampHarmonics} * 0.35) * np.sin(2 * np.pi * 180.0 * t + 2.3)`
    : `# Armónicos 120/180 Hz desactivados`
}

# 2. Ráfagas espurias de alta frecuencia (Wi-Fi / fuentes conmutadas)
${
  signalParams.burstNoiseEnabled
    ? `burst_centers = [(N * dt) * 0.25, (N * dt) * 0.65]
burst_dur = ${Math.max(0.005, signalParams.burstDurationMs / 1000.0)}
for b_c in burst_centers:
    dist = np.abs(t - b_c)
    mask = dist < burst_dur
    env = 0.5 * (1.0 + np.cos(np.pi * dist[mask] / burst_dur))
    noise[mask] += ${signalParams.burstAmp} * env * np.sin(2 * np.pi * ${signalParams.burstFreq} * t[mask])`
    : `# Ráfagas espurias desactivadas`
}

# 3. Ruido blanco gaussiano (AWGN)
${
  signalParams.awgnEnabled && signalParams.awgnStd > 0
    ? `noise += np.random.normal(0, ${signalParams.awgnStd}, N)`
    : `# AWGN desactivado`
}

# Señal total contaminada observada en la antena
x = s_clean + noise

# ==========================================
# 2. AUDITORÍA DEL CRITERIO DE NYQUIST
# ==========================================
f_max_teorico = ${metrics.fMaxPresent}
f_nyquist = fs / 2.0
cumple_nyquist = fs >= 2.0 * f_max_teorico
delta_f = fs / N

print("="*60)
print(f"REPORTE DE AUDITORÍA ESPECTRAL - {groupInfo.groupNumber || 'GRUPO 01'}")
print("="*60)
print(f"Frecuencia de muestreo (fs): {fs} Hz")
print(f"Frecuencia de Nyquist: {f_nyquist} Hz")
print(f"Máxima frecuencia activa en señal (f_max): {f_max_teorico} Hz")
print(f"Resolución espectral (Delta f): {delta_f:.4f} Hz")
print(f"Estado de Criterio de Nyquist: {'CUMPLE (Sin aliasing)' if cumple_nyquist else 'ALERTA: VIOLACIÓN DE NYQUIST (Existe aliasing)'}")

# ==========================================
# 3. DISEÑO DE FILTRO FIR PASA-BANDA (VENTANADO)
# ==========================================
num_taps = ${firParams.taps % 2 === 0 ? firParams.taps + 1 : firParams.taps}
f_low = ${firParams.fLow}
f_high = ${firParams.fHigh}
window_fir = ${windowScipyMap[firParams.window] || "'hamming'"}

# Coeficientes FIR usando scipy.signal.firwin
b = firwin(num_taps, [f_low, f_high], pass_zero='bandpass', fs=fs, window=window_fir)

# Filtrado de señal
y = lfilter(b, 1.0, x)
# Compensación de retardo de grupo para alineación temporal perfecta
delay = (num_taps - 1) // 2
y_aligned = np.roll(y, -delay)

# Filtrado individual para cálculo de potencias puras y métricas SNR
s_filt = lfilter(b, 1.0, s_clean)
n_filt = lfilter(b, 1.0, noise)

p_signal_in = np.mean(s_clean**2)
p_noise_in = np.mean(noise**2)
snr_in_db = 10.0 * np.log10(p_signal_in / max(p_noise_in, 1e-12))

p_signal_out = np.mean(s_filt**2)
p_noise_out = np.mean(n_filt**2)
snr_out_db = 10.0 * np.log10(p_signal_out / max(p_noise_out, 1e-12))

delta_snr = snr_out_db - snr_in_db

print("-" * 60)
print("MÉTRICAS DE DESEMPEÑO DEL FILTRADO FIR:")
print(f"SNR de Entrada: {snr_in_db:.2f} dB")
print(f"SNR de Salida:  {snr_out_db:.2f} dB")
print(f"GANANCIA DE SNR (Delta SNR): {delta_snr:.2f} dB")
print("=" * 60)

# ==========================================
# 4. ESTIMACIÓN PSD (MÉTODO DE WELCH)
# ==========================================
nperseg = ${welchParams.windowSize}
noverlap = int(nperseg * 0.5)

f_welch_raw, pxx_raw = welch(x, fs=fs, window=${windowScipyMap[welchParams.window] || "'hamming'"}, nperseg=nperseg, noverlap=noverlap)
f_welch_filt, pxx_filt = welch(y, fs=fs, window=${windowScipyMap[welchParams.window] || "'hamming'"}, nperseg=nperseg, noverlap=noverlap)

# ==========================================
# 5. VISUALIZACIÓN MULTIPANEL
# ==========================================
fig, axs = plt.subplots(2, 2, figsize=(14, 9))
fig.suptitle(f"Auditoría Espectral de Telemetría Sísmica - {groupInfo.groupNumber || 'Grupo 01'}\\n"
             f"fs={fs}Hz | f0={f0}Hz | FIR=[{f_low}-{f_high}]Hz | Delta SNR = {delta_snr:.2f} dB", fontsize=12, fontweight='bold')

# Panel 1: Dominio Temporal (Osciloscopio)
axs[0, 0].plot(t[:min(1000, N)], x[:min(1000, N)], color='orange', alpha=0.6, label='Bruta Contaminada x[n]')
axs[0, 0].plot(t[:min(1000, N)], y_aligned[:min(1000, N)], color='cyan', linewidth=1.5, label='Filtrada FIR y[n]')
axs[0, 0].set_title("1. Dominio Temporal (Osciloscopio)")
axs[0, 0].set_xlabel("Tiempo (s)")
axs[0, 0].set_ylabel("Amplitud")
axs[0, 0].grid(True, alpha=0.3)
axs[0, 0].legend()

# Panel 2: FFT y Mitigación de Spectral Leakage
w_rect = np.ones(N)
w_hamm = np.hamming(N)
w_bh = signal.windows.blackmanharris(N)

X_rect = np.abs(np.fft.rfft(x * w_rect)) / (N / 2)
X_hamm = np.abs(np.fft.rfft(x * w_hamm)) / (np.sum(w_hamm) / 2)
X_bh = np.abs(np.fft.rfft(x * w_bh)) / (np.sum(w_bh) / 2)
freqs_fft = np.fft.rfftfreq(N, d=dt)

axs[0, 1].plot(freqs_fft, 20*np.log10(np.maximum(X_rect, 1e-6)), color='red', alpha=0.5, label='Rectangular (Leakage alto)')
axs[0, 1].plot(freqs_fft, 20*np.log10(np.maximum(X_hamm, 1e-6)), color='yellow', alpha=0.7, label='Hamming (-43dB)')
axs[0, 1].plot(freqs_fft, 20*np.log10(np.maximum(X_bh, 1e-6)), color='lime', linewidth=1.4, label='Blackman-Harris (-92dB)')
axs[0, 1].set_title("2. Análisis de Ventanado & Mitigación de Fuga")
axs[0, 1].set_xlabel("Frecuencia (Hz)")
axs[0, 1].set_ylabel("Magnitud (dB)")
axs[0, 1].set_ylim([-90, 20])
axs[0, 1].grid(True, alpha=0.3)
axs[0, 1].legend()

# Panel 3: PSD Método de Welch
axs[1, 0].semilogy(f_welch_raw, pxx_raw, color='salmon', alpha=0.7, label='PSD Bruta')
axs[1, 0].semilogy(f_welch_filt, pxx_filt, color='deepskyblue', linewidth=1.5, label='PSD Filtrada')
axs[1, 0].axvline(f0, color='lime', linestyle='--', label=f'Portadora f0={f0}Hz')
axs[1, 0].axvline(60, color='red', linestyle=':', label='Ruido Red 60Hz')
axs[1, 0].set_title("3. Densidad Espectral de Potencia (Welch PSD)")
axs[1, 0].set_xlabel("Frecuencia (Hz)")
axs[1, 0].set_ylabel("PSD (V²/Hz)")
axs[1, 0].grid(True, alpha=0.3)
axs[1, 0].legend()

# Panel 4: Respuesta en Frecuencia Filtro FIR
w_eval, h_eval = signal.freqz(b, worN=512, fs=fs)
axs[1, 1].plot(w_eval, 20 * np.log10(np.maximum(np.abs(h_eval), 1e-5)), color='cyan', linewidth=1.8, label='Magnitud |H(f)|')
axs[1, 1].axvspan(f_low, f_high, color='cyan', alpha=0.15, label='Banda de Paso')
axs[1, 1].axvline(60, color='red', linestyle=':', alpha=0.8, label='Atenuación 60Hz')
axs[1, 1].set_title("4. Respuesta en Frecuencia FIR Pasa-Banda")
axs[1, 1].set_xlabel("Frecuencia (Hz)")
axs[1, 1].set_ylabel("Ganancia (dB)")
axs[1, 1].set_ylim([-80, 5])
axs[1, 1].grid(True, alpha=0.3)
axs[1, 1].legend()

plt.tight_layout()
plt.show()
`;

  return code;
}
