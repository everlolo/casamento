const GAS_URL = "https://script.google.com/macros/s/AKfycbygYup61ahqKlAPN5Nr0_ldLItzN3MwFUU1GQl0-b6K-6J5-MDUr_bbCWz33NlAMgmvoA/exec";
const PROD_ORIGIN = "https://casamento-nu-black.vercel.app";

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === PROD_ORIGIN) return true;
  if (/\.vercel\.app$/i.test(new URL(origin).hostname)) return true;
  return false;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = isAllowedOrigin(origin);

  if (allowed) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const upstream = await fetch(GAS_URL, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "GET" ? undefined : JSON.stringify(req.body || {}),
    });

    const text = await upstream.text();

    try {
      const data = JSON.parse(text);
      return res.status(upstream.status).json(data);
    } catch {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.status(upstream.status).send(text);
    }
  } catch (err) {
    return res.status(502).json({ error: "Erro ao contactar o Apps Script", detail: String(err) });
  }
}
