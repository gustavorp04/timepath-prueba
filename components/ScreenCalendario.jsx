"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, CalendarCheck } from "lucide-react";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatearFecha(dateStr) {
  if (!dateStr) return { day: "??", month: "??" };
  const partes = dateStr.split("-");
  return {
    day: parseInt(partes[2], 10),
    month: MESES[parseInt(partes[1], 10) - 1],
  };
}

function hoyISO() {
  return new Date().toLocaleDateString("en-CA");
}

function sumarDias(fechaISO, n) {
  const d = new Date(fechaISO + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

function etiquetaDia(iso, hoy) {
  if (iso === hoy) return "Hoy";
  if (iso === sumarDias(hoy, 1)) return "Mañana";
  return new Date(iso + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export default function ScreenCalendario({ proyectos }) {
  const hoy = hoyISO();
  const entregas = proyectos.filter((p) => p.fecha_entrega);

  // Mes visible en el calendario (arranca en el mes actual, flechas para navegar)
  const [mesVisible, setMesVisible] = useState(() => {
    const d = new Date();
    return { anio: d.getFullYear(), mes: d.getMonth() };
  });

  const tituloMes = (() => {
    const t = new Date(mesVisible.anio, mesVisible.mes, 1).toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
    return t.charAt(0).toUpperCase() + t.slice(1);
  })();

  const mesStr = `${mesVisible.anio}-${String(mesVisible.mes + 1).padStart(2, "0")}`;
  // Entregas (punto rojo) y días con pasos pendientes (punto azul) del mes visible
  const diasConEntrega = new Set(
    entregas
      .filter((p) => p.fecha_entrega.startsWith(mesStr))
      .map((p) => parseInt(p.fecha_entrega.slice(8), 10))
  );
  const diasConPlan = new Set();
  proyectos.forEach((p) =>
    p.microtareas.forEach((m) => {
      if (!m.completada && m.fecha_asignada && m.fecha_asignada.startsWith(mesStr)) {
        diasConPlan.add(parseInt(m.fecha_asignada.slice(8), 10));
      }
    })
  );

  // Celdas del mes real: relleno del mes anterior + días del mes (semana inicia lunes)
  const offset = (new Date(mesVisible.anio, mesVisible.mes, 1).getDay() + 6) % 7;
  const diasDelMes = new Date(mesVisible.anio, mesVisible.mes + 1, 0).getDate();
  const diasMesAnterior = new Date(mesVisible.anio, mesVisible.mes, 0).getDate();
  const celdas = [
    ...Array.from({ length: offset }, (_, i) => ({
      n: diasMesAnterior - offset + 1 + i,
      fuera: true,
    })),
    ...Array.from({ length: diasDelMes }, (_, i) => ({ n: i + 1, fuera: false })),
  ];

  const hoyDate = new Date();
  const esMesActual =
    hoyDate.getFullYear() === mesVisible.anio && hoyDate.getMonth() === mesVisible.mes;

  const cambiarMes = (delta) =>
    setMesVisible(({ anio, mes }) => {
      const d = new Date(anio, mes + delta, 1);
      return { anio: d.getFullYear(), mes: d.getMonth() };
    });

  // Plan día por día: microtareas pendientes agrupadas por fecha asignada
  // (lo atrasado se muestra como parte de hoy)
  const porDia = new Map();
  proyectos.forEach((p) =>
    p.microtareas.forEach((m) => {
      if (m.completada || !m.fecha_asignada) return;
      const dia = m.fecha_asignada < hoy ? hoy : m.fecha_asignada;
      if (!porDia.has(dia)) porDia.set(dia, []);
      porDia.get(dia).push({ ...m, curso: p.curso });
    })
  );
  const diasOrdenados = [...porDia.keys()].sort();

  return (
    <section className="absolute inset-0 overflow-y-auto no-scrollbar p-6 pb-32 bg-slate-50 screen-enter">
      <header className="mb-6 mt-6">
        <h1 className="text-2xl font-bold text-slate-800">Agenda</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">
          Todo ya está repartido día por día. Nada de esto es para hoy... salvo lo de hoy.
        </p>
      </header>

      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-extrabold text-slate-700">{tituloMes}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => cambiarMes(-1)}
              className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => cambiarMes(1)}
              className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors active:scale-95"
            >
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
          {celdas.map((dia, i) => {
            if (dia.fuera) {
              return (
                <div key={i} className="py-1.5 text-slate-300">
                  {dia.n}
                </div>
              );
            }
            if (esMesActual && dia.n === hoyDate.getDate()) {
              return (
                <div
                  key={i}
                  className="py-1.5 bg-blue-600 text-white rounded-xl font-bold shadow-md shadow-blue-200"
                >
                  {dia.n}
                </div>
              );
            }
            const conEntrega = diasConEntrega.has(dia.n);
            const conPlan = diasConPlan.has(dia.n);
            return (
              <div
                key={i}
                className={`py-1.5 text-slate-700 ${
                  conEntrega || conPlan ? "relative flex flex-col items-center" : ""
                }`}
              >
                {dia.n}
                {(conEntrega || conPlan) && (
                  <div className="absolute bottom-0 flex gap-0.5">
                    {conEntrega && <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
                    {conPlan && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 text-[10px] font-semibold text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Entrega
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span> Día con plan
          </span>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
          Tu plan, día por día
        </h3>
        {diasOrdenados.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-500 font-medium">
              No hay nada agendado. Captura una tarea y la IA la repartirá aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {diasOrdenados.map((dia) => {
              const tareas = porDia.get(dia);
              const totalMin = tareas.reduce((n, t) => n + (parseInt(t.tiempo, 10) || 20), 0);
              const esHoy = dia === hoy;
              return (
                <div
                  key={dia}
                  className={`bg-white p-4 rounded-2xl border shadow-sm fade-in ${
                    esHoy ? "border-blue-200" : "border-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-extrabold uppercase tracking-wider ${
                        esHoy ? "text-blue-600" : "text-slate-500"
                      }`}
                    >
                      {etiquetaDia(dia, hoy)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {totalMin} min en total
                    </span>
                  </div>
                  <div className="space-y-2">
                    {tareas.map((t) => (
                      <div key={t.id} className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></div>
                        <p className="text-[13px] font-bold text-slate-700 leading-tight flex-1">
                          {t.titulo}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-400 flex-shrink-0">
                          {t.tiempo} · {t.curso}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
          Próximas Entregas
        </h3>
        <div className="space-y-3">
          {entregas.length === 0 && (
            <p className="text-sm text-slate-400 font-medium px-2">
              Sin entregas registradas todavía.
            </p>
          )}
          {entregas.map((p) => {
            const f = formatearFecha(p.fecha_entrega);
            return (
              <div
                key={p.id}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 fade-in"
              >
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex flex-col items-center justify-center font-bold flex-shrink-0">
                  <span className="text-[9px] uppercase leading-none mb-0.5">{f.month}</span>
                  <span className="text-base leading-none">{f.day}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-bold uppercase tracking-wider">
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
        </div>
      </div>
    </section>
  );
}
