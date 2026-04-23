# ECG Front — Panel de gestión CONTEC E3

Frontend del sistema de gestión del electrocardiógrafo CONTEC E3. Permite detectar y sincronizar el dispositivo desde el navegador.

## Stack

- **Next.js 16** + **TypeScript**
- **Tailwind CSS v4**
- **recharts** — gráficos ECG
- **lucide-react** — iconos
- Docker multi-stage (producción + desarrollo)

## Requisitos

- Node.js 20+
- Backend [`Electrocardiograph_device`](https://github.com/JOSRANDOM/Electrocardiograph_device) corriendo en `http://localhost:8000`

## Desarrollo local

```bash
cp .env.example .env   # configurar variables
npm install
npm run dev            # http://localhost:3000
```

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del backend API | `http://localhost:8000` |
| `NEXT_PUBLIC_AGENT_DOWNLOAD_URL` | URL de descarga del agente .exe | `{API_URL}/agent/download` |
| `APP_PORT` | Puerto del contenedor Docker | `3000` |

## Docker

```bash
make build && make up          # producción → http://localhost:3000
make build-dev && make up-dev  # desarrollo con hot-reload
make down                      # detener
make logs                      # ver logs
```

## Flujo de sincronización

1. El usuario presiona **Sincronizar dispositivo**
2. Se valida que el sistema operativo sea Windows
3. Si es la primera vez, se descarga `agente_contec.exe` automáticamente
4. El usuario ejecuta el agente y conecta el electrocardiógrafo por USB
5. El indicador LED cambia a **verde** cuando el dispositivo es detectado

| LED | Estado |
|-----|--------|
| 🟡 Amarillo | Buscando / descargando |
| 🟢 Verde | Dispositivo sincronizado |
| 🔴 Rojo | Error o SO no compatible |

## Estructura

```
app/
├── components/
│   └── DeviceCard.tsx   # Card principal con LED y lógica de sincronización
├── layout.tsx
└── page.tsx
```
