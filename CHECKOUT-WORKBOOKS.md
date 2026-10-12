# Checkout digital — Sinergia en Acción

## Producto configurado
- ID: `SIN-WB-001`
- Nombre: Delegar mejor. Construir autonomía.
- Precio base: ARS 19.900
- Transferencia: descuento comercial del 10% (ARS 17.910), gestionada por WhatsApp y entrega manual luego de verificar el ingreso.
- Mercado Pago: confirmación de pago en servidor antes de habilitar el PDF.
- Cupones: códigos porcentuales o de importe fijo configurados en `SINERGIA_COUPONS_JSON`.
- Gift cards: saldo reutilizable con reservas persistentes en Supabase.

## Variables de entorno requeridas en Vercel
Configurar en Production y Preview según corresponda; no guardar secretos en el repositorio:
- `MP_ACCESS_TOKEN`: token privado de Mercado Pago.
- `MP_WEBHOOK_SECRET`: secreto de firma de notificaciones de Mercado Pago.
- `SINERGIA_SITE_URL`: URL canónica pública del sitio, sin barra final.
- `SINERGIA_API_BASE_URL`: URL pública donde viven las funciones API, sin barra final.
- `SINERGIA_DOWNLOAD_SECRET`: secreto aleatorio largo para firmar enlaces temporales.
- `SINERGIA_PDF_URL_DELEGAR_AUTONOMIA`: URL privada o firmada del PDF final; no usar una URL pública indexable.
- `SINERGIA_COUPONS_JSON`: objeto JSON de cupones, por ejemplo:
  `{"LANZAMIENTO10":{"type":"percent","value":10,"enabled":true},"BONO3000":{"type":"fixed","value":3000,"enabled":true}}`
  Los códigos son ejemplos desactivados hasta que Fabi apruebe los nombres, vigencias y reglas comerciales.
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: solo para el backend de gift cards. Nunca exponer la service role key en el navegador.

## Mercado Pago
Configurar el webhook de pagos apuntando a `SINERGIA_API_BASE_URL/api/webhook` y copiar el secreto de firma correspondiente a `MP_WEBHOOK_SECRET`. Verificar que la URL de retorno y la URL de notificación coincidan con el entorno correcto.

## Gift cards
1. Ejecutar `supabase/sinergia-gift-cards.sql` en el SQL Editor del proyecto Supabase destinado a Sinergia.
2. Crear las gift cards insertando el SHA-256 del código normalizado (mayúsculas y sin espacios) en `code_hash`, junto con el saldo inicial en pesos.
3. No publicar códigos ni claves de servicio. Las funciones reservan saldo al iniciar el checkout y lo descuentan cuando el webhook confirma un pago aprobado; los pagos rechazados/cancelados liberan la reserva.

## Antes de publicar
- Cargar el PDF final y validar la URL privada desde la función de descarga.
- Configurar secretos de Mercado Pago, webhook, firma y Supabase.
- Probar en sandbox/credenciales de prueba: aprobación, rechazo, pendiente, cupón inválido, gift card parcial, doble intento, vencimiento del enlace y descarga del PDF.
- Revisar las notificaciones reales de Mercado Pago y la entrega.
- Confirmar acceso al proyecto Vercel, despliegue y dominio. Un commit en GitHub por sí solo no significa que el checkout esté publicado.
