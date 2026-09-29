import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";

const KEY = "phg_v1";
const state = JSON.parse(
  localStorage.getItem(KEY) ||
    '{"batches":[],"readings":[],"target":"","pro":false}'
);
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const RC_ANDROID_KEY = "REPLACE_WITH_REVENUECAT_GOOGLE_PUBLIC_KEY";
const ENTITLEMENT = "pro";
const PRODUCT = "postharvest_guard_pro_monthly";

async function initRevenueCat() {
  if (
    Capacitor.getPlatform() !== "android" ||
    RC_ANDROID_KEY.startsWith("REPLACE")
  )
    return;
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.INFO });
    await Purchases.configure({ apiKey: RC_ANDROID_KEY });
  } catch (e) {
    console.log("RevenueCat init:", e);
  }
}
async function buyPro() {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg =
      offerings.current?.availablePackages?.find(
        (p) => p.product.identifier === PRODUCT
      ) || offerings.current?.availablePackages?.[0];
    if (!pkg) throw new Error("No offering configured");
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    state.pro = !!result.customerInfo?.entitlements?.active?.[ENTITLEMENT];
    save();
    render();
    closePaywall();
  } catch (e) {
    alert(
      "Purchase could not be completed. Configure the RevenueCat offering and Google Play product first."
    );
    console.log(e);
  }
}
async function restore() {
  try {
    const r = await Purchases.restorePurchases();
    state.pro = !!r.customerInfo?.entitlements?.active?.[ENTITLEMENT];
    save();
    render();
    alert(state.pro ? "Pro restored." : "No active Pro purchase found.");
  } catch (e) {
    alert("Restore could not be completed.");
  }
}

function go(id) {
  $$(".screen").forEach((x) => x.classList.remove("active"));
  $("#" + id).classList.add("active");
  $$(".nav").forEach((x) => x.classList.toggle("active", x.dataset.go === id));
  render();
  window.scrollTo(0, 0);
}
$$("[data-go]").forEach((b) =>
  b.addEventListener("click", () => go(b.dataset.go))
);

function render() {
  $("#batchCount").textContent = state.batches.length;
  $("#readingCount").textContent = state.readings.length;
  $("#dryingCount").textContent = state.batches.filter(
    (b) => b.status === "Drying"
  ).length;
  $("#target").value = state.target || "";
  const bl = $("#batchList");
  bl.innerHTML = "";
  state.batches
    .slice()
    .reverse()
    .forEach((b) => {
      const d = document.createElement("div");
      d.className = "list-item";
      d.innerHTML = `<strong>${escapeHtml(b.name)}</strong><small>${escapeHtml( b.crop )} · ${b.quantity || "—"} ${b.unit || ""}</small><span class="badge">${ b.status }</span>`;
      bl.appendChild(d);
    });
  if (!state.batches.length)
    bl.innerHTML =
      '<div class="list-item"><strong>No batches yet</strong><small>Create your first harvest lot above.</small></div>';
  const rl = $("#recentReadings");
  rl.innerHTML = "";
  state.readings
    .slice(-8)
    .reverse()
    .forEach((r) => {
      const d = document.createElement("div");
      d.className = "list-item";
      d.innerHTML = `<strong>${escapeHtml(r.crop)} — ${ r.moisture }%</strong><small>${escapeHtml( r.batch || "Unassigned batch" )} · ${new Date(r.date).toLocaleString()}</small>`;
      rl.appendChild(d);
    });
  if (!state.readings.length)
    rl.innerHTML =
      '<div class="list-item"><strong>No readings yet</strong><small>Your saved moisture records will appear here.</small></div>';
  const avg = state.readings.length
    ? state.readings.reduce((a, r) => a + Number(r.moisture), 0) /
      state.readings.length
    : 0;
  $("#avgMoisture").textContent = state.readings.length
    ? avg.toFixed(1) + "%"
    : "—";
}
function escapeHtml(v) {
  return String(v).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[
        m
      ])
  );
}

$("#readingForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const moisture = Number($("#moisture").value);
  state.readings.push({
    crop: $("#crop").value,
    moisture,
    batch: $("#readingBatch").value.trim(),
    purpose: $("#purpose").value,
    note: $("#readingNote").value.trim(),
    date: new Date().toISOString(),
  });
  save();
  $("#readingResult").classList.remove("hidden");
  $("#readingResult").innerHTML = `<strong>${moisture.toFixed( 1 )}%</strong><br/><small>Reading saved. Compare it with the target required for this crop, buyer or storage method.</small>`;
  e.target.reset();
  render();
});
$("#batchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  state.batches.push({
    name: $("#batchName").value.trim(),
    crop: $("#batchCrop").value,
    quantity: $("#quantity").value,
    unit: $("#unit").value,
    status: "Drying",
    date: new Date().toISOString(),
  });
  save();
  e.target.reset();
  render();
  alert("Batch created.");
});
$("#saveTarget").addEventListener("click", () => {
  state.target = $("#target").value;
  save();
  alert("Target saved.");
});
$("#exportBtn").addEventListener("click", () => {
  if (!state.pro) {
    openPaywall();
    return;
  }
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "postharvest-guard-records.json";
  a.click();
  URL.revokeObjectURL(a.href);
});
function openPaywall() {
  $("#paywall").classList.remove("hidden");
}
function closePaywall() {
  $("#paywall").classList.add("hidden");
}
$("#proBtn").addEventListener("click", openPaywall);
$("#closePaywall").addEventListener("click", closePaywall);
$("#purchaseBtn").addEventListener("click", buyPro);
$("#restoreBtn").addEventListener("click", restore);

initRevenueCat();
render();
