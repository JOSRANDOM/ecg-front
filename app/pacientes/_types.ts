// Tipos que reflejan la respuesta real de pacientes-service (snake_case,
// mismo convenio que usuarios-service — ver app/usuarios/page.tsx). No
// existe una capa de mapeo camelCase↔snake_case en las rutas /api/*: se
// consume el JSON tal cual llega del backend.

export type EstadoPaciente = "activo" | "pendiente" | "inactivo";
export type EstadoEcg = "pendiente" | "en_proceso" | "revisado";

export interface Paciente {
  id: string;
  nombre_completo: string;
  documento: string;
  edad: number;
  tipo_sangre: string;
  telefono: string;
  estado: EstadoPaciente;
  ultimo_ecg: string | null;
  total_registros: number;
  creado_en: string;
  actualizado_en: string;
}

export interface RegistroEcg {
  id: string;
  paciente_id: string;
  fecha: string;
  duracion_segundos: number;
  tecnico_id: string;
  tecnico_nombre: string;
  medico_id: string | null;
  medico_nombre: string | null;
  estado: EstadoEcg;
  sintomas: string[];
  descripcion_sintomas: string | null;
  antecedentes: string[];
  antecedentes_extra: string | null;
  notas: string | null;
  ritmo: string[];
  fc_registrada: number | null;
  alteraciones: string[];
  descripcion_hallazgos: string | null;
  diagnostico: string | null;
  diagnostico_secundario: string | null;
  recomendaciones: string | null;
  revisado_por: string | null;
  revisado_en: string | null;
  proximo_control: string | null;
  creado_en: string;
  actualizado_en: string;
}

/** Snapshot histórico de un informe antes de ser corregido — ver
 * GET /api/registros-ecg/{id}/versiones. */
export interface VersionInforme {
  id: string;
  registro_ecg_id: string;
  version: number;
  ritmo: string[];
  fc_registrada: number | null;
  alteraciones: string[];
  descripcion_hallazgos: string | null;
  diagnostico: string | null;
  diagnostico_secundario: string | null;
  recomendaciones: string | null;
  medico_id: string | null;
  medico_nombre: string | null;
  reemplazado_por: string;
  reemplazado_por_nombre: string;
  creado_en: string;
}

/** Recorte de UsuarioResponse (usuarios-service) usado para los selectores
 * de técnico/médico — ver GET /api/usuarios?rol=tecnico|medico. */
export interface UsuarioBasico {
  id: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
}

export type AccionAuditoria =
  | "ver_paciente" | "crear_paciente" | "actualizar_paciente"
  | "ver_registro_ecg" | "crear_registro_ecg" | "revisar_registro_ecg"
  | "subir_imagen_ecg";

/** Evento de auditoría — ver GET /api/auditoria. `usuario_nombre` es un
 * snapshot (username, no nombre_completo — UsuarioAutenticado en
 * pacientes-service no trae nombre completo, mismo criterio que
 * tecnico_nombre en RegistroEcg). */
export interface EventoAuditoria {
  id: string;
  paciente_id: string;
  entidad_tipo: "paciente" | "registro_ecg" | "imagen_ecg";
  entidad_id: string;
  accion: AccionAuditoria;
  usuario_id: string;
  usuario_nombre: string;
  creado_en: string;
}

/** Foto/PDF de un ECG en papel subido manualmente (fuera del flujo
 * estructurado de RegistroEcg) — ver GET/POST /api/pacientes/{id}/imagenes-ecg.
 * `url` es una signed URL de Supabase Storage con vigencia de 1h, resuelta
 * en cada request — no se persiste ni se cachea en el cliente. */
export interface ImagenEcg {
  id: string;
  paciente_id: string;
  fecha: string; // "YYYY-MM-DD"
  nombre_archivo: string;
  tipo_archivo: string;
  tamano_bytes: number;
  subido_por_nombre: string;
  creado_en: string;
  url: string;
}

/** Color de avatar determinístico a partir de un id — funciona igual con
 * los ids numéricos del mock viejo que con uuids reales (a diferencia de
 * `parseInt(id) % n`, que con un uuid da NaN o solo lee sus primeros
 * dígitos). */
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
];

export function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function iniciales(nombre: string): string {
  return nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
