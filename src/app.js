import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const KEY = "phg_v1";

const state = JSON.parse(
  localStorage.getItem(KEY) ||
    '{"batches":[],"readings":[],"target":"","pro":false}'
);

const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const RC_ANDROID_KEY = "test_tfgoyIxZlEHEsoTMgvAhozmPmkG";
const ENTITLEMENT = "postharvest_guard_pro";
const PRODUCT = "postharvest_guard_pro_monthly";

async function initRevenueCat() {
  if (Capacitor.getPlatform() !== "android") return;

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

    await Purchases.configure({
      apiKey: RC_ANDROID_KEY
    });

    console.log("RevenueCat initialized successfully");
  } catch (e) {
    console.error("RevenueCat initialization error:", e);

    alert(
      "RevenueCat initialization error:\n\n" +
      (e?.message || e?.code || JSON.stringify(e))
    );
  }
}

async function buyPro() {
  try {
    console.log("RevenueCat: getting offerings...");

    const offerings = await Purchases.getOfferings();

    console.log("RevenueCat offerings:", offerings);

    if (!offerings.current) {
      throw new Error("No current RevenueCat offering was returned.");
    }

    // Use the monthly package from the current RevenueCat offering.
    // RevenueCat maps this package to the configured monthly product.
    const pkg =
      offerings.current.monthly ||
      offerings.current.availablePackages.find(
        (p) =>
          p.packageType === "MONTHLY" ||
          p.identifier === "$rc_monthly" ||
          p.product?.identifier === "monthly"
      );

    if (!pkg) {
      const available = offerings.current.availablePackages
        .map(
          (p) =>
            `${p.identifier || "unknown"} → ${
              p.product?.identifier || "unknown"
            }`
        )
        .join(", ");

      throw new Error(
        "Monthly package was not found in the current offering.\n\n" +
        "Available packages: " +
        (available || "none")
      );
    }

    console.log(
      "Purchasing RevenueCat package:",
      pkg.identifier,
      pkg.product?.identifier
    );

    const result = await Purchases.purchasePackage({
      aPackage: pkg
    });

    console.log("RevenueCat purchase result:", result);

    state.pro =
      !!result.customerInfo?.entitlements?.active?.[ENTITLEMENT];

    save();
    render();

    if (state.pro) {
      closePaywall();
      alert("🎉 PostHarvest Guard Pro unlocked!");
    } else {
      alert(
        "Purchase completed, but the Pro entitlement was not activated."
      );
    }
  } catch (e) {
    console.error("RevenueCat purchase error:", e);

    alert(
      "RevenueCat purchase error:\n\n" +
        (e?.message || e?.code || JSON.stringify(e))
    );
  }
}

async function restore() {
  try {
    const r = await Purchases.restorePurchases();

    state.pro =
      !!r.customerInfo?.entitlements?.active?.[ENTITLEMENT];

    save();
    render();

    alert(
      state.pro
        ? "Pro restored successfully."
        : "No active Pro purchase found."
    );
  } catch (e) {
    console.error("RevenueCat restore error:", e);

    alert(
      "RevenueCat restore error:\n\n" +
      (e?.message || e?.code || JSON.stringify(e))
    );
  }
}

function go(id) {
  $$(".screen").forEach((x) => x.classList.remove("active"));

  const screen = $("#" + id);
  if (screen) screen.classList.add("active");

  $$(".nav").forEach((x) =>
    x.classList.toggle("active", x.dataset.go === id)
  );

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

  state.batches.slice().reverse().forEach((b) => {
    const d = document.createElement("div");
    d.className = "list-item";

    d.innerHTML = `
      <strong>${escapeHtml(b.name)}</strong>
      <small>
        ${escapeHtml(b.crop)} · ${b.quantity || "—"} ${b.unit || ""}
      </small>
      <span class="badge">${escapeHtml(b.status)}</span>
    `;

    bl.appendChild(d);
  });

  if (!state.batches.length) {
    bl.innerHTML =
      '<div class="list-item"><strong>No batches yet</strong><small>Create your first harvest lot above.</small></div>';
  }

  const rl = $("#recentReadings");
  rl.innerHTML = "";

  state.readings.slice(-8).reverse().forEach((r) => {
    const d = document.createElement("div");
    d.className = "list-item";

    d.innerHTML = `
      <strong>${escapeHtml(r.crop)} — ${r.moisture}%</strong>
      <small>
        ${escapeHtml(r.batch || "Unassigned batch")} ·
        ${new Date(r.date).toLocaleString()}
      </small>
    `;

    rl.appendChild(d);
  });

  if (!state.readings.length) {
    rl.innerHTML =
      '<div class="list-item"><strong>No readings yet</strong><small>Your saved moisture records will appear here.</small></div>';
  }

  const avg = state.readings.length
    ? state.readings.reduce(
        (a, r) => a + Number(r.moisture),
        0
      ) / state.readings.length
    : 0;

  $("#avgMoisture").textContent = state.readings.length
    ? avg.toFixed(1) + "%"
    : "—";
}

function escapeHtml(v) {
  return String(v).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[m]
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
    date: new Date().toISOString()
  });

  save();

  $("#readingResult").classList.remove("hidden");

  $("#readingResult").innerHTML = `
    <strong>${moisture.toFixed(1)}%</strong><br/>
    <small>
      Reading saved. Compare it with the target required for this crop,
      buyer or storage method.
    </small>
  `;

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
    date: new Date().toISOString()
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

$("#exportBtn").addEventListener("click", async () => {
  if (!state.pro) {
    openPaywall();
    return;
  }

  try {
    const json = JSON.stringify(state, null, 2);

    const fileName = `postharvest-guard-records-${Date.now()}.json`;

    const file = await Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true
    });

    await Share.share({
      title: "PostHarvest Guard Records",
      text: "PostHarvest Guard exported records",
      url: file.uri,
      dialogTitle: "Share exported records"
    });
  } catch (e) {
    console.error("Export error:", e);
    alert(
      "Export failed:\n\n" +
      (e?.message || e?.code || JSON.stringify(e))
    );
  }
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
