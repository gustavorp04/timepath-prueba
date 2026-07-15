import { sql } from "@/lib/db";

// Tope de minutos que la IA puede agendar en un mismo día.
// La fecha de entrega siempre gana: si no alcanza, el último día se carga más.
const TOPE_MIN_DIA = 90;

// Fecha de hoy (YYYY-MM-DD) en hora de Perú; el servidor corre en UTC.
export function hoyLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

function sumarDias(fechaISO, n) {
  const d = new Date(fechaISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function minutosDe(tiempo) {
  return parseInt(tiempo, 10) || 20;
}

// Reparte las microtareas entre hoy y la víspera de la entrega, sin pasar de
// TOPE_MIN_DIA por día (contando lo ya agendado de otros cursos del usuario).
async function repartirFechas(usuarioId, micros, fechaEntrega) {
  const hoy = hoyLocal();

  const pendientes = await sql`
    SELECT to_char(m.fecha_asignada, 'YYYY-MM-DD') AS dia, m.tiempo
    FROM microtareas m
    JOIN proyectos p ON p.id = m.proyecto_id
    WHERE p.usuario_id = ${usuarioId}
      AND m.completada = FALSE
      AND m.fecha_asignada >= ${hoy}
  `;
  const carga = new Map();
  for (const f of pendientes) {
    carga.set(f.dia, (carga.get(f.dia) || 0) + minutosDe(f.tiempo));
  }

  let ultimoDia; // null = sin límite, se reparte desde hoy hacia adelante
  if (!fechaEntrega) ultimoDia = null;
  else if (fechaEntrega <= hoy) ultimoDia = hoy;
  else ultimoDia = sumarDias(fechaEntrega, -1);

  let dia = hoy;
  return micros.map((m) => {
    const min = minutosDe(m.tiempo);
    while ((carga.get(dia) || 0) + min > TOPE_MIN_DIA && (!ultimoDia || dia < ultimoDia)) {
      dia = sumarDias(dia, 1);
    }
    carga.set(dia, (carga.get(dia) || 0) + min);
    return { ...m, fecha_asignada: dia };
  });
}

// Guardado compartido: inserta un proyecto + sus microtareas para un usuario,
// repartiendo cada microtarea en un día concreto (dosis diaria).
// Lo usan la captura web (app/api/tareas POST) y el chatbot de WhatsApp.
// Si no llegan microtareas válidas, usa los textos fijos del prototipo.
export async function guardarProyecto(usuarioId, { curso, fecha, descripcion, microtareas, resumen }) {
  const microsValidas =
    Array.isArray(microtareas) && microtareas.length > 0 && microtareas.every((m) => m?.titulo)
      ? microtareas.slice(0, 12)
      : [
          {
            titulo: "Fase 1: Revisión analítica",
            descripcion:
              "Realizar una lectura rápida del material ingresado para identificar los 3 conceptos clave antes de empezar el desarrollo práctico.",
            tiempo: "15 min",
          },
          {
            titulo: "Fase 2: Ejecución principal",
            descripcion:
              "Desarrollar la estructura base de la solución utilizando un temporizador Pomodoro estricto de concentración.",
            tiempo: "30 min",
          },
        ];

  const desc =
    typeof descripcion === "string" && descripcion.trim()
      ? descripcion.trim().slice(0, 60)
      : "Asignación Desconocida";

  const resumenLimpio =
    typeof resumen === "string" && resumen.trim() ? resumen.trim().slice(0, 1000) : null;

  const repartidas = await repartirFechas(usuarioId, microsValidas, fecha || null);

  const inserted = await sql`
    INSERT INTO proyectos (usuario_id, curso, descripcion, fecha_entrega, resumen)
    VALUES (${usuarioId}, ${curso}, ${desc}, ${fecha || null}, ${resumenLimpio})
    RETURNING id
  `;
  const proyectoId = inserted[0].id;

  let orden = 1;
  const guardadas = [];
  for (const m of repartidas) {
    const fila = {
      titulo: String(m.titulo).slice(0, 60),
      descripcion: String(m.descripcion || "Avanzar con esta parte de la tarea.").slice(0, 300),
      tiempo: String(m.tiempo || "20 min").slice(0, 20),
      fecha_asignada: m.fecha_asignada,
    };
    await sql`
      INSERT INTO microtareas (proyecto_id, titulo, descripcion, tiempo, orden, fecha_asignada)
      VALUES (${proyectoId}, ${fila.titulo}, ${fila.descripcion}, ${fila.tiempo}, ${orden++}, ${fila.fecha_asignada})
    `;
    guardadas.push(fila);
  }

  return { proyectoId, micros: guardadas };
}
