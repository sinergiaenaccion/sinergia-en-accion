const json = (res, status, body) => { res.status(status).setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };
async function validSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;
  const signature = req.headers["x-signature"], requestId = req.headers["x-request-id"] || "", dataId = String(req.query["data.id"] || "").toLowerCase();
  if (!signature || !dataId) return false;
  let ts = "", v1 = "";
  for (const part of String(signature).split(",")) { const [k, ...rest] = part.trim().split("="); if (k === "ts") ts = rest.join("="); if (k === "v1") v1 = rest.join("="); }
  if (!ts || !v1) return false;
  const crypto = await import("node:crypto");
  const expected = crypto.createHmac("sha256", secret).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
async function giftRpc(name, body) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase no configurado");
  const r = await fetch(process.env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/rpc/" + name, { method: "POST", headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("No se pudo actualizar la gift card");
}
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Método no permitido." });
  try {
    if (!(await validSignature(req))) return json(res, 401, { received: false, error: "Firma inválida." });
    const type = String(req.body?.type || ""), paymentId = String(req.body?.data?.id || "");
    if (type !== "payment" || !paymentId) return json(res, 200, { received: true });
    const r = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), { headers: { Authorization: "Bearer " + process.env.MP_ACCESS_TOKEN } });
    if (!r.ok) return json(res, 200, { received: true });
    const payment = await r.json(), orderId = String(payment.external_reference || payment.order?.external_reference || payment.order?.external_reference_id || "");
    let giftCode = String(payment.metadata?.gift_card_code || "");
    if (!giftCode && payment.preference_id) {
      const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences/" + encodeURIComponent(payment.preference_id), { headers: { Authorization: "Bearer " + process.env.MP_ACCESS_TOKEN } });
      if (preferenceResponse.ok) {
        const preference = await preferenceResponse.json();
        giftCode = String(preference.metadata?.gift_card_code || "");
      }
    }
    if (giftCode && orderId && ["rejected", "cancelled", "refunded", "charged_back"].includes(String(payment.status))) {
      await giftRpc("release_sinergia_gift_card_reservation", { p_order_id: orderId });
    }
    if (payment.status === "approved" && giftCode && orderId) {
      await giftRpc("confirm_sinergia_gift_card_redemption", { p_order_id: orderId, p_payment_id: paymentId });
    }
    return json(res, 200, { received: true });
  } catch (e) { console.error("Sinergia webhook:", e?.message || e); return json(res, 200, { received: true }); }
};