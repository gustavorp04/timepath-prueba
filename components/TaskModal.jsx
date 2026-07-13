"use client";

import { useEffect, useState } from "react";
import { Sparkles, GitBranch, Info, BookOpen } from "lucide-react";

export default function TaskModal({ data, onClose }) {
  const [visible, setVisible] = useState(false);
  const [contenido, setContenido] = useState(null);

  useEffect(() => {
    if (data) {
      setContenido(data);
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    }
  }, [data]);

  function cerrar() {
    setVisible(false);
    setTimeout(() => {
      setContenido(null);
      onClose();
    }, 300);
  }

  if (!data && !contenido) return null;
  const c = contenido || data;
  const esResumen = c.tipo === "resumen";

  return (
    <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm">
      <div
        className={`bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl transform transition-transform duration-300 flex flex-col max-h-[80vh] ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden flex-shrink-0"></div>

        <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                esResumen ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
              }`}
            >
              {esResumen ? <BookOpen className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {esResumen ? "Resumen de clase" : "Detalle de Micro-tarea"}
              </h3>
              <p className="text-xs text-slate-500">
                {esResumen ? `Generado por IA · ${c.curso}` : "Asistente IA"}
              </p>
            </div>
          </div>

          {esResumen ? (
            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 mb-4">
              <p className="text-[14px] leading-relaxed text-slate-700 whitespace-pre-line">
                {c.descripcion}
              </p>
            </div>
          ) : (
            <>
              <h4 className="font-bold text-xl text-slate-800 mb-4">{c.titulo}</h4>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-4">
                <ul className="space-y-4 text-[13px] font-medium">
                  <li className="flex gap-3 text-slate-700 mb-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-800 block mb-1">¿De qué trata?</strong>
                      {c.descripcion}
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <GitBranch className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>
                      Fraccionada para <strong>{c.curso}</strong>.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span>Micro-tarea diseñada para evitar saturación mental.</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        <button
          onClick={cerrar}
          className="w-full flex-shrink-0 bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-700 transition-colors active:scale-[0.98] shadow-md shadow-slate-300"
        >
          {esResumen ? "Entendido, listo para estudiar" : "Entendido, a enfocarse"}
        </button>
      </div>
    </div>
  );
}
