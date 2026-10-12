const PRODUCTS = { "SIN-WB-001": { name: "Delegar mejor. Construir autonomía.", env: "SINERGIA_PDF_URL_DELEGAR_AUTONOMIA", filename: "Sinergia_Delegar_mejor_Construir_autonomia.pdf" } };
const json = (res, status, body) => { res.status(status).setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };
const b64url = value => Buffer.from(value).toString("base64url");

async function sign(payload) {
  const secret = process.env.SINERGIA_DOWNLOAD_SECRET;
  if (!secret) throw new Error("Falta SINERGIA_DOWNLOAD_SECRET");
  const crypto = await import("node:crypto");
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

async function getPreference(payment, orderId) {
  const headers = { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` };
  const preferenceId = String(payment.preference_id || "").trim();

  if (preferenceId) {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences/" + encodeURIComponent(preferenceId), { headers });
    if (response.ok) {
      const preference = await response.json();
      if (String(preference.external_reference || "") === orderId) return preference;
    }
  }

  const response = await fetch("https://api.mercadopago.com/checkout/preferences/search?external_reference=" + encodeURIComponent(orderId) + "&limit=10", { headers });
  if (!response.ok) return null;
  const data = await response.json();
  const elements = Array.isArray(data.elements) ? data.elements : Array.isArray(data.results) ? data.results : [];
  return elements.find(item => String(item.external_reference || "") === orderId) || null;
}

function productFromPreference(preference) {
  if (!Array.isArray(preference?.items)) return "";
  for (const item of preference.items) {
    const id = String(item.id || "").trim();
    if (PRODUCTS[id]) return id;
    const match = Object.entries(PRODUCTS).find(([, product]) => product.name === String(item.title || "").trim());
    if (match) return match[0];
  }
  return "";
}

module.exports = async (req, res) => {
  if (req.method !== "GET") return json(res, 405, { error: "Método no permitido." });
  if (!process.env.MP_ACCESS_TOKEN) return json(res, 503, { error: "La validación de pagos no está configurada." });

  const paymentId = String(req.query.payment_id || req.query.collection_id || "");
  const orderId = String(req.query.order || req.query.external_reference || "");
  if (!paymentId || !orderId) return json(res, 400, { error: "Faltan datos para verificar la compra." });

  try {
    const response = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), {
      headers: { Authorization: "Bearer " + process.env.MP_ACCESS_TOKEN }
    });
    const payment = await response.json();
    if (!response.ok) {
      console.error("Sinergia payment lookup failed", response.status, payment?.message || payment?.error || "");
      return json(res, 502, { approved: false, message: "No pudimos consultar el estado del pago. Volvé a intentar." });
    }

    const references = [
      payment.external_reference,
      payment.order?.external_reference,
      payment.order?.external_reference_id
    ].filter(Boolean).map(String);
    let sameOrder = references.includes(orderId);
    let productId = String(payment.metadata?.product_id || "").trim();
    if (!PRODUCTS[productId]) productId = "";

    const preference = await getPreference(payment, orderId);
    if (preference) {
      sameOrder = sameOrder || String(preference.external_reference || "") === orderId;
      if (!productId) productId = productFromPreference(preference);
    }

    if (payment.status !== "approved" || !sameOrder || !PRODUCTS[productId]) {
      return json(res, 200, {
        approved: false,
        status: payment.status || "unknown",
        message: payment.status === "pending"
          ? "El pago está pendiente. La descarga se habilitará cuando Mercado Pago confirme la aprobación."
          : "Todavía no se confirmó un pago aprobado para esta compra."
      });
    }

    const payload = JSON.stringify({ order: orderId, products: [productId], exp: Date.now() + 15 * 60 * 1000 });
    const token = b64url(payload) + "." + await sign(payload);
    const siteUrl = (process.env.SINERGIA_SITE_URL || "").replace(/\/$/, "");
    const downloadUrl = "/api/download?token=" + encodeURIComponent(token) + "&product=" + encodeURIComponent(productId);

    return json(res, 200, {
      approved: true,
      downloads: [{
        productId,
        name: PRODUCTS[productId].name,
        downloadUrl: siteUrl ? siteUrl + downloadUrl : downloadUrl
      }]
    });
  } catch (error) {
    console.error("Sinergia verify:", error?.message || error);
    return json(res, 500, { approved: false, message: "No se pudo validar el pago en este momento." });
  }
};
