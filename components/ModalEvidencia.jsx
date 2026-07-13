"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Paperclip, XCircle, CheckCircle2, Loader2, X } from "lucide-react";

const MAX_BYTES = 4 * 1024 * 1024;

export default function ModalEvidencia({ data, onEnviar, onClose }) {
  const [archivo, setArchivo] = useState(null);
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState("form"); // form | enviando | rechazado
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (data) {
      setArchivo(null);
      setTexto("");
      setEstado("form");
      setMotivo(data.micro?.motivo_rechazo || "");
      setError("");
    }
  }, [data]);

  if (!data) return null;
  const { micro } = data;

  function elegirArchivo(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError("El archivo pesa más de 4 MB. Usa uno más liviano.");
      return;
    }
    setError("");
    setArchivo(f);
  }

  async function enviar() {
    if (!archivo && !texto.trim()) {
      setError("Adjunta una foto/documento o describe qué hiciste.");
      return;
    }
    setError("");
    setEstado("enviando");
    try {
      const resultado = await onEnviar({ archivo, texto: texto.trim() });
      if (resultado.cumple) {
        onClose();
      } else {
        setMotivo(resultado.motivo);
        setEstado("rechazado");
      }
    } catch (e) {
      setError(e.message || "No se pudo verificar. Intenta de nuevo.");
      setEstado("form");
    }
  }

  return (
    <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 sm:hidden flex-shrink-0" />

        <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-800 text-lg">Modo exigente</h3>
              <p className="text-xs text-slate-500">Necesita evidencia verificada por IA</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
            <p className="font-bold text-slate-800 text-sm">{micro.titulo}</p>
            <p className="text-xs text-slate-500 mt-1">{micro.descripcion}</p>
          </div>

          {estado === "rechazado" && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 flex gap-3 fade-in">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-600">La IA no la aprobó</p>
                <p className="text-xs text-red-500 mt-1 leading-relaxed">{motivo}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={elegirArchivo} />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 transition-colors text-left"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Paperclip className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-700">
                  {archivo ? archivo.name : "Adjuntar foto o documento"}
                </p>
                <p className="text-[11px] text-slate-400">Opcional si describes tu evidencia abajo</p>
              </div>
            </button>

            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Describe qué hiciste (opcional si adjuntas archivo)..."
              rows={3}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-blue-500 transition-colors resize-none"
            />

            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          </div>
        </div>

        <button
          onClick={enviar}
          disabled={estado === "enviando"}
          className="w-full flex-shrink-0 bg-amber-500 text-white font-bold py-4 rounded-xl hover:bg-amber-600 transition-colors active:scale-[0.98] shadow-md shadow-amber-200 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {estado === "enviando" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Verificando con IA...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Enviar evidencia
            </>
          )}
        </button>
      </div>
    </div>
  );
}
