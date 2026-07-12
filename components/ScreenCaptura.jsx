"use client";

import { useRef, useState } from "react";
import { FileText, Camera, Mic } from "lucide-react";

const MAX_BYTES = 4 * 1024 * 1024;

// Reduce fotos grandes para que pasen el límite de 4 MB y suban rápido
async function comprimirImagen(file) {
  try {
    const img = await createImageBitmap(file);
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (!blob) return file;
    return new File([blob], "foto.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function ScreenCaptura({ onCapturar }) {
  const pdfRef = useRef(null);
  const fotoRef = useRef(null);
  const [error, setError] = useState("");

  async function manejarPdf(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError("El PDF pesa más de 4 MB. Usa uno más liviano.");
      return;
    }
    setError("");
    onCapturar("pdf", f);
  }

  async function manejarFoto(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    const comprimida = await comprimirImagen(f);
    if (comprimida.size > MAX_BYTES) {
      setError("La imagen es demasiado grande. Intenta con otra.");
      return;
    }
    onCapturar("foto", comprimida);
  }

  return (
    <section className="absolute inset-0 overflow-y-auto no-scrollbar p-6 pb-32 bg-slate-50 screen-enter">
      <header className="mb-8 mt-6">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
          ¿Qué tienes
          <br />
          pendiente?
        </h1>
        <p className="text-slate-500 mt-3 text-sm">
          Súbelo y la IA (Gemini) lo organizará por ti en segundos.
        </p>
        {error && (
          <p className="text-red-500 text-xs font-bold mt-3 fade-in">{error}</p>
        )}
      </header>

      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={manejarPdf}
      />
      <input
        ref={fotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={manejarFoto}
      />

      <div className="space-y-4">
        <button
          onClick={() => pdfRef.current?.click()}
          className="w-full bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98] group"
        >
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
            <FileText className="w-7 h-7" />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-slate-800 text-lg">Subir PDF / Sílabo</h3>
            <p className="text-slate-400 text-xs mt-0.5">Vía documento digital</p>
          </div>
        </button>

        <button
          onClick={() => fotoRef.current?.click()}
          className="w-full bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98] group"
        >
          <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <Camera className="w-7 h-7" />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-slate-800 text-lg">Tomar Foto / PPT</h3>
            <p className="text-slate-400 text-xs mt-0.5">Vía OCR de pizarra</p>
          </div>
        </button>

        <button
          onClick={() => onCapturar("audio", null)}
          className="w-full bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98] group"
        >
          <div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <Mic className="w-7 h-7" />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-slate-800 text-lg">Grabar Audio</h3>
            <p className="text-slate-400 text-xs mt-0.5">Vía transcripción de voz</p>
          </div>
        </button>
      </div>
    </section>
  );
}
