/**
 * =======================================================
 *  A/L PAPER HUB - admin.js
 *  Complete Firebase-powered admin panel logic.
 *  Uses Firebase v10 modular SDK.
 * =======================================================
 */

import { firebaseConfig, ADMIN_EMAILS } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* =======================================================
   INITIALISE FIREBASE
======================================================= */
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const storage = getStorage(app);

/* =======================================================
   GLOBAL STATE
======================================================= */
let allResources   = [];
let currentPage    = 1;
const PAGE_SIZE    = 20;
let modalConfirmFn = null;
let isEditing      = false;
const autoFilledFields = new Map();
let analyzedDriveDrafts = [];
let driveSyncTimer = null;

/* =======================================================
   AUTH
======================================================= */

/**
 * Monitor authentication state on page load.
 * Show login, loading, or dashboard accordingly.
 */
onAuthStateChanged(auth, (user) => {
  const loading = document.getElementById("auth-loading");
  const login   = document.getElementById("login-page");
  const panel   = document.getElementById("admin-panel");

  if (user) {
    if (!ADMIN_EMAILS.includes(user.email)) {
      // Signed in but not in allowlist - boot them out
      signOut(auth);
      loading.classList.add("hidden");
      login.classList.remove("hidden");
      showLoginError("You are not authorised to access this admin panel.");
      return;
    }
    // Authorised admin
    loading.classList.add("hidden");
    login.classList.add("hidden");
    panel.classList.remove("hidden");
    document.getElementById("topbar-email").textContent = user.email;
    initAdminPanel();
  } else {
    loading.classList.add("hidden");
    panel.classList.add("hidden");
    login.classList.remove("hidden");
  }
});

/** Login with email/password */
window.loginAdmin = async function () {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn      = document.getElementById("login-btn");
  const btnText  = document.getElementById("login-btn-text");
  const loader   = document.getElementById("login-btn-loader");

  hideLoginError();
  if (!email || !password) { showLoginError("Please enter your email and password."); return; }

  btn.disabled = true;
  btnText.classList.add("hidden");
  loader.classList.remove("hidden");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles the rest
  } catch (err) {
    btn.disabled = false;
    btnText.classList.remove("hidden");
    loader.classList.add("hidden");
    showLoginError(friendlyAuthError(err.code));
  }
};

/** Logout */
window.logoutAdmin = async function () {
  await signOut(auth);
};

function showLoginError(msg) {
  const el = document.getElementById("login-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}
function hideLoginError() {
  document.getElementById("login-error").classList.add("hidden");
}

function friendlyAuthError(code) {
  const map = {
    "auth/user-not-found":   "No account found with that email.",
    "auth/wrong-password":   "Incorrect password. Please try again.",
    "auth/invalid-email":    "Please enter a valid email address.",
    "auth/too-many-requests":"Too many failed attempts. Please try again later.",
    "auth/invalid-credential": "Incorrect email or password.",
  };
  return map[code] || "Login failed. Please check your credentials.";
}

// Allow Enter key on login form
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !document.getElementById("login-page").classList.contains("hidden")) {
    window.loginAdmin();
  }
});

/* =======================================================
   INIT ADMIN PANEL
======================================================= */

function initAdminPanel() {
  showSection("dashboard");
  loadDashboardStats();
  loadRecentResources();
  setupDriveAutoSync();
}

/* =======================================================
   NAVIGATION
======================================================= */

window.showSection = function (name) {
  // Hide all sections
  document.querySelectorAll(".section-content").forEach(s => s.classList.add("hidden"));
  // Deactivate all nav items
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));

  // Show target
  const section = document.getElementById("section-" + name);
  if (section) section.classList.remove("hidden");

  // Activate nav button
  const navBtn = document.querySelector(`.nav-item[data-section="${name}"]`);
  if (navBtn) navBtn.classList.add("active");

  // Load section data
  if (name === "dashboard")     { loadDashboardStats(); loadRecentResources(); }
  if (name === "resources")     { loadResources(); }
  if (name === "reports")       { loadBrokenReports(); }
  if (name === "announcements") { loadAnnouncements(); }
  if (name === "subjects")      { loadSubjects(); }
  if (name === "settings")      { loadSiteSettings(); }

  // Close sidebar on mobile
  if (window.innerWidth <= 900) closeSidebar();
};

window.toggleSidebar = function () {
  const sidebar  = document.getElementById("admin-sidebar");
  const overlay  = document.getElementById("sidebar-overlay");
  const isOpen   = sidebar.classList.contains("open");
  if (isOpen) {
    sidebar.classList.remove("open");
    overlay.classList.add("hidden");
  } else {
    sidebar.classList.add("open");
    overlay.classList.remove("hidden");
  }
};

function closeSidebar() {
  document.getElementById("admin-sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.add("hidden");
}

/* =======================================================
   DASHBOARD
======================================================= */

async function loadDashboardStats() {
  try {
    const snap = await getDocs(collection(db, "resources"));
    let total = 0, published = 0, drafts = 0, papers = 0, books = 0;
    snap.forEach(d => {
      const r = d.data();
      total++;
      if (r.status === "published") published++; else drafts++;
      if (r.type === "Past Paper") papers++;
      if (r.type === "Book") books++;
    });

    // Open reports
    const rSnap = await getDocs(query(collection(db, "brokenReports"), where("status", "==", "open")));
    const openReports = rSnap.size;

    set("stat-total",     total);
    set("stat-published", published);
    set("stat-drafts",    drafts);
    set("stat-papers",    papers);
    set("stat-books",     books);
    set("stat-reports",   openReports);

    // Update nav badges
    document.getElementById("nav-badge-resources").textContent = total;
    document.getElementById("nav-badge-reports").textContent   = openReports;
  } catch (err) {
    console.error("Stats load failed:", err);
  }
}

async function loadRecentResources() {
  const el = document.getElementById("dashboard-recent-list");
  try {
    const q    = query(collection(db, "resources"), orderBy("createdAt", "desc"), limit(6));
    const snap = await getDocs(q);
    if (snap.empty) {
      el.innerHTML = `<div class="empty-state">No resources uploaded yet.<br>Start by clicking <strong>Upload Resource</strong>.</div>`;
      return;
    }
    let html = "";
    snap.forEach(d => {
      const r = d.data();
      const icon = fileIcon(r.fileType);
      html += `<div class="recent-item">
        <div class="recent-item-icon">${icon}</div>
        <div class="recent-item-info">
          <div class="recent-item-title">${esc(r.title)}</div>
          <div class="recent-item-meta">${esc(r.subject || "-")} - ${esc(r.type || "-")} - <span class="${r.status === "published" ? "status-published" : "status-draft"} status-badge">${r.status}</span></div>
        </div>
        <button class="btn-icon btn-sm" onclick="editResource('${d.id}')">Edit</button>
      </div>`;
    });
    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed to load: ${err.message}</div>`;
  }
}

/* =======================================================
   UPLOAD / EDIT RESOURCE
======================================================= */

/** Called when a file is picked from the file input */
window.handleFileSelect = function (input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById("file-drop-label").innerHTML = `<strong>${esc(file.name)}</strong>`;
  document.getElementById("file-drop-hint").textContent = formatFileSize(file.size);
  applyDriveMetadata(window.APHDriveHelper?.inferMetadata(file.name), true);
};

window.prefillFromDriveInput = function () {
  const input = document.getElementById("f-externalurl").value.trim();
  const meta = window.APHDriveHelper?.inferMetadata(input);
  if (!meta || !input) {
    setDriveNote("Paste a Drive PDF link or filename first.");
    return;
  }
  applyDriveMetadata(meta, true);
};

window.analyzeDriveFolderInput = async function () {
  const input = document.getElementById("drive-folder-input").value.trim();
  const results = document.getElementById("drive-folder-results");
  const actions = document.getElementById("drive-import-actions");
  if (!input) {
    showToast("Paste a Drive folder link or filename list first.", "info");
    return;
  }
  results.classList.remove("hidden");
  results.innerHTML = `<div class="drive-result-row"><strong>Analyzing...</strong><span></span><span></span><span></span></div>`;
  actions.classList.add("hidden");
  const analysis = await window.APHDriveHelper.analyzeFolder(input, { apiKey: getDriveSyncSettings().apiKey });
  analyzedDriveDrafts = analysis.files || [];
  if (!analyzedDriveDrafts.length) {
    results.innerHTML = `<div class="drive-result-row"><strong>No PDF/file names found</strong><span>${esc(analysis.warning || "")}</span><span></span><span></span></div>`;
    return;
  }
  const warning = analysis.warning ? `<div class="drive-helper-note">${esc(analysis.warning)}</div>` : "";
  results.innerHTML = analyzedDriveDrafts.slice(0, 30).map((row) => `<div class="drive-result-row">
    <strong>${esc(row.title || row.fileName || "Untitled")}</strong>
    <span>${esc(row.subject || "Other")} / ${esc(row.type || "Other")}</span>
    <span>${esc(row.medium || "English")} ${esc(row.year || "")}</span>
    <span>${row.externalUrl ? "Link ready" : "Draft"}</span>
  </div>`).join("") + warning;
  actions.classList.remove("hidden");
};

window.saveAnalyzedDriveDrafts = async function () {
  if (!analyzedDriveDrafts.length) {
    showToast("Analyze folder items first.", "info");
    return;
  }
  setUploadLoading(true);
  try {
    const email = auth.currentUser?.email || "admin";
    const batch = analyzedDriveDrafts.map((row) => {
      const subject = row.subject || "Other";
      const type = row.type || "Other";
      const medium = row.medium || "English";
      const stream = row.stream || streamForSubject(subject) || "Common Resources";
      const externalUrl = row.externalUrl || "";
      return addDoc(collection(db, "resources"), {
        title: row.title || row.fileName || "Untitled Resource",
        subject,
        stream,
        type,
        medium,
        year: row.year || "",
        examType: row.examType || "",
        paperPart: row.paperPart || "",
        description: "",
        source: "Google Drive",
        tags: row.tags || [subject, type, medium, row.year].filter(Boolean),
        status: "draft",
        featured: false,
        externalUrl,
        fileUrl: "",
        storagePath: "",
        fileName: row.fileName || "",
        fileSize: 0,
        fileSizeLabel: externalUrl ? "Drive Link" : "Needs link",
        fileType: "PDF",
        slug: createSlug(row.title || row.fileName || "resource"),
        downloadCount: 0,
        viewCount: 0,
        reportCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: email,
        updatedBy: email,
      });
    });
    await Promise.all(batch);
    showToast(`${analyzedDriveDrafts.length} Drive draft(s) saved.`, "success");
    clearDriveFolderAnalysis();
    loadDashboardStats();
  } catch (err) {
    showUploadError("Drive draft save failed: " + err.message);
  } finally {
    setUploadLoading(false);
  }
};

window.clearDriveFolderAnalysis = function () {
  analyzedDriveDrafts = [];
  document.getElementById("drive-folder-input").value = "";
  document.getElementById("drive-folder-results").innerHTML = "";
  document.getElementById("drive-folder-results").classList.add("hidden");
  document.getElementById("drive-import-actions").classList.add("hidden");
};

/** Main submit handler - handles both create and edit */
window.handleSubmitResource = async function () {
  const editId = document.getElementById("f-edit-id").value;
  if (editId) {
    await updateResource(editId);
  } else {
    await createResource();
  }
};

async function createResource() {
  const data = collectFormData();
  if (!data) return;

  const file = document.getElementById("f-file").files[0];
  const externalUrl = normalizeDriveDownloadUrl(document.getElementById("f-externalurl").value.trim());

  if (!file && !externalUrl) {
    showUploadError("Please upload a file or provide an external download URL.");
    return;
  }

  setUploadLoading(true);
  clearUploadMessages();

  try {
    let fileUrl = "", storagePath = "", fileName = "", fileSize = 0, fileSizeLabel = "", fileType = "";

    if (file) {
      const result = await uploadFileToStorage(file, data.stream, data.subject);
      fileUrl       = result.url;
      storagePath   = result.path;
      fileName      = result.name;
      fileSize      = file.size;
      fileSizeLabel = formatFileSize(file.size);
      fileType      = detectFileType(file);
    } else {
      fileType = "External Link";
    }

    const docData = {
      ...data,
      fileUrl, storagePath, fileName, fileSize, fileSizeLabel, fileType,
      externalUrl,
      slug: createSlug(data.title),
      downloadCount: 0,
      viewCount:     0,
      reportCount:   0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: auth.currentUser.email,
      updatedBy: auth.currentUser.email,
    };

    await addDoc(collection(db, "resources"), docData);

    showUploadSuccess("OK Resource uploaded and saved successfully!");
    resetUploadForm();
    showToast("Resource uploaded!", "success");
    loadDashboardStats();
    setUploadLoading(false);
  } catch (err) {
    setUploadLoading(false);
    showUploadError("Upload failed: " + err.message);
  }
}

async function updateResource(docId) {
  const data = collectFormData();
  if (!data) return;

  const file         = document.getElementById("f-file").files[0];
  const externalUrl  = normalizeDriveDownloadUrl(document.getElementById("f-externalurl").value.trim());
  const oldPath      = document.getElementById("f-edit-storagepath").value;

  setUploadLoading(true);
  clearUploadMessages();

  try {
    const updates = {
      ...data,
      externalUrl,
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser.email,
    };

    // Replace file if a new one was chosen
    if (file) {
      const result = await uploadFileToStorage(file, data.stream, data.subject);
      updates.fileUrl       = result.url;
      updates.storagePath   = result.path;
      updates.fileName      = result.name;
      updates.fileSize      = file.size;
      updates.fileSizeLabel = formatFileSize(file.size);
      updates.fileType      = detectFileType(file);

      // Try to delete old file (non-fatal if fails)
      if (oldPath) {
        try { await deleteObject(ref(storage, oldPath)); } catch (_) {}
      }
    }

    await updateDoc(doc(db, "resources", docId), updates);

    showUploadSuccess("OK Resource updated successfully!");
    showToast("Resource updated!", "success");
    setUploadLoading(false);
    loadResources();
  } catch (err) {
    setUploadLoading(false);
    showUploadError("Update failed: " + err.message);
  }
}

/** Upload file to Firebase Storage, show progress */
async function uploadFileToStorage(file, stream, subject) {
  const safeName   = createSlug(file.name.replace(/\.[^.]+$/, "")) + "." + file.name.split(".").pop();
  const streamPath = createSlug(stream || "general");
  const subjectPath= createSlug(subject || "other");
  const path       = `resources/${streamPath}/${subjectPath}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);

    document.getElementById("upload-progress-wrap").classList.remove("hidden");

    task.on("state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        document.getElementById("upload-progress-bar").style.width   = pct + "%";
        document.getElementById("upload-progress-label").textContent = `Uploading... ${pct}%`;
      },
      (err) => { reject(err); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        document.getElementById("upload-progress-bar").style.width   = "100%";
        document.getElementById("upload-progress-label").textContent = "Upload complete!";
        resolve({ url, path, name: safeName });
      }
    );
  });
}

/** Collect and validate form data */
function collectFormData() {
  const title   = document.getElementById("f-title").value.trim();
  const subject = document.getElementById("f-subject").value;
  const stream  = document.getElementById("f-stream").value;
  const type    = document.getElementById("f-type").value;
  const medium  = document.getElementById("f-medium").value;

  if (!title)   { showUploadError("Title is required."); return null; }
  if (!subject) { showUploadError("Please select a subject."); return null; }
  if (!stream)  { showUploadError("Please select a stream."); return null; }
  if (!type)    { showUploadError("Please select a resource type."); return null; }
  if (!medium)  { showUploadError("Please select a medium."); return null; }

  const year        = document.getElementById("f-year").value;
  const examType    = document.getElementById("f-examtype").value;
  const paperPart   = document.getElementById("f-paperpart").value;
  const description = document.getElementById("f-description").value.trim();
  const source      = document.getElementById("f-source").value.trim();
  const tagsRaw     = document.getElementById("f-tags").value;
  const status      = document.getElementById("f-status").value;
  const featured    = document.getElementById("f-featured").value === "true";

  const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

  return { title, subject, stream, type, medium, year, examType, paperPart, description, source, tags, status, featured };
}

function fieldValue(id) {
  return document.getElementById(id)?.value || "";
}

function setAutoField(id, value) {
  if (!value) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  const previous = autoFilledFields.get(id);
  if (el.value && el.value !== previous) return false;
  el.value = value;
  autoFilledFields.set(id, value);
  return true;
}

function applyDriveMetadata(meta, announce) {
  if (!meta) return;
  const changed = [];
  const fields = [
    ["f-title", meta.title],
    ["f-subject", meta.subject],
    ["f-stream", meta.stream || streamForSubject(meta.subject)],
    ["f-type", meta.type],
    ["f-medium", meta.medium],
    ["f-year", meta.year],
    ["f-examtype", meta.examType],
    ["f-paperpart", meta.paperPart]
  ];
  fields.forEach(([id, value]) => {
    if (setAutoField(id, value)) changed.push(labelForField(id));
  });

  if (!fieldValue("f-tags") && meta.tags?.length) {
    setAutoField("f-tags", meta.tags.join(", "));
    changed.push("tags");
  }

  if (meta.externalUrl) {
    const urlField = document.getElementById("f-externalurl");
    if (urlField && (!urlField.value || !autoFilledFields.has("f-externalurl"))) {
      urlField.value = meta.externalUrl;
    }
  }

  if (announce) {
    setDriveNote(changed.length ? `Prefilled ${changed.join(", ")}. Manual edits are kept.` : "No empty fields needed changing. Your manual values were kept.");
  }
}

function labelForField(id) {
  return ({
    "f-title": "title",
    "f-subject": "subject",
    "f-stream": "stream",
    "f-type": "type",
    "f-medium": "medium",
    "f-year": "year",
    "f-examtype": "exam type",
    "f-paperpart": "paper part",
    "f-tags": "tags"
  })[id] || id;
}

function setDriveNote(message) {
  const note = document.getElementById("drive-prefill-note");
  if (!note) return;
  note.textContent = message;
  note.classList.remove("hidden");
}

function streamForSubject(subject) {
  const map = {
    "Combined Maths": "Physical Science",
    "Physics": "Physical Science",
    "Chemistry": "Physical Science",
    "Biology": "Bio Science",
    "Accounting": "Commerce",
    "Business Studies": "Commerce",
    "Economics": "Commerce",
    "ICT": "Technology",
    "Engineering Technology": "Technology",
    "Science for Technology": "Technology",
    "Bio Systems Technology": "Technology",
    "General English": "Common Resources",
    "General Knowledge": "Common Resources"
  };
  return map[subject] || "";
}

/** Edit an existing resource - prefill form */
window.editResource = async function (docId) {
  isEditing = true;
  showSection("upload");

  document.getElementById("upload-section-title").textContent = "Edit Resource";
  document.getElementById("upload-btn-text").textContent = "Save Changes";

  try {
    const snap = await getDoc(doc(db, "resources", docId));
    if (!snap.exists()) { showToast("Resource not found.", "error"); return; }

    const r = snap.data();
    document.getElementById("f-title").value       = r.title || "";
    document.getElementById("f-subject").value     = r.subject || "";
    document.getElementById("f-stream").value      = r.stream || "";
    document.getElementById("f-type").value        = r.type || "";
    document.getElementById("f-medium").value      = r.medium || "";
    document.getElementById("f-year").value        = r.year || "";
    document.getElementById("f-examtype").value    = r.examType || "";
    document.getElementById("f-paperpart").value   = r.paperPart || "";
    document.getElementById("f-description").value = r.description || "";
    document.getElementById("f-source").value      = r.source || "";
    document.getElementById("f-tags").value        = (r.tags || []).join(", ");
    document.getElementById("f-status").value      = r.status || "draft";
    document.getElementById("f-featured").value    = r.featured ? "true" : "false";
    document.getElementById("f-externalurl").value = r.externalUrl || "";

    document.getElementById("f-edit-id").value          = docId;
    document.getElementById("f-edit-storagepath").value = r.storagePath || "";
    document.getElementById("f-edit-fileurl").value     = r.fileUrl || "";

    if (r.fileName) {
      document.getElementById("file-drop-label").innerHTML = `Current: <strong>${esc(r.fileName)}</strong>`;
      document.getElementById("file-drop-hint").textContent = r.fileSizeLabel || "";
    }
  } catch (err) {
    showToast("Failed to load resource: " + err.message, "error");
  }
};

/** Cancel edit / reset form */
window.cancelEdit = function () {
  resetUploadForm();
  showSection("resources");
};

function resetUploadForm() {
  document.getElementById("upload-form").reset();
  document.getElementById("f-edit-id").value = "";
  document.getElementById("f-edit-storagepath").value = "";
  document.getElementById("f-edit-fileurl").value = "";
  document.getElementById("upload-section-title").textContent = "Upload Resource";
  document.getElementById("upload-btn-text").textContent = "Upload & Save Resource";
  document.getElementById("file-drop-label").innerHTML = `Drag &amp; drop or <strong>click to browse</strong>`;
  document.getElementById("file-drop-hint").textContent = "No file selected";
  document.getElementById("upload-progress-wrap").classList.add("hidden");
  document.getElementById("upload-progress-bar").style.width = "0%";
  autoFilledFields.clear();
  const note = document.getElementById("drive-prefill-note");
  if (note) note.classList.add("hidden");
  clearUploadMessages();
  isEditing = false;
}

function normalizeDriveDownloadUrl(rawUrl) {
  const url = (rawUrl || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return "";
  if (window.APHDriveHelper) return window.APHDriveHelper.normalizeDriveDownloadUrl(url);
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (fileMatch) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileMatch[1])}`;
  try {
    const parsed = new URL(url);
    if (!/drive\.google\.com$/i.test(parsed.hostname)) return url;
    const id = parsed.searchParams.get("id");
    if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  } catch (_) {
    return url;
  }
  return url;
}

function setUploadLoading(on) {
  const btn  = document.getElementById("upload-submit-btn");
  const text = document.getElementById("upload-btn-text");
  const spin = document.getElementById("upload-btn-loader");
  btn.disabled = on;
  if (on) { text.classList.add("hidden"); spin.classList.remove("hidden"); }
  else    { text.classList.remove("hidden"); spin.classList.add("hidden"); }
}

function showUploadError(msg) {
  const el = document.getElementById("upload-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}
function showUploadSuccess(msg) {
  const el = document.getElementById("upload-success");
  el.textContent = msg;
  el.classList.remove("hidden");
}
function clearUploadMessages() {
  document.getElementById("upload-error").classList.add("hidden");
  document.getElementById("upload-success").classList.add("hidden");
}

/* =======================================================
   MANAGE RESOURCES TABLE
======================================================= */

async function loadResources() {
  const wrap = document.getElementById("resources-table-wrap");
  wrap.innerHTML = `<div class="empty-state">Loading resources...</div>`;
  try {
    const snap = await getDocs(query(collection(db, "resources"), orderBy("createdAt", "desc")));
    allResources = [];
    snap.forEach(d => allResources.push({ id: d.id, ...d.data() }));
    renderResourcesTable(allResources);
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state">Failed to load: ${err.message}</div>`;
  }
}

window.filterResources = function () {
  const search  = document.getElementById("res-search").value.toLowerCase();
  const subject = document.getElementById("res-filter-subject").value;
  const type    = document.getElementById("res-filter-type").value;
  const status  = document.getElementById("res-filter-status").value;
  const sort    = document.getElementById("res-filter-sort").value;

  let filtered = allResources.filter(r => {
    if (search  && !r.title.toLowerCase().includes(search))  return false;
    if (subject && r.subject !== subject) return false;
    if (type    && r.type    !== type)    return false;
    if (status  && r.status  !== status)  return false;
    return true;
  });

  if (sort === "oldest") filtered.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0));
  else if (sort === "title") filtered.sort((a,b) => a.title.localeCompare(b.title));

  currentPage = 1;
  renderResourcesTable(filtered);
};

function renderResourcesTable(rows) {
  const wrap = document.getElementById("resources-table-wrap");
  const pager = document.getElementById("res-pagination");

  if (!rows.length) {
    wrap.innerHTML = `<div class="empty-state">No resources found.</div>`;
    pager.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows   = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  let html = `<div style="overflow-x:auto"><table class="resource-table">
    <thead><tr>
      <th>Title</th><th>Subject</th><th>Type</th><th>Year</th>
      <th>Medium</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>`;

  pageRows.forEach(r => {
    const statusBadge = r.status === "published"
      ? `<span class="status-badge status-published">Published</span>`
      : `<span class="status-badge status-draft">Draft</span>`;
    const savedUrl = r.fileUrl || r.externalUrl || "";

    html += `<tr>
      <td class="rt-title">
        <span class="rt-title-text" title="${esc(r.title)}">${esc(r.title)}</span>
        ${r.featured ? `<span class="type-badge" style="margin-top:4px;display:inline-block">* Featured</span>` : ""}
      </td>
      <td class="rt-subject">${esc(r.subject||"-")}</td>
      <td><span class="type-badge">${esc(r.type||"-")}</span></td>
      <td>${esc(r.year||"-")}</td>
      <td>${esc(r.medium||"-")}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="rt-actions">
          <button class="btn-icon btn-sm" onclick="editResource('${r.id}')">Edit</button>
          ${savedUrl ? `<button class="btn-icon btn-sm" onclick="copyUrl('${esc(savedUrl)}')">URL</button>` : ""}
          <button class="btn-icon btn-sm" onclick="togglePublish('${r.id}','${r.status}')">${r.status==="published"?"Unpublish":"Publish"}</button>
          <button class="btn-icon btn-sm danger" onclick="confirmDeleteResource('${r.id}','${esc(r.title)}','${r.storagePath||""}')">Delete</button>
        </div>
      </td>
    </tr>`;
  });

  html += "</tbody></table></div>";
  wrap.innerHTML = html;

  // Pagination
  if (totalPages <= 1) { pager.innerHTML = ""; return; }
  let pgHtml = "";
  for (let i = 1; i <= totalPages; i++) {
    pgHtml += `<button class="${i === currentPage ? "active" : ""}" onclick="goPage(${i})">${i}</button>`;
  }
  pager.innerHTML = pgHtml;
}

window.goPage = function (n) {
  currentPage = n;
  // Re-run filter to re-render at new page
  filterResources();
};

window.copyUrl = function (url) {
  navigator.clipboard.writeText(url).then(() => showToast("URL copied!", "info")).catch(() => showToast("Copy failed.", "error"));
};

window.togglePublish = async function (docId, currentStatus) {
  const newStatus = currentStatus === "published" ? "draft" : "published";
  try {
    await updateDoc(doc(db, "resources", docId), { status: newStatus, updatedAt: serverTimestamp() });
    showToast(`Resource ${newStatus === "published" ? "published" : "unpublished"}.`, "success");
    loadResources();
    loadDashboardStats();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
};

window.confirmDeleteResource = function (docId, title, storagePath) {
  showModal(
    "Delete Resource",
    `Are you sure you want to delete "${title}"? This will remove the database record and the uploaded file if it exists.`,
    async () => {
      closeModal();
      await deleteResource(docId, storagePath);
    }
  );
};

async function deleteResource(docId, storagePath) {
  try {
    await deleteDoc(doc(db, "resources", docId));
    if (storagePath) {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (_) {
        showToast("Resource deleted, but old file could not be removed from storage. Check Firebase Storage manually.", "info");
      }
    }
    showToast("Resource deleted.", "success");
    loadResources();
    loadDashboardStats();
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}

/* =======================================================
   BROKEN REPORTS
======================================================= */

async function loadBrokenReports() {
  const el = document.getElementById("reports-list");
  el.innerHTML = `<div class="empty-state">Loading...</div>`;
  try {
    const snap = await getDocs(query(collection(db, "brokenReports"), orderBy("createdAt", "desc")));
    if (snap.empty) { el.innerHTML = `<div class="empty-state">No reports submitted yet.</div>`; return; }

    let html = "";
    snap.forEach(d => {
      const r = d.data();
      const statusBadge = r.status === "open"
        ? `<span class="report-status-open">Open</span>`
        : `<span class="report-status-fixed">Fixed</span>`;
      const date = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : "-";
      html += `<div class="report-item">
        <div class="report-item-header">
          <div>
            <div class="report-item-title">${esc(r.resourceTitle || "Unknown resource")} ${statusBadge}</div>
            <div class="report-item-meta">Problem: ${esc(r.problemType||"-")} - ${date}${r.message ? " - " + esc(r.message) : ""}</div>
          </div>
          <div class="report-item-actions">
            ${r.status === "open" ? `<button class="btn-icon btn-sm" onclick="markReportFixed('${d.id}')">OK Mark Fixed</button>` : ""}
            <button class="btn-icon btn-sm danger" onclick="deleteReport('${d.id}')">Delete</button>
          </div>
        </div>
      </div>`;
    });
    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed to load: ${err.message}</div>`;
  }
}

window.markReportFixed = async function (docId) {
  try {
    await updateDoc(doc(db, "brokenReports", docId), { status: "fixed" });
    showToast("Marked as fixed.", "success");
    loadBrokenReports();
    loadDashboardStats();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
};

window.deleteReport = function (docId) {
  showModal("Delete Report", "Are you sure you want to delete this report?", async () => {
    closeModal();
    try {
      await deleteDoc(doc(db, "brokenReports", docId));
      showToast("Report deleted.", "success");
      loadBrokenReports();
      loadDashboardStats();
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    }
  });
};

/* =======================================================
   ANNOUNCEMENTS
======================================================= */

async function loadAnnouncements() {
  const el = document.getElementById("announcements-list");
  el.innerHTML = `<div class="empty-state">Loading...</div>`;
  try {
    const snap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")));
    if (snap.empty) { el.innerHTML = `<div class="empty-state">No announcements yet.</div>`; return; }

    let html = "";
    snap.forEach(d => {
      const a = d.data();
      const status = a.status === "active"
        ? `<span class="status-badge status-published">Active</span>`
        : `<span class="status-badge status-draft">Inactive</span>`;
      html += `<div class="list-item">
        <div class="list-item-info">
          <div class="list-item-title">${esc(a.title)} ${status}</div>
          <div class="list-item-meta">Type: ${esc(a.type||"info")}${a.message ? " - " + esc(a.message) : ""}</div>
        </div>
        <div class="list-item-actions">
          <button class="btn-icon btn-sm" onclick="editAnnouncement('${d.id}')">Edit</button>
          <button class="btn-icon btn-sm danger" onclick="deleteAnnouncement('${d.id}')">Delete</button>
        </div>
      </div>`;
    });
    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed: ${err.message}</div>`;
  }
}

window.openAnnouncementForm = function () {
  document.getElementById("ann-form-title").textContent = "New Announcement";
  document.getElementById("ann-edit-id").value = "";
  document.getElementById("ann-title").value = "";
  document.getElementById("ann-message").value = "";
  document.getElementById("ann-type").value = "info";
  document.getElementById("ann-status").value = "active";
  document.getElementById("announcement-form-wrap").classList.remove("hidden");
};

window.closeAnnouncementForm = function () {
  document.getElementById("announcement-form-wrap").classList.add("hidden");
};

window.editAnnouncement = async function (docId) {
  const snap = await getDoc(doc(db, "announcements", docId));
  if (!snap.exists()) return;
  const a = snap.data();
  document.getElementById("ann-form-title").textContent = "Edit Announcement";
  document.getElementById("ann-edit-id").value = docId;
  document.getElementById("ann-title").value   = a.title || "";
  document.getElementById("ann-message").value = a.message || "";
  document.getElementById("ann-type").value    = a.type || "info";
  document.getElementById("ann-status").value  = a.status || "active";
  document.getElementById("announcement-form-wrap").classList.remove("hidden");
  document.getElementById("announcement-form-wrap").scrollIntoView({ behavior: "smooth" });
};

window.saveAnnouncement = async function () {
  const title  = document.getElementById("ann-title").value.trim();
  const message= document.getElementById("ann-message").value.trim();
  const type   = document.getElementById("ann-type").value;
  const status = document.getElementById("ann-status").value;
  const editId = document.getElementById("ann-edit-id").value;

  if (!title) { showToast("Title is required.", "error"); return; }

  const payload = {
    title, message, type, status,
    updatedAt: serverTimestamp(),
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "announcements", editId), payload);
      showToast("Announcement updated.", "success");
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "announcements"), payload);
      showToast("Announcement added.", "success");
    }
    closeAnnouncementForm();
    loadAnnouncements();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
};

window.deleteAnnouncement = function (docId) {
  showModal("Delete Announcement", "Are you sure you want to delete this announcement?", async () => {
    closeModal();
    try {
      await deleteDoc(doc(db, "announcements", docId));
      showToast("Announcement deleted.", "success");
      loadAnnouncements();
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    }
  });
};

/* =======================================================
   SUBJECTS
======================================================= */

async function loadSubjects() {
  const el = document.getElementById("subjects-list");
  el.innerHTML = `<div class="empty-state">Loading...</div>`;
  try {
    const snap = await getDocs(query(collection(db, "subjects"), orderBy("order", "asc")));
    if (snap.empty) { el.innerHTML = `<div class="empty-state">No subjects added yet.</div>`; return; }

    let html = "";
    snap.forEach(d => {
      const s = d.data();
      const status = s.status === "active"
        ? `<span class="status-badge status-published">Active</span>`
        : `<span class="status-badge status-draft">Hidden</span>`;
      html += `<div class="list-item">
        <div class="list-item-info">
          <div class="list-item-title">${esc(s.name)} ${status}</div>
          <div class="list-item-meta">${esc(s.stream||"-")} - Order: ${s.order||0}${s.description ? " - " + esc(s.description) : ""}</div>
        </div>
        <div class="list-item-actions">
          <button class="btn-icon btn-sm" onclick="editSubject('${d.id}')">Edit</button>
          <button class="btn-icon btn-sm danger" onclick="deleteSubject('${d.id}')">Delete</button>
        </div>
      </div>`;
    });
    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed: ${err.message}</div>`;
  }
}

window.openSubjectForm = function () {
  document.getElementById("subj-form-title").textContent = "New Subject";
  document.getElementById("subj-edit-id").value  = "";
  document.getElementById("subj-name").value     = "";
  document.getElementById("subj-stream").value   = "";
  document.getElementById("subj-order").value    = "0";
  document.getElementById("subj-status").value   = "active";
  document.getElementById("subj-desc").value     = "";
  document.getElementById("subject-form-wrap").classList.remove("hidden");
};

window.closeSubjectForm = function () {
  document.getElementById("subject-form-wrap").classList.add("hidden");
};

window.editSubject = async function (docId) {
  const snap = await getDoc(doc(db, "subjects", docId));
  if (!snap.exists()) return;
  const s = snap.data();
  document.getElementById("subj-form-title").textContent = "Edit Subject";
  document.getElementById("subj-edit-id").value  = docId;
  document.getElementById("subj-name").value     = s.name || "";
  document.getElementById("subj-stream").value   = s.stream || "";
  document.getElementById("subj-order").value    = s.order || 0;
  document.getElementById("subj-status").value   = s.status || "active";
  document.getElementById("subj-desc").value     = s.description || "";
  document.getElementById("subject-form-wrap").classList.remove("hidden");
  document.getElementById("subject-form-wrap").scrollIntoView({ behavior: "smooth" });
};

window.saveSubject = async function () {
  const name   = document.getElementById("subj-name").value.trim();
  const stream = document.getElementById("subj-stream").value;
  const order  = parseInt(document.getElementById("subj-order").value) || 0;
  const status = document.getElementById("subj-status").value;
  const desc   = document.getElementById("subj-desc").value.trim();
  const editId = document.getElementById("subj-edit-id").value;

  if (!name) { showToast("Subject name is required.", "error"); return; }

  const payload = {
    name, stream, order, status, description: desc,
    slug: createSlug(name),
    updatedAt: serverTimestamp(),
  };

  try {
    if (editId) {
      await updateDoc(doc(db, "subjects", editId), payload);
      showToast("Subject updated.", "success");
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "subjects"), payload);
      showToast("Subject added.", "success");
    }
    closeSubjectForm();
    loadSubjects();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
};

window.deleteSubject = function (docId) {
  showModal("Delete Subject", "Are you sure you want to delete this subject?", async () => {
    closeModal();
    try {
      await deleteDoc(doc(db, "subjects", docId));
      showToast("Subject deleted.", "success");
      loadSubjects();
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    }
  });
};

/* =======================================================
   SITE SETTINGS
======================================================= */

function getDriveSyncSettings() {
  const codeSync = window.APH_DRIVE_SYNC || {};
  return {
    folder: document.getElementById("set-drive-folder")?.value.trim() || localStorage.getItem("aph.drive.folder") || codeSync.folder || "",
    apiKey: document.getElementById("set-drive-api-key")?.value.trim() || localStorage.getItem("aph.drive.apiKey") || codeSync.apiKey || "",
    interval: Number(document.getElementById("set-drive-interval")?.value || localStorage.getItem("aph.drive.interval") || 0),
    status: document.getElementById("set-drive-status")?.value || localStorage.getItem("aph.drive.status") || "published",
    medium: document.getElementById("set-drive-medium")?.value || localStorage.getItem("aph.drive.medium") || "English"
  };
}

function setDriveSyncStatus(message) {
  const el = document.getElementById("drive-sync-status");
  if (el) el.textContent = message;
}

function cacheDriveSyncSettings(settings) {
  localStorage.setItem("aph.drive.folder", settings.folder || "");
  localStorage.setItem("aph.drive.apiKey", settings.apiKey || "");
  localStorage.setItem("aph.drive.interval", String(settings.interval || 0));
  localStorage.setItem("aph.drive.status", settings.status || "published");
  localStorage.setItem("aph.drive.medium", settings.medium || "English");
}

function setupDriveAutoSync() {
  if (driveSyncTimer) clearInterval(driveSyncTimer);
  driveSyncTimer = null;
  const settings = getDriveSyncSettings();
  if (!settings.folder || !settings.interval) return;
  driveSyncTimer = setInterval(() => {
    syncDriveFolder({ quiet: true });
  }, settings.interval * 60 * 1000);
  setDriveSyncStatus(`Auto sync is on. Checks run every ${settings.interval} minutes while admin is open.`);
}

async function existingDriveKeys() {
  const keys = new Set();
  const snap = await getDocs(collection(db, "resources"));
  snap.forEach((item) => {
    const row = item.data();
    [row.driveId, row.externalUrl, row.fileName, row.title].filter(Boolean).forEach((value) => keys.add(String(value).toLowerCase()));
  });
  return keys;
}

function driveResourcePayload(row, settings) {
  const subject = row.subject || "Other";
  const type = row.type || "Other";
  const medium = row.medium || settings.medium || "English";
  const stream = row.stream || streamForSubject(subject) || "Common Resources";
  const externalUrl = row.externalUrl || "";
  return {
    title: row.title || row.fileName || "Untitled Resource",
    subject,
    stream,
    type,
    medium,
    year: row.year || "",
    examType: row.examType || "",
    paperPart: row.paperPart || "",
    description: "",
    source: row.category ? `Google Drive Auto Sync - ${row.category}` : "Google Drive Auto Sync",
    category: row.category || "",
    folderPath: row.folderPath || "",
    tags: row.tags || [row.category, subject, type, medium, row.year, row.paperPart].filter(Boolean),
    status: settings.status || "published",
    featured: false,
    externalUrl,
    fileUrl: "",
    storagePath: "",
    driveId: row.driveId || "",
    driveModifiedTime: row.modifiedTime || "",
    fileName: row.fileName || "",
    fileSize: 0,
    fileSizeLabel: externalUrl ? "Drive Link" : "Needs link",
    fileType: "PDF",
    slug: createSlug(row.title || row.fileName || "resource"),
    downloadCount: 0,
    viewCount: 0,
    reportCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: auth.currentUser?.email || "admin",
    updatedBy: auth.currentUser?.email || "admin",
  };
}

async function syncDriveFolder(options = {}) {
  const settings = getDriveSyncSettings();
  if (!settings.folder) {
    if (!options.quiet) showToast("Add a Google Drive folder link in settings first.", "info");
    return;
  }
  setDriveSyncStatus("Checking Google Drive folder...");
  try {
    const analysis = await window.APHDriveHelper.analyzeFolder(settings.folder, { apiKey: settings.apiKey });
    const files = analysis.files || [];
    const keys = await existingDriveKeys();
    const fresh = files.filter((row) => {
      const values = [row.driveId, row.externalUrl, row.fileName, row.title].filter(Boolean).map((value) => String(value).toLowerCase());
      return values.length && !values.some((value) => keys.has(value));
    });
    await Promise.all(fresh.map((row) => addDoc(collection(db, "resources"), driveResourcePayload(row, settings))));
    const warning = analysis.warning ? ` ${analysis.warning}` : "";
    setDriveSyncStatus(`Drive sync complete. ${fresh.length} new file(s), ${files.length - fresh.length} already existed.${warning}`);
    if (!options.quiet) showToast(`Drive sync added ${fresh.length} new file(s).`, "success");
    if (fresh.length) {
      loadDashboardStats();
      loadRecentResources();
      if (currentSection === "resources") loadResources();
    }
  } catch (err) {
    setDriveSyncStatus("Drive sync failed: " + err.message);
    if (!options.quiet) showToast("Drive sync failed: " + err.message, "error");
  }
}

window.syncDriveFolderNow = function () {
  syncDriveFolder();
};

async function loadSiteSettings() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "main"));
    const s = snap.exists() ? snap.data() : {};
    document.getElementById("set-name").value        = s.siteName || "";
    document.getElementById("set-tagline").value     = s.tagline || "";
    document.getElementById("set-email").value       = s.contactEmail || "";
    document.getElementById("set-telegram").value    = s.telegram || "";
    document.getElementById("set-facebook").value    = s.facebook || "";
    document.getElementById("set-whatsapp").value    = s.whatsapp || "";
    document.getElementById("set-seo-title").value   = s.seoTitle || "";
    document.getElementById("set-seo-desc").value    = s.seoDescription || "";
    document.getElementById("set-exam-title").value  = s.examTitle || "";
    document.getElementById("set-exam-subtitle").value = s.examSubtitle || "";
    document.getElementById("set-exam-date").value   = toDateTimeLocalValue(s.examDate || "");
    document.getElementById("set-notice").value      = s.homepageNotice || "";
    document.getElementById("set-maintenance").value = s.maintenanceMode ? "true" : "false";
    const driveSync = s.driveSync || {};
    document.getElementById("set-drive-folder").value = driveSync.folder || localStorage.getItem("aph.drive.folder") || (window.APH_DRIVE_SYNC?.folder || "");
    document.getElementById("set-drive-api-key").value = localStorage.getItem("aph.drive.apiKey") || (window.APH_DRIVE_SYNC?.apiKey || "");
    document.getElementById("set-drive-interval").value = String(driveSync.interval || localStorage.getItem("aph.drive.interval") || "0");
    document.getElementById("set-drive-status").value = driveSync.status || localStorage.getItem("aph.drive.status") || "published";
    document.getElementById("set-drive-medium").value = driveSync.medium || localStorage.getItem("aph.drive.medium") || "English";
    cacheDriveSyncSettings(getDriveSyncSettings());
    setupDriveAutoSync();
  } catch (err) {
    console.error("Settings load failed:", err);
  }
}

window.saveSiteSettings = async function () {
  const payload = {
    siteName:        document.getElementById("set-name").value.trim(),
    tagline:         document.getElementById("set-tagline").value.trim(),
    contactEmail:    document.getElementById("set-email").value.trim(),
    telegram:        document.getElementById("set-telegram").value.trim(),
    facebook:        document.getElementById("set-facebook").value.trim(),
    whatsapp:        document.getElementById("set-whatsapp").value.trim(),
    seoTitle:        document.getElementById("set-seo-title").value.trim(),
    seoDescription:  document.getElementById("set-seo-desc").value.trim(),
    examTitle:       document.getElementById("set-exam-title").value.trim(),
    examSubtitle:    document.getElementById("set-exam-subtitle").value.trim(),
    examDate:        document.getElementById("set-exam-date").value,
    homepageNotice:  document.getElementById("set-notice").value.trim(),
    maintenanceMode: document.getElementById("set-maintenance").value === "true",
    driveSync:       { ...getDriveSyncSettings(), apiKey: "" },
    updatedAt: serverTimestamp(),
  };
  cacheDriveSyncSettings(getDriveSyncSettings());

  try {
    const ref2 = doc(db, "siteSettings", "main");
    await setDoc(ref2, payload, { merge: true });
    showToast("Settings saved.", "success");
    setupDriveAutoSync();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
  }
};

function toDateTimeLocalValue(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/* =======================================================
   MODAL
======================================================= */

function showModal(title, message, onConfirm) {
  document.getElementById("modal-title").textContent   = title;
  document.getElementById("modal-message").textContent = message;
  document.getElementById("modal-confirm-btn").onclick = onConfirm;
  document.getElementById("confirm-modal").classList.remove("hidden");
}

window.closeModal = function () {
  document.getElementById("confirm-modal").classList.add("hidden");
};

// Close modal on overlay click
document.getElementById("confirm-modal").addEventListener("click", function (e) {
  if (e.target === this) window.closeModal();
});

/* =======================================================
   TOAST
======================================================= */

window.showToast = function (message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

/* =======================================================
   HELPERS
======================================================= */

function createSlug(str) {
  return (str || "").toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatFileSize(bytes) {
  if (!bytes) return "-";
  if (bytes < 1024)        return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function detectFileType(file) {
  const t = file.type;
  if (t === "application/pdf") return "PDF";
  if (t.includes("word"))      return "DOCX";
  if (t.startsWith("image/"))  return "Image";
  if (t.includes("zip"))       return "ZIP";
  return "Other";
}

function fileIcon(type) {
  const m = { PDF: "PDF", DOCX: "DOC", Image: "IMG", ZIP: "ZIP", Book: "Book", "External Link": "Link" };
  return m[type] || "File";
}

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

["f-title", "f-subject", "f-stream", "f-type", "f-medium", "f-year", "f-examtype", "f-paperpart", "f-tags"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", () => {
    if (autoFilledFields.get(id) !== el.value) autoFilledFields.delete(id);
  });
  el.addEventListener("change", () => {
    if (autoFilledFields.get(id) !== el.value) autoFilledFields.delete(id);
  });
});

const driveInput = document.getElementById("f-externalurl");
if (driveInput) {
  driveInput.addEventListener("blur", () => window.prefillFromDriveInput());
}

/* -- Drag-over highlight on file drop zone ----------- */
const dropZone = document.getElementById("file-drop-zone");
if (dropZone) {
  dropZone.addEventListener("dragover",  e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop",      e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const input = document.getElementById("f-file");
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      window.handleFileSelect(input);
    }
  });
}
