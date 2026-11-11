import React from 'react';
import {
  SignalGeneratorParams,
  FirFilterParams,
  WindowType,
  PerformanceMetrics,
  HackathonGroupInfo,
  SpectralPeak,
  WindowMetrics
} from '../dsp/types';
import { generateExecutiveSummary } from '../dsp/summaryGenerator';
import { Printer, X, Download, ShieldCheck, Award, FileText } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  signalParams: SignalGeneratorParams;
  firParams: FirFilterParams;
  selectedWindow: WindowType;
  metrics: PerformanceMetrics;
  groupInfo: HackathonGroupInfo;
  peaks: SpectralPeak[];
  windowMetricsList: WindowMetrics[];
  onDownloadPython: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  signalParams,
  firParams,
  selectedWindow,
  metrics,
  groupInfo,
  peaks,
  windowMetricsList,
  onDownloadPython
}) => {
  if (!isOpen) return null;

  const { text: summaryText, wordCount } = generateExecutiveSummary(
    signalParams,
    firParams,
    selectedWindow,
    metrics,
    groupInfo
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6 print:p-0 print:static print:bg-white print:text-black">
      {/* Modal Dialog Window */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col my-auto overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:bg-white print:text-black">
        {/* Action Header bar (Hidden when printing) */}
        <div className="flex items-center justify-between p-3 bg-slate-950 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-slate-200">
              VISTA PREVIA DEL INFORME TÉCNICO DE AUDITORÍA ESPECTRAL
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono text-xs font-bold flex items-center gap-1.5 shadow transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / Guardar en PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 md:p-10 space-y-6 text-slate-200 font-sans text-xs bg-slate-900 overflow-y-auto max-h-[82vh] print:max-h-none print:p-0 print:bg-white print:text-slate-900">
          
          {/* Institutional Header */}
          <div className="border-b-2 border-slate-600 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:border-slate-800">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-cyan-300 print:text-slate-900">
                FUNDACIÓN UNIVERSITARIA SAN MATEO
              </h2>
              <h3 className="text-xs font-semibold text-slate-300 print:text-slate-700">
                FACULTAD DE INGENIERÍA Y CIENCIAS AFINES
              </h3>
              <p className="text-[11px] text-slate-400 print:text-slate-600">
                Laboratorio de Procesamiento Digital de Señales (PDS) | Hackathon 2026
              </p>
            </div>
            <div className="text-right font-mono text-[11px] bg-slate-950/80 p-2.5 rounded border border-slate-800 print:bg-slate-100 print:border-slate-300 print:text-slate-800">
              <div><strong className="text-cyan-400 print:text-slate-900">{groupInfo.groupNumber || 'Grupo 01'}</strong></div>
              <div>Fecha: {new Date().toLocaleDateString('es-CO')}</div>
              <div>ID Telemetría: SISMOLOG-PDS-774</div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center py-2">
            <h1 className="text-base sm:text-lg font-bold uppercase tracking-tight text-white print:text-slate-950">
              INFORME DE AUDITORÍA ESPECTRAL Y MITIGACIÓN DE INTERFERENCIA EN TELEMETRÍA SÍSMICA
            </h1>
            <p className="text-xs text-slate-400 mt-1 print:text-slate-600">
              Integrantes: <strong className="text-slate-200 print:text-slate-800">{groupInfo.teamMembers || 'Equipo de Investigación Sísmica'}</strong>
            </p>
          </div>

          {/* Section 1: Executive Summary */}
          <section className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-700 pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-slate-900">
                1. RESUMEN EJECUTIVO (RÚBRICA DE EVALUACIÓN)
              </h3>
              <span className="font-mono text-[10px] text-emerald-400 print:text-slate-700">
                {wordCount} palabras (Máximo 150)
              </span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded border border-slate-800 italic leading-relaxed text-slate-300 print:bg-slate-50 print:border-slate-300 print:text-slate-800">
              "{summaryText}"
            </div>
          </section>

          {/* Section 2: Nyquist & Sampling Audit */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-slate-900 border-b border-slate-700 pb-1">
              2. AUDITORÍA DEL CRITERIO DE NYQUIST & PARÁMETROS GLOBALES
            </h3>
            <table className="w-full font-mono text-[11px] border border-slate-800 print:border-slate-300">
              <thead className="bg-slate-950 print:bg-slate-200 print:text-slate-900">
                <tr>
                  <th className="p-2 text-left border-b border-slate-800 print:border-slate-300">Parámetro</th>
                  <th className="p-2 text-center border-b border-slate-800 print:border-slate-300">Valor Numérico</th>
                  <th className="p-2 text-left border-b border-slate-800 print:border-slate-300">Interpretación Física / Teórica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-300">
                <tr>
                  <td className="p-2 font-semibold">Frecuencia de Muestreo (fs)</td>
                  <td className="p-2 text-center text-cyan-300 print:text-slate-900">{signalParams.fs} Hz</td>
                  <td className="p-2 text-slate-400 print:text-slate-700">Tasa de adquisición del convertidor ADC.</td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold">Frecuencia de Nyquist (f_Nyq)</td>
                  <td className="p-2 text-center text-cyan-300 print:text-slate-900">{metrics.nyquistFreq.toFixed(1)} Hz</td>
                  <td className="p-2 text-slate-400 print:text-slate-700">Límite teórico superior libre de solapamiento.</td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold">Máxima Frecuencia Activa (f_max)</td>
                  <td className="p-2 text-center text-amber-300 print:text-slate-900">{metrics.fMaxPresent.toFixed(1)} Hz</td>
                  <td className="p-2 text-slate-400 print:text-slate-700">Determinada por espurios Wi-Fi y armónicos de red.</td>
                </tr>
                <tr>
                  <td className="p-2 font-semibold">Resolución Espectral (Δf = fs / N)</td>
                  <td className="p-2 text-center text-slate-200 print:text-slate-900">{metrics.spectralResolution.toFixed(3)} Hz</td>
                  <td className="p-2 text-slate-400 print:text-slate-700">Capacidad para discernir dos frecuencias adyacentes.</td>
                </tr>
                <tr className={metrics.nyquistSatisfied ? 'bg-emerald-950/20 print:bg-emerald-50' : 'bg-red-950/20 print:bg-red-50'}>
                  <td className="p-2 font-bold">Estado del Criterio de Nyquist</td>
                  <td className="p-2 text-center font-bold" colSpan={2}>
                    {metrics.nyquistSatisfied
                      ? `✓ CUMPLE: fs (${signalParams.fs} Hz) >= 2 × f_max (${(2 * metrics.fMaxPresent).toFixed(1)} Hz). No existe aliasing.`
                      : `✗ ALERTA: VIOLACIÓN CRÍTICA (fs < 2 × f_max). Presencia de aliasing y frecuencias fantasma reflejadas.`}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section 3: Spectral Leakage & Windowing Analysis */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-slate-900 border-b border-slate-700 pb-1">
              3. MITIGACIÓN DE FUGA ESPECTRAL (SPECTRAL LEAKAGE) MEDIANTE VENTANADO
            </h3>
            <p className="text-[11px] text-slate-300 print:text-slate-700">
              La señal truncada en una ventana de observación finita induce lóbulos secundarios en el dominio frecuencial. A continuación se resume el comportamiento de las ventanas evaluadas:
            </p>
            <table className="w-full font-mono text-[11px] border border-slate-800 print:border-slate-300">
              <thead className="bg-slate-950 print:bg-slate-200 print:text-slate-900">
                <tr>
                  <th className="p-2 text-left">Función de Ventanado</th>
                  <th className="p-2 text-center">Ancho Lóbulo Principal</th>
                  <th className="p-2 text-center">Atenuación Secundarios</th>
                  <th className="p-2 text-left">Efecto en la Detección Sísmica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-slate-300">
                {windowMetricsList.map((w, idx) => (
                  <tr key={idx} className={w.name === selectedWindow ? 'bg-cyan-950/30 font-semibold print:bg-cyan-50' : ''}>
                    <td className="p-2">{w.label} {w.name === selectedWindow && '(Seleccionada)'}</td>
                    <td className="p-2 text-center">{w.mainlobeWidthBins} bins</td>
                    <td className="p-2 text-center font-bold">{w.sidelobeAttenuationDb} dB</td>
                    <td className="p-2 text-[10px] text-slate-400 print:text-slate-700">
                      {w.name === 'rectangular'
                        ? 'Alto leakage (-13 dB); enmascara componentes débiles cercanas al 60 Hz.'
                        : w.name === 'hamming'
                        ? 'Compromiso óptimo (-43 dB); atenuación balanceada y buena resolución.'
                        : w.name === 'blackman_harris'
                        ? 'Supresión profunda (-92 dB); elimina completamente el leakage de la red eléctrica.'
                        : 'Atenuación moderada (-32 dB); lóbulo suave.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Section 4: Welch PSD & Peak Identification */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-slate-900 border-b border-slate-700 pb-1">
              4. CARACTERIZACIÓN ESPECTRAL (MÉTODO DE WELCH CON 50% OVERLAP)
            </h3>
            <p className="text-[11px] text-slate-300 print:text-slate-700">
              Segmentación en bloques con ventana {selectedWindow} y 50% de solapamiento para reducir la varianza del periodograma estándar. Picos identificados:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {peaks.map((peak, idx) => (
                <div key={idx} className="bg-slate-950/60 p-2 rounded border border-slate-800 print:bg-slate-100 print:border-slate-300">
                  <div className="font-mono text-xs font-bold text-cyan-300 print:text-slate-900">{peak.label}</div>
                  <div className="font-mono text-[11px] text-slate-400 print:text-slate-700">Frecuencia: {peak.freq} Hz</div>
                  <div className="font-mono text-[11px] text-amber-300 print:text-slate-800">Potencia: {peak.powerDb} dB/Hz</div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: FIR Filter Performance & SNR */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300 print:text-slate-900 border-b border-slate-700 pb-1">
              5. BALANCE DE POTENCIA Y GANANCIA DE SNR (FILTRO FIR PASA-BANDA)
            </h3>
            <div className="grid grid-cols-3 gap-3 font-mono text-center">
              <div className="bg-slate-950 p-3 rounded border border-slate-800 print:bg-slate-100 print:border-slate-300">
                <span className="text-[10px] text-slate-500 block">SNR Entrada (Bruta):</span>
                <span className="text-base font-bold text-amber-400 print:text-amber-700">{metrics.snrInDb.toFixed(2)} dB</span>
              </div>
              <div className="bg-slate-950 p-3 rounded border border-slate-800 print:bg-slate-100 print:border-slate-300">
                <span className="text-[10px] text-slate-500 block">SNR Salida (Filtrada):</span>
                <span className="text-base font-bold text-cyan-400 print:text-cyan-700">{metrics.snrOutDb.toFixed(2)} dB</span>
              </div>
              <div className="bg-emerald-950/40 p-3 rounded border border-emerald-500/50 print:bg-emerald-100 print:border-emerald-300">
                <span className="text-[10px] text-emerald-400 print:text-emerald-800 font-bold block">GANANCIA ΔSNR:</span>
                <span className="text-lg font-extrabold text-emerald-300 print:text-emerald-900">+{metrics.deltaSnrDb.toFixed(2)} dB</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 print:text-slate-700 mt-1">
              Filtro FIR diseñado por ventana {firParams.window} con orden M = {firParams.taps} taps, banda de paso [{firParams.fLow} - {firParams.fHigh}] Hz y fase estrictamente lineal, garantizando distorsión nula en el retardo de grupo de la señal sísmica.
            </p>
          </section>

          {/* Institutional Signatures */}
          <div className="pt-6 border-t border-slate-700 flex justify-between items-center text-[10px] text-slate-500 print:text-slate-700">
            <div>
              <p>Auditoría generada por SISMOLOG-DSP</p>
              <p>Bogotá D.C., Colombia</p>
            </div>
            <div className="text-right">
              <p>Firma Docente Evaluador: ____________________________</p>
              <p>Calificación Rúbrica: [ _____ / 100 pts ]</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
