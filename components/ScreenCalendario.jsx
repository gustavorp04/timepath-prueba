"use client";

import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatearFecha(dateStr) {
  if (!dateStr) return { day: "??", month: "??" };
  const partes = dateStr.split("-");
  return {
    day: parseInt(partes[2], 10),
    month: MESES[parseInt(partes[1], 10) - 1],
  };
}

// Días con punto rojo fijos del prototipo original
const DIAS_ESTATICOS = [10, 14, 18];

export default function ScreenCalendario({ proyectos }) {
  const entregas = proyectos.filter((p) => p.fecha_entrega);
  const diasConEntrega = new Set([
    ...DIAS_ESTATICOS,
    ...entregas.map((p) => formatearFecha(p.fecha_entrega).day),
  ]);

  const dias = [
    { n: 29, mesAnterior: true },
    { n: 30, mesAnterior: true },
    ...Array.from({ length: 26 }, (_, i) => ({ n: i + 1, mesAnterior: false })),
  ];

  return (
    <section className="absolute inset-0 overflow-y-auto no-scrollbar p-6 pb-32 bg-slate-50 screen-enter">
      <header className="mb-6 mt-6">
        <h1 className="text-2xl font-bold text-slate-800">Calendario Académico</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">
          Visualiza las entregas importantes.
        </p>
      </header>

      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold text-slate-700">Mes Actual</h2>
          <div className="flex gap-2">
            <button className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-3">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <div key={i} className="text-[10px] font-bold text-slate-400">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center text-sm font-medium">
          {dias.map((dia, i) => {
            if (dia.mesAnterior) {
              return (
                <div key={i} className="py-1.5 text-slate-300">
                  {dia.n}
                </div>
              );
            }
            if (dia.n === 9) {
              return (
                <div
                  key={i}
                  className="py-1.5 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-200"
                >
                  9
                </div>
              );
            }
            const conPunto = diasConEntrega.has(dia.n);
            return (
              <div
                key={i}
                className={`py-1.5 text-slate-700 ${
                  conPunto ? "relative flex flex-col items-center" : ""
                }`}
              >
                {dia.n}
                {conPunto && (
                  <div className="absolute bottom-0 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
          Próximas Entregas
        </h3>
        <div className="space-y-3">
          {entregas.map((p) => {
            const f = formatearFecha(p.fecha_entrega);
            return (
              <div
                key={p.id}
                className="bg-white p-4 rounded-2xl border border-green-200 shadow-sm flex items-center gap-4 cursor-pointer fade-in relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-bold uppercase px-3 py-1 rounded-bl-xl shadow-sm">
                  Nuevo
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex flex-col items-center justify-center font-bold flex-shrink-0">
                  <span className="text-[9px] uppercase leading-none mb-0.5">{f.month}</span>
                  <span className="text-base leading-none">{f.day}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-md text-[9px] font-bold uppercase tracking-wider border border-green-100">
                      {p.curso}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm leading-tight">
                    {p.descripcion}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Para: {f.day} {f.month}
                  </p>
                </div>
              </div>
            );
          })}

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex flex-col items-center justify-center font-bold flex-shrink-0">
              <span className="text-[9px] uppercase leading-none mb-0.5">Mes</span>
              <span className="text-base leading-none">10</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-bold uppercase tracking-wider">
                  Algoritmos
                </span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm leading-tight">
                Proyecto Backend Final
              </h4>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 23:59 PM
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex flex-col items-center justify-center font-bold flex-shrink-0">
              <span className="text-[9px] uppercase leading-none mb-0.5">Mes</span>
              <span className="text-base leading-none">14</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md text-[9px] font-bold uppercase tracking-wider">
                  Física III
                </span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm leading-tight">
                Laboratorio de Ondas
              </h4>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> 10:00 AM (Presencial)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
