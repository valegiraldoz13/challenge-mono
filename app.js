// ====== CONFIG ======
const USER_NAME = "Valentina";

// UI demo realista (saldo/tarjetas/movimientos),
// pero Transfer/Topup/Create Card siguen siendo reales contra API.
const DEMO_UI = true;

const ACCOUNT_A = "lacc_031q0qwVGDHDmuwSnczysf";
const ACCOUNT_B = "lacc_031ptmr1teoDl643nvdBQk";

const DEFAULT_TOPUP = 50000;
const DEFAULT_SEND  = 10000;

// Card programs (dropdown)
const CARD_PROGRAMS = [
  { id: "ccg_02zKnMXeCB3eYDFHxTHe9j", label: "Sandbox default program" },
  { id: "custom", label: "Custom (paste ccg_...)" }
];

// ====== Helpers ======
const $ = (sel) => document.querySelector(sel);

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2600);
}

function setView(name) {
  const views = ["dashboard","activity","cards","send"];
  for (const v of views) {
    const el = $(`#view-${v}`);
    if (!el) continue;
    el.classList.toggle("hidden", v !== name);
  }
}

function getNumericLast4(key, fallback = "9780") {
  const k = `mono_last4_${key}`;
  const saved = localStorage.getItem(k);
  if (saved) return saved;
  const n = String(Math.floor(1000 + Math.random() * 9000));
  localStorage.setItem(k, n);
  return n || fallback;
}

function maskId(id, fallbackKey = "account") {
  const last4 = getNumericLast4(id || fallbackKey);
  return `••••${last4}`;
}

function formatCOP(amount, decimals = 0) {
  const n = Number(amount || 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(n);
}

function formatCOP2(amount){
  return formatCOP(amount, 2);
}

async function api(action, { method="GET", body=null, qs=null } = {}) {
  const url = new URL("/.netlify/functions/api", window.location.origin);
  url.searchParams.set("action", action);
  if (qs) for (const [k, val] of Object.entries(qs)) url.searchParams.set(k, String(val));

  const res = await fetch(url.toString(), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.error || data?.message || text || "Request failed";
    throw new Error(msg);
  }
  return data;
}

// ====== Local activity (stores real demo operations) ======
const LOCAL_KEY = "mono_demo_activity";
function pushLocalActivity(item) {
  const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  list.unshift(item);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 80)));
}
function getLocalActivity() {
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
}

// ====== Seed Demo UI (cards/activity/balance) ======
const DEMO_SEED_KEY = "mono_demo_seeded";
function seedDemoDataOnce() {
  if (!DEMO_UI) return;
  if (localStorage.getItem(DEMO_SEED_KEY) === "1") return;

  const demoCards = [
    { id: "demo_car_1", type: "physical", state: "active", nickname: null, last_four: "2044", account_id: ACCOUNT_A },
    { id: "demo_car_2", type: "virtual",  state: "active", nickname: null, last_four: "2251", account_id: ACCOUNT_A },
    { id: "demo_car_3", type: "virtual",  state: "active", nickname: null, last_four: "0957", account_id: ACCOUNT_A },
  ];
  localStorage.setItem("mono_demo_cards", JSON.stringify(demoCards));

  const demoActivity = [
    {
      title: "Compra en SP+AFF* THERMCANADA",
      sub: "Card transaction",
      time: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      amount: 108641.94,
      sign: "-",
      badge: "VISA"
    },
    {
      title: "Compra en SP VESSI-FOOTWEAR-CA",
      sub: "Card transaction",
      time: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      amount: 792833.36,
      sign: "-",
      badge: "VISA"
    },
    {
      title: "Oncall Q32025",
      sub: "Wallet",
      time: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      amount: 801540.00,
      sign: "+",
      badge: " "
    },
    {
      title: "Nomina Noviembre",
      sub: "Wallet",
      time: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
      amount: 200000.00,
      sign: "+",
      badge: " "
    },
    {
      title: "Nomina Octubre",
      sub: "Wallet",
      time: new Date(Date.now() - 1000 * 60 * 60 * 44).toISOString(),
      amount: 200000.00,
      sign: "+",
      badge: " "
    },
    {
      title: "Transferencia entre billeteras",
      sub: "Wallet",
      time: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
      amount: 48500.00,
      sign: "-",
      badge: " "
    }
  ];
  localStorage.setItem("mono_demo_activity_seed", JSON.stringify(demoActivity));
  localStorage.setItem("mono_demo_balance", String(328675.48));
  getNumericLast4(ACCOUNT_A, "9780");

  localStorage.setItem(DEMO_SEED_KEY, "1");
}

// ====== Recipients (Saved contacts) ======
const RECIPIENTS_KEY = "mono_saved_recipients";

function getRecipients() {
  const raw = localStorage.getItem(RECIPIENTS_KEY);
  if (raw) return JSON.parse(raw);

  const defaults = [
    { id: "mom", name: "Mamá", account_id: ACCOUNT_B },
    { id: "accb", name: "Account B", account_id: ACCOUNT_B },
  ];
  localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(defaults));
  return defaults;
}

function setRecipients(list) {
  localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(list));
}

function upsertRecipient(name, account_id) {
  const list = getRecipients();
  const cleanName = (name || "").trim() || "Recipient";
  const cleanAcc = (account_id || "").trim();
  if (!cleanAcc) throw new Error("Missing account_id to save recipient");

  const existingIdx = list.findIndex(r => r.account_id === cleanAcc || r.name.toLowerCase() === cleanName.toLowerCase());
  const item = { id: `r_${Date.now()}`, name: cleanName, account_id: cleanAcc };

  if (existingIdx >= 0) list[existingIdx] = { ...list[existingIdx], ...item };
  else list.unshift(item);

  setRecipients(list.slice(0, 30));
  return item;
}

function populateRecipientSelect(selectedAccountId = null) {
  const sel = $("#recipientSelect");
  if (!sel) return;

  const recipients = getRecipients();
  sel.innerHTML = "";

  for (const r of recipients) {
    const opt = document.createElement("option");
    opt.value = r.account_id;
    opt.textContent = `${r.name}  (${maskId(r.account_id, "recipient")})`;
    sel.appendChild(opt);
  }

  const target = selectedAccountId || ACCOUNT_B;
  sel.value = recipients.some(r => r.account_id === target) ? target : (recipients[0]?.account_id || ACCOUNT_B);
}

// ====== Cards program dropdown ======
function setupCfgGroupSelect(){
  const sel = $("#cfgGroupSelect");
  if (!sel) return;

  sel.innerHTML = "";
  for (const p of CARD_PROGRAMS){
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    sel.appendChild(opt);
  }

  sel.value = CARD_PROGRAMS[0]?.id || "custom";
  toggleCustomCfgInput();
}

function toggleCustomCfgInput(){
  const sel = $("#cfgGroupSelect");
  const wrap = $("#cfgGroupCustomWrap");
  if (!sel || !wrap) return;

  const isCustom = sel.value === "custom";
  wrap.classList.toggle("hidden", !isCustom);
}

// ====== Rendering ======
function renderCards(container, cards, limit=null) {
  container.innerHTML = "";
  const list = Array.isArray(cards) ? cards : [];
  const shown = limit ? list.slice(0, limit) : list;

  if (shown.length === 0) {
    container.innerHTML = `
      <div class="item">
        <div class="item-left">
          <div class="visa">—</div>
          <div>
            <div class="item-title">No cards</div>
            <div class="item-sub">Create a virtual card to see it here</div>
          </div>
        </div>
      </div>`;
    return;
  }

  for (const c of shown) {
    const typeLabel = c.type ? (c.type[0].toUpperCase() + c.type.slice(1)) : "Card";
    const last4 = c.last_four ? `****${c.last_four}` : `****${getNumericLast4(c.id, "0000")}`;
    const title = `${typeLabel} ${last4}`;
    const sub = `${typeLabel} • ${c.state || "active"}`;

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item-left">
        <div class="visa">VISA</div>
        <div>
          <div class="item-title">${title}</div>
          <div class="item-sub">${sub}</div>
        </div>
      </div>
      <div class="item-right"></div>
    `;
    container.appendChild(el);
  }
}

// Activity grouped by date + icons
function dayKey(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function timeOnly(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function renderActivity(container, rows, limit=null) {
  container.innerHTML = "";
  const list = Array.isArray(rows) ? rows : [];
  const shown = limit ? list.slice(0, limit) : list;

  if (shown.length === 0) {
    container.innerHTML = `
      <div style="padding:10px 0">
        <div class="item-title">No activity yet</div>
        <div class="item-sub">Send money / topup to generate operations</div>
      </div>`;
    return;
  }

  const groups = new Map();
  for (const r of shown) {
    const iso = r.time || r.inserted_at || r.created_at || "";
    const key = dayKey(iso);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  for (const [key, items] of groups.entries()) {
    const header = document.createElement("div");
    header.className = "activity-day";
    header.textContent = key;
    container.appendChild(header);

    for (const r of items) {
      const title = r.title || r.description || r.operation || r.operation_type || "Operation";
      const sub = r.sub || r.kind || "Wallet";
      const iso = r.time || r.inserted_at || r.created_at || "";
      const t = timeOnly(iso);

      const amount = Number(r.amount ?? r?.amount_obj?.amount ?? r?.amount?.amount ?? 0);
      const sign = r.sign || (amount >= 0 ? "+" : "-");
      const cls = sign === "+" ? "positive" : "negative";

      const isCard = (r.badge && r.badge.trim().toUpperCase() === "VISA") || sub.toLowerCase().includes("card");
      const iconHTML = isCard
        ? `<div class="act-visa">VISA</div>`
        : `<div class="act-arrow">${sign === "+" ? "↙" : "↗"}</div>`;

      const el = document.createElement("div");
      el.className = "activity-row";
      el.innerHTML = `
        <div class="activity-left">
          ${iconHTML}
          <div class="activity-text">
            <div class="activity-title">${title}</div>
            <div class="activity-sub">${sub}</div>
          </div>
        </div>
        <div class="activity-right">
          <div class="activity-amount ${cls}">${sign} ${formatCOP2(Math.abs(amount))}</div>
          <div class="activity-time">${t}</div>
        </div>
      `;
      container.appendChild(el);
    }
  }
}

// ====== Normalize real operations from API ======
function normalizeOperation(op) {
  if (!op || typeof op !== "object") return null;

  const amountObj = op.amount || op.source_amount || op.target_amount || null;
  const amt = amountObj?.amount ?? op.amount ?? 0;

  const isTransferOut =
    (op.operation_type === "account_to_account" &&
      op.payer_account_id === ACCOUNT_A &&
      op.receiving_account_id !== ACCOUNT_A);

  const sign = op.operation === "topup" ? "+" : (isTransferOut ? "-" : "+");

  return {
    title: op.description || op.operation_type || op.operation || "Operation",
    sub: "Wallet",
    time: op.inserted_at || op.created_at || new Date().toISOString(),
    amount: Number(amt || 0),
    amount_obj: amountObj,
    sign,
    badge: " ",
    raw: op
  };
}

// ====== Data loading ======
async function loadDashboard() {
  seedDemoDataOnce();
  setupCfgGroupSelect();
  populateRecipientSelect($("#sendToAccountInput")?.value?.trim() || ACCOUNT_B);

  $("#helloText").textContent = `Hello, ${USER_NAME}!`;
  $("#accountMask").textContent = maskId(ACCOUNT_A, "accountA");

  if (DEMO_UI) {
    const demoBal = Number(localStorage.getItem("mono_demo_balance") || 328675.48);
    $("#balanceAmount").textContent = formatCOP2(demoBal);
  } else {
    const bal = await api("balance", { qs: { account_id: ACCOUNT_A } });
    const available = bal?.available?.amount ?? 0;
    $("#balanceAmount").textContent = formatCOP(available, 0);
  }

  // Cards
  let cards = [];
  if (DEMO_UI) {
    cards = JSON.parse(localStorage.getItem("mono_demo_cards") || "[]");
  } else {
    const cardsResp = await api("cards", { qs: { page_number: 1, page_size: 10 } });
    const cardsAll = cardsResp.cards || [];
    cards = cardsAll.filter(c => c.account_id === ACCOUNT_A);
  }
  renderCards($("#cardsShortList"), cards, 3);

  // Activity
  let activityRows = [];
  if (DEMO_UI) {
    const seed = JSON.parse(localStorage.getItem("mono_demo_activity_seed") || "[]");
    activityRows = [...getLocalActivity(), ...seed];
  } else {
    activityRows = getLocalActivity();
  }
  renderActivity($("#activityShortList"), activityRows, 5);

  // Hidden account_id for card creation
  const cardAcc = $("#cardAccountId");
  if (cardAcc) cardAcc.value = ACCOUNT_A;

  // Autofill send defaults
  const sendTo = $("#sendToAccountInput");
  if (sendTo && !sendTo.value) sendTo.value = ACCOUNT_B;

  const sendAmt = $("#sendAmountInput");
  if (sendAmt && !sendAmt.value) sendAmt.value = DEFAULT_SEND;

  refreshConfirmCard();
}

function refreshConfirmCard() {
  const amt = Number($("#sendAmountInput")?.value || DEFAULT_SEND);

  const sel = $("#recipientSelect");
  const selectedAcc = sel?.value?.trim() || $("#sendToAccountInput")?.value?.trim() || ACCOUNT_B;

  const recipients = getRecipients();
  const found = recipients.find(r => r.account_id === selectedAcc);
  const displayName = found?.name || "Recipient";

  const inputAcc = $("#sendToAccountInput");
  if (inputAcc) inputAcc.value = selectedAcc;

  $("#confirmAmount").textContent = formatCOP(amt, 0);
  $("#recipientMask").textContent = maskId(selectedAcc, "recipient");
  $("#recipientLabel").textContent = displayName;
}

// ====== Pages ======
async function openActivity() {
  setView("activity");
  let rows = [];
  if (DEMO_UI) {
    const seed = JSON.parse(localStorage.getItem("mono_demo_activity_seed") || "[]");
    rows = [...getLocalActivity(), ...seed];
  } else {
    rows = getLocalActivity();
  }
  renderActivity($("#activityFullList"), rows, null);
}

async function openCards() {
  setView("cards");

  let cards = [];
  if (DEMO_UI) {
    cards = JSON.parse(localStorage.getItem("mono_demo_cards") || "[]");
  } else {
    const cardsResp = await api("cards", { qs: { page_number: 1, page_size: 20 } });
    const cardsAll = cardsResp.cards || [];
    cards = cardsAll.filter(c => c.account_id === ACCOUNT_A);
  }

  renderCards($("#cardsFullList"), cards, null);

  setupCfgGroupSelect();
  const form = $("#createCardForm");
  if (form) form.classList.add("hidden");
}

function openSend() {
  setView("send");
  populateRecipientSelect($("#sendToAccountInput")?.value?.trim() || ACCOUNT_B);
  refreshConfirmCard();
}

// ====== Real actions (API) ======
async function topupQuick() {
  const external_id = crypto.randomUUID();
  const op = await api("topup", {
    method: "POST",
    body: { account_id: ACCOUNT_A, amount: DEFAULT_TOPUP, external_id }
  });

  pushLocalActivity(normalizeOperation(op));

  if (DEMO_UI) {
    const current = Number(localStorage.getItem("mono_demo_balance") || 0);
    localStorage.setItem("mono_demo_balance", String(current + DEFAULT_TOPUP));
  }

  toast("Topup success");
  await loadDashboard();
}

function getSelectedCfgGroupId(){
  const sel = $("#cfgGroupSelect");
  if (!sel) return "";
  if (sel.value === "custom") return ($("#cfgGroupCustom")?.value || "").trim();
  return (sel.value || "").trim();
}

async function createCard() {
  const configuration_group_id = getSelectedCfgGroupId();
  const account_id = ($("#cardAccountId")?.value || ACCOUNT_A).trim();
  const nickname = ($("#cardNickname")?.value || "").trim();

  if (!configuration_group_id) throw new Error("Please select a card program (ccg_...)");

  const rand = Math.floor(Math.random() * 1e6);
  const cardholder = {
    birthdate: "1997-04-13",
    email: `demo_${rand}@example.com`,
    first_name: "Valentina",
    last_name: "Giraldo",
    nationality: "CO",
    phone_number: "+573000000000",
    document: {
      country_code: "CO",
      number: String(1000000000 + rand),
      person_type: "natural",
      type: "CC"
    },
    address: {
      city: "Bogotá",
      country: "CO",
      line_1: "Calle 1 # 2-3",
      line_2: "Apto 101",
      state: "Cundinamarca",
      zip_code: "110111"
    }
  };

  const created = await api("create_card", {
    method: "POST",
    body: { configuration_group_id, account_id, nickname, cardholder }
  });

  const createdId = created?.id || created?.card_id || `demo_${Date.now()}`;
  const last4 = getNumericLast4(createdId, "0000");

  if (DEMO_UI) {
    const list = JSON.parse(localStorage.getItem("mono_demo_cards") || "[]");
    list.unshift({
      id: createdId,
      type: "virtual",
      state: "active",
      nickname: nickname || "Virtual",
      last_four: last4,
      account_id: ACCOUNT_A
    });
    localStorage.setItem("mono_demo_cards", JSON.stringify(list.slice(0, 30)));
  }

  toast("Card created");
  await openCards();
  await loadDashboard();
  return created;
}

async function sendMoney() {
  const amount = Number($("#sendAmountInput").value || 0);
  const receiving_account_id = $("#sendToAccountInput").value.trim();
  const description = ($("#sendMessageInput").value || "").trim() || "Transfer XYZ";

  if (!amount || amount <= 0) throw new Error("Invalid amount");
  if (!receiving_account_id) throw new Error("Missing receiving account");

  const external_id = crypto.randomUUID();

  const op = await api("transfer", {
    method: "POST",
    body: {
      payer_account_id: ACCOUNT_A,
      receiving_account_id,
      amount,
      external_id,
      description
    }
  });

  pushLocalActivity(normalizeOperation(op));

  if (DEMO_UI) {
    const current = Number(localStorage.getItem("mono_demo_balance") || 0);
    localStorage.setItem("mono_demo_balance", String(current - amount));
  }

  openReceipt({
    amount,
    message: description,
    account: receiving_account_id,
    txId: op.id || op.transaction_id || "—",
    status: "Success"
  });

  toast("Transfer success");
  await loadDashboard();
}

function openReceipt({ amount, message, account, txId, status }) {
  const recipients = getRecipients();
  const found = recipients.find(r => r.account_id === account);
  const displayName = found?.name || "Recipient";

  $("#receiptAmount").textContent = `COP ${formatCOP2(-Math.abs(amount))}`;
  $("#receiptDate").textContent = new Date().toLocaleString("en-US");
  $("#receiptMessage").textContent = message || "—";
  $("#receiptRecipientName").textContent = displayName;
  $("#receiptAccount").textContent = maskId(account, "recipient");
  $("#receiptTxId").textContent = txId;
  $("#receiptStatus").textContent = status || "Success";

  $("#modalOverlay").classList.remove("hidden");
}

function closeReceipt() {
  $("#modalOverlay").classList.add("hidden");
}

// ====== Wire events ======
window.addEventListener("load", async () => {
  // Dashboard
  $("#btnGoSend").addEventListener("click", openSend);
  $("#btnGoCards").addEventListener("click", openCards);
  $("#btnMoreCards").addEventListener("click", openCards);
  $("#btnMoreActivity").addEventListener("click", openActivity);
  $("#btnRefresh").addEventListener("click", () => loadDashboard().then(() => toast("Refreshed")));
  $("#btnTopupQuick").addEventListener("click", () => topupQuick().catch(e => toast(e.message)));

  // Activity
  $("#backFromActivity").addEventListener("click", async () => { setView("dashboard"); await loadDashboard(); });

  // Cards
  $("#backFromCards").addEventListener("click", async () => { setView("dashboard"); await loadDashboard(); });
  $("#btnReloadCards").addEventListener("click", () => openCards().then(() => toast("Cards loaded")));
  $("#btnCreateCard").addEventListener("click", () => createCard().catch(e => toast(e.message)));

  $("#btnToggleCreateCard").addEventListener("click", () => {
    $("#createCardForm").classList.toggle("hidden");
  });
  $("#btnCancelCreateCard").addEventListener("click", () => {
    $("#createCardForm").classList.add("hidden");
  });

  $("#cfgGroupSelect").addEventListener("change", () => {
    toggleCustomCfgInput();
  });

  // Send
  $("#backFromSend").addEventListener("click", async () => { setView("dashboard"); await loadDashboard(); });
  $("#btnCancelSend").addEventListener("click", async () => { setView("dashboard"); await loadDashboard(); });
  $("#sendAmountInput").addEventListener("input", refreshConfirmCard);
  $("#sendToAccountInput").addEventListener("input", refreshConfirmCard);

  $("#recipientSelect").addEventListener("change", refreshConfirmCard);

  $("#btnSaveRecipient").addEventListener("click", () => {
    try {
      const name = $("#recipientNameInput").value;
      const acc = $("#sendToAccountInput").value;
      const saved = upsertRecipient(name, acc);
      populateRecipientSelect(saved.account_id);
      $("#recipientNameInput").value = "";
      toast("Recipient saved");
      refreshConfirmCard();
    } catch (e) {
      toast(e.message);
    }
  });

  $("#btnSendNow").addEventListener("click", () => sendMoney().catch(e => toast(e.message)));

  // Modal
  $("#modalClose").addEventListener("click", closeReceipt);
  $("#modalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "modalOverlay") closeReceipt();
  });

  // Init
  try {
    await loadDashboard();
  } catch (e) {
    toast(e.message);
  }
});
