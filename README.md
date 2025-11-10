# TheCookFlow API

Servicio HTTP ligero en Node.js 20 + TypeScript para alimentar funcionalidades de planificación de comidas asistidas por IA.

## Requisitos

- Node.js 20 (recomendado habilitar Corepack).
- pnpm `9.12.3` (definido en `package.json`).
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

- `pnpm dev`: Ejecuta la API con recarga en caliente usando `tsx`.
- `pnpm lint`: Ejecuta ESLint con reglas estrictas de TypeScript e importación.
- `pnpm typecheck`: Valida tipos sin emitir archivos.
- `pnpm test`: Corre las pruebas con Vitest (modo `run`).
- `pnpm build`: Transpila la API a `dist/`.
- `pnpm start`: Levanta la versión compilada desde `dist/`.
- `pnpm qa`: Ejecuta `lint`, `typecheck` y `test` en secuencia.
- `pnpm lint:fix` / `pnpm format:write`: Corrigen problemas detectados por ESLint o Prettier.
- `pnpm changeset`: Genera una nueva entrada de cambio (requiere interacción en CLI).
- `pnpm release`: Consumido por CI para aplicar versiones generadas con Changesets.

## Flujo de desarrollo recomendado

1. Clona el repositorio y ejecuta `pnpm install`.
2. Crea tu `.env` a partir de `.env.example`.
3. Ejecuta `pnpm dev` para trabajar en caliente.
4. Antes de subir cambios, corre `pnpm qa` o los comandos individuales.
5. Si introduces cambios relevantes, genera un changeset con `pnpm changeset`.

## Build y despliegue

1. Ejecuta `pnpm build` para generar la salida en `dist/`.
2. Opcionalmente, copia el contenido de `dist/` al entorno destino y ejecuta `pnpm start`.
3. Asegúrate de configurar las variables de entorno en el destino (ver sección anterior).

GitHub Actions ejecuta automáticamente `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` en cada `push` o `pull request`. El workflow de release gestiona los PR de versionado a partir de los archivos generados por Changesets.

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
