"use client";

import {
  Coffee,
  PartyPopper,
  Flame,
  CheckCircle2,
  FolderOpen,
  ChevronDown,
  Check,
  Clock,
  Info,
  LogOut,
  BookOpen,
  LifeBuoy,
  FastForward,
} from "lucide-react";

// Tarjeta opcional para adelantar 1 paso de mañana (aparece solo al terminar
// el día o cuando no hay nada asignado; 100% voluntaria)
function TarjetaAdelantar({ onAdelantar, onDescansar }) {
  return (
    <div className="mt-6 w-full max-w-xs bg-white border border-slate-200 rounded-2xl p-4 shadow-sm fade-in">
      <p className="text-[13px] text-slate-600 font-medium text-center leading-snug">
        ¿Tienes unos minutos extra y quieres <span className="font-bold text-slate-800">adelantar algo de mañana</span> para estar más libre después?
      </p>
      <div className="flex gap-2 mt-3.5">
        <button
          onClick={onAdelantar}
          className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition-colors active:scale-95 flex items-center justify-center gap-1.5"
        >
          <FastForward className="w-3.5 h-3.5" /> Sí, 1 paso
        </button>
        <button
          onClick={onDescansar}
          className="flex-1 bg-slate-100 text-slate-600 text-xs font-bold py-2.5 rounded-xl hover:bg-slate-200 transition-colors active:scale-95"
        >
          No, hoy descanso
        </button>
      </div>
    </div>
  );
}

export default function ScreenHoy({
  proyectos,
  cargado,
  showSuccess,
  racha,
  username,
  onToggleProyecto,
  onToggleMicro,
  onOpenTask,
  onLogout,
  onAbrirAyuda,
  puedeAdelantar,
  onAdelantar,
  onDescansar,
}) {
  const fecha = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const vacio = cargado && proyectos.length === 0;

  return (
    <section className="absolute inset-0 overflow-y-auto no-scrollbar p-6 pb-32 bg-slate-50 screen-enter">
      <header className="mb-8 mt-6">
        <div className="flex items-start justify-between">
          <p className="text-slate-500 font-medium text-xs tracking-widest uppercase mb-2">
            {fecha}
          </p>
          <button
            onClick={onLogout}
            title={`Cerrar sesión (${username})`}
            className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors -mt-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          Concéntrate hoy.
        </h1>
        <p className="text-slate-500 mt-2 text-sm leading-tight font-medium">
          Solo tu dosis de hoy. El resto ya quedó repartido en la Agenda.
        </p>
      </header>

      {showSuccess ? (
        <div className="flex flex-col items-center justify-center h-72 fade-in relative">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 z-10 relative">
            <PartyPopper className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Día conquistado!</h2>
          <p className="text-slate-500 text-center text-sm">
            Tu dosis de hoy está completa.
            <br />
            Estado guardado en la nube.
          </p>
          <div className="mt-6 bg-orange-50 text-orange-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 fade-in shadow-sm border border-orange-100">
            <Flame className="w-5 h-5" /> Racha aumentada a <span>{racha}</span> días
          </div>
          {puedeAdelantar && (
            <TarjetaAdelantar onAdelantar={onAdelantar} onDescansar={onDescansar} />
          )}
        </div>
      ) : vacio ? (
        <div className="flex flex-col items-center justify-center h-64 fade-in">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Coffee className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Día libre de avances</h2>
          <p className="text-slate-500 text-center text-sm">
            El algoritmo indica que no hay urgencias en tus cursos.
            <br />
            Disfruta tu descanso sin culpa.
          </p>
          {puedeAdelantar && (
            <TarjetaAdelantar onAdelantar={onAdelantar} onDescansar={onDescansar} />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {proyectos.map((proyecto, pIndex) => {
            const isCompleted =
              proyecto.microtareas.length > 0 &&
              proyecto.microtareas.every((m) => m.completada);

            return (
              <div
                key={proyecto.id}
                className={`bg-white rounded-3xl border ${
                  isCompleted
                    ? "border-slate-100 opacity-60"
                    : "border-slate-200 shadow-sm hover:border-blue-300"
                } transition-all duration-300 overflow-hidden fade-in`}
                style={{ animationDelay: `${pIndex * 0.1}s` }}
              >
                <div
                  className={`p-5 flex items-center justify-between cursor-pointer ${
                    isCompleted ? "bg-slate-50" : "bg-white"
                  }`}
                  onClick={() => onToggleProyecto(proyecto.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-10 h-10 rounded-2xl ${
                        isCompleted
                          ? "bg-slate-200 text-slate-400"
                          : "bg-blue-50 text-blue-600"
                      } flex items-center justify-center flex-shrink-0 transition-colors`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <FolderOpen className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isCompleted ? "text-slate-400" : "text-blue-600"
                        } transition-colors`}
                      >
                        {proyecto.curso}
                      </span>
                      <h3
                        className={`font-bold text-[15px] leading-tight ${
                          isCompleted
                            ? "text-slate-500 line-through"
                            : "text-slate-800"
                        } mt-0.5`}
                      >
                        {proyecto.descripcion}
                      </h3>
                      {proyecto.resumen && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTask({
                              curso: proyecto.curso,
                              titulo: "Resumen de clase",
                              descripcion: proyecto.resumen,
                              tipo: "resumen",
                            });
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg px-2.5 py-1 text-[11px] font-bold hover:bg-amber-100 transition-colors active:scale-95"
                        >
                          <BookOpen className="w-3.5 h-3.5" /> Resumen de clase
                        </button>
                      )}
                    </div>
                  </div>
                  <div
                    className={`text-slate-400 transform transition-transform duration-300 ${
                      proyecto.expandido ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>

                {proyecto.expandido && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-50 bg-slate-50/50 space-y-3">
                    {proyecto.microtareas.map((micro, mIndex) => (
                      <div
                        key={micro.id}
                        className={`p-3.5 rounded-2xl bg-white border ${
                          micro.completada
                            ? "border-slate-100 opacity-60"
                            : "border-slate-200 shadow-sm"
                        } hover:border-blue-300 transition-all group`}
                      >
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => onToggleMicro(proyecto.id, micro.id)}
                        >
                          <div className="relative flex items-center justify-center w-6 h-6 flex-shrink-0">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                micro.completada
                                  ? "bg-blue-500 border-blue-500"
                                  : "border-slate-300 bg-white"
                              }`}
                            >
                              {micro.completada && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4
                              className={`font-bold text-[13px] leading-tight ${
                                micro.completada
                                  ? "line-through text-slate-400"
                                  : "text-slate-700"
                              }`}
                            >
                              {mIndex + 1}. {micro.titulo}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1.5 text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span className="text-[10px] font-semibold">
                                {micro.tiempo}
                              </span>
                              {micro.esAdelanto && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 ml-1">
                                  <FastForward className="w-3 h-3" /> Adelanto de mañana
                                </span>
                              )}
                            </div>
                          </div>
                          {!micro.completada && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAbrirAyuda(proyecto, micro);
                              }}
                              title="¿Atascado? Pide ayuda a la IA"
                              className="p-2 text-slate-300 hover:text-orange-500 transition-colors bg-slate-50 rounded-xl group-hover:bg-orange-50"
                            >
                              <LifeBuoy className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTask({
                                curso: proyecto.curso,
                                titulo: micro.titulo,
                                descripcion: micro.descripcion,
                              });
                            }}
                            className="p-2 text-slate-300 hover:text-blue-500 transition-colors bg-slate-50 rounded-xl group-hover:bg-blue-50"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
