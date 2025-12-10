// netlify/functions/api.js (CommonJS)

exports.handler = async (event) => {
  try {
    const apiKey = process.env.MONO_API_KEY;
    const baseUrl = process.env.MONO_BASE_URL || "https://api.sandbox.cuentamono.com";

    if (!apiKey) return res(500, { error: "Missing MONO_API_KEY in Netlify environment variables" });

    const action = (event.queryStringParameters && event.queryStringParameters.action) || "health";
    const qs = event.queryStringParameters || {};
    const method = event.httpMethod || "GET";
    const body = event.body ? safeJson(event.body) : null;

    const mono = async (path, { method="GET", body=null, headers=null } = {}) => {
      const r = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          "accept": "application/json",
          "authorization": `Bearer ${apiKey}`,
          ...(body ? { "content-type": "application/json" } : {}),
          ...(headers || {})
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      if (!r.ok) {
        return Promise.reject({
          status: r.status,
          data
        });
      }
      return data;
    };

    if (action === "health") {
      return res(200, { ok: true });
    }

    // ===== BALANCE =====
    if (action === "balance") {
      const account_id = qs.account_id || body?.account_id;
      if (!account_id) return res(400, { error: "account_id is required" });

      const bal = await mono(`/v1/ledger/accounts/${account_id}/balances`);
      return res(200, {
        account_id,
        pending: bal.pending,
        available: bal.available,
        available_amount: bal?.available?.amount ?? 0,
        currency: bal?.available?.currency ?? "COP"
      });
    }

    // ===== TOPUP =====
    if (action === "topup") {
      if (method !== "POST") return res(405, { error: "Method not allowed" });

      const account_id = body?.account_id;
      const amount = Number(body?.amount);
      const external_id = body?.external_id || randomId();

      if (!account_id) return res(400, { error: "account_id is required" });
      if (!amount || amount <= 0) return res(400, { error: "amount must be > 0" });

      const op = await mono(`/v1/ledger/accounts/${account_id}/balance`, {
        method: "POST",
        body: {
          amount: { currency: "COP", amount },
          operation: "topup",
          external_id
        }
      });

      return res(200, op);
    }

    // ===== LIST CARDS =====
    if (action === "cards") {
      const page_number = Number(qs.page_number || 1);
      const page_size = Number(qs.page_size || 10);

      // user-confirmed endpoint
      const cards = await mono(`/v1/cards?page_number=${page_number}&page_size=${page_size}`);
      return res(200, {
        pagination: cards.pagination || null,
        cards: cards.cards || []
      });
    }

    // ===== CREATE CARD =====
    if (action === "create_card") {
      if (method !== "POST") return res(405, { error: "Method not allowed" });

      const configuration_group_id = body?.configuration_group_id;
      const account_id = body?.account_id;
      const cardholder = body?.cardholder;
      const nickname = body?.nickname || null;

      if (!configuration_group_id) return res(400, { error: "configuration_group_id is required" });
      if (!account_id) return res(400, { error: "account_id is required" });
      if (!cardholder) return res(400, { error: "cardholder is required" });

      const created = await mono(`/v1/ledger/cards`, {
        method: "POST",
        body: {
          configuration_group_id,
          account_id,
          cardholder,
          ...(nickname ? { nickname } : {})
        }
      });

      return res(200, created);
    }

    // ===== TRANSFER (Account-to-Account) =====
    if (action === "transfer") {
      if (method !== "POST") return res(405, { error: "Method not allowed" });

      const payer_account_id = body?.payer_account_id;
      const receiving_account_id = body?.receiving_account_id;
      const amount = Number(body?.amount);
      const description = body?.description || "Transfer";
      const external_id = body?.external_id || randomId();

      if (!payer_account_id) return res(400, { error: "payer_account_id is required" });
      if (!receiving_account_id) return res(400, { error: "receiving_account_id is required" });
      if (payer_account_id === receiving_account_id) return res(400, { error: "payer_account_id and receiving_account_id must be different" });
      if (!amount || amount <= 0) return res(400, { error: "amount must be > 0" });

      const op = await mono(`/v1/ledger/transfers`, {
        method: "POST",
        body: {
          payer_account_id,
          receiving_account_id,
          source_amount: { amount, currency: "COP" },
          external_id,
          description
        }
      });

      return res(200, op);
    }

    // ===== ACTIVITY (best effort) =====
    if (action === "activity") {
      const account_id = qs.account_id || body?.account_id;
      if (!account_id) return res(400, { error: "account_id is required" });

      const page_number = Number(qs.page_number || 1);
      const page_size = Number(qs.page_size || 20);

      // Core docs list "Gets account transactions" under Ledger.
      // Many tenants expose it under this path:
      const path = `/v1/ledger/accounts/${account_id}/transactions?page_number=${page_number}&page_size=${page_size}`;

      const data = await mono(path);
      return res(200, data);
    }

    return res(404, { error: `Unknown action: ${action}` });

  } catch (e) {
    // Normalize Mono errors
    if (e && typeof e === "object" && e.status) {
      return res(e.status, e.data || { error: "Mono API error" });
    }
    return res(500, { error: e?.message || "Server error" });
  }
};

function res(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj)
  };
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function randomId() {
  return `ext_${Date.now()}_${Math.floor(Math.random()*1e9)}`;
}
