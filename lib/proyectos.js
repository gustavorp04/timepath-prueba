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

// Planifica las microtareas a ritmo de "dosis diaria" (opción B):
// - El primer paso apunta a hoy y los siguientes a razón de 1 por día.
// - Nunca se pasa del tope de 90 min por día (contando otros cursos)...
// - ...salvo urgencia: si la entrega es hoy (o ya no queda espacio antes de
//   la víspera), la fecha de entrega gana y el día se sobrecarga.
// Función pura (sin base de datos) para poder probarla por separado.
export function planificarDias(micros, fechaEntrega, carga, hoy) {
  let ultimoDia; // null = sin límite, se reparte desde hoy hacia adelante
  if (!fechaEntrega) ultimoDia = null;
  else if (fechaEntrega <= hoy) ultimoDia = hoy;
  else ultimoDia = sumarDias(fechaEntrega, -1);

  let objetivo = hoy; // día al que apunta el próximo paso (ritmo 1/día)
  return micros.map((m) => {
    const min = minutosDe(m.tiempo);

    // Si el ritmo ya rebasó el rango disponible, se vuelve a buscar desde hoy
    let dia = ultimoDia && objetivo > ultimoDia ? hoy : objetivo;
    while ((carga.get(dia) || 0) + min > TOPE_MIN_DIA && (!ultimoDia || dia < ultimoDia)) {
      dia = sumarDias(dia, 1);
    }

    // Ningún día tiene espacio antes de la entrega: urgencia, va al menos cargado
    if ((carga.get(dia) || 0) + min > TOPE_MIN_DIA && ultimoDia) {
      let mejor = hoy;
      for (let d = hoy; d <= ultimoDia; d = sumarDias(d, 1)) {
        if ((carga.get(d) || 0) < (carga.get(mejor) || 0)) mejor = d;
      }
      dia = mejor;
    }

    carga.set(dia, (carga.get(dia) || 0) + min);
    objetivo = sumarDias(dia, 1);
    return { ...m, fecha_asignada: dia };
  });
}

// Carga la agenda pendiente del usuario y reparte las microtareas nuevas.
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

  return planificarDias(micros, fechaEntrega, carga, hoy);
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
