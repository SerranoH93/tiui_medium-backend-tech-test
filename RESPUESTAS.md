# RESPUESTAS

## 1. Problemas encontrados

### Problema 1
- Descripción:
Algunos webhooks de pago parecen procesarse más de una vez
- Cómo lo reproduje:
Usando el software Postman, realicé peticiones al enpoint `POST /api/webhooks/paycash` con el body `{ "eventId": "evt-dup-001", "folio": "ORD-1003", "amount": 200}`, al realizar varias peticiones la order se actualizaba de forma continua.
- Impacto operativo:
Esto puede implicar la duplicididad en pagos ya que al ejecutar el enpoint `POST /api/webhooks/paycash` genera un registro en la tabla `payment_webhook_logs` y actualiza el pago correspondiente haciendo que un mismo pago se contabilice varias veces.
- Solución aplicada:
  - En la tabla `payment_webhook_logs` se creó la columna `status`, para llevar el control de los payment intents y saber si un webhook falló, fue exitoso o esta pendiente de procesamiento.
  - Dentro de la tabla `payment_webhook_logs` se creó una llave unica (unique key) formada por las columnas `provider` y `provider_event_id`, para evitar la duplicidad de registros.
  - Se creó el archivo `payments.repository.ts` para centralizar la logica de consulta y evitar mezclar la capa de datos con la logica de negocio.
  - En el archivo `payments.service.ts` se agregó la validacion para saber si el event ya se habia procesado o se encuntra pendiente de procesamiento y evitar que se procesen de nuevo.

### Problema 2
- Descripción:
Algunas consultas de órdenes fallan con datos nulos
- Cómo lo reproduje:
Al realizar consulta en los endpoints `GET /api/orders` y `GET /api/orders/:id` por medio de Postman, en ambos casos devolvieron un error ocasionado por un registro con valores null en una columna, en el error se mostrabá que intentaba ejecutar el metodo `.trim()` en undefined.
- Impacto operativo:
Al realizar la consulta a dichos enpoints el usuario final no podrá ver la información solicitada o si era requerido en algún otro proceso, el endpoint no podrá ser utilizado.
- Solución aplicada:
En el archivo `orders.repository.ts` se cambio la siguiente linea de código:

Anterior
```Typescript
recipient_name: row.recipient_name.trim()
```

Actual
```Typescript
recipient_name: row.recipient_name ? row.recipient_name.trim() : ''
```
Con este cambio se previene el error provocado por el metodo `.trim()` que ocasionaba cuando el dato era null.

### Problema 3
- Descripción:
Algunas órdenes canceladas aparecen como pagadas.
- Cómo lo reproduje:
Se buscó una orden cancelada en la base de datos, en este caso la orden con id 4, se le realizó un pago por medio del endpoint `PATCH /api/orders/:id/pay` con el body `{ "amount": 100, "source": "manual" }`, se detectó que el pago pudo ser procesado a pesar de que la orden se encontraba cancelada.
- Impacto operativo:
Ordenes canceladas no deberían poder ser pagadas, estas ordenes por logía deberían bloquear cualquier pago en ellas para evitar futuros reclamos del cliente.
- Solución aplicada:
En el archivo `payments.service.ts` se agregó el siguente fragmento de código:

```Typescript
  if (order.status === 'paid'|| order.status === 'cancelled') {
    return { applied: false, reason: `Order already paid ${order.status}`};
  }
```
Esta logica permite evitar que las ordenes tanto canceladas como las ya pagadas puedan ser pagadas.

## 2. Cambios realizados

Se creó el archivo `002_idempotency.sql`, para la actualización de la tabla `payment_webhook_logs`, en el archivo `seed.ts` se eliminó un registro para la tabla `payment_webhook_logs` ya que al ser actualizada generaba errores pues la columna `provider` y `provider_event_id` ya habian sido actualizadas como unicas.

Se movio el script de `payments.service.ts` al nuevo repositorio `payments.repository.ts`, en el archivo `payments.service.ts` se llama a este script para la validacion del registro a ingresar.

Este es el script SQL modificado en el nuevo repositorio `payments.repository.ts`:

```SQL
INSERT INTO payment_webhook_logs (provider, provider_event_id, folio, amount, payload)
    VALUES ($1, $2, $3, $4, $5::jsonb) 
    ON CONFLICT (provider, provider_event_id)
    DO NOTHING
    RETURNING provider_event_id
```

Con el siguiente fragmento de codigo es la logica para la respuesta si el `provider` y `provider_event_id` ya se encuentra en base de datos.
```Typescript
    if ( !logResult) {
    return { applied: false, reason: 'Duplicate event' };
  }
```

La validación de si la orden ya se encuentra pagada o cancelada

```Typescript
  if (order.status === 'paid'|| order.status === 'cancelled') {
    return { applied: false, reason: `Order already paid ${order.status}`};
  }
```

En el archivo `orders.service.ts` se agrego el siguente fragmento de código:

Clase para manejar el error
```Typescript
export class OrderPaymentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, OrderPaymentError.prototype);
  }
}
```
Validación del status
```Typescript
  if (order.status === 'paid' || order.status === 'cancelled') {
    throw new Error(`Order is already ${order.status}`);
  }
```

En el archivo `orders.repository.ts` se cambio la siguiente linea de código:

Anterior
```Typescript
recipient_name: row.recipient_name.trim()
```

Actual
```Typescript
recipient_name: row.recipient_name ? row.recipient_name.trim() : ''
```

Y en el archivo `reports.service.ts` se actualiza el WHERE, para que solamente muestre los registros pagados. 

```SQL
SELECT COALESCE(SUM(paid_amount), 0) AS total_cash
     FROM orders
     WHERE status = 'paid'
       AND DATE(created_at) = $1
```


## 3. Pruebas agregadas o modificadas

Se agregaron las siguientes pruebas: 

- ORDERS
  - does not allow paying a cancelled order
  - handles orders with null recipient_name
  - applies status filter correctly when combined with date filters (Este test sigue fallando porque no se corrigió el código)
  - rejects payment with zero or negative amount
  - returns 404 when order id does not exist
  - does not mark order as paid on partial payment
  - marks order as paid when payment completes the total

- PAYMENTS
  - does not process the same webhook event twice
  - does not apply payment to cancelled orders from webhook
  - rejects webhook with invalid paidAt format

- REPORTS
  - does not include cancelled orders in daily cash report
  - returns the expected total cash for a known seeded date (Este test falla porque no se ha creado el endpoint)
  

## 4. Riesgos pendientes

Los que considero criticos son:
- El webhook no está validando algún key, token o firma para verificar que la solicitud provenga del proveedor real, en un entorno de producción, esto podría generar vulnerabilidades de seguridad, como por ejemplo, que algien mande un webhook falso.
- Agregaría indices a las tablas de base de datos para mejorar el rendimiento de acuerdo a los filtros usados.
- No se emplean transacciones, un fallo a mitad del proceso pueden provocar inconsistencias de los datos, yo considero que, en el procesamiento de los pagos, se deberia usar transacciones.

Estos no son tan criticos pero creo podrían ayudar a mejorar el sistema:
- Algunos filtros combinados no devuelven los resultados esperados.

- Los parametros de las rutas no se están validando, por lo que puede haber un error en la ruta.

## 5. Qué haría diferente en producción

- Se puede usar un ORM como Sequelize o Prisma para evitar el uso de scrips de SQL en el codigo y tener mejor control de las migraciones.
- Uso de transacciones para prevenir errores en base de datos (`BEGGIN`, `COMMIT`, `ROLLBACK`).
- Crear indices de ordenes para mejorar la velocidad en las consultas.
- Documentar la API, usar Swagger o Postman para la documentación de los endpoints.
- Crear DTOs, porque actualmente se retorna informacion de la base de datos sin procesar.

## 6. Uso de IA
Utilicé la IA para aumentar la cantidad de datos en los casos de prueba en la seed.ts, generé 100 ordenes para cada mes desde enero hasta diciembre del año actual para tener más datos para las pruebas (Estos no les incluí en algun commit, solo lo manejé local).

La ocupé para el autocompletado de código (ya me lo dá el propio Visual Studio Code).

Le pedí que me dividiera el archivo de payments.service.ts para crear un repository y evitar ensuciar el archivo con consultas y validaciones de base de datos. Una vez que dividió la lógica, revisé los cambios realizados, verifiqué que todo estuviera correcto y en este caso solo tuve que renombrar el archivo que generó. Posteriormente volví a correr los test unitarios para aseguirar que todo sigue funcionando de la misma manera.

Para generar nuevos casos de prueba, para poder saber que nuevos test debía generar, de los cuales me dió una lista de posibles test que debía considerar, de esos test seleccioné los que consideré que si eran necesarios y le pedí que me generara el codigo de esos test, validé que lo que generó estuviera correcto y entendible (Sin logica extraña), y volvía a jecutar los test.