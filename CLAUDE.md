# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **IMPORTANTE:** Esta es la versión Next.js 16, que tiene breaking changes respecto a versiones anteriores. Antes de escribir código, revisa `node_modules/next/dist/docs/` y presta atención a los avisos de deprecación.

## Project Overview

**Cardioflow E3** — Frontend de gestión para el electrocardiógrafo CONTEC E3. Permite sincronizar el dispositivo vía un agente Windows, y gestionar pacientes, equipos y usuarios.

Backend/agente: repositorio hermano `electrocardiógrafo` (Python/FastAPI + agente .exe).

## Commands

```bash
# Desarrollo local
npm run dev          # http://localhost:3000 con hot-reload
npm run build        # Build de producción (salida standalone)
npm start            # Servidor de producción
npm run lint         # ESLint

# Docker (via Makefile)
make dev                        # dev server local
make build && make up           # producción en Docker
make build-dev && make up-dev   # Docker con hot-reload y volumen montado
make down                       # detener contenedores
make logs                       # logs del contenedor
make shell                      # abrir shell en el contenedor
```

## Architecture

App Router de Next.js 16. Toda la lógica de UI vive bajo `app/`:

```
app/
├── layout.tsx              # Root layout: monta Navbar + DeviceStatusBar en todas las páginas
├── page.tsx                # Dashboard principal
├── globals.css             # Tailwind v4 + estilos globales
├── components/
│   ├── DeviceStatusBar.tsx # Barra de estado: polling cada 5s a GET /agent/device-status
│   ├── Navbar.tsx          # Header con acceso al NavDrawer
│   ├── NavDrawer.tsx       # Navegación lateral/móvil
│   ├── DeviceCard.tsx      # Tarjeta de dispositivo
│   └── DeviceStatusBadge.tsx # Indicador LED (gris/amarillo/verde)
├── pacientes/
│   ├── page.tsx            # Lista de pacientes
│   ├── [id]/page.tsx       # Detalle de paciente
│   └── _data.ts            # Utilidades de datos de paciente
├── equipos/page.tsx        # Gestión de equipos
└── usuarios/page.tsx       # Gestión de usuarios
```

### Flujo de sincronización del dispositivo

1. `DeviceStatusBar` llama `GET /agent/info` al cargar para verificar si el agente está disponible.
2. El usuario pulsa "Sincronizar dispositivo" → el frontend descarga `agente_contec.exe` via `GET /agent/download`.
3. El usuario ejecuta el `.exe` en la PC Windows con el CONTEC E3 conectado por USB.
4. El frontend hace polling a `GET /api/v1/device/status` cada 3s (timeout 90s).
5. El LED del `DeviceStatusBar` cambia: ⚫ desconectado → 🟡 agente activo → 🟢 dispositivo detectado.

### Environment

`NEXT_PUBLIC_API_URL` se embebe en el bundle en tiempo de build (no en runtime). Debe apuntar al backend Windows con uvicorn — el CONTEC E3 solo funciona vía USB en Windows.

```bash
# .env.local (desarrollo)
NEXT_PUBLIC_API_URL=http://localhost:8000
APP_PORT=3000

# Producción (por defecto en Dockerfile)
NEXT_PUBLIC_API_URL=https://electrocardiographdevice-production.up.railway.app
```

### Next.js config

`next.config.ts` usa `output: 'standalone'` para optimizar la imagen Docker. Tailwind v4 se configura via PostCSS (`postcss.config.mjs`). Path alias `@/*` apunta a la raíz del proyecto.
