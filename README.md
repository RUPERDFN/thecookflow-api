# TheCookFlow API

Pequeño servicio HTTP escrito en Node.js 20 + TypeScript.

## Requisitos

- Node.js 20 (Corepack habilitado)
- pnpm

## Instalación

```bash
pnpm install
```

## Configuración de entorno

Copia el archivo de ejemplo y ajusta los valores según tu entorno local:

```bash
cp .env.example .env
```

Variables clave:

- `PORT`: Puerto donde expone la API (por defecto `3000`).
- `DATABASE_URL`: Cadena de conexión a tu base de datos.
- `JWT_SECRET`: Secreto para firmar tokens.
- `OPENAI_API_KEY` / `PERPLEXITY_API_KEY`: Claves para los proveedores de IA.

## Desarrollo

```bash
pnpm dev
```

El script `dev` ejecuta `tsx watch src/index.ts` para recargar automáticamente al modificar el código.

## Scripts útiles

- `pnpm build`: Genera la salida compilada en `dist/`.
- `pnpm start`: Levanta la versión compilada.
- `pnpm lint`: Ejecuta ESLint.
- `pnpm test`: Ejecuta Vitest (si hay pruebas configuradas).

## Endpoint de salud

```
GET /api/health → { "ok": true }
```
