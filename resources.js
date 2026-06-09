/**
 * =======================================================
 *  A/L PAPER HUB - resources.js
 *  Public website Firebase integration.
 *  Loads published resources, handles downloads, search,
 *  filters, and broken-link reporting.
 *
 *  Include AFTER firebase-config.js in your HTML:
 *    <script type="module" src="resources.js"></script>
 * =======================================================
 */

import { firebaseConfig } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig, "public");
const db  = getFirestore(app);

/* =======================================================
   LOAD PUBLISHED RESOURCES
   Returns array of published resource objects from Firestore.
   Each object includes id + all fields.
======================================================= */

export async function loadPublishedResources({ subject, type, year, medium, sort = "newest" } = {}) {
  try {
    let q = query(collection(db, "resources"), where("status", "==", "published"));

    const snap = await getDocs(q);
    let resources = [];
    snap.forEach(d => resources.push({ id: d.id, ...d.data() }));

    // Client-side filtering (Firestore composite index not required)
    if (subject) resources = resources.filter(r => r.subject === subject);
    if (type)    resources = resources.filter(r => r.type === type);
    if (year)    resources = resources.filter(r => r.year === year);
    if (medium)  resources = resources.filter(r => r.medium === medium);

    // Sort
    if (sort === "newest") resources.sort((a, b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
    if (sort === "oldest") resources.sort((a, b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));
    if (sort === "title")  resources.sort((a, b) => (a.title||"").localeCompare(b.title||""));
    if (sort === "year")   resources.sort((a, b) => (parseInt(b.year)||0) - (parseInt(a.year)||0));

    return resources;
  } catch (err) {
    console.error("[APH] Failed to load resources:", err);
    return [];
  }
}

/* =======================================================
   SEARCH RESOURCES (client-side, case-insensitive)
======================================================= */

export function searchResources(resources, query) {
  if (!query) return resources;
  const q = query.toLowerCase();
  return resources.filter(r => {
    return (r.title    || "").toLowerCase().includes(q) ||
           (r.subject  || "").toLowerCase().includes(q) ||
           (r.type     || "").toLowerCase().includes(q) ||
           (r.medium   || "").toLowerCase().includes(q) ||
           ((r.tags||[]).some(t => t.toLowerCase().includes(q)));
  });
}

/* =======================================================
   TRACK DOWNLOAD
   Call when user clicks a download/view button.
======================================================= */

export async function trackDownload(resourceId) {
  try {
    await updateDoc(doc(db, "resources", resourceId), {
      downloadCount: increment(1)
    });
  } catch (_) {
    // Non-fatal - download still proceeds
  }
}

/* =======================================================
   SUBMIT BROKEN LINK REPORT
======================================================= */

export async function submitBrokenReport({ resourceId, resourceTitle, problemType, message = "" }) {
  try {
    await addDoc(collection(db, "brokenReports"), {
      resourceId,
      resourceTitle,
      problemType,
      message,
      status: "open",
      createdAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* =======================================================
   LOAD ACTIVE ANNOUNCEMENTS
======================================================= */

export async function loadAnnouncements() {
  try {
    const snap = await getDocs(
      query(collection(db, "announcements"), where("status", "==", "active"))
    );
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    return items;
  } catch (_) {
    return [];
  }
}

/* =======================================================
   LOAD SITE SETTINGS
   Public pages can read non-sensitive site settings.
======================================================= */

export async function loadSiteSettings() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "main"));
    return snap.exists() ? snap.data() : {};
  } catch (_) {
    return {};
  }
}

/* =======================================================
   RENDER RESOURCE CARD HTML
   Utility function to render a standard resource card.
   Pass a container element ID and an array of resources.
======================================================= */

export function renderResourceCards(containerId, resources) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!resources || resources.length === 0) {
    container.innerHTML = `<div class="resources-empty" style="text-align:center;padding:40px;color:var(--text2)">No resources found. Try adjusting your filters.</div>`;
    return;
  }

  container.innerHTML = resources.map(r => {
    const downloadUrl = r.fileUrl || r.externalUrl || "#";
    const isExternal  = !!r.externalUrl && !r.fileUrl;
    const fileLabel   = isExternal ? "Open Link" : `Download Download ${r.fileType || "PDF"}`;

    return `<div class="resource-card" data-id="${esc(r.id)}">
      <div class="resource-card-top">
        <div class="resource-card-subject">
          <div class="resource-subject-dot" style="background:var(--blue)"></div>
          <div class="resource-subject-name">${esc(r.subject)}</div>
        </div>
        <div class="resource-card-title">${esc(r.title)}</div>
        <div class="resource-card-badges">
          <span class="badge badge-blue">${esc(r.type)}</span>
          ${r.medium ? `<span class="badge badge-cyan">${esc(r.medium)}</span>` : ""}
          ${r.year   ? `<span class="badge badge-gray">${esc(r.year)}</span>` : ""}
        </div>
        <div class="resource-detail-grid">
          ${r.year       ? `<span><strong>Year</strong>${esc(r.year)}</span>` : ""}
          ${r.medium     ? `<span><strong>Medium</strong>${esc(r.medium)}</span>` : ""}
          ${r.fileType   ? `<span><strong>File</strong>${esc(r.fileType)}</span>` : ""}
          ${r.fileSizeLabel ? `<span><strong>Size</strong>${esc(r.fileSizeLabel)}</span>` : ""}
        </div>
      </div>
      <div class="resource-card-bottom resource-card-actions">
        ${downloadUrl !== "#" ? `
          <button class="resource-view-btn" onclick="handleView('${esc(r.id)}','${esc(downloadUrl)}')">View Online</button>
          <button class="resource-dl-btn"   onclick="handleDownload('${esc(r.id)}','${esc(downloadUrl)}')">
            ${fileLabel}
          </button>
        ` : `<span style="font-size:12px;color:var(--text2)">No download available</span>`}
      </div>
      <div class="resource-report-link">
        <button onclick="openReportModal('${esc(r.id)}','${esc(r.title)}')"
          style="background:none;border:none;color:var(--text2);font-size:12px;cursor:pointer;text-decoration:underline;padding:0">
          ! Report broken link
        </button>
      </div>
    </div>`;
  }).join("");
}

/* -- Download handler -------------------------------- */
window.handleView = async function (resourceId, url) {
  window.open(url, "_blank");
  await trackDownload(resourceId);
};

window.handleDownload = async function (resourceId, url) {
  const a = document.createElement("a");
  a.href     = url;
  a.target   = "_blank";
  a.download = "";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  await trackDownload(resourceId);
};

/* -- Broken report modal ------------------------------ */
window.openReportModal = function (resourceId, resourceTitle) {
  // Create a simple modal if it doesn't exist
  let modal = document.getElementById("tdr-report-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "tdr-report-modal";
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);
      display:flex;align-items:center;justify-content:center;
      z-index:9999;padding:20px;
    `;
    modal.innerHTML = `
      <div style="background:var(--bg2,#101f38);border:1px solid rgba(148,163,184,0.2);border-radius:16px;padding:28px;max-width:400px;width:100%;font-family:var(--ff-body,system-ui)">
        <h3 style="margin-bottom:6px;color:var(--text0,#f8fafc)">Report an Issue</h3>
        <p id="report-modal-subtitle" style="font-size:13px;color:var(--text2,#94a3b8);margin-bottom:18px"></p>
        <div style="margin-bottom:14px">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--text2,#94a3b8);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Problem Type</label>
          <select id="report-problem-type" style="width:100%;background:var(--bg1,#0b1528);border:1px solid rgba(148,163,184,0.15);border-radius:8px;color:var(--text0,#f8fafc);font-size:13px;padding:9px 12px;outline:none">
            <option>File not opening</option>
            <option>Wrong paper</option>
            <option>Wrong medium</option>
            <option>Download too slow</option>
            <option>Other</option>
          </select>
        </div>
        <div style="margin-bottom:18px">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--text2,#94a3b8);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Message (optional)</label>
          <textarea id="report-message" rows="2" placeholder="Extra details..." style="width:100%;background:var(--bg1,#0b1528);border:1px solid rgba(148,163,184,0.15);border-radius:8px;color:var(--text0,#f8fafc);font-size:13px;padding:9px 12px;outline:none;resize:vertical"></textarea>
        </div>
        <div id="report-feedback" style="display:none;font-size:13px;margin-bottom:12px;padding:8px 12px;border-radius:8px"></div>
        <div style="display:flex;gap:10px">
          <button id="report-submit-btn" onclick="submitReport()" style="background:#2563eb;color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;padding:9px 18px;cursor:pointer;flex:1">Submit Report</button>
          <button onclick="document.getElementById('tdr-report-modal').style.display='none'" style="background:transparent;color:var(--text2,#94a3b8);border:1px solid rgba(148,163,184,0.2);border-radius:8px;font-family:inherit;font-size:13px;padding:9px 14px;cursor:pointer">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  modal.dataset.resourceId    = resourceId;
  modal.dataset.resourceTitle = resourceTitle;
  document.getElementById("report-modal-subtitle").textContent = resourceTitle;
  document.getElementById("report-feedback").style.display = "none";
  modal.style.display = "flex";
};

window.submitReport = async function () {
  const modal     = document.getElementById("tdr-report-modal");
  const resId     = modal.dataset.resourceId;
  const resTitle  = modal.dataset.resourceTitle;
  const problem   = document.getElementById("report-problem-type").value;
  const message   = document.getElementById("report-message").value.trim();
  const feedback  = document.getElementById("report-feedback");
  const btn       = document.getElementById("report-submit-btn");

  btn.disabled    = true;
  btn.textContent = "Submitting...";

  const result = await submitBrokenReport({
    resourceId: resId, resourceTitle: resTitle, problemType: problem, message
  });

  btn.disabled = false;
  btn.textContent = "Submit Report";
  feedback.style.display = "block";

  if (result.success) {
    feedback.style.background = "rgba(34,197,94,0.12)";
    feedback.style.border     = "1px solid rgba(34,197,94,0.3)";
    feedback.style.color      = "#86efac";
    feedback.textContent      = "Thank you! Your report has been submitted.";
    setTimeout(() => { modal.style.display = "none"; }, 2000);
  } else {
    feedback.style.background = "rgba(239,68,68,0.12)";
    feedback.style.border     = "1px solid rgba(239,68,68,0.3)";
    feedback.style.color      = "#fca5a5";
    feedback.textContent      = "Failed to submit. Please try again.";
  }
};

function esc(str) {
  return String(str||"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
