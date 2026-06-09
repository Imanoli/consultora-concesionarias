\# Dashboard Multi-Cliente — Consultora Imanol Rodríguez Mini



\## Propósito del proyecto



Dashboard centralizado para visualizar KPIs de marketing digital de múltiples clientes (concesionarias de autos y otros) en tiempo "casi real", con actualización diaria y capa de IA para insights automáticos.



Cliente piloto: \*\*ESAC Energy\*\* (energía solar, La Pampa).

Próximos clientes a integrar: Dakota Cars, CG Cars.



\## Quién soy



Imanol Rodríguez Mini (Ima), consultor independiente de marketing digital y tecnología, especializado en concesionarias de autos en Córdoba, Argentina. Trabajo solo, con proveedores subcontratados. Hago vibe coding con Claude.



\## Stack técnico



\- \*\*Frontend\*\*: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts. Deploy en Vercel.

\- \*\*Backend\*\*: Node.js + TypeScript + Fastify. Deploy en VPS propio con pm2.

\- \*\*DB\*\*: MySQL en VPS.

\- \*\*ORM\*\*: Prisma.

\- \*\*Auth\*\*: NextAuth.js con JWT.

\- \*\*Cron\*\*: node-cron, 1 ejecución diaria a las 8 AM Argentina (timezone America/Argentina/Buenos\_Aires).

\- \*\*IA\*\*: Claude API (Sonnet) para insights automáticos diarios.

\- \*\*Reverse proxy\*\*: Caddy en VPS para HTTPS automático.

\- \*\*Comunicación frontend ↔ backend\*\*: API REST con CORS configurado.



\## Estructura del repo (monorepo)



```

Consultora-Concesionarias/

├── frontend/          # Next.js en Vercel

├── backend/           # Node + Fastify en VPS

├── prisma/            # Schema y migrations

├── docs/              # Documentación interna

├── CLAUDE.md          # Este archivo

└── README.md

```



\## Fuentes de datos integradas



| Fuente | API | Estado |

|---|---|---|

| Meta Ads | Marketing API (Graph) | Prioridad alta |

| Google Ads | Google Ads API | Prioridad alta |

| Google Analytics 4 | Data API | Prioridad media |

| Microsoft Clarity | Data Export API | Prioridad media |

| CRM Kommo | API REST | Fase posterior |



\## Pipeline diario (8 AM Argentina)



1\. Fetch Meta Ads del día anterior

2\. Fetch Google Ads del día anterior

3\. Fetch GA4 del día anterior

4\. Fetch Clarity del día anterior

5\. Guardar snapshots en MySQL

6\. Enviar JSON consolidado a Claude API → recibir insights

7\. Guardar insights en DB

8\. Si hay alertas críticas → webhook a n8n → WhatsApp



\## Niveles de IA



1\. \*\*Alertas por reglas duras\*\*: CPL +30%, gasto desbordado, 0 leads en ventana de horario activo, Quality Score < 5.

2\. \*\*Análisis diario con Claude\*\*: anomalías + recomendaciones priorizadas, guardadas en tabla `ai\_insights`.

3\. \*\*Chat interactivo\*\* (fase posterior): el usuario pregunta sobre los datos, Claude responde con contexto de la DB.



\## Schema MySQL inicial (4 tablas)



\- `clients` — id, name, industry, active, created\_at

\- `daily\_metrics` — snapshot por cliente/fuente/día con métricas agregadas + raw\_data JSON

\- `campaign\_metrics\_daily` — desglose por campaña

\- `ai\_insights` — insights generados por Claude



\## Funcionalidades clave del frontend



\- Login email + password (NextAuth)

\- Vista master (yo) y vista cliente (cada uno los suyos, fase posterior)

\- KPIs por cliente: gasto, leads, CPL, CTR, CPM, conversiones, sesiones

\- Desglose por campaña

\- Filtros por rango de fechas: hoy, ayer, últimos 7, últimos 30, mes actual, mes anterior, personalizado

\- Mobile-first (lo uso mucho desde el celular)



\## Convenciones de código



\- TypeScript estricto (`"strict": true`)

\- Prettier + ESLint estándar de Next.js

\- Imports absolutos con alias `@/`

\- Componentes en PascalCase, hooks en camelCase con prefijo `use`

\- Variables de entorno tipadas con `zod` o `t3-env`

\- Nunca commitear `.env`, siempre actualizar `.env.example`



\## Preferencias de comunicación



\- Respuestas en español

\- Claras, estructuradas, accionables

\- Tablas y listas mejor que texto largo

\- Tono directo, sin disclaimers innecesarios

\- Si hay tradeoffs, explicalos antes de elegir

\- Si algo no está definido, preguntar antes de inventar



\## Roadmap de etapas



1\. \*\*Etapa 1 — Setup base\*\* (en curso): estructura del repo, schema Prisma, endpoints vacíos, frontend con login y dashboard vacío.

2\. \*\*Etapa 2\*\* — Integración Meta Ads (cron + persistencia).

3\. \*\*Etapa 3\*\* — Dashboard visual con KPIs y filtros de fecha.

4\. \*\*Etapa 4\*\* — Capa IA: alertas por reglas + análisis diario con Claude.

5\. \*\*Etapa 5\*\* — GA4, Clarity, Google Ads completos + chat interactivo.



\## Lo que NO hacer



\- No instalar paquetes sin avisar.

\- No inventar valores de configuración: si algo es ambiguo, preguntar.

\- No usar `any` en TypeScript sin justificación explícita.

\- No mezclar lógica de cron con endpoints de API.

\- No exponer datos de un cliente a otro (sin RLS porque es MySQL, pero cuidado a nivel aplicación).

