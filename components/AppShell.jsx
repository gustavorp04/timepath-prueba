"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutDashboard, CalendarDays, Plus, BarChart2 } from "lucide-react";
import ScreenHoy from "@/components/ScreenHoy";
import ScreenCalendario from "@/components/ScreenCalendario";
import ScreenCaptura from "@/components/ScreenCaptura";
import ScreenProgreso from "@/components/ScreenProgreso";
import TaskModal from "@/components/TaskModal";
import IAModal from "@/components/IAModal";

const CONFETTI_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AppShell({ username }) {
  const [pantalla, setPantalla] = useState("hoy");
  const [proyectos, setProyectos] = useState([]);
  const [racha, setRacha] = useState(0);
  const [cargado, setCargado] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [rachaBump, setRachaBump] = useState(false);
  const [taskModalData, setTaskModalData] = useState(null);
  const [captura, setCaptura] = useState(null); // { tipo, archivo }
  const [confetti, setConfetti] = useState([]);
  const celebrandoRef = useRef(false);

  const cargarDatos = useCallback(async (expandirPrimero = false) => {
    const res = await fetch("/api/tareas");
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const data = await res.json();
    setProyectos((prev) =>
      data.proyectos.map((p, i) => {
        const anterior = prev.find((x) => x.id === p.id);
        return {
          ...p,
          expandido: expandirPrimero ? i === 0 : anterior ? anterior.expandido : i === 0,
        };
      })
    );
    setRacha(data.racha);
    setCargado(true);
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  function lanzarConfeti() {
    const piezas = Array.from({ length: 60 }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.5,
      duracion: Math.random() * 1.5 + 2,
    }));
    setConfetti(piezas);
    setTimeout(() => setConfetti([]), 4500);
  }

  // Detectar "día conquistado": todas las microtareas completadas
  const totalMicro = proyectos.reduce((n, p) => n + p.microtareas.length, 0);
  const todasCompletadas =
    totalMicro > 0 && proyectos.every((p) => p.microtareas.every((m) => m.completada));

  useEffect(() => {
    if (!cargado) return;
    if (todasCompletadas && !showSuccess && !celebrandoRef.current) {
      celebrandoRef.current = true;
      const t = setTimeout(async () => {
        setShowSuccess(true);
        lanzarConfeti();
        try {
          const res = await fetch("/api/racha", { method: "POST" });
          const data = await res.json();
          if (data.aumentada) {
            setRachaBump(true);
            setTimeout(() => setRachaBump(false), 500);
          }
          setRacha(data.racha);
        } catch {}
        celebrandoRef.current = false;
      }, 400);
      return () => {
        clearTimeout(t);
        celebrandoRef.current = false;
      };
    }
    if (!todasCompletadas && showSuccess) setShowSuccess(false);
  }, [todasCompletadas, showSuccess, cargado]);

  function alternarProyecto(id) {
    setProyectos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, expandido: !p.expandido } : p))
    );
  }

  async function alternarMicrotarea(proyectoId, microId) {
    let nuevoValor = false;
    setProyectos((prev) =>
      prev.map((p) => {
        if (p.id !== proyectoId) return p;
        return {
          ...p,
          microtareas: p.microtareas.map((m) => {
            if (m.id !== microId) return m;
            nuevoValor = !m.completada;
            return { ...m, completada: nuevoValor };
          }),
        };
      })
    );
    // Persistir en Neon (optimista: la UI ya se actualizó)
    try {
      await fetch(`/api/microtareas/${microId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completada: nuevoValor }),
      });
    } catch {}
  }

  async function confirmarCaptura(datos) {
    // datos = { curso, fecha, descripcion, microtareas } (los dos últimos vienen de Gemini)
    const res = await fetch("/api/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...datos, tipo: captura?.tipo }),
    });
    if (!res.ok) throw new Error("No se pudo guardar");
  }

  async function terminarCaptura() {
    setCaptura(null);
    await cargarDatos(true);
    setPantalla("hoy");
  }

  async function cerrarSesion() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const navBtnClass = (id) =>
    `flex flex-col items-center justify-center gap-1 transition-colors w-1/4 ${
      pantalla === id ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
    }`;

  return (
    <>
      {confetti.map((c) => (
        <div
          key={c.id}
          className="confetti"
          style={{
            left: `${c.left}vw`,
            backgroundColor: c.color,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duracion}s`,
          }}
        />
      ))}

      <main className="w-full max-w-md mx-auto h-[100dvh] sm:h-[800px] sm:max-h-[90vh] bg-slate-50 sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col sm:border-[8px] sm:border-slate-800">
        <div className="flex-1 relative overflow-hidden w-full h-full">
          {pantalla === "hoy" && (
            <ScreenHoy
              proyectos={proyectos}
              cargado={cargado}
              showSuccess={showSuccess}
              racha={racha}
              username={username}
              onToggleProyecto={alternarProyecto}
              onToggleMicro={alternarMicrotarea}
              onOpenTask={setTaskModalData}
              onLogout={cerrarSesion}
            />
          )}
          {pantalla === "calendario" && <ScreenCalendario proyectos={proyectos} />}
          {pantalla === "captura" && (
            <ScreenCaptura
              onCapturar={(tipo, archivo) => setCaptura({ tipo, archivo })}
            />
          )}
          {pantalla === "progreso" && (
            <ScreenProgreso racha={racha} rachaBump={rachaBump} />
          )}
        </div>

        <TaskModal data={taskModalData} onClose={() => setTaskModalData(null)} />
        <IAModal
          captura={captura}
          onConfirmar={confirmarCaptura}
          onTerminar={terminarCaptura}
          onCancelar={() => setCaptura(null)}
        />

        <nav className="absolute bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-3 flex justify-between items-center z-40 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.02)]">
          <button onClick={() => setPantalla("hoy")} className={navBtnClass("hoy")}>
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wide">Hoy</span>
          </button>
          <button
            onClick={() => setPantalla("calendario")}
            className={navBtnClass("calendario")}
          >
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wide">Agenda</span>
          </button>
          <button
            onClick={() => setPantalla("captura")}
            className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 transition-colors w-1/4 group"
          >
            <div className="bg-blue-600 text-white p-3 rounded-full -mt-7 shadow-lg shadow-blue-200 flex items-center justify-center active:scale-95 transition-transform group-hover:scale-105 mb-0.5">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Capturar</span>
          </button>
          <button
            onClick={() => setPantalla("progreso")}
            className={navBtnClass("progreso")}
          >
            <BarChart2 className="w-6 h-6" />
            <span className="text-[10px] font-bold tracking-wide">Progreso</span>
          </button>
        </nav>
      </main>
    </>
  );
}
