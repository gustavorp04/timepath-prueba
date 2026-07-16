"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, Sparkles, ListChecks, Scissors, XCircle, Clock } from "lucide-react";

// Modal del botón de desatoro: el estudiante cuenta qué lo trabó y la IA
// responde una guía rápida o propone dividir el paso en subpasos más chicos.
export default function ModalAyuda({ data, onClose, onAplicado }) {
  // fases: form | loading | resultado | aplicando | error
  const [fase, setFase] = useState("form");
  const [texto, setTexto] = useState("");
  const [resp, setResp] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (data) {
      setFase("form");
      setTexto("");
      setResp(null);
      setErrorMsg("");
    }
  }, [data]);

  if (!data) return null;
  const { micro } = data;

  async function pedir() {
    setFase("loading");
    try {
      const res = await fetch(`/api/microtareas/${micro.id}/ayuda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "No se pudo pedir la ayuda");
      setResp(j);
      setFase("resultado");
    } catch (e) {
      setErrorMsg(e.message);
      setFase("error");
    }
  }

  async function aplicarRefraccion() {
    setFase("aplicando");
    try {
      const res = await fetch(`/api/microtareas/${micro.id}/refraccionar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subpasos: resp.subpasos }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "No se pudo dividir el paso");
      await onAplicado();
    } catch (e) {
      setErrorMsg(e.message);
      setFase("error");
    }
  }

  return (
    <div className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center backdrop-blur-sm px-4">
      <div className="bg-white p-6 rounded-[2rem] flex flex-col items-center shadow-2xl max-w-[340px] w-full max-h-[90vh] overflow-y-auto no-scrollbar">
        {fase === "form" && (
          <>
            <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-3">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 text-center">¿Atascado?</h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
              Le pasaré este paso a la IA:
              <br />
              <span className="font-bold text-slate-700">{micro.titulo}</span>
            </p>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, 300))}
              rows={3}
              placeholder="Cuéntame qué te está trabando (opcional). Ej: me sale un error, no sé por dónde empezar..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-orange-400 transition-colors resize-none"
            />
            <button
              onClick={pedir}
              className="w-full mt-4 bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-colors active:scale-95 shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Pedir ayuda a la IA
            </button>
            <button
              onClick={onClose}
              className="mt-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </>
        )}

        {(fase === "loading" || fase === "aplicando") && (
          <>
            <div className="relative w-16 h-16 mb-6 mt-2 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
              <LifeBuoy className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center leading-tight">
              {fase === "loading" ? "Analizando tu bloqueo" : "Dividiendo el paso..."}
            </h3>
            <p className="text-xs text-slate-500 mt-3 text-center leading-relaxed">
              {fase === "loading"
                ? "La IA está buscando la forma más rápida de destrabarte."
                : "Reemplazando el paso por versiones más pequeñas."}
            </p>
          </>
        )}

        {fase === "resultado" && resp?.tipo === "guia" && (
          <>
            <div className="w-12 h-12 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-3">
              <ListChecks className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 text-center">Guía de desatoro</h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">{resp.mensaje}</p>
            <div className="w-full space-y-2.5 mb-5">
              {resp.guia.map((paso, i) => (
                <div key={i} className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-[13px] text-slate-700 leading-snug font-medium">{paso}</p>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors active:scale-95 shadow-lg shadow-blue-200"
            >
              ¡A intentarlo!
            </button>
          </>
        )}

        {fase === "resultado" && resp?.tipo === "refraccionar" && (
          <>
            <div className="w-12 h-12 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mb-3">
              <Scissors className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1 text-center">
              Mejor en pasos más chicos
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">{resp.mensaje}</p>
            <div className="w-full space-y-2.5 mb-5">
              {resp.subpasos.map((s, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-[13px] font-bold text-slate-700 leading-tight">
                    {i + 1}. {s.titulo}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{s.descripcion}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {s.tiempo}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={aplicarRefraccion}
              className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-xl hover:bg-purple-700 transition-colors active:scale-95 shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
            >
              <Scissors className="w-4 h-4" /> Dividir el paso así
            </button>
            <button
              onClick={onClose}
              className="mt-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Mejor lo dejo como está
            </button>
          </>
        )}

        {fase === "error" && (
          <>
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-3">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center">Algo salió mal</h3>
            <p className="text-xs text-slate-500 mt-2 text-center leading-relaxed">{errorMsg}</p>
            <button
              onClick={pedir}
              className="w-full mt-5 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors active:scale-95 shadow-lg shadow-blue-200"
            >
              Reintentar
            </button>
            <button
              onClick={onClose}
              className="mt-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
