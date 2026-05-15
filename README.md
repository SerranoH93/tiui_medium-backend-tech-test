# medium-backend-tech-test

## Objetivo de la prueba

Evaluar habilidades backend de nivel medium en Node.js, TypeScript, Express, PostgreSQL, debugging, reglas de negocio, idempotencia, pruebas automatizadas y comunicación técnica.

## Contexto de negocio

La empresa opera logística de entrega con pago contra entrega. Soporte reportó incidencias en cobros, reportes diarios y consultas de órdenes que deben investigarse y corregirse.

## Stack

- Node.js 20
- TypeScript
- Express
- PostgreSQL
- Docker Compose
- Jest + Supertest
- pg
- dotenv
- zod

## Instalación y ejecución

1. Levantar base de datos:

```bash
docker compose up -d
```

2. Instalar dependencias:

```bash
npm install
```

3. Ejecutar migraciones:

```bash
npm run db:migrate
```

4. Cargar seed:

```bash
npm run db:seed
```

5. Levantar API en desarrollo:

```bash
npm run dev
```

6. Ejecutar pruebas:

```bash
npm test
```

## Endpoints disponibles

- `GET /health`
- `GET /api/orders`
  - filtros opcionales: `status`, `from`, `to`, `page`, `limit`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/pay`
  - body: `{ "amount": number, "source": "manual" }`
- `POST /api/webhooks/paycash`
  - body: `{ "eventId": string, "folio": string, "amount": number, "paidAt": string }`
- `GET /api/reports/daily-cash?date=YYYY-MM-DD`

## Requerimiento nuevo: auditoría de cambios de estado

El candidato debe completar o implementar auditoría básica de cambios relevantes de estado en el flujo de negocio.

Cada cambio relevante debe registrar:

- `order_id`
- `previous_status`
- `new_status`
- `source`: `manual`, `webhook` o `system`
- `external_reference`, cuando aplique
- `created_at`

No basta con que exista la tabla `audit_logs`; la auditoría debe quedar integrada al flujo de negocio, de modo que cualquier transición de estado quede registrada automáticamente.

## Problemas reportados por soporte

- Algunas órdenes canceladas aparecen como pagadas.
- Algunos webhooks de pago parecen procesarse más de una vez.
- El reporte diario de recaudo no siempre cuadra.
- Algunas consultas de órdenes fallan con datos incompletos.
- Algunos filtros combinados no devuelven los resultados esperados.

## Tareas del candidato

- Identificar y reproducir los incidentes reportados.
- Corregir bugs en reglas de negocio e idempotencia.
- Mejorar y ampliar pruebas automatizadas.
- Documentar decisiones técnicas y cambios realizados.

## Criterio importante

No es obligatorio resolver todo. Prioriza los problemas con mayor impacto operativo y explica qué dejaste pendiente y por qué.

Valoramos más una solución pequeña, segura y bien explicada que muchos cambios apresurados sin claridad.

## Entregable esperado

- Código actualizado con fixes incrementales.
- Pruebas automatizadas que cubran escenarios críticos.
- Archivo `RESPUESTAS.md` con razonamiento técnico.

## Duración sugerida

90 a 120 minutos.

## Criterios de evaluación

- Correctitud funcional de los fixes.
- Calidad técnica y mantenibilidad.
- Cobertura y calidad de pruebas.
- Capacidad de debugging.
- Claridad de comunicación técnica.

## Restricciones

- No reescribir toda la app.
- No cambiar el stack.
- No agregar librerías innecesarias.
- Sí agregar pruebas.
- Sí documentar decisiones.
- Si usa IA, declararlo en `RESPUESTAS.md`.
