# Aviso de pedidos por WhatsApp

Cada pedido llega a María por WhatsApp además del correo, en el mismo momento:
al enviarse si es transferencia, al aprobarse si es tarjeta.

Está **apagado** hasta que exista la variable `WA_APIKEY` en Netlify. Mientras
no esté, el sitio funciona exactamente igual que antes.

## Activarlo con CallMeBot (gratis)

Lo hace María, desde su propio teléfono:

1. Guardar el número **+34 684 770 005** en sus contactos (con cualquier nombre).
2. Enviarle por WhatsApp exactamente: `I allow callmebot to send me messages`
3. En uno o dos minutos llega la respuesta con su **APIKEY**.
   Si no llega en 2 minutos, hay que esperar 24 horas e intentar de nuevo.

Con esa APIKEY, en Netlify → Site configuration → Environment variables
(alcance **Functions**):

| Variable | Valor |
|---|---|
| `WA_APIKEY` | la APIKEY que mandó el bot |
| `WA_TO` | opcional — por defecto `50255279444` |
| `WA_PROVIDER` | opcional — `callmebot` (por defecto) o `textmebot` |

**Después hay que volver a publicar el sitio**: Netlify no aplica una variable
nueva a las funciones hasta el siguiente deploy.

> CallMeBot indica que su API gratuita es para uso personal. Para avisos de
> una tienda, la alternativa dentro de sus términos es **TextMeBot**
> (US$1/mes, un destinatario): pedir la APIKEY en textmebot.com y poner
> `WA_PROVIDER=textmebot`. No hay que cambiar código.

## Qué dice el mensaje

```
*Nuevo pedido GT-261001-AB12*
Ana Lucía Pérez · +502 5555 1234
Entrega a domicilio — Zona 10, Guatemala

2 × GLOW Blend 70 mg
1 × BPC-157 10 mg

*Total: Q3,828*
Pago: Transferencia bancaria — esperando comprobante
Admin: https://glowguate.com/admin/
```

Lleva zona y departamento pero **no la dirección completa** ni las notas del
cliente: el texto pasa por el proveedor, y esos datos ya están en el correo y
en el admin.

## Si falla

Un aviso de WhatsApp que falla nunca bloquea un pedido: el pedido ya está
guardado y el correo sale igual. El intento se corta a los 5 segundos.
Los errores quedan en Netlify → Logs → Functions (`whatsapp alert failed`).

Si la función de pedidos estuviera caída, el sitio envía el formulario
directamente: en ese caso llega el correo pero no el WhatsApp.
