"use client";

import { useEffect, useRef, useState } from "react";
import {
  Server,
  FileSearch,
  ScanText,
  AudioWaveform,
  Sparkles,
  GitBranch,
  AlertCircle,
  CalendarCheck,
  Mic,
  Square,
  XCircle,
  ShieldCheck,
} from "lucide-react";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatearFecha(dateStr) {
  if (!dateStr) return { day: "??", month: "??" };
  const partes = dateStr.split("-");
  return { day: partes[2], month: MESES[parseInt(partes[1], 10) - 1] };
}

const CURSOS = [
  "Cálculo Avanzado",
  "Física III",
  "Algoritmos y Estructuras",
  "Emprendimiento",
  "Historia Crítica",
];

export default function IAModal({ captura, onConfirmar, onTerminar, onCancelar }) {
  // fases: grabando | loading | question | fraccionando | success | error
  const [fase, setFase] = useState("loading");
  const [paso, setPaso] = useState(0);
  const [curso, setCurso] = useState("");
  const [fecha, setFecha] = useState("");
  const [modoExigente, setModoExigente] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [shake, setShake] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const timersRef = useRef([]);
  const recorderRef = useRef(null);
  const intervalRef = useRef(null);

  function programar(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  function limpiar() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      try {
        rec.stream.getTracks().forEach((t) => t.stop());
        rec.stop();
      } catch {}
    }
    recorderRef.current = null;
  }

  useEffect(() => {
    if (!captura) return;
    setCurso("");
    setFecha("");
    setModoExigente(false);
    setResultado(null);
    setErrorMsg("");
    setSegundos(0);
    if (captura.tipo === "audio") {
      setFase("grabando");
      iniciarGrabacion();
    } else {
      analizar(captura.archivo);
    }
    return limpiar;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captura]);

  if (!captura) return null;

  // Gemini no acepta audio/webm (lo que graba Chrome/Edge por defecto).
  // Preferimos un formato que sí soporte; si no hay ninguno, caemos a webm
  // y el servidor mostrará un error claro en vez de fallar en silencio.
  const MIME_PREFERIDOS = ["audio/mp4", "audio/mpeg", "audio/aac", "audio/ogg;codecs=opus"];

  async function iniciarGrabacion() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeSoportado = MIME_PREFERIDOS.find(
        (m) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(m)
      );
      const rec = new MediaRecorder(stream, mimeSoportado ? { mimeType: mimeSoportado } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (intervalRef.current) clearInterval(intervalRef.current);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        analizar(new File([blob], "grabacion", { type: blob.type }));
      };
      rec.start();
      recorderRef.current = rec;
      intervalRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    } catch {
      setErrorMsg(
        "No se pudo acceder al micrófono. Revisa los permisos del navegador."
      );
      setFase("error");
    }
  }

  function detenerGrabacion() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  async function analizar(archivo) {
    setFase("loading");
    setPaso(0);
    // Mismos textos escalonados del prototipo mientras Gemini trabaja de verdad
    programar(() => setPaso(1), 1500);
    programar(() => setPaso(2), 3500);
    const inicio = Date.now();
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      fd.append("tipo", captura.tipo);
      const res = await fetch("/api/capturar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al analizar");
      // Espera mínima para que la animación se aprecie completa
      const espera = Math.max(0, 5500 - (Date.now() - inicio));
      programar(() => {
        setResultado(data);
        if (data.curso) setCurso(data.curso);
        if (data.fecha_entrega) setFecha(data.fecha_entrega);
        setFase("question");
      }, espera);
    } catch (e) {
      const espera = Math.max(0, 2000 - (Date.now() - inicio));
      programar(() => {
        setErrorMsg(e.message || "No se pudo analizar el archivo.");
        setFase("error");
      }, espera);
    }
  }

  async function validarYFraccionar() {
    if (!curso || !fecha) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setFase("fraccionando");
    const inicio = Date.now();
    try {
      await onConfirmar({
        curso,
        fecha,
        descripcion: resultado?.descripcion,
        microtareas: resultado?.microtareas,
        resumen: resultado?.resumen_clase,
        modoExigente,
      });
      const espera = Math.max(0, 2500 - (Date.now() - inicio));
      programar(() => {
        setFase("success");
        programar(onTerminar, 2500);
      }, espera);
    } catch {
      setErrorMsg("No se pudo guardar en la base de datos. Intenta de nuevo.");
      setFase("error");
    }
  }

  const f = formatearFecha(fecha);
  const opcionesCursos =
    resultado?.curso && !CURSOS.includes(resultado.curso)
      ? [resultado.curso, ...CURSOS]
      : CURSOS;

  let loadingIcon = <Server className="w-6 h-6 text-blue-500" />;
  let loadingTitle = "Conectando con el servidor";
  let loadingText = "Subiendo tu archivo de forma segura...";

  if (fase === "loading" && paso === 1) {
    loadingTitle = "Extracción Cruda";
    if (captura.tipo === "pdf") {
      loadingText = "Leyendo documento digital línea por línea...";
      loadingIcon = <FileSearch className="w-6 h-6 text-blue-500" />;
    } else if (captura.tipo === "foto") {
      loadingText = "Motor OCR extrayendo palabras de la foto...";
      loadingIcon = <ScanText className="w-6 h-6 text-blue-500" />;
    } else {
      loadingText = "Transcribiendo el audio a texto plano...";
      loadingIcon = <AudioWaveform className="w-6 h-6 text-blue-500" />;
    }
  } else if (fase === "loading" && paso === 2) {
    loadingTitle = "Google Gemini API";
    loadingText =
      "Solicitud controlada: Extrayendo campos estructurados JSON: [Curso, Descripción, Deadline]...";
    loadingIcon = <Sparkles className="w-6 h-6 text-blue-500" />;
  } else if (fase === "fraccionando") {
    loadingTitle = "Fraccionando...";
    loadingText = `Agendando para el ${f.day} de ${f.month}. Fraccionando e insertando en la base de datos.`;
    loadingIcon = <GitBranch className="w-6 h-6 text-blue-500" />;
  }

  const mm = String(Math.floor(segundos / 60)).padStart(1, "0");
  const ss = String(segundos % 60).padStart(2, "0");

  return (
    <div className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm px-4">
      {fase === "grabando" && (
        <div className="bg-white p-8 rounded-[2rem] flex flex-col items-center shadow-2xl max-w-[280px] w-full transform scale-100 transition-transform duration-300">
          <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-60"></div>
            <div className="relative w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
              <Mic className="w-7 h-7 text-red-500" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 text-center leading-tight">
            Grabando... {mm}:{ss}
          </h3>
          <p className="text-xs text-slate-500 mt-3 text-center leading-relaxed">
            Di qué tarea tienes, de qué curso es y para cuándo la debes entregar.
          </p>
          <button
            onClick={detenerGrabacion}
            className="w-full mt-6 bg-red-500 text-white font-bold py-3.5 rounded-xl hover:bg-red-600 transition-colors active:scale-95 shadow-lg shadow-red-200 flex items-center justify-center gap-2"
          >
            <Square className="w-4 h-4 fill-current" /> Detener y analizar
          </button>
          <button
            onClick={() => {
              limpiar();
              onCancelar();
            }}
            className="mt-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {(fase === "loading" || fase === "fraccionando") && (
        <div className="bg-white p-8 rounded-[2rem] flex flex-col items-center shadow-2xl max-w-[280px] w-full transform scale-100 transition-transform duration-300">
          <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            {loadingIcon}
          </div>
          <h3 className="text-lg font-bold text-slate-800 text-center leading-tight">
            {loadingTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-3 text-center leading-relaxed">
            {loadingText}
          </p>
        </div>
      )}

      {fase === "question" && (
        <div
          className={`bg-white p-6 rounded-[2rem] flex flex-col items-center shadow-2xl max-w-[340px] w-full transform scale-100 transition-transform duration-300 max-h-[90vh] overflow-y-auto no-scrollbar ${
            shake ? "animate-shake" : ""
          }`}
        >
          <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1 text-center">
            Filtro Anti-fallas
          </h3>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-3 text-center w-full">
            Google Gemini API
          </p>

          {resultado ? (
            <div className="w-full bg-green-50 border border-green-100 rounded-xl p-3 mb-4 text-left">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">
                La IA detectó:
              </p>
              <p className="text-sm font-bold text-slate-800 leading-tight">
                {resultado.descripcion}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {resultado.microtareas.length} microtareas generadas. Confirma o corrige:
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 text-center mb-5 leading-relaxed">
              Se detectó una tarea pero falta el contexto exacto. <br />
              Ayuda a la IA completando esto:
            </p>
          )}

          <div className="w-full text-left space-y-4 mb-6">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">
                1. ¿A qué curso pertenece?
              </label>
              <select
                value={curso}
                onChange={(e) => setCurso(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              >
                <option value="" disabled>
                  Selecciona un curso...
                </option>
                {opcionesCursos.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase mb-1.5 block">
                2. Selecciona la Fecha de Entrega
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={() => setModoExigente((v) => !v)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors text-left ${
                modoExigente
                  ? "bg-amber-50 border-amber-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  modoExigente ? "bg-amber-500 text-white" : "bg-white text-slate-400"
                }`}
              >
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">Modo exigente</p>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Cada microtarea pedirá evidencia verificada por IA antes de poder completarse.
                </p>
              </div>
              <div
                className={`w-10 h-6 rounded-full flex-shrink-0 flex items-center px-0.5 transition-colors ${
                  modoExigente ? "bg-amber-500 justify-end" : "bg-slate-300 justify-start"
                }`}
              >
                <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
              </div>
            </button>
          </div>

          <button
            onClick={validarYFraccionar}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors active:scale-95 shadow-lg shadow-blue-200"
          >
            Confirmar y Fraccionar
          </button>
        </div>
      )}

      {fase === "success" && (
        <div className="bg-white p-8 rounded-[2rem] flex flex-col items-center shadow-2xl max-w-[280px] w-full transform scale-100 transition-transform duration-300">
          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 text-center">Agenda reordenada</h3>
          <p className="text-sm text-slate-500 text-center mt-2">
            La carga académica ha sido redistribuida sin sobrecargar tu semana.
          </p>
        </div>
      )}

      {fase === "error" && (
        <div className="bg-white p-8 rounded-[2rem] flex flex-col items-center shadow-2xl max-w-[300px] w-full transform scale-100 transition-transform duration-300">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 text-center leading-tight">
            Algo salió mal
          </h3>
          <p className="text-xs text-slate-500 mt-3 text-center leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => {
              setResultado(null);
              setFase("question");
            }}
            className="w-full mt-6 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors active:scale-95 shadow-lg shadow-blue-200"
          >
            Continuar manualmente
          </button>
          <button
            onClick={() => {
              limpiar();
              onCancelar();
            }}
            className="mt-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
