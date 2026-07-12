// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EstadoPaciente = "activo" | "pendiente" | "inactivo";
export type EstadoEcg      = "revisado" | "pendiente" | "en_proceso";

export interface RegistroEcg {
  id:       string;
  fecha:    string;       // ISO date-time
  duracion: string;
  tecnico:  string;
  medico:   string | null;
  estado:   EstadoEcg;
  notas?:   string;
}

export interface Paciente {
  id:          string;
  nombre:      string;
  documento:   string;
  edad:        number;
  tipoSangre:  string;
  telefono:    string;
  ultimoEcg:   string | null;
  estado:      EstadoPaciente;
  registros:   RegistroEcg[];
}

// ── ECG waveform (deterministic — sin Date.now / Math.random) ─────────────────

function ecgCycle(): number[] {
  return [
    0, 0, 0.08, 0.18, 0.08, 0, 0,
    -0.08, -0.28, 1, 0.28, -0.08, 0, 0,
    0, 0.22, 0.42, 0.22, 0, 0, 0, 0, 0,
  ];
}

export function ecgData() {
  return [...ecgCycle(), ...ecgCycle(), ...ecgCycle()].map((v, i) => ({ i, v }));
}

// ── Datos MVP ─────────────────────────────────────────────────────────────────

export const PACIENTES: Paciente[] = [
  {
    id: "1", nombre: "María Fernanda López", documento: "1.023.456.789",
    edad: 54, tipoSangre: "O+", telefono: "+57 310 234 5678",
    ultimoEcg: "2026-05-20", estado: "activo",
    registros: [
      { id: "r1-1", fecha: "2026-05-20T09:15:00", duracion: "30s", tecnico: "Sofía Restrepo", medico: "Dr. Ricardo Montoya",  estado: "revisado",   notas: "Ritmo sinusal normal. FC 72 lpm." },
      { id: "r1-2", fecha: "2026-03-10T14:30:00", duracion: "30s", tecnico: "Andrés Mora",    medico: "Dr. Camila Vásquez",  estado: "revisado",   notas: "Leve taquicardia sinusal. FC 98 lpm. Control en 2 meses." },
      { id: "r1-3", fecha: "2026-01-05T11:00:00", duracion: "30s", tecnico: "Sofía Restrepo", medico: "Dr. Ricardo Montoya",  estado: "revisado",   notas: "Sin alteraciones significativas." },
    ],
  },
  {
    id: "2", nombre: "Carlos Andrés Medina", documento: "80.245.317",
    edad: 67, tipoSangre: "A+", telefono: "+57 315 876 5432",
    ultimoEcg: "2026-05-15", estado: "activo",
    registros: [
      { id: "r2-1", fecha: "2026-05-15T08:00:00", duracion: "30s", tecnico: "Andrés Mora",    medico: null,                  estado: "pendiente"  },
      { id: "r2-2", fecha: "2026-04-01T10:20:00", duracion: "30s", tecnico: "Sofía Restrepo", medico: "Dr. Ricardo Montoya",  estado: "revisado",   notas: "Bloqueo de rama derecha incompleto. Seguimiento trimestral." },
      { id: "r2-3", fecha: "2026-02-14T15:45:00", duracion: "30s", tecnico: "Andrés Mora",    medico: "Dr. Camila Vásquez",  estado: "revisado"   },
    ],
  },
  {
    id: "3", nombre: "Ana Milena Torres", documento: "52.891.004",
    edad: 41, tipoSangre: "B-", telefono: "+57 300 112 3344",
    ultimoEcg: "2026-04-30", estado: "pendiente",
    registros: [
      { id: "r3-1", fecha: "2026-04-30T16:10:00", duracion: "30s", tecnico: "Sofía Restrepo", medico: null,                  estado: "pendiente"  },
      { id: "r3-2", fecha: "2026-02-20T09:30:00", duracion: "30s", tecnico: "Andrés Mora",    medico: "Dr. Ricardo Montoya",  estado: "revisado",   notas: "ECG dentro de límites normales." },
    ],
  },
  {
    id: "4", nombre: "Jorge Iván Castillo", documento: "17.654.023",
    edad: 72, tipoSangre: "AB+", telefono: "+57 321 456 7890",
    ultimoEcg: "2026-03-12", estado: "activo",
    registros: [
      { id: "r4-1", fecha: "2026-03-12T11:30:00", duracion: "30s", tecnico: "Sofía Restrepo", medico: "Dr. Camila Vásquez",  estado: "revisado",   notas: "Extrasístoles ventriculares aisladas. Control mensual recomendado." },
      { id: "r4-2", fecha: "2025-12-05T08:45:00", duracion: "30s", tecnico: "Andrés Mora",    medico: "Dr. Ricardo Montoya",  estado: "revisado",   notas: "Ritmo sinusal. PR 0.18s." },
    ],
  },
  {
    id: "5", nombre: "Lucía Esperanza Vargas", documento: "43.210.876",
    edad: 38, tipoSangre: "O-", telefono: "+57 318 900 1122",
    ultimoEcg: null, estado: "pendiente",
    registros: [],
  },
  {
    id: "6", nombre: "Pedro José Ramírez", documento: "91.345.602",
    edad: 60, tipoSangre: "A-", telefono: "+57 311 223 3445",
    ultimoEcg: "2026-02-05", estado: "inactivo",
    registros: [
      { id: "r6-1", fecha: "2026-02-05T13:00:00", duracion: "30s", tecnico: "Andrés Mora",    medico: "Dr. Ricardo Montoya",  estado: "revisado",   notas: "Fibrilación auricular paroxística documentada. Derivado a cardiología." },
    ],
  },
  {
    id: "7", nombre: "Sandra Milena Ruiz", documento: "39.712.445",
    edad: 49, tipoSangre: "B+", telefono: "+57 302 567 8901",
    ultimoEcg: "2026-05-28", estado: "activo",
    registros: [
      { id: "r7-1", fecha: "2026-05-28T10:00:00", duracion: "30s", tecnico: "Sofía Restrepo", medico: null,                  estado: "en_proceso" },
      { id: "r7-2", fecha: "2026-03-18T14:15:00", duracion: "30s", tecnico: "Andrés Mora",    medico: "Dr. Camila Vásquez",  estado: "revisado",   notas: "Sin hallazgos patológicos." },
    ],
  },
  {
    id: "8", nombre: "Hernando Suárez Pinto", documento: "7.823.190",
    edad: 58, tipoSangre: "O+", telefono: "+57 314 678 9012",
    ultimoEcg: "2026-01-18", estado: "inactivo",
    registros: [
      { id: "r8-1", fecha: "2026-01-18T09:20:00", duracion: "30s", tecnico: "Andrés Mora",    medico: "Dr. Ricardo Montoya",  estado: "revisado",   notas: "Hipertrofia ventricular izquierda leve." },
    ],
  },
];

export function getPaciente(id: string): Paciente | undefined {
  return PACIENTES.find(p => p.id === id);
}
