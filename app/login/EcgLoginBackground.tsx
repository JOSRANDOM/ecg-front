"use client";

import { useEffect, useRef } from "react";

interface Carril {
  y: number;            // centro vertical, 0..1 relativo al alto del canvas
  color: string;         // "r,g,b"
  amplitud: number;      // px
  pixelesPorLatido: number;
  velocidad: number;     // px/s
  grosor: number;
  opacidad: number;
}

const CARRILES: Carril[] = [
  { y: 0.22, color: "56,189,248",  amplitud: 42, pixelesPorLatido: 300, velocidad: 68, grosor: 1.4, opacidad: 0.35 },
  { y: 0.50, color: "96,165,250",  amplitud: 64, pixelesPorLatido: 260, velocidad: 94, grosor: 2,   opacidad: 0.75 },
  { y: 0.78, color: "56,189,248",  amplitud: 38, pixelesPorLatido: 330, velocidad: 55, grosor: 1.4, opacidad: 0.3 },
];

/** Modelo de un latido normal (P-QRS-T) como suma de gaussianas — mismo
 * criterio visual que un trazado real: P y T son bultos redondeados, QRS es
 * un pico angosto y alto con muescas Q/S antes/después. `t` es el tiempo
 * normalizado dentro de un latido, en [0, 1). */
function valorEcg(t: number): number {
  const gauss = (centro: number, ancho: number, amp: number) => {
    const d = t - centro;
    return amp * Math.exp(-(d * d) / (2 * ancho * ancho));
  };
  return (
    gauss(0.15, 0.025, 0.12) +   // P
    gauss(0.27, 0.008, -0.15) +  // Q
    gauss(0.30, 0.010, 1.0) +    // R
    gauss(0.33, 0.010, -0.28) +  // S
    gauss(0.55, 0.05, 0.30)      // T
  );
}

export default function EcgLoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let W = 0;
    let H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function ajustarTamano() {
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ajustarTamano();
    const ro = new ResizeObserver(ajustarTamano);
    ro.observe(canvas);

    const offsets = CARRILES.map(() => 0);
    const PASO_MUESTREO = 2;

    function dibujar() {
      ctx!.clearRect(0, 0, W, H);
      CARRILES.forEach((carril, i) => {
        const centroY = H * carril.y;
        ctx!.save();
        ctx!.shadowBlur = 14;
        ctx!.shadowColor = `rgba(${carril.color}, 0.9)`;
        ctx!.strokeStyle = `rgba(${carril.color}, ${carril.opacidad})`;
        ctx!.lineWidth = carril.grosor;
        ctx!.beginPath();
        for (let x = 0; x <= W; x += PASO_MUESTREO) {
          const posicion = x + offsets[i];
          let t = (posicion / carril.pixelesPorLatido) % 1;
          if (t < 0) t += 1;
          const y = centroY - valorEcg(t) * carril.amplitud;
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();
        ctx!.restore();
      });
    }

    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    if (prefiereMenosMovimiento) {
      dibujar();
    } else {
      let ultimo = performance.now();
      const frame = (ahora: number) => {
        const dt = Math.min((ahora - ultimo) / 1000, 0.05);
        ultimo = ahora;
        CARRILES.forEach((carril, i) => { offsets[i] += carril.velocidad * dt; });
        dibujar();
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
    />
  );
}
