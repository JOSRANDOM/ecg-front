# ECG Front — Panel de gestión CONTEC E3

Frontend del sistema de gestión del electrocardiógrafo CONTEC E3. Permite detectar y sincronizar el dispositivo desde el navegador con un solo clic.

## Stack

- **Next.js 16** + **TypeScript**
- **Tailwind CSS v4**
- **recharts** — gráficos ECG
- **lucide-react** — iconos
- Docker multi-stage (producción + desarrollo)

## Requisitos

- Node.js 20+
- Backend [`Electrocardiograph_device`](https://github.com/JOSRANDOM/Electrocardiograph_device) corriendo en Windows

## Desarrollo local

```bash
cp .env.example .env   # configurar NEXT_PUBLIC_API_URL
npm install
npm run dev            # http://localhost:3000
```

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del backend API | `http://localhost:8000` |
| `APP_PORT` | Puerto del contenedor Docker | `3000` |

## Docker

```bash
make build && make up          # producción → http://localhost:3000
make build-dev && make up-dev  # desarrollo con hot-reload
make down                      # detener
make logs                      # ver logs
```

## Flujo de sincronización

1. Al cargar la página, el frontend consulta `GET /agent/info` — si el `.exe` no está disponible el botón se deshabilita
2. El usuario presiona **Sincronizar dispositivo**
3. El navegador descarga `agente_contec.exe` vía `GET /agent/download`
4. El usuario ejecuta el agente en su PC Windows con el dispositivo conectado por USB
5. El frontend hace polling cada 3s a `GET /api/v1/device/status` (timeout: 90s)
6. El indicador LED cambia a **verde** cuando el dispositivo es detectado

> **Requisito**: `NEXT_PUBLIC_API_URL` debe apuntar al servidor Windows donde corre uvicorn, no a un servidor Linux/cloud.

| LED | Estado |
|-----|--------|
| 🟡 Amarillo | Esperando que el usuario ejecute el agente |
| 🟢 Verde | Dispositivo sincronizado |
| 🔴 Rojo | Timeout o error de conexión |
