# SISMOLOG-DSP | Simulador & Dashboard de Telemetría y Análisis Espectral

**Hackathon de Auditoría Espectral de Telemetría Sísmica**  
*Fundación Universitaria San Mateo — Procesamiento Digital de Señales (PDS)*

---

## 🛰️ 1. Descripción del Sistema

**SISMOLOG-DSP** es una aplicación web interactiva (SPA) de grado profesional diseñada con arquitectura reactiva de alto rendimiento y estética **"Mission Control / Telemetry Center"** (tema oscuro `slate-950`, acentos en cyan, amber, emerald y violet, tipografías monoespaciadas para telemetría).

El sistema simula en tiempo real la señal de telemetría de una antena antisísmica afectada por el entorno electromagnético típico de aula de clase:
- **Acople de red eléctrica de 60 Hz** y armónicos de rectificación (120 Hz, 180 Hz).
- **Ráfagas espurias de alta frecuencia** (conmutación digital / paquetes Wi-Fi).
- **Ruido blanco gaussiano** (AWGN).

Permite auditar el **Criterio de Nyquist**, experimentar la **mitigación de fuga espectral (*spectral leakage*)** mediante ventanado matemático, estimar la **Densidad Espectral de Potencia (PSD)** con el método de Welch al 50% de solapamiento, diseñar e implementar un **filtro digital FIR pasa-banda de fase lineal** y cuantificar la ganancia de relación señal a ruido ($\Delta \text{SNR}_{\text{dB}}$).

---

## ⚡ 2. Módulos Implementados

### A. Barra Superior de Control y Estado
- **Cronómetro de Misión:** Temporizador de 150 minutos dividido en las 4 fases del Hackathon con barra de progreso reactiva.
- **Telemetría Global en Vivo:** Frecuencia de muestreo ($f_s$), número de muestras ($N$) y resolución espectral calculada ($\Delta f = f_s / N$).
- **Alerta Interactiva de Aliasing:**
  - `NYQUIST OK` (verde esmeralda): si $f_s \ge 2 f_{\max}$.
  - `¡ALIASING DETECTADO!` (rojo parpadeante animado): si se viola el criterio de Nyquist, alertando sobre frecuencias imagen en banda base.

### B. Generador Sintético & Entorno de Aula
- **Señal Sísmica Útil:** Portadora $f_0 \in [1, 150]\text{ Hz}$, amplitud pico y morfología de eventos sísmicos (*Pulso Ricker*, *Decay Exponencial*, *Modulada Gaussiana*, *Senoidal Continua*).
- **Fuentes de Ruido Electromagnético:** Toggles y sliders para acople de 60 Hz, armónicos (120 y 180 Hz), ráfagas Wi-Fi de alta frecuencia y ruido AWGN.
- **Filtro FIR Pasa-Banda:** Ajuste de frecuencias de corte $f_{low}$, $f_{high}$, orden $M$ (taps) y función de ventana.
- **Presets Rápidos:**
  1. *Caso Base: Aula Estándar*
  2. *Interferencia Severa 60 Hz*
  3. *Ráfagas Wi-Fi + Transitorios*
  4. *Experimento de Aliasing (fs < 2·fmax)*
  5. *Solución Óptima Hackathon (Máxima ganancia ΔSNR)*

### C. Núcleo DSP (Visualización 2x2 o Pestañas)
1. **Osciloscopio Temporal:** Señal bruta contaminada $x[n]$ vs. señal filtrada $y[n]$ vs. componente sísmica pura $s[n]$, con zoom interactivo ($1\times$ a $16\times$), paneo temporal y cursores milimétricos.
2. **Espectro FFT & Spectral Leakage:** Selector interactivo de ventanas (*Rectangular*, *Hamming*, *Blackman-Harris*, *Hann*), medidor de atenuación de lóbulos secundarios en dB (-13 dB, -43 dB, -92 dB) y modo de superposición comparativa.
3. **Densidad Espectral de Potencia (Welch PSD):** Segmentos con $50\%$ de overlap, normalización con $S_2 = \sum w^2[n]$, identificador automático de picos flotantes (*Portadora Sísmica*, *Red 60 Hz*, *Armónicos*, *Wi-Fi*).
4. **Filtro FIR Pasa-Banda & Balance SNR:** Visualización de la respuesta en magnitud $|H(f)|$ en dB, curva de fase lineal, coeficientes impulsionales $h[n]$ y panel de métricas ($\text{SNR}_{in}$, $\text{SNR}_{out}$, $\Delta\text{SNR}_{\text{dB}}$).

### D. Módulo de Despacho y Protocolo de Envío
- **Generador de Resumen Ejecutivo Automático:** Redacción técnica estricta de máximo 150 palabras con botón de copiado inmediato.
- **Descarga de Script Python (`.py`):** Archivo `script_pds_grupoX.py` 100% funcional con NumPy, SciPy (`scipy.signal.welch`, `scipy.signal.firwin`, `scipy.signal.lfilter`) y Matplotlib, listo para ejecutar en terminal.
- **Exportación de Informe Técnico (`.pdf`):** Vista de impresión profesional estructurada con membrete institucional de la San Mateo, tablas numéricas de parámetros, análisis teórico y firmas.

---

## 🚀 3. Instrucciones de Ejecución

### Requisitos
- Node.js 18+ (recomendado Node 20+)
- npm 9+

### Ejecución en Desarrollo
```bash
npm run dev
```
Abre en tu navegador la URL indicada (usualmente `http://localhost:5173`).

### Compilación para Producción
```bash
npm run build
npm run preview
```

---

## 🧪 4. Ejecución del Script Python Descargado

El script generado desde la interfaz es autocontenido y reproduce idénticamente todas las gráficas y cálculos de SNR:
```bash
pip install numpy scipy matplotlib
python script_pds_grupo01.py
```
