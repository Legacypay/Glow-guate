# Pagos con tarjeta — CyberSource / NeoNet

Afiliación **280528000** · Terminal **99583771** · Soporte NeoNet
canalesdigitales@neonet.com.gt · 2424-2828

## Qué método usamos y por qué

NeoNet ofrece tres: SOAP Toolkit API, Secure Acceptance API y **Secure
Acceptance Hosted Checkout**. Usamos el tercero.

Con Hosted Checkout el número de tarjeta nunca toca glowguate.com: el cliente
va a la página de CyberSource, paga ahí y regresa. Eso nos deja en el nivel PCI
más simple (SAQ A) en vez de obligarnos a certificar el sitio como si
guardáramos tarjetas. NeoNet además confirmó que este método **ya incluye el
Device Fingerprint** que exigen para producción.

## Lo que falta para que funcione

El código está completo. Faltan tres credenciales que sólo existen dentro del
Business Center, y **no se puede entrar sin crear primero el usuario
administrador** — CyberSource mandó ese correo a info@glowpeptides.com y vence
a las 12 horas. Si venció, pedirle a NeoNet que lo reenvíen.

Una vez adentro:

1. **Configuración de pago → Configuración de Secure Acceptance** → crear un
   perfil *Hosted Checkout*. Ahí sale el **Profile ID**.
2. Dentro del perfil, **Security → Keys → Create new key** (tipo: SOAP/HMAC para
   Secure Acceptance). Da **Access Key** y **Secret Key**.
   La secret key se muestra **una sola vez**.
3. En el perfil, *Customer Response Pages*, poner como página de respuesta:
   `https://glowguate.com/.netlify/functions/pay-return`
4. Activar el perfil (*Promote to Active*).

## Variables en Netlify

Site configuration → Environment variables, alcance **Functions**:

| Variable | Valor |
|---|---|
| `CYBS_PROFILE_ID` | Profile ID del perfil de Secure Acceptance |
| `CYBS_ACCESS_KEY` | Access Key de ese perfil |
| `CYBS_SECRET_KEY` | Secret Key de ese perfil (**secreta**) |
| `CYBS_ENV` | `test` mientras se certifica, `live` al pasar a producción |
| `CYBS_MERCHANT_ID` | ID del comercio en CyberSource (para Device Fingerprint) |
| `CYBS_LOCALE` | opcional, por defecto `es-419`; si CyberSource lo rechaza, usar `es` |
| `CYBS_CURRENCY` | opcional, por defecto `GTQ` |

Sin las tres primeras, la opción de tarjeta **no aparece** en el sitio. No hay
un interruptor que alguien pueda olvidar: el checkout le pregunta al servidor si
puede cobrar antes de dibujar las opciones.

## La prueba de certificación

Mientras `CYBS_ENV=test`, la opción de tarjeta está **oculta para los clientes**
— una pasarela de prueba no cobra nada y sería una venta perdida. Para verla:

```
https://glowguate.com/?pruebapago=1
```

Ese enlace la desbloquea sólo en ese navegador. Con él se hace el pedido de
prueba que pide el equipo de Canales Digitales. Al terminar, borrar el pedido
desde `/admin/` → Pedidos.

Para pasar a producción hay que, además: entregar el **Check-list de seguridad**
que mandó NeoNet, y que ellos validen la prueba. Entonces se cambia
`CYBS_ENV=live` y la tarjeta aparece para todos.

## Cómo funciona por dentro

```
checkout  →  pay-start   guarda el pedido como "pendiente_pago",
                         RECALCULA el monto desde data.js y lo firma
          →  CyberSource cobra en su propia página
          →  pay-return  verifica la firma de la respuesta,
                         marca "pagado", descuenta inventario y manda el correo
          →  /#/pago/<pedido>/ok
```

Dos cosas que sostienen todo esto:

**El monto no lo pone el navegador.** `pay-start` vuelve a calcular el total
desde el mismo `data.js` que ve el cliente y rechaza el pedido si no coincide
(error 409 → el sitio le pide recargar la página). Un cliente que edite el
precio en su navegador recibe un rechazo, no un cobro barato.

**El regreso se verifica.** Cualquiera puede abrir la URL de retorno. Lo único
que hace válida la respuesta es el HMAC con que CyberSource la firma. Sin firma
válida no se toca el pedido.

## Códigos de motivo

`100` es el único éxito. Todo lo demás es rechazo. `480`/`481` son de Decision
Manager: el pedido queda en **Pago pendiente** con una nota, porque el dinero
todavía puede liquidarse — revisar en el Business Center antes de despachar.

## Anulaciones y reembolsos

Se hacen en el Business Center de CyberSource, no en nuestro admin. Las
**anulaciones sólo el mismo día**, antes del cierre. Después sólo créditos
(totales o parciales). El ID de solicitud de cada pago aparece en el pedido
dentro de `/admin/`.

## Pendientes conocidos

- Confirmar con NeoNet si `es-419` es el locale correcto o prefieren `es`.
- El Check-list de seguridad pide reCAPTCHA y cabeceras de seguridad; ninguno
  está instalado todavía.
