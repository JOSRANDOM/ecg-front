import type { Paciente } from "../pacientes/_types";

/** Envuelve cada celda en comillas solo si hace falta (coma, comilla o salto
 * de línea) — evita saturar el CSV de comillas innecesarias en el caso
 * común de texto simple. */
function escaparCelda(valor: string): string {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

function aCsv(encabezados: string[], filas: string[][]): string {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(escaparCelda).join(","));
  // BOM al inicio: sin esto, Excel en Windows abre acentos/ñ como caracteres
  // corruptos al no detectar UTF-8 automáticamente.
  return "﻿" + lineas.join("\r\n");
}

export async function generarCsvPacientes(): Promise<{ blob: Blob; nombreArchivo: string }> {
  const res = await fetch("/api/pacientes");
  if (!res.ok) throw new Error("No se pudo obtener la lista de pacientes.");
  const pacientes: Paciente[] = await res.json();

  const encabezados = [
    "Nombre completo", "Documento", "Edad", "Tipo de sangre", "Teléfono",
    "Estado", "Último ECG", "Total registros", "Registrado el",
  ];
  const filas = pacientes.map((p) => [
    p.nombre_completo,
    p.documento,
    String(p.edad),
    p.tipo_sangre,
    p.telefono,
    p.estado,
    p.ultimo_ecg ? p.ultimo_ecg.split("T")[0] : "",
    String(p.total_registros),
    p.creado_en.split("T")[0],
  ]);

  const csv = aCsv(encabezados, filas);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const fecha = new Date().toISOString().split("T")[0];
  return { blob, nombreArchivo: `pacientes_${fecha}.csv` };
}
