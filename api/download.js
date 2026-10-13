const PRODUCTS = { "SIN-WB-001": { env: "SINERGIA_PDF_URL_DELEGAR_AUTONOMIA", filename: "Sinergia_Delegar_mejor_Construir_autonomia.pdf" } };
async function verify(payload, signature) {
  if (!process.env.SINERGIA_DOWNLOAD_SECRET) return false;
  const crypto = await import("node:crypto");
  const expected = crypto.createHmac("sha256", process.env.SINERGIA_DOWNLOAD_SECRET).update(payload).digest("base64url");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido." });
  try {
    const token = String(req.query.token || ""), productId = String(req.query.product || ""), dot = token.lastIndexOf(".");
    if (dot < 1 || !PRODUCTS[productId]) return res.status(403).json({ error: "Descarga no autorizada." });
    const encoded = token.slice(0, dot), signature = token.slice(dot + 1), payload = Buffer.from(encoded, "base64url").toString("utf8");
    if (!(await verify(payload, signature))) return res.status(403).json({ error: "Descarga no autorizada." });
    const data = JSON.parse(payload);
    if (!data.exp || Date.now() > data.exp) return res.status(410).json({ error: "El enlace venció. Volvé a verificar tu pago para generar otro." });
    if (!Array.isArray(data.products) || !data.products.includes(productId)) return res.status(403).json({ error: "El archivo no corresponde a esta compra." });
    const sourceUrl = process.env[PRODUCTS[productId].env];
    if (!sourceUrl) return res.status(503).json({ error: "El PDF todavía no está conectado. Contactanos para recibir asistencia." });
    const file = await fetch(sourceUrl);
    if (!file.ok) return res.status(502).json({ error: "No se pudo recuperar el archivo." });
    const bytes = Buffer.from(await file.arrayBuffer());
    res.status(200); res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="' + PRODUCTS[productId].filename + '"');
    res.setHeader("Cache-Control", "private, no-store"); res.end(bytes);
  } catch (e) { console.error("Sinergia download:", e?.message || e); return res.status(500).json({ error: "No se pudo preparar la descarga." }); }
};