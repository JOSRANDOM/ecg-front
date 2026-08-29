// Trazado ECG simulado para el mini-gráfico de la historia clínica. No hay
// persistencia de la señal cruda en v1 (ver plan de integración) — esto es
// puramente decorativo, independiente del backend real.

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
