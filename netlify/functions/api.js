const DEFAULT_BASE = "https://api.sandbox.cuentamono.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

async function monoFetch(path, { method="GET", body=null, baseUrl, apiKey } = {}) {
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    return { ok: false, status: res.status, data };
  }
  return { ok: true, status: res.status, data };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });

  const apiKey = process.env.MONO_API_KEY;
  const baseUrl = process.env.MONO_BASE_URL || DEFAULT_BASE;

  if (!apiKey) return json(500, { error: "Missing MONO_API_KEY in Netlify environment variables" });

  const action = (event.queryStringParameters?.action || "").trim();

  try {
    if (action === "health") {
      return json(200, { ok: true });
    }

    // LIST CARDS
    if (action === "cards") {
      const page_number = event.queryStringParameters?.page_number || "1";
      const page_size = event.queryStringParameters?.page_size || "10";
      const qs = `?page_number=${encodeURIComponent(page_number)}&page_size=${encodeURIComponent(page_size)}`;

      const r = await monoFetch(`/v1/cards${qs}`, { method: "GET", baseUrl, apiKey });
      if (!r.ok) return json(r.status, r.data);
      return json(200, r.data);
    }

    // GET BALANCE
    if (action === "balance") {
      const account_id = event.queryStringParameters?.account_id;
      if (!account_id) return json(400, { error: "Missing account_id" });

      const r = await monoFetch(`/v1/ledger/accounts/${encodeURIComponent(account_id)}/balances`, { method: "GET", baseUrl, apiKey });
      if (!r.ok) return json(r.status, r.data);
      return json(200, r.data);
    }

    // TOPUP
    if (action === "topup") {
      const payload = JSON.parse(event.body || "{}");
      const { account_id, amount, external_id } = payload;

      if (!account_id) return json(400, { error: "Missing account_id" });
      if (!amount) return json(400, { error: "Missing amount" });
      if (!external_id) return json(400, { error: "Missing external_id" });

      const body = {
        amount: { currency: "COP", amount: Number(amount) },
        operation: "topup",
        external_id: String(external_id),
      };

      const r = await monoFetch(`/v1/ledger/accounts/${encodeURIComponent(account_id)}/balance`, {
        method: "POST",
        body,
        baseUrl,
        apiKey
      });

      if (!r.ok) return json(r.status, r.data);
      return json(200, r.data);
    }

    // TRANSFER (account-to-account)
    if (action === "transfer") {
      const payload = JSON.parse(event.body || "{}");
      const { payer_account_id, receiving_account_id, amount, external_id, description } = payload;

      if (!payer_account_id) return json(400, { error: "Missing payer_account_id" });
      if (!receiving_account_id) return json(400, { error: "Missing receiving_account_id" });
      if (!amount) return json(400, { error: "Missing amount" });
      if (!external_id) return json(400, { error: "Missing external_id" });

      // Doc: specify either source_amount or target_amount, not both.
      const body = {
        payer_account_id,
        receiving_account_id,
        source_amount: { amount: Number(amount), currency: "COP" },
        target_amount: null,
        external_id,
        description: description || "Transfer"
      };

      const r = await monoFetch(`/v1/ledger/transfers`, { method: "POST", body, baseUrl, apiKey });
      if (!r.ok) return json(r.status, r.data);
      return json(200, r.data);
    }

    // CREATE CARD
    if (action === "create_card") {
      const payload = JSON.parse(event.body || "{}");
      const { configuration_group_id, account_id, cardholder, nickname } = payload;

      if (!configuration_group_id) return json(400, { error: "Missing configuration_group_id" });
      if (!account_id) return json(400, { error: "Missing account_id" });
      if (!cardholder) return json(400, { error: "Missing cardholder" });

      const body = {
        configuration_group_id,
        account_id,
        cardholder,
      };

      // Add nickname only if provided (some APIs accept it, some ignore it)
      if (nickname) body.nickname = nickname;

      const r = await monoFetch(`/v1/ledger/cards`, { method: "POST", body, baseUrl, apiKey });
      if (!r.ok) return json(r.status, r.data);
      return json(200, r.data);
    }

    return json(400, { error: `Unknown action: ${action}` });
  } catch (e) {
    return json(500, { error: e.message || "Internal error" });
  }
};
