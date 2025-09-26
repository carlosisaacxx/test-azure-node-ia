# Azure OpenAI CLI con Memoria (Node.js + SQL Server)

## Resumen
CLI conversacional que integra Azure OpenAI (GPT-4o) y un sistema de memoria de corto plazo (RAM) y largo plazo (SQL Server). Implementación "Code First" con Sequelize.

## Requerimientos
- Node.js >= 18
- SQL Server (local, docker o Azure SQL)
- Variables de entorno en `.env`

## Instalación
1. `git clone ...`
2. `cd proyecto`
3. `pnpm install`
4. Configurar `.env` (usar `.env.example`)
5. Levantar SQL Server y asegurarse credenciales
6. `pnpm start`

## Estructura
(ver sección estructura del repo)

## Uso (CLI)
- Escribe mensajes y presiona Enter
- Comandos:
  - `exit` o `quit` — salir
  - `clear` — limpiar memoria corto plazo
  - `history` — mostrar historial corto plazo
  - `conversations` — listar conversaciones
  - `new <titulo>` — crear nueva conversación y cambiar a ella
  - `switch <id>` — cambiar a conversación

## Diseño de memoria
- **Corto plazo**: buffer en RAM (últimas N interacciones). Incluido siempre en cada request. (configurable)
- **Largo plazo**: mensajes persistidos en SQL Server (Message + Conversation + MemorySummary).
- Implementación Code-First con `sequelize.sync()`.

## Decisiones técnicas
- Peticiones directas HTTP a Azure endpoint (Axios).
- Retries exponenciales para 429/timeout.
- Estimador tokens heurístico (chars/4) — suficiente para evitar sobrepasar rápidamente el límite. Para producción usar contador real de tokens del tokenizer adecuado.

