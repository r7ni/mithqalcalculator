// mithqál currency calculator shared logic
// Extracted & unified (May 2025) and incrementally refined.
// Works for index.html, ar.html, and fa.html; keep Tom Select CDN above this import.

const MITHQAL_TO_GRAM = 3.641667;

/* ------------------------------------------------------------------
 *  Formatting helpers
 * ----------------------------------------------------------------*/
function formatMoney(input) {
  let value = input.value.replace(/[^0-9.]/g, "");
  const parts = value.split(".");
  if (parts.length > 2) value = parts[0] + "." + parts[1];
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  input.value = parts.length > 1 ? intPart + "." + parts[1] : intPart;
}
function formatMithqals(input) {
  formatMoney(input);
}

/* ------------------------------------------------------------------
 *  Simple in‑memory cache (5 min TTL) to speed up rapid edits
 * ----------------------------------------------------------------*/
const cache = { metal: {}, currency: {} };
function isFresh(ts) { return Date.now() - ts < 300_000; }

/* ------------------------------------------------------------------
 *  Remote‑data helpers
 * ----------------------------------------------------------------*/
async function fetchMetalPrice(type) {
  if (cache.metal[type] && isFresh(cache.metal[type].ts)) return cache.metal[type].val;
  const url = type === "gold"
    ? "https://api.gold-api.com/price/XAU"
    : "https://api.gold-api.com/price/XAG";
  try {
    const res = await fetch(url);
    const data = await res.json();
    const price = data.price / 31.1035;
    cache.metal[type] = { val: price, ts: Date.now() };
    return price;
  } catch (err) {
    console.error(`Unable to fetch ${type} price`, err);
    return cache.metal[type]?.val || 0;
  }
}

async function fetchCurrencyRate(cur) {
  if (cur === "CUSTOM") {
    return parseFloat(document.getElementById("customRate").value.replace(/,/g, "")) || 1;
  }
  if (cache.currency[cur] && isFresh(cache.currency[cur].ts)) return cache.currency[cur].val;
  try {
    const res = await fetch(`https://hexarate.paikama.co/api/rates/latest/USD?target=${cur}`);
    const data = await res.json();
    cache.currency[cur] = { val: data.data.mid, ts: Date.now() };
    return data.data.mid;
  } catch (err) {
    console.error("Unable to fetch currency rate", err);
    return cache.currency[cur]?.val || 1;
  }
}

/* ------------------------------------------------------------------
 *  Conversion logic with token‑based race‑condition guard
 * ----------------------------------------------------------------*/
let calcToken = 0;
let lastEdited = "mithqals";  // tracks which field user edited last

async function calculateMoneyFromMithqals() {
  const localToken = ++calcToken;
  const mithqals = parseFloat(document.getElementById("mithqals").value.replace(/,/g, ""));
  if (isNaN(mithqals) || mithqals <= 0) { document.getElementById("money").value = ""; return; }
  const metalType = document.querySelector('input[name="metalType"]:checked').value;
  const currency  = document.getElementById("currencySelect").value;
  const metalPrice = await fetchMetalPrice(metalType);
  const usdPerMithqal = metalPrice * MITHQAL_TO_GRAM;
  let valueInUSD = mithqals * usdPerMithqal;
  if (currency !== "USD") valueInUSD *= await fetchCurrencyRate(currency);
  if (localToken !== calcToken) return;
  document.getElementById("money").value = valueInUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function calculateMithqalsFromMoney() {
  const localToken = ++calcToken;
  const money = parseFloat(document.getElementById("money").value.replace(/,/g, ""));
  if (isNaN(money) || money <= 0) { document.getElementById("mithqals").value = ""; return; }
  const metalType = document.querySelector('input[name="metalType"]:checked').value;
  const currency  = document.getElementById("currencySelect").value;
  const metalPrice = await fetchMetalPrice(metalType);
  const usdPerMithqal = metalPrice * MITHQAL_TO_GRAM;
  let moneyInUSD = money;
  if (currency !== "USD") moneyInUSD /= await fetchCurrencyRate(currency);
  const mithqals = moneyInUSD / usdPerMithqal;
  if (localToken !== calcToken) return;
  document.getElementById("mithqals").value = mithqals.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ------------------------------------------------------------------
 *  UI plumbing
 * ----------------------------------------------------------------*/
function handleCurrencyChange() {
  const cur = document.getElementById("currencySelect").value;
  document.getElementById("customRateContainer").style.display = cur === "CUSTOM" ? "block" : "none";
  // Recalculate according to last edited field
  lastEdited === "mithqals" ? calculateMoneyFromMithqals() : calculateMithqalsFromMoney();
}

function initTomSelect() {
  if (!window.TomSelect) return;
  const rtl = document.documentElement.dir === "rtl" || /^(ar|fa)/.test(document.documentElement.lang);
  const ts = new TomSelect("#currencySelect", { maxItems: 1, closeAfterSelect: true, dropdownParent: "body", rtl });
  ts.on("change", handleCurrencyChange);
  ts.on("item_add", () => ts.blur());
}
function blurOnEnter(id) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") e.target.blur(); });
}

function attachInputHandlers() {
  const mith = document.getElementById("mithqals");
  const money = document.getElementById("money");
  if (mith) mith.addEventListener("input", e => { lastEdited = "mithqals"; formatMithqals(e.target); calculateMoneyFromMithqals(); });
  if (money) money.addEventListener("input", e => { lastEdited = "money"; formatMoney(e.target); calculateMithqalsFromMoney(); });

  // Custom rate live updates
  const custom = document.getElementById("customRate");
  if (custom) custom.addEventListener("input", () => {
    if (document.getElementById("currencySelect").value === "CUSTOM") {
      lastEdited === "mithqals" ? calculateMoneyFromMithqals() : calculateMithqalsFromMoney();
    }
  });
}

function attachMetalHandlers() {
  document.querySelectorAll('input[name="metalType"]').forEach(radio => {
    radio.addEventListener("change", () => {
      lastEdited === "mithqals" ? calculateMoneyFromMithqals() : calculateMithqalsFromMoney();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTomSelect();
  blurOnEnter("mithqals");
  blurOnEnter("money");
  attachInputHandlers();
  attachMetalHandlers();
  handleCurrencyChange();
});
