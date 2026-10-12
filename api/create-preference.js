const PRODUCTS = {
  "SIN-WB-001": { name: "Delegar mejor. Construir autonomía.", price: 19900, env: "SINERGIA_PDF_URL_DELEGAR_AUTONOMIA", filename: "Sinergia_Delegar_mejor_Construir_autonomia.pdf" }
};
const json = (res, status, body) => { res.status(status).setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };
const validEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const money = n => Math.max(0, Math.round(Number(n) || 0));

function couponFor(code) {
  if (!code) return null;
  let coupons = {};
  try { coupons = JSON.parse(process.env.SINERGIA_COUPONS_JSON || "{}"); } catch { return null; }
  const c = coupons[String(code).trim().toUpperCase()];
  if (!c || c.enabled === false) return null;
  if (c.startsAt && Date.now() < Date.parse(c.startsAt)) return null;
  if (c.endsAt && Date.now() >= Date.parse(c.endsAt)) return null;
  if (c.type === "percent" && Number(c.value) > 0 && Number(c.value) <= 100) return { code: String(code).trim().toUpperCase(), amount: "percent", value: Number(c.value) };
  if (c.type === "fixed" && Number(c.value) > 0) return { code: String(code).trim().toUpperCase(), amount: "fixed", value: money(c.value) };
  return null;
}
async function supabaseRpc(name, body) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("El módulo de gift cards todavía no está configurado.");
  const r = await fetch(process.env.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error("No se pudo validar la gift card.");
  return data;
}
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Método no permitido." });
  if (!process.env.MP_ACCESS_TOKEN) return json(res, 503, { error: "Mercado Pago todavía no está configurado." });
  try {
    const productId = String(req.body?.productId || "SIN-WB-001");
    const product = PRODUCTS[productId];
    if (!product) return json(res, 400, { error: "Producto no válido." });
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!validEmail(email)) return json(res, 400, { error: "Ingresá un email válido para identificar tu compra." });
    const couponCode = String(req.body?.coupon || "").trim().toUpperCase();
    const coupon = couponCode ? couponFor(couponCode) : null;
    if (couponCode && !coupon) return json(res, 400, { error: "El cupón no es válido o no está vigente." });
    const subtotal = product.price;
    let discount = coupon ? (coupon.amount === "percent" ? Math.round(subtotal * coupon.value / 100) : Math.min(subtotal, coupon.value)) : 0;
    const giftCode = String(req.body?.giftCard || "").trim().toUpperCase();
    const orderId = "SIN-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    let giftAmount = 0;
    if (giftCode) {
      const reserve = await supabaseRpc("reserve_sinergia_gift_card", { p_code: giftCode, p_order_id: orderId, p_max_amount: Math.max(0, subtotal - discount) });
      if (!reserve || reserve.ok !== true) return json(res, 400, { error: reserve?.message || "No pudimos validar la gift card." });
      giftAmount = money(reserve.amount);
    }
    const total = Math.max(0, subtotal - discount - giftAmount);
    if (total === 0) return json(res, 400, { error: "El saldo de la gift card cubre el total. Para habilitar esta compra sin pago externo, contactanos por WhatsApp y la verificaremos." });
    const siteUrl = (process.env.SINERGIA_SITE_URL || "https://sinergiaenaccion.com").replace(/\/$/, "");
    const apiUrl = (process.env.SINERGIA_API_BASE_URL || siteUrl).replace(/\/$/, "");
    const items = [{ id: productId, title: product.name, description: "Workbook digital de Sinergia en Acción", quantity: 1, currency_id: "ARS", unit_price: total }];
    const preference = {
      items, external_reference: orderId,
      payer: { email },
      metadata: { product_id: productId, product_ids: productId, buyer_email: email, coupon: couponCode, discount_ars: String(discount), gift_card_code: giftCode, gift_card_ars: String(giftAmount), subtotal_ars: String(subtotal) },
      back_urls: {
        success: siteUrl + "/digital-success.html?order=" + encodeURIComponent(orderId),
        pending: siteUrl + "/digital-success.html?order=" + encodeURIComponent(orderId) + "&state=pending",
        failure: siteUrl + "/digital-success.html?order=" + encodeURIComponent(orderId) + "&state=failure"
      },
      auto_return: "approved",
      notification_url: apiUrl + "/api/webhook"
    };
    const mp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.MP_ACCESS_TOKEN }, body: JSON.stringify(preference)
    });
    const data = await mp.json();
    if (!mp.ok || !data.init_point) {
      if (giftCode) await supabaseRpc("release_sinergia_gift_card_reservation", { p_order_id: orderId });
      console.error("Mercado Pago preference error", data);
      return json(res, 502, { error: "No se pudo iniciar el pago. Intentá nuevamente." });
    }
    return json(res, 200, { orderId, initPoint: data.init_point, subtotal, discount, giftAmount, total });
  } catch (e) {
    console.error("Sinergia checkout:", e?.message || e);
    return json(res, 503, { error: "El checkout no está completamente configurado. No se realizó ningún cobro." });
  }
};