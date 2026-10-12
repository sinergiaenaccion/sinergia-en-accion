const PRODUCTS = { "SIN-WB-001": { name: "Delegar mejor. Construir autonomía.", env: "SINERGIA_PDF_URL_DELEGAR_AUTONOMIA", filename: "Sinergia_Delegar_mejor_Construir_autonomia.pdf" } };
const json = (res, status, body) => { res.status(status).setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };
const b64url = value => Buffer.from(value).toString("base64url");
async function sign(payload) {
  if (!process.env.SINERGIA_DOWNLOAD_SECRET) throw new Error("Falta SINERGIA_DOWNLOAD_SECRET");
  const crypto = await import("node:crypto");
  return crypto.createHmac("sha256", process.env.SINERGIA_DOWNLOAD_SECRET).update(payload).digest("base64url");
}
module.exports = async (req, res) => {
  if (req.method !== "GET") return json(res, 405, { error: "Método no permitido." });
  if (!process.env.MP_ACCESS_TOKEN) return json(res, 503, { error: "La validación de pagos no está configurada." });
  const paymentId = String(req.query.payment_id || req.query.collection_id || "");
  const orderId = String(req.query.order || "");
  if (!paymentId || !orderId) return json(res, 400, { error: "Faltan datos para verificar la compra." });
  try {
    const r = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), { headers: { Authorization: "Bearer " + process.env.MP_ACCESS_TOKEN } });
    const payment = await r.json();
    if (!r.ok) return json(res, 502, { approved: false, message: "No pudimos consultar el estado del pago. Volvé a intentar." });
    const refs = [payment.external_reference, payment.order?.external_reference, payment.order?.external_reference_id].filter(Boolean).map(String);
    const productId = String(payment.metadata?.product_id || "").trim();
    if (payment.status !== "approved" || !refs.includes(orderId) || !PRODUCTS[productId]) {
      return json(res, 200, { approved: false, status: payment.status || "unknown", message: payment.status === "pending" ? "El pago está pendiente. La descarga se habilitará cuando Mercado Pago confirme la aprobación." : "Todavía no se confirmó un pago aprobado para esta compra." });
    }
    const payload = JSON.stringify({ order: orderId, products: [productId], exp: Date.now() + 15 * 60 * 1000 });
    const token = b64url(payload) + "." + await sign(payload);
    const siteUrl = (process.env.SINERGIA_SITE_URL || "").replace(/\/$/, "");
    return json(res, 200, { approved: true, downloads: [{ productId, name: PRODUCTS[productId].name, downloadUrl: siteUrl + "/api/download?token=" + encodeURIComponent(token) + "&product=" + encodeURIComponent(productId) }] });
  } catch (e) {
    console.error("Sinergia verify:", e?.message || e);
    return json(res, 500, { approved: false, message: "No se pudo validar el pago en este momento." });
  }
};