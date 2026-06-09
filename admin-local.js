(function () {
  const store = window.APHStore;
  const esc = store.esc;
  let currentSection = "dashboard";
  let modalConfirmFn = null;

  function $(id) {
    return document.getElementById(id);
  }

  function value(id) {
    const el = $(id);
    return el ? el.value.trim() : "";
  }

  function setValue(id, val) {
    const el = $(id);
    if (el) el.value = val ?? "";
  }

  function show(el) {
    if (el) el.classList.remove("hidden");
  }

  function hide(el) {
    if (el) el.classList.add("hidden");
  }

  function fmtDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
  }

  function allResources() {
    return store.getResources().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }

  function init() {
    hide($("auth-loading"));
    hide($("login-page"));
    show($("admin-panel"));
    if ($("topbar-email")) $("topbar-email").textContent = "Local admin";
    showSection("dashboard");
  }

  window.loginAdmin = function () {
    init();
  };

  window.logoutAdmin = function () {
    alert("Local admin mode is active. To protect this page, configure Firebase Auth before publishing a private admin.");
  };

  window.showSection = function (name) {
    currentSection = name;
    document.querySelectorAll(".section-content").forEach((section) => hide(section));
    document.querySelectorAll(".nav-item").forEach((button) => button.classList.remove("active"));
    show($("section-" + name));
    const nav = document.querySelector(`.nav-item[data-section="${name}"]`);
    if (nav) nav.classList.add("active");
    if (name === "dashboard") renderDashboard();
    if (name === "resources") renderResources();
    if (name === "reports") renderReports();
    if (name === "announcements") renderAnnouncements();
    if (name === "subjects") renderSubjects();
    if (name === "settings") loadSiteSettings();
    if (window.innerWidth <= 900) closeSidebar();
  };

  window.toggleSidebar = function () {
    const sidebar = $("admin-sidebar");
    const overlay = $("sidebar-overlay");
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle("open");
    overlay.classList.toggle("hidden", !sidebar.classList.contains("open"));
  };

  function closeSidebar() {
    const sidebar = $("admin-sidebar");
    const overlay = $("sidebar-overlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.add("hidden");
  }

  window.handleFileSelect = function (input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const nameEl = $("file-name");
    const sizeEl = $("file-size");
    if (nameEl) nameEl.textContent = file.name;
    if (sizeEl) sizeEl.textContent = `${Math.round(file.size / 1024)} KB selected. Add a public file URL before saving.`;
  };

  function collectResource() {
    const file = $("f-file") && $("f-file").files && $("f-file").files[0];
    const editId = value("f-edit-id");
    const existing = editId ? store.getResources().find((row) => row.id === editId) : {};
    const externalUrl = normalizeDriveDownloadUrl(value("f-externalurl"));
    return {
      ...existing,
      id: editId || undefined,
      title: value("f-title"),
      subject: value("f-subject"),
      stream: value("f-stream"),
      type: value("f-type"),
      medium: value("f-medium"),
      year: value("f-year"),
      examType: value("f-examtype"),
      paperPart: value("f-paperpart"),
      description: value("f-description"),
      source: value("f-source"),
      tags: value("f-tags").split(",").map((tag) => tag.trim()).filter(Boolean),
      externalUrl,
      fileUrl: externalUrl || value("f-edit-fileurl"),
      fileType: file ? file.name.split(".").pop().toUpperCase() : (existing.fileType || "PDF"),
      fileSizeLabel: file ? `${Math.round(file.size / 1024)} KB` : (existing.fileSizeLabel || "Link"),
      status: value("f-status") || "draft",
      featured: value("f-featured") || "no",
      downloadCount: Number(existing.downloadCount || 0)
    };
  }

  window.handleSubmitResource = function () {
    const data = collectResource();
    if (!data.title || !data.subject || !data.stream || !data.type || !data.medium) {
      return showUploadError("Please fill title, subject, stream, type and medium.");
    }
    if (!data.fileUrl) {
      return showUploadError("Add a public PDF/link in External Link. Static GitHub Pages cannot upload files by itself.");
    }
    store.saveResource(data);
    showUploadSuccess(data.id ? "Resource saved." : "Resource added.");
    resetUploadForm();
    showSection("resources");
  };

  window.editResource = function (id) {
    const row = store.getResources().find((item) => item.id === id);
    if (!row) return;
    setValue("f-edit-id", row.id);
    setValue("f-edit-fileurl", row.fileUrl || "");
    setValue("f-title", row.title);
    setValue("f-subject", row.subject);
    setValue("f-stream", row.stream);
    setValue("f-type", row.type);
    setValue("f-medium", row.medium);
    setValue("f-year", row.year);
    setValue("f-examtype", row.examType);
    setValue("f-paperpart", row.paperPart);
    setValue("f-description", row.description);
    setValue("f-source", row.source);
    setValue("f-tags", (row.tags || []).join(", "));
    setValue("f-externalurl", row.externalUrl || row.fileUrl || "");
    setValue("f-status", row.status || "draft");
    setValue("f-featured", row.featured || "no");
    if ($("upload-section-title")) $("upload-section-title").textContent = "Edit Resource";
    showSection("upload");
  };

  window.cancelEdit = function () {
    resetUploadForm();
    showSection("resources");
  };

  function resetUploadForm() {
    const form = $("upload-form");
    if (form) form.reset();
    ["f-edit-id", "f-edit-storagepath", "f-edit-fileurl"].forEach((id) => setValue(id, ""));
    if ($("upload-section-title")) $("upload-section-title").textContent = "Upload Resource";
    clearUploadMessages();
  }

  function showUploadError(message) {
    const el = $("upload-error");
    if (el) {
      el.textContent = message;
      show(el);
    } else alert(message);
  }

  function showUploadSuccess(message) {
    const el = $("upload-success");
    if (el) {
      el.textContent = message;
      show(el);
    } else showToast(message, "success");
  }

  function clearUploadMessages() {
    hide($("upload-error"));
    hide($("upload-success"));
  }

  function renderDashboard() {
    const rows = allResources();
    const reports = store.getReports().filter((row) => row.status === "open");
    setText("stat-total", rows.length);
    setText("stat-published", rows.filter((row) => row.status === "published").length);
    setText("stat-drafts", rows.filter((row) => row.status !== "published").length);
    setText("stat-papers", rows.filter((row) => row.type === "Past Paper").length);
    setText("stat-books", rows.filter((row) => ["Book", "Syllabus"].includes(row.type)).length);
    setText("stat-reports", reports.length);
    setText("nav-badge-resources", rows.length);
    setText("nav-badge-reports", reports.length);
    const recent = $("dashboard-recent-list");
    if (recent) {
      recent.innerHTML = rows.slice(0, 6).map((row) => `<div class="recent-item">
        <div class="recent-item-icon">PDF</div>
        <div class="recent-item-info"><div class="recent-item-title">${esc(row.title)}</div><div class="recent-item-meta">${esc(row.subject)} - ${esc(row.status)}</div></div>
      </div>`).join("") || `<div class="empty-state">No resources yet. Start by clicking <strong>Upload Resource</strong>.</div>`;
    }
  }

  window.filterResources = renderResources;
  window.goPage = function () {};

  function renderResources() {
    const q = value("res-search").toLowerCase();
    const subject = value("res-filter-subject");
    const type = value("res-filter-type");
    const status = value("res-filter-status");
    const sort = value("res-filter-sort") || "newest";
    let rows = allResources().filter((row) => {
      const haystack = [row.title, row.subject, row.type, row.medium, row.year, row.source].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) && (!subject || row.subject === subject) && (!type || row.type === type) && (!status || row.status === status);
    });
    if (sort === "oldest") rows.reverse();
    if (sort === "title") rows.sort((a, b) => a.title.localeCompare(b.title));
    const wrap = $("resources-table-wrap");
    if (!wrap) return;
    wrap.innerHTML = rows.length ? `<div class="table-wrap"><table class="admin-table">
      <thead><tr><th>Title</th><th>Subject</th><th>Type</th><th>Medium</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${rows.map((row) => `<tr>
        <td><strong>${esc(row.title)}</strong><div class="muted">${esc(row.year || "")} ${esc(row.source || "")}</div></td>
        <td>${esc(row.subject)}</td>
        <td>${esc(row.type)}</td>
        <td>${esc(row.medium)}</td>
        <td><span class="status-pill status-${esc(row.status)}">${esc(row.status)}</span></td>
        <td>
          <button class="btn-icon btn-sm" onclick="editResource('${esc(row.id)}')">Edit</button>
          <button class="btn-icon btn-sm" onclick="togglePublish('${esc(row.id)}','${esc(row.status)}')">${row.status === "published" ? "Draft" : "Publish"}</button>
          <button class="btn-icon btn-sm" onclick="copyUrl('${esc(row.fileUrl || row.externalUrl || "")}')">Copy</button>
          <button class="btn-icon btn-sm danger" onclick="confirmDeleteResource('${esc(row.id)}','${esc(row.title)}')">Delete</button>
        </td>
      </tr>`).join("")}</tbody>
    </table></div>` : `<div class="empty-state">No resources found.</div>`;
  }

  window.copyUrl = function (url) {
    if (!url) return showToast("No URL saved for this resource.", "warning");
    navigator.clipboard?.writeText(url);
    showToast("URL copied.", "success");
  };

  window.togglePublish = function (id, status) {
    const row = store.getResources().find((item) => item.id === id);
    if (!row) return;
    row.status = status === "published" ? "draft" : "published";
    store.saveResource(row);
    renderResources();
    renderDashboard();
  };

  window.confirmDeleteResource = function (id, title) {
    showModal("Delete resource", `Delete "${title}"?`, () => {
      store.deleteResource(id);
      renderResources();
      renderDashboard();
      showToast("Resource deleted.", "success");
    });
  };

  function renderReports() {
    const rows = store.getReports();
    const el = $("reports-list");
    if (!el) return;
    el.innerHTML = rows.length ? rows.map((row) => `<div class="report-item">
      <div><strong>${esc(row.resourceTitle || "Resource")}</strong><div class="muted">${esc(row.problemType)} - ${fmtDate(row.createdAt)}</div><p>${esc(row.message || "")}</p></div>
      <div><button class="btn-primary-sm" onclick="markReportFixed('${esc(row.id)}')">Mark Fixed</button> <button class="btn-danger-sm" onclick="deleteReport('${esc(row.id)}')">Delete</button></div>
    </div>`).join("") : `<div class="empty-state">No reports yet.</div>`;
  }

  window.markReportFixed = function (id) {
    const row = store.getReports().find((item) => item.id === id);
    if (row) store.saveReport({ ...row, status: "fixed" });
    renderReports();
    renderDashboard();
  };

  window.deleteReport = function (id) {
    store.deleteReport(id);
    renderReports();
    renderDashboard();
  };

  window.openAnnouncementForm = function () {
    setValue("ann-edit-id", "");
    setValue("ann-title", "");
    setValue("ann-message", "");
    setValue("ann-type", "info");
    setValue("ann-status", "active");
    show($("announcement-form-wrap"));
  };

  window.closeAnnouncementForm = function () {
    hide($("announcement-form-wrap"));
  };

  window.editAnnouncement = function (id) {
    const row = store.getAnnouncements().find((item) => item.id === id);
    if (!row) return;
    setValue("ann-edit-id", row.id);
    setValue("ann-title", row.title);
    setValue("ann-message", row.message);
    setValue("ann-type", row.type || "info");
    setValue("ann-status", row.status || "active");
    show($("announcement-form-wrap"));
  };

  window.saveAnnouncement = function () {
    if (!value("ann-title")) return showToast("Announcement title is required.", "warning");
    store.saveAnnouncement({ id: value("ann-edit-id") || undefined, title: value("ann-title"), message: value("ann-message"), type: value("ann-type"), status: value("ann-status") });
    closeAnnouncementForm();
    renderAnnouncements();
  };

  window.deleteAnnouncement = function (id) {
    store.deleteAnnouncement(id);
    renderAnnouncements();
  };

  function renderAnnouncements() {
    const rows = store.getAnnouncements();
    const el = $("announcements-list");
    if (!el) return;
    el.innerHTML = rows.length ? rows.map((row) => `<div class="recent-item">
      <div class="recent-item-info"><div class="recent-item-title">${esc(row.title)}</div><div class="recent-item-meta">${esc(row.status)} - ${esc(row.type || "info")}</div><p>${esc(row.message || "")}</p></div>
      <button class="btn-icon btn-sm" onclick="editAnnouncement('${esc(row.id)}')">Edit</button>
      <button class="btn-icon btn-sm danger" onclick="deleteAnnouncement('${esc(row.id)}')">Delete</button>
    </div>`).join("") : `<div class="empty-state">No announcements.</div>`;
  }

  window.openSubjectForm = function () {
    setValue("subj-edit-id", "");
    setValue("subj-name", "");
    setValue("subj-stream", "");
    setValue("subj-order", "0");
    setValue("subj-status", "active");
    setValue("subj-desc", "");
    show($("subject-form-wrap"));
  };

  window.closeSubjectForm = function () {
    hide($("subject-form-wrap"));
  };

  window.editSubject = function (id) {
    const row = store.getSubjects().find((item) => item.id === id);
    if (!row) return;
    setValue("subj-edit-id", row.id);
    setValue("subj-name", row.name);
    setValue("subj-stream", row.stream);
    setValue("subj-order", row.order || 0);
    setValue("subj-status", row.status || "active");
    setValue("subj-desc", row.desc);
    show($("subject-form-wrap"));
  };

  window.saveSubject = function () {
    if (!value("subj-name")) return showToast("Subject name is required.", "warning");
    store.saveSubject({ id: value("subj-edit-id") || undefined, name: value("subj-name"), stream: value("subj-stream"), order: Number(value("subj-order") || 0), status: value("subj-status"), desc: value("subj-desc") });
    closeSubjectForm();
    renderSubjects();
  };

  window.deleteSubject = function (id) {
    store.deleteSubject(id);
    renderSubjects();
  };

  function renderSubjects() {
    const rows = store.getSubjects().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    const el = $("subjects-list");
    if (!el) return;
    el.innerHTML = rows.length ? rows.map((row) => `<div class="recent-item">
      <div class="recent-item-info"><div class="recent-item-title">${esc(row.name)}</div><div class="recent-item-meta">${esc(row.stream || "A/L")} - ${esc(row.status)}</div><p>${esc(row.desc || "")}</p></div>
      <button class="btn-icon btn-sm" onclick="editSubject('${esc(row.id)}')">Edit</button>
      <button class="btn-icon btn-sm danger" onclick="deleteSubject('${esc(row.id)}')">Delete</button>
    </div>`).join("") : `<div class="empty-state">No subjects.</div>`;
  }

  window.loadSiteSettings = function () {
    const s = store.getSettings();
    setValue("set-name", s.name);
    setValue("set-tagline", s.tagline);
    setValue("set-email", s.email);
    setValue("set-telegram", s.telegram);
    setValue("set-facebook", s.facebook);
    setValue("set-whatsapp", s.whatsapp);
    setValue("set-seo-title", s.seoTitle);
    setValue("set-seo-desc", s.seoDesc);
    setValue("set-exam-title", s.examTitle);
    setValue("set-exam-subtitle", s.examSubtitle);
    setValue("set-exam-date", toDateTimeLocalValue(s.examDate));
    setValue("set-notice", s.notice);
    setValue("set-maintenance", s.maintenance || "false");
  };

  window.saveSiteSettings = function () {
    store.saveSettings({
      name: value("set-name") || "A/L Paper Hub",
      tagline: value("set-tagline"),
      email: value("set-email"),
      telegram: value("set-telegram"),
      facebook: value("set-facebook"),
      whatsapp: value("set-whatsapp"),
      seoTitle: value("set-seo-title"),
      seoDesc: value("set-seo-desc"),
      examTitle: value("set-exam-title"),
      examSubtitle: value("set-exam-subtitle"),
      examDate: value("set-exam-date"),
      notice: value("set-notice"),
      maintenance: value("set-maintenance")
    });
    const msg = $("settings-msg");
    if (msg) {
      msg.textContent = "Settings saved. Open the public site to see changes.";
      msg.className = "";
      msg.style.color = "var(--admin-success)";
    }
    showToast("Settings saved.", "success");
  };

  function showModal(title, message, onConfirm) {
    modalConfirmFn = onConfirm;
    setText("modal-title", title);
    setText("modal-message", message);
    const btn = $("modal-confirm-btn");
    if (btn) btn.onclick = function () {
      if (modalConfirmFn) modalConfirmFn();
      closeModal();
    };
    show($("confirm-modal"));
  }

  window.closeModal = function () {
    hide($("confirm-modal"));
    modalConfirmFn = null;
  };

  window.showToast = function (message, type = "info") {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    show(toast);
    setTimeout(() => hide(toast), 2600);
  };

  function showToast(message, type) {
    window.showToast(message, type);
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function normalizeDriveDownloadUrl(rawUrl) {
    const url = (rawUrl || "").trim();
    if (!url) return "";
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

  function toDateTimeLocalValue(value) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  window.addEventListener("tdr-store-change", () => {
    if (currentSection === "dashboard") renderDashboard();
    if (currentSection === "resources") renderResources();
    if (currentSection === "reports") renderReports();
    if (currentSection === "announcements") renderAnnouncements();
    if (currentSection === "subjects") renderSubjects();
  });

  document.addEventListener("DOMContentLoaded", init);
})();
