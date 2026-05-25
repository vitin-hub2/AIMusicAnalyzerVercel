export const config = {
  maxDuration: 60,
};

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
}

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Accept key from header (sent by client)
  const apiKey = req.headers["x-api-key"] || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(401).json({ error: "Chave API não fornecida." });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Body JSON inválido." });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(502).json({ error: "Resposta inválida da Anthropic: " + text.slice(0, 200) }); }

    if (data.error) {
      const msg = typeof data.error === "object"
        ? (data.error.message || JSON.stringify(data.error))
        : String(data.error);
      return res.status(upstream.status).json({ error: msg });
    }

    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Erro ao contactar a API Anthropic: " + err.message });
  }
}
