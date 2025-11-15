# TheCookFlow API

Servicio HTTP ligero en Node.js 20 + TypeScript para alimentar funcionalidades de planificación de comidas asistidas por IA.

## Autenticación con GitHub Packages en Docker

El proyecto usa el paquete privado @ruperdfn/thecookflow-shared desde npm.pkg.github.com.

El build Docker necesita el build-arg NODE_AUTH_TOKEN para instalar dependencias desde GitHub Packages.

En Coolify hay que definir NODE_AUTH_TOKEN como build argument y enlazarlo a un secret con un PAT de GitHub con permisos read:packages.

## Requisitos

- Node.js 20 (recomendado habilitar Corepack).
- pnpm 9 (se habilita con `corepack prepare pnpm@9 --activate`).
- Git y acceso a GitHub Actions para CI/CD.

## Configuración inicial

```bash
pnpm install
cp .env.example .env
```

Completa las variables del nuevo `.env` antes de iniciar el servicio.

## Variables de entorno

| Variable              | Descripción                                              | Valor por defecto        |
| --------------------- | -------------------------------------------------------- | ------------------------ |
| `NODE_ENV`            | Entorno de ejecución (`development`, `production`, etc.) | `development`            |
| `PORT`                | Puerto HTTP de escucha                                   | `3000`                   |
| `LOG_LEVEL`           | Nivel de log para Pino                                   | `info`                   |
| `CORS_ORIGIN`         | Origen permitido para CORS                               | `http://localhost:3000`  |
| `DATABASE_URL`        | Cadena de conexión a la base de datos                    | `postgres://...`         |
| `JWT_SECRET`          | Secreto para firmar tokens JWT                           | `please-change-me`       |
| `OPENAI_API_KEY`      | Clave para proveedor de IA                               | _(sin valor por defecto)_|
| `PERPLEXITY_API_KEY`  | Clave alternativa de IA                                  | _(sin valor por defecto)_|

> Consulta `.env.example` para más referencias. Nunca compartas secretos reales en repositorios.

## Comandos principales

- `pnpm clean`: Elimina `dist/`.
- `pnpm build`: Transpila la API a `dist/`.
- `pnpm start`: Levanta la versión compilada desde `dist/`.
- `pnpm dev`: Ejecuta la API con recarga en caliente usando `tsx`.
- `pnpm lint`: Ejecuta ESLint con reglas estrictas de TypeScript e importación.
- `pnpm typecheck`: Valida tipos sin emitir archivos.

## Flujo de desarrollo recomendado

1. Clona el repositorio y ejecuta `pnpm install`.
2. Crea tu `.env` a partir de `.env.example`.
3. Ejecuta `pnpm dev` para trabajar en caliente.
4. Antes de subir cambios, corre `pnpm lint` y `pnpm typecheck`.
5. Ejecuta `pnpm build` para confirmar que la salida se genera correctamente.

## Build y despliegue

1. Ejecuta `pnpm build` para generar la salida en `dist/`.
2. Opcionalmente, copia el contenido de `dist/` al entorno destino y ejecuta `pnpm start`.
3. Asegúrate de configurar las variables de entorno en el destino (ver sección anterior).

GitHub Actions ejecuta automáticamente `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` en cada `push` o `pull request`. El workflow de release gestiona los PR de versionado a partir de los archivos generados por Changesets.

## Despliegue en Coolify

1. Selecciona **Application** y elige el repositorio.
2. En **Build Pack**, selecciona **Dockerfile**.
3. Configura el contexto a la raíz del repo (`.`) y el path del Dockerfile como `./Dockerfile`.
4. Define las variables de entorno **solo** en tiempo de ejecución (ejemplo: `PORT=3000`, `DATABASE_URL`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `JWT_SECRET`, `SESSION_SECRET`, `NODE_AUTH_TOKEN`).
5. No definas secretos como argumentos de build; el Dockerfile no los requiere.
6. Al desplegar, Coolify ejecutará `node dist/index.js` automáticamente según el `CMD` de la imagen.

Para verificar el despliegue puedes realizar un `GET /health` que devuelve `{ "ok": true }`.

## Troubleshooting

- **Errores de módulos no resueltos**: confirma que `pnpm install` se completó y que usas Node.js 20.
- **Problemas con variables de entorno**: verifica que `.env` exista y que las claves coincidan con las esperadas por la aplicación.
- **Fallo en `pnpm build` por tipos**: ejecuta `pnpm typecheck` para obtener el detalle y corrige los tipos.
- **Hooks de git no se ejecutan**: asegura que `pnpm install` haya corrido el script `prepare` (husky). Si persiste, ejecuta `pnpm husky install`.

## Seguridad y soporte

- Reportes de vulnerabilidades: consulta `SECURITY.md`.
- Canales de soporte y SLA: revisa `SUPPORT.md`.

## Versionado y changelog

Este proyecto usa [Changesets](https://github.com/changesets/changesets). Cada feature o fix debe incluir un archivo en `.changeset/`. El historial consolidado se publica en `CHANGELOG.md`.
