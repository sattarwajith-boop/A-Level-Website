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
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

(function () {
  const store = window.APHStore;
  const esc = store.esc;
  const app = initializeApp(firebaseConfig, "public-app");
  const db = getFirestore(app);

  const streams = ["All Streams", "Physical Science", "Bio Science", "Commerce", "Arts", "Technology", "Common Resources"];
  const types = ["All Types", "Past Paper", "Marking Scheme", "FWC Paper", "Mora Paper", "Elaboration", "Model Paper", "Term Test Paper", "School Paper", "Book", "Syllabus", "Short Note"];
  const mediums = ["All Mediums", "Tamil", "Sinhala", "English", "Bilingual"];
  const fallbackExamDate = "2026-11-10T00:00:00+05:30";
  const fallbackExamTitle = "G.C.E. Advanced Level Examination";
  const fallbackExamSubtitle = "Start revision today. Download subject papers by year, medium and type.";

  function normalizeSettings(settings = {}) {
    return {
      ...settings,
      name: settings.name || settings.siteName || "A/L Paper Hub",
      tagline: settings.tagline || "Sri Lankan A/L resources arranged by stream, subject, year and medium.",
      seoTitle: settings.seoTitle || `${settings.name || settings.siteName || "A/L Paper Hub"} - A/L Resources`,
      seoDesc: settings.seoDesc || settings.seoDescription || "",
      notice: settings.notice || settings.homepageNotice || "",
      maintenance: String(settings.maintenance ?? settings.maintenanceMode ?? "false"),
      examTitle: settings.examTitle || fallbackExamTitle,
      examSubtitle: settings.examSubtitle || fallbackExamSubtitle,
      examDate: settings.examDate || fallbackExamDate
    };
  }

  let state = {
    q: "",
    stream: "",
    subject: "",
    type: "",
    medium: "",
    year: "",
    loading: true,
    navOpen: false,
    modal: null,
    savedIds: readIdSet("aph.saved"),
    doneIds: readIdSet("aph.done"),
    resources: store.getResources().filter((row) => row.status === "published"),
    settings: normalizeSettings(store.getSettings()),
    subjects: store.getSubjects()
  };

  let searchTimer = 0;

  const pomodoro = {
    mode: "focus",
    focusSeconds: 25 * 60,
    breakSeconds: 5 * 60,
    remaining: 25 * 60,
    running: false,
    lastTick: 0
  };

  function badge(type, label) {
    return `<span class="badge badge-${type}">${esc(label)}</span>`;
  }

  function readIdSet(key) {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch (_) {
      return new Set();
    }
  }

  function writeIdSet(key, set) {
    localStorage.setItem(key, JSON.stringify([...set]));
  }

  function isSaved(id) {
    return state.savedIds.has(id);
  }

  function isDone(id) {
    return state.doneIds.has(id);
  }

  function urlFor(row) {
    return normalizeDriveDownloadUrl(row.fileUrl || row.externalUrl || "");
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

  function openableUrl(rawUrl) {
    const url = String(rawUrl || "").trim();
    if (!url) return "";
    try {
      const parsed = new URL(url);
      if (/drive\.google\.com$/i.test(parsed.hostname)) {
        const id = parsed.searchParams.get("id");
        if (id) return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
      }
    } catch (_) {}
    return url;
  }

  function driveFileIdFromUrl(rawUrl) {
    const url = String(rawUrl || "").trim();
    if (!url) return "";
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    if (fileMatch) return fileMatch[1];
    try {
      const parsed = new URL(url);
      if (/drive\.google\.com$/i.test(parsed.hostname)) return parsed.searchParams.get("id") || "";
    } catch (_) {}
    return "";
  }

  function resourceIcon(row) {
    return resourceEmoji(row.type);
  }

  function resourceEmoji(type = "") {
    const value = String(type).toLowerCase();
    if (value.includes("marking")) return "✅";
    if (value.includes("model")) return "📝";
    if (value.includes("book")) return "📘";
    if (value.includes("syllabus")) return "📋";
    if (value.includes("short")) return "⚡";
    if (value.includes("term")) return "🏫";
    if (value.includes("school")) return "🏛️";
    return "📄";
  }

  function subjectEmoji(subject = "") {
    const value = String(subject).toLowerCase();
    if (value.includes("chem")) return "⚗️";
    if (value.includes("physics")) return "🔭";
    if (value.includes("bio")) return "🧬";
    if (value.includes("combined") || value.includes("math")) return "📐";
    if (value.includes("ict") || value.includes("information")) return "💻";
    if (value.includes("account")) return "📊";
    if (value.includes("economic")) return "📈";
    if (value.includes("business")) return "💼";
    if (value.includes("geo")) return "🌍";
    if (value.includes("history")) return "📜";
    if (value.includes("political")) return "🏛️";
    if (value.includes("english")) return "📖";
    if (value.includes("agri")) return "🌱";
    if (value.includes("technology")) return "⚙️";
    if (value.includes("general")) return "🧠";
    return "🎓";
  }

  function subjectLocalLabel(name = "") {
    const labels = {
      Chemistry: "රසායන විද්‍යාව · இரசாயனவியல்",
      Physics: "භෞතික විද්‍යාව · பௌதிகவியல்",
      Biology: "ජීව විද්‍යාව · உயிரியல்",
      "Combined Mathematics": "සංයුක්ත ගණිතය · இணைந்த கணிதம்",
      "Agricultural Science": "කෘෂි විද්‍යාව · விவசாய அறிவியல்",
      "Science for Technology": "තාක්ෂණය සඳහා විද්‍යාව · தொழில்நுட்பத்திற்கான அறிவியல்",
      "Information & Comm. Tech": "තොරතුරු තාක්ෂණය · தகவல் தொடர்பாடல் தொழில்நுட்பம்",
      "Engineering Technology": "ඉංජිනේරු තාක්ෂණය · பொறியியல் தொழில்நுட்பம்",
      Accounting: "ගිණුම්කරණය · கணக்கியல்",
      Economics: "ආර්ථික විද්‍යාව · பொருளியல்",
      "Business Studies": "ව්‍යාපාර අධ්‍යයනය · வணிகக் கல்வி",
      Geography: "භූගෝල විද්‍යාව · புவியியல்",
      History: "ඉතිහාසය · வரலாறு",
      "Political Science": "දේශපාලන විද්‍යාව · அரசியல் அறிவியல்",
      "General English": "සාමාන්‍ය ඉංග්‍රීසි · பொது ஆங்கிலம்",
      "Common General Test": "සාමාන්‍ය පොදු පරීක්ෂණය · பொது பொது பரீட்சை"
    };
    return labels[name] || "";
  }

  function quickEmoji(title = "") {
    const value = String(title).toLowerCase();
    if (value.includes("past")) return "📄";
    if (value.includes("marking")) return "✅";
    if (value.includes("model")) return "📝";
    if (value.includes("book") || value.includes("syllabus")) return "📚";
    if (value.includes("note")) return "⚡";
    return "🎓";
  }

  function unique(rows, key) {
    return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort();
  }

  function optionList(values, selected) {
    return values.map((value) => {
      const clean = value.replace(/^All .+$/, "");
      return `<option value="${esc(clean)}"${selected === clean ? " selected" : ""}>${esc(value)}</option>`;
    }).join("");
  }

  function filteredResources(base = state.resources) {
    const q = state.q.toLowerCase();
    const activeStreams = state.stream ? streamForTab(state.stream) : [];
    return base.filter((row) => {
      const haystack = [row.title, row.subject, row.stream, row.type, row.medium, row.year, row.source, ...(row.tags || [])].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) &&
        (!activeStreams.length || activeStreams.includes(row.stream)) &&
        (!state.subject || row.subject === state.subject) &&
        (!state.type || row.type === state.type) &&
        (!state.medium || row.medium === state.medium) &&
        (!state.year || row.year === state.year);
    });
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms))
    ]);
  }

  async function loadFirebaseData() {
    state.loading = true;
    render();
    try {
      const settingsSnap = await withTimeout(getDoc(doc(db, "siteSettings", "main")), 2500, "Settings load");
      if (settingsSnap.exists()) state.settings = normalizeSettings(settingsSnap.data());
    } catch (error) {
      console.warn("[APH] Firebase settings unavailable, using local fallback.", error);
    }

    try {
      const resourceSnap = await withTimeout(getDocs(query(collection(db, "resources"), where("status", "==", "published"))), 3500, "Resources load");
      const resources = [];
      resourceSnap.forEach((item) => resources.push({ id: item.id, ...item.data() }));
      if (resources.length) state.resources = resources;

      const subjectSnap = await withTimeout(getDocs(collection(db, "subjects")), 2500, "Subjects load");
      const subjects = [];
      subjectSnap.forEach((item) => subjects.push({ id: item.id, ...item.data() }));
      if (subjects.length) state.subjects = subjects;
    } catch (error) {
      console.warn("[APH] Firebase public data unavailable, using local fallback.", error);
    } finally {
      state.loading = false;
    }
  }

  function renderNav(active = "Home") {
    const links = [
      ["Home", "#home"],
      ["Past Papers", "#papers"],
      ["Model Papers", "#papers?type=Model%20Paper"],
      ["Marking Schemes", "#papers?type=Marking%20Scheme"],
      ["Books & Syllabuses", "#papers?type=Syllabus"],
      ["Short Notes", "#papers?type=Short%20Note"],
      ["Saved", "#saved"],
      ["Study Tools", "#tools"],
      ["Admin", "admin/"]
    ].map(([label, href]) => `<a class="nav-link${label === active ? " active" : ""}" href="${href}">${label}</a>`).join("");

    return `<nav>
      <a class="nav-logo" href="#home">
        <div class="nav-logo-icon"><img src="assets/logo.png?v=custom-logo" alt="" width="24" height="24" /></div>
        <span class="nav-logo-text">${esc(state.settings.name || "A/L Paper Hub")}</span>
      </a>
      <button class="nav-menu-btn" data-nav-toggle aria-label="Open menu">☰</button>
      <div class="nav-links">${links}</div>
      <div class="nav-right">
        <div class="nav-search-box">
          <input id="nav-search" placeholder="Search papers, subjects..." type="text" value="${esc(state.q)}" />
        </div>
        <button class="theme-toggle" aria-label="Toggle theme"></button>
      </div>
      <div class="mobile-nav${state.navOpen ? " open" : ""}">
        <div class="mobile-nav-head">
          <strong>${esc(state.settings.name || "A/L Paper Hub")}</strong>
          <button data-nav-close aria-label="Close menu">×</button>
        </div>
        <div class="mobile-nav-search"><input id="mobile-search" placeholder="Search papers..." type="text" value="${esc(state.q)}" /></div>
        <div class="mobile-nav-links">${links}</div>
      </div>
      <button class="mobile-nav-scrim${state.navOpen ? " open" : ""}" data-nav-close aria-label="Close menu"></button>
    </nav>`;
  }

  function renderFooter() {
    return `<footer>
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="footer-logo"><div class="footer-logo-icon"><img src="assets/logo.png?v=custom-logo" alt="" width="24" height="24" /></div><span class="footer-logo-name">${esc(state.settings.name || "A/L Paper Hub")}</span></div>
          <p>${esc(state.settings.tagline || "Sri Lankan A/L resources arranged by stream, subject, year and medium.")}</p>
        </div>
        <div class="footer-col"><h4>Resources</h4><a href="#papers">Past Papers</a><a href="#papers?type=Marking%20Scheme">Marking Schemes</a><a href="#papers?type=Model%20Paper">Model Papers</a></div>
        <div class="footer-col"><h4>Subjects</h4><a href="#subject=Chemistry">Chemistry</a><a href="#subject=Physics">Physics</a><a href="#subject=Combined%20Mathematics">Combined Maths</a></div>
        <div class="footer-col"><h4>Admin</h4><a href="admin/">Admin Login</a><a href="#tools">Study Tools</a><a href="#papers">Browse Library</a></div>
      </div>
      <div class="footer-bottom"><span>(c) 2026 ${esc(state.settings.name || "A/L Paper Hub")}</span><span>Sources: DoE Sri Lanka, e-Thaksalawa, NIE and credited schools.</span></div>
    </footer>`;
  }

  function renderFilters() {
    const years = ["All Years", ...unique(state.resources, "year").sort((a, b) => Number(b) - Number(a))];
    const subjects = ["All Subjects", ...unique(state.resources, "subject")];
    return `<div class="home-filter-panel">
      <div class="home-filter-title">Find the exact file fast</div>
      <div class="home-filter-grid">
        <label class="home-filter-field"><span>Stream</span><select data-filter="stream">${optionList(streams, state.stream)}</select></label>
        <label class="home-filter-field"><span>Subject</span><select data-filter="subject">${optionList(subjects, state.subject)}</select></label>
        <label class="home-filter-field"><span>Year</span><select data-filter="year">${optionList(years, state.year)}</select></label>
        <label class="home-filter-field"><span>Medium</span><select data-filter="medium">${optionList(mediums, state.medium)}</select></label>
        <label class="home-filter-field"><span>Type</span><select data-filter="type">${optionList(types, state.type)}</select></label>
      </div>
    </div>`;
  }

  function countdownParts() {
    const target = new Date(state.settings.examDate || fallbackExamDate).getTime();
    const diff = Math.max(0, target - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor(diff / 3600000) % 24,
      minutes: Math.floor(diff / 60000) % 60
    };
  }

  function renderCountdown() {
    const cd = countdownParts();
    return `<section class="countdown-section">
      <div class="countdown-card">
        <div>
          <div class="section-label" style="margin-bottom:6px">Exam Countdown</div>
          <div class="countdown-title">${esc(state.settings.examTitle || fallbackExamTitle)}</div>
          <div class="countdown-sub" style="margin-top:4px">${esc(state.settings.examSubtitle || fallbackExamSubtitle)}</div>
        </div>
        <div class="countdown-nums">
          <div class="countdown-unit"><div class="countdown-num" data-countdown="days">${cd.days}</div><div class="countdown-lbl">Days</div></div>
          <div class="countdown-sep">:</div>
          <div class="countdown-unit"><div class="countdown-num" data-countdown="hours">${String(cd.hours).padStart(2, "0")}</div><div class="countdown-lbl">Hours</div></div>
          <div class="countdown-sep">:</div>
          <div class="countdown-unit"><div class="countdown-num" data-countdown="minutes">${String(cd.minutes).padStart(2, "0")}</div><div class="countdown-lbl">Minutes</div></div>
        </div>
      </div>
    </section>`;
  }

  function renderQuickCards() {
    const cards = [
      ["Past Papers", "By year & medium", "#papers?type=Past%20Paper"],
      ["Marking Schemes", "Answer guides", "#papers?type=Marking%20Scheme"],
      ["Model Papers", "Practice papers", "#papers?type=Model%20Paper"],
      ["Books & Syllabuses", "Official guides", "#papers?type=Syllabus"],
      ["Short Notes", "Fast revision", "#papers?type=Short%20Note"]
    ];
    return `<div style="background:var(--bg1);border-bottom:1px solid var(--border);padding:24px 32px;">
      <div class="quick-grid">${cards.map(([title, count, href]) => `<a class="quick-card" href="${href}"><div class="quick-card-icon">${quickEmoji(title)}</div><div class="quick-card-title">${title}</div><div class="quick-card-count">${count}</div></a>`).join("")}</div>
    </div>`;
  }

  function renderSubjectCards() {
    const counts = state.resources.reduce((acc, row) => {
      acc[row.subject] = (acc[row.subject] || 0) + 1;
      return acc;
    }, {});
    const activeStreams = state.stream ? streamForTab(state.stream) : streamForTab("Science");
    const rows = state.subjects
      .filter((row) => row.status !== "hidden")
      .filter((row) => !activeStreams.length || activeStreams.includes(row.stream))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    return rows.map((row) => `<a class="subject-card" href="#subject=${encodeURIComponent(row.name)}">
      <div class="subject-icon" style="background:rgba(37,99,235,0.1)">${subjectEmoji(row.name)}</div>
      <div><div class="subject-name">${esc(row.name)}</div><div class="subject-meta">${esc(subjectLocalLabel(row.name) || row.stream || "A/L")}</div><div class="subject-meta">${counts[row.name] || 0} resources</div></div>
    </a>`).join("");
  }

  function streamForTab(label) {
    if (label === "Science") return ["Physical Science", "Bio Science", "Science"];
    if (label === "Common") return ["Common Resources"];
    return [label];
  }

  function streamEmoji(label = "") {
    const value = String(label).toLowerCase();
    if (value.includes("science")) return "🔬";
    if (value.includes("commerce")) return "💼";
    if (value.includes("arts")) return "🏛️";
    if (value.includes("technology")) return "💻";
    if (value.includes("common")) return "🧠";
    return "🎓";
  }

  function renderStreamTabs() {
    const tabs = ["Science", "Commerce", "Arts", "Technology", "Common"];
    return `<div class="stream-tabs">${tabs.map((tab) => `<button class="stream-tab${state.stream === tab || (!state.stream && tab === "Science") ? " active" : ""}" data-stream-tab="${esc(tab)}">${streamEmoji(tab)} ${esc(tab)}</button>`).join("")}</div>`;
  }

  function renderSkeletonCards(count = 6) {
    return Array.from({ length: count }, () => `<div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-line short"></div>
      <div class="skeleton-line title"></div>
      <div class="skeleton-chip-row"><span></span><span></span><span></span></div>
      <div class="skeleton-grid"><span></span><span></span><span></span><span></span></div>
      <div class="skeleton-actions"><span></span><span></span></div>
    </div>`).join("");
  }

  function renderResourceActions(row, variant = "card") {
    const id = esc(row.id);
    const saved = isSaved(row.id);
    const done = isDone(row.id);
    const viewClass = variant === "list" ? "rlist-view-btn" : "resource-view-btn";
    const dlClass = variant === "list" ? "rlist-dl-btn" : "resource-dl-btn";
    return `<button class="${viewClass}${saved ? " saved" : ""}" data-bookmark="${id}">${saved ? "⭐ Saved" : "☆ Save"}</button>
      <button class="${viewClass}${done ? " done" : ""}" data-done="${id}">✅ Done</button>
      <button class="${dlClass}" data-paper="${id}">View Details</button>`;
  }

  function renderHomeResourceCard(row) {
    return `<div class="resource-card" data-paper-card="${esc(row.id)}" tabindex="0" role="link" aria-label="Open details for ${esc(row.title)}">
      <div class="resource-card-top">
        <div class="resource-card-subject"><div class="resource-subject-dot" style="background:var(--blue)"></div><div class="resource-subject-name">${subjectEmoji(row.subject)} ${esc(row.subject)} - ${esc(row.stream || "A/L")}</div></div>
        <div class="resource-card-title">${esc(row.title)}</div>
        <div class="resource-card-badges">${badge("blue", row.type || "Resource")}${badge("gray", row.medium || "Medium")}${row.year ? badge("amber", row.year) : ""}</div>
        <div class="resource-detail-grid">
          <span><strong>Year</strong>${esc(row.year || "-")}</span>
          <span><strong>Medium</strong>${esc(row.medium || "-")}</span>
          <span><strong>Type</strong>${esc(row.type || "-")}</span>
          <span><strong>File</strong>${resourceEmoji(row.type)} ${esc(row.fileSizeLabel || row.fileType || "PDF")}</span>
        </div>
      </div>
      <div class="resource-card-bottom resource-card-actions">
        ${renderResourceActions(row, "card")}
      </div>
    </div>`;
  }

  function renderHome() {
    const shown = filteredResources().slice(0, 6);
    return `${renderNav("Home")}
      <section class="hero" id="home">
        <div class="hero-grid-bg"></div>
        <div class="hero-glow"></div>
        <div class="hero-content">
          <div class="hero-pretag"><span></span>Free A/L Resources - Sri Lanka</div>
          <h1>Your A/L resources,<br><em>finally organized.</em></h1>
          <p>${esc(state.settings.tagline || "Past papers, marking schemes, model papers and notes for all streams - Tamil, Sinhala and English medium.")}</p>
          <div class="hero-search">
            <input id="hero-search-input" placeholder="Search papers, subjects..." type="text" value="${esc(state.q)}" />
            <button class="hero-search-btn" id="hero-search-btn">Search</button>
          </div>
          ${state.settings.notice ? `<div class="source-credit" style="margin-top:18px">${esc(state.settings.notice)}</div>` : ""}
          ${renderFilters()}
          <div class="hero-stats">
            <div class="hero-stat"><div class="hero-stat-num">${state.resources.length}</div><div class="hero-stat-lbl">Published resources</div></div>
            <div class="hero-stat"><div class="hero-stat-num">${state.subjects.length}</div><div class="hero-stat-lbl">Subjects</div></div>
            <div class="hero-stat"><div class="hero-stat-num">3</div><div class="hero-stat-lbl">Mediums</div></div>
            <div class="hero-stat"><div class="hero-stat-num">Live</div><div class="hero-stat-lbl">Firebase ready</div></div>
          </div>
        </div>
      </section>
      ${renderQuickCards()}
      <section style="padding:34px 32px;max-width:1180px;margin:0 auto;" id="subjects">
        <div class="section-hdr"><h2>Browse by subject</h2><a href="#papers">View all resources -></a></div>
        ${renderStreamTabs()}
        <div class="subject-grid">${renderSubjectCards()}</div>
      </section>
      <section style="padding:34px 32px;max-width:1180px;margin:0 auto;" id="resources">
        <div class="section-hdr"><h2>Recently added resources</h2><a href="#papers">See all papers -></a></div>
        <div class="resource-grid">${state.loading ? renderSkeletonCards(6) : shown.length ? shown.map(renderHomeResourceCard).join("") : `<div class="resources-empty">No resources found. Add published resources in admin.</div>`}</div>
      </section>
      ${renderCountdown()}
      ${renderTools()}
      ${renderFooter()}`;
  }

  function renderTools() {
    const minutes = Math.floor(pomodoro.remaining / 60);
    const seconds = pomodoro.remaining % 60;
    const modeLabel = pomodoro.mode === "focus" ? "Focus" : "Break";
    return `<section style="padding:34px 32px;max-width:1180px;margin:0 auto;" id="tools">
      <div class="section-hdr"><h2>Exam tools</h2><a href="#papers">Use with past papers -></a></div>
      <div class="tools-grid">
        <div class="tool-card pomodoro-card">
          <div class="tool-icon">${pomodoro.mode === "focus" ? "⏱️" : "☕"}</div>
          <div class="tool-title">Pomodoro Timer</div>
          <div class="pomodoro-time" data-pomodoro-time>${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}</div>
          <div class="tool-desc" data-pomodoro-status>${pomodoro.running ? `${modeLabel} session running` : `${modeLabel} session ready`}</div>
          <div class="pomodoro-actions">
            <button class="pomodoro-btn primary" data-pomodoro-action="toggle">${pomodoro.running ? "⏸️ Pause" : "▶️ Start"}</button>
            <button class="pomodoro-btn" data-pomodoro-action="reset">🔄 Reset</button>
          </div>
          <div class="pomodoro-modes">
            <button class="${pomodoro.mode === "focus" ? "active" : ""}" data-pomodoro-mode="focus">25 min focus</button>
            <button class="${pomodoro.mode === "break" ? "active" : ""}" data-pomodoro-mode="break">5 min break</button>
          </div>
        </div>
        <div class="tool-card"><div class="tool-icon">🗓️</div><div class="tool-title">Study Timetable Generator</div><div class="tool-desc">Use subjects and remaining days to plan weekly revision.</div></div>
        <div class="tool-card"><div class="tool-icon">📊</div><div class="tool-title">Z-score Guide</div><div class="tool-desc">Keep official Z-score and university entry links as resources.</div></div>
      </div>
    </section>`;
  }

  function renderPaperList(rows) {
    return rows.map((row) => `<div class="rlist-item" data-paper-card="${esc(row.id)}" tabindex="0" role="link" aria-label="Open details for ${esc(row.title)}">
      <div class="rlist-icon">${resourceIcon(row)}</div>
      <div class="rlist-main">
        <div class="rlist-title">${esc(row.title)}</div>
        <div class="rlist-badges" style="margin:5px 0">${badge("blue", row.type || "Resource")}${badge("gray", row.medium || "Medium")}${row.year ? badge("amber", row.year) : ""}</div>
        <div class="rlist-meta">
          <div class="rlist-meta-item">${esc(row.fileType || "PDF")}</div>
          <div class="rlist-meta-item">${esc(row.fileSizeLabel || "Link")}</div>
          <div class="rlist-meta-item">Downloads: ${Number(row.downloadCount || 0)}</div>
          <div class="rlist-meta-item">Source: ${esc(row.source || "Not listed")}</div>
        </div>
      </div>
      <div class="rlist-action">
        ${renderResourceActions(row, "list")}
      </div>
    </div>`).join("");
  }

  function renderProgressBlock(rows, label = "Selected papers") {
    const total = rows.length;
    const done = rows.filter((row) => isDone(row.id)).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return `<div class="progress-panel">
      <div><strong>✅ Study progress</strong><span>${esc(label)} · ${done}/${total} done</span></div>
      <div class="progress-track"><span style="width:${percent}%"></span></div>
      <b>${percent}%</b>
    </div>`;
  }

  function renderPapers(subjectName = "") {
    const subjectRows = state.resources.filter((row) => !subjectName || row.subject === subjectName);
    const shown = filteredResources(subjectRows);
    const subject = state.subjects.find((row) => row.name === subjectName);
    const title = subjectName || "All A/L Resources";
    const crumbs = `<a href="#home">Home</a><span class="breadcrumb-sep">></span><span style="color:var(--text1)">${esc(title)}</span>`;

    return `${renderNav("Past Papers")}
      <div class="subject-page-hero">
        <div class="breadcrumb" style="position:absolute;top:16px;left:32px;font-size:12px">${crumbs}</div>
        <div style="margin-top:20px;display:flex;align-items:center;gap:24px;width:100%">
          <div class="subject-page-icon">${subjectEmoji(title)}</div>
          <div>
            <div class="section-label" style="margin-bottom:4px">${esc(subject?.stream || "A/L Resource Library")}</div>
            <div class="subject-page-title">${esc(title)}</div>
            <div class="subject-page-desc">${esc(subject?.desc || "Past papers, marking schemes, books, syllabuses and notes arranged by medium, year and type.")}</div>
          </div>
          <div class="subject-page-stats">
            <div><div class="spstat-num">${subjectRows.length}</div><div class="spstat-lbl">Resources</div></div>
            <div><div class="spstat-num">${unique(subjectRows, "year").length || "-"}</div><div class="spstat-lbl">Years</div></div>
            <div><div class="spstat-num">${unique(subjectRows, "medium").length || "-"}</div><div class="spstat-lbl">Mediums</div></div>
          </div>
        </div>
      </div>
      <div class="filter-bar">
        <span class="filter-label">Filter:</span>
        ${types.map((type, index) => `<button class="filter-chip${(state.type || "All Types") === type ? " active" : index === 0 && !state.type ? " active" : ""}" data-type-chip="${esc(type.replace(/^All Types$/, ""))}">${esc(type)}</button>`).join("")}
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap">${renderCompactSelects()}</div>
      </div>
      <div style="padding:28px 32px;max-width:1180px;margin:0 auto;">
        ${renderProgressBlock(subjectRows, title)}
        <div class="resource-list">${shown.length ? renderPaperList(shown) : `<div class="resources-empty">No papers found for this filter.</div>`}</div>
      </div>
      ${renderFooter()}`;
  }

  function renderSavedPage() {
    const savedRows = state.resources.filter((row) => isSaved(row.id));
    const doneRows = state.resources.filter((row) => isDone(row.id));
    return `${renderNav("Saved")}
      <div class="page-header">
        <div class="breadcrumb"><a href="#home">Home</a><span class="breadcrumb-sep">></span><span style="color:var(--text1)">Saved</span></div>
        <h1>⭐ Saved papers</h1>
        <div class="page-header-sub">${savedRows.length} saved resources · ${doneRows.length} completed for revision</div>
      </div>
      <div style="padding:28px 32px;max-width:1180px;margin:0 auto;">
        <div class="saved-summary">
          <div><strong>${savedRows.length}</strong><span>Saved</span></div>
          <div><strong>${doneRows.length}</strong><span>Done</span></div>
          <div><strong>${state.resources.length ? Math.round((doneRows.length / state.resources.length) * 100) : 0}%</strong><span>Total progress</span></div>
        </div>
        <div class="resource-list">${savedRows.length ? renderPaperList(savedRows) : `<div class="resources-empty">No saved papers yet. Use the ☆ Save button on any resource.</div>`}</div>
      </div>
      ${renderFooter()}`;
  }

  function renderCompactSelects() {
    const years = ["All Years", ...unique(state.resources, "year").sort((a, b) => Number(b) - Number(a))];
    return `
      <select class="filter-select" data-filter="stream">${optionList(streams, state.stream)}</select>
      <select class="filter-select" data-filter="year">${optionList(years, state.year)}</select>
      <select class="filter-select" data-filter="medium">${optionList(mediums, state.medium)}</select>`;
  }

  function detailMeta(row) {
    return [
      ["Subject", row.subject],
      ["Stream", row.stream],
      ["Year", row.year],
      ["Exam Type", row.examType || "G.C.E. Advanced Level"],
      ["Medium", row.medium],
      ["Paper", row.paperPart || "Full Paper"],
      ["File", row.fileType || "PDF"],
      ["File Size", row.fileSizeLabel || "Link"],
      ["Source", row.source || "Not listed"],
      ["Downloads", Number(row.downloadCount || 0)]
    ].map(([key, val]) => `<div class="dl-meta-cell"><div class="dl-meta-key">${esc(key)}</div><div class="dl-meta-val">${esc(val || "-")}</div></div>`).join("");
  }

  function renderPaperDetail(id) {
    const row = state.resources.find((item) => item.id === id) || state.resources[0];
    if (!row) return renderPapers();
    const related = state.resources.filter((item) => item.id !== row.id && item.subject === row.subject).slice(0, 4);
    return `${renderNav("Past Papers")}
      <div class="page-header">
        <div class="breadcrumb"><a href="#home">Home</a><span class="breadcrumb-sep">></span><a href="#subject=${encodeURIComponent(row.subject)}">${esc(row.subject)}</a><span class="breadcrumb-sep">></span><span style="color:var(--text1)">${esc(row.title)}</span></div>
        <h1>${esc(row.title)}</h1>
        <div class="page-header-sub">${esc(row.paperPart || "Full Paper")} - ${esc(row.examType || "G.C.E. Advanced Level")}</div>
      </div>
      <div class="download-layout">
        <div>
          <div class="dl-main-card">
            <div class="dl-preview">
              <div class="dl-badge-official">${esc(row.source || "Educational Resource")}</div>
              <div style="display:flex;gap:16px"><div class="dl-preview-pdf"><div class="dl-preview-pdf-icon">PDF</div><div class="dl-preview-pdf-name">${esc(row.type || "Resource")}</div></div></div>
            </div>
            <div class="dl-info">
              <div class="dl-meta-grid">${detailMeta(row)}</div>
              <div class="dl-actions">
                <button class="dl-btn-primary" data-open="${esc(row.id)}">Download PDF</button>
                <button class="dl-btn-secondary" data-preview="${esc(row.id)}">Preview PDF</button>
                <button class="dl-btn-secondary" data-bookmark="${esc(row.id)}">${isSaved(row.id) ? "⭐ Saved" : "☆ Save"}</button>
                <button class="dl-btn-secondary" data-done="${esc(row.id)}">${isDone(row.id) ? "✅ Done" : "✅ Mark Done"}</button>
                <button class="dl-btn-secondary" data-copy-link="${esc(row.id)}">🔗 Copy Link</button>
                <button class="dl-btn-secondary" data-report="${esc(row.id)}" style="font-size:13px;padding:10px 20px">Report Broken Link</button>
              </div>
              <div class="source-credit"><strong>Source credit:</strong> ${esc(row.source || "Source not listed. Add source in admin for copyright-safe publishing.")}</div>
            </div>
          </div>
        </div>
        <div class="dl-sidebar">
          <div class="dl-sidebar-card" style="border-color:rgba(196,125,14,0.25);background:var(--amber-dim)">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--amber);margin-bottom:10px">Related ${esc(row.subject)} Resources</div>
            <button style="width:100%;padding:10px;background:var(--amber);border:none;border-radius:8px;color:var(--dl-btn-text);font-family:var(--ff-body);font-size:13px;font-weight:700;cursor:pointer;" onclick="location.hash='subject=${encodeURIComponent(row.subject)}'">View Subject Page</button>
          </div>
          <div class="dl-sidebar-card">
            <div class="dl-sidebar-title">Related papers</div>
            ${related.length ? related.map((item) => `<div class="related-item" data-paper-card="${esc(item.id)}" tabindex="0" role="link"><div class="related-icon">${resourceIcon(item)}</div><div><div class="related-item-title">${esc(item.title)}</div><div class="related-item-meta">${esc(item.type)} - ${esc(item.medium)} - ${esc(item.year || "")}</div></div></div>`).join("") : `<div class="related-item-meta">No related resources yet.</div>`}
          </div>
        </div>
      </div>
      <div style="max-width:1100px;margin:0 auto 40px;padding:0 32px">
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px 22px;font-size:12px;color:var(--text2);line-height:1.8">
          <strong style="color:var(--text1)">Disclaimer:</strong> Resources are provided for Sri Lankan A/L educational access. Copyright belongs to the respective owners. Use admin settings to correct sources or remove files when needed.
        </div>
      </div>
      ${renderFooter()}`;
  }

  function googleViewerUrl(row) {
    const url = urlFor(row);
    if (!url) return "";
    const driveId = driveFileIdFromUrl(url);
    if (driveId) return `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`;
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
  }

  function renderModal() {
    if (!state.modal || state.modal.type !== "preview") return "";
    const row = state.resources.find((item) => item.id === state.modal.id);
    if (!row) return "";
    const viewer = googleViewerUrl(row);
    return `<div class="pdf-modal-backdrop" data-modal-close>
      <div class="pdf-modal" role="dialog" aria-modal="true" aria-label="PDF preview">
        <div class="pdf-modal-head">
          <div><strong>👁️ ${esc(row.title)}</strong><span>${esc(row.subject || "A/L")} · ${esc(row.medium || "Medium")} · ${esc(row.year || "")}</span></div>
          <button data-modal-close aria-label="Close preview">×</button>
        </div>
        ${viewer ? `<iframe class="pdf-modal-frame" src="${esc(viewer)}" title="${esc(row.title)}"></iframe>` : `<div class="resources-empty">No preview link is saved for this resource.</div>`}
        <div class="pdf-modal-actions">
          <button class="dl-btn-secondary" data-copy-link="${esc(row.id)}">🔗 Copy Link</button>
          <button class="dl-btn-primary" data-open="${esc(row.id)}">Download PDF</button>
        </div>
      </div>
    </div>`;
  }

  function parseHash() {
    const raw = decodeURIComponent(location.hash || "#home");
    if (raw.startsWith("#paper=")) return { page: "paper", id: raw.slice(7) };
    if (raw.startsWith("#subject=")) return { page: "subject", subject: raw.slice(9) };
    if (raw.startsWith("#papers")) {
      const typeMatch = raw.match(/type=([^&]+)/);
      if (typeMatch) state.type = typeMatch[1];
      return { page: "papers" };
    }
    if (raw.startsWith("#saved")) return { page: "saved" };
    if (raw.startsWith("#tools")) return { page: "tools" };
    return { page: "home" };
  }

  function render() {
    document.title = state.settings.seoTitle || `${state.settings.name || "A/L Paper Hub"} - A/L Resources`;
    if (state.settings.maintenance === "true") {
      document.body.innerHTML = `<main class="hero"><div class="hero-content"><h1>${esc(state.settings.name || "A/L Paper Hub")} is under maintenance.</h1><p>${esc(state.settings.tagline || "")}</p></div></main>`;
      return;
    }
    const route = parseHash();
    if (route.page === "paper") document.body.innerHTML = renderPaperDetail(route.id);
    else if (route.page === "subject") document.body.innerHTML = renderPapers(route.subject);
    else if (route.page === "papers") document.body.innerHTML = renderPapers("");
    else if (route.page === "saved") document.body.innerHTML = renderSavedPage();
    else if (route.page === "tools") document.body.innerHTML = `${renderNav("Study Tools")}${renderCountdown()}${renderTools()}${renderFooter()}`;
    else document.body.innerHTML = renderHome();
    document.body.insertAdjacentHTML("beforeend", renderModal());
    bind();
    if (window.APHTheme) window.APHTheme.init();
  }

  function bind() {
    document.querySelectorAll("[data-nav-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        state.navOpen = true;
        render();
      });
    });
    document.querySelectorAll("[data-nav-close]").forEach((button) => {
      button.addEventListener("click", () => {
        state.navOpen = false;
        render();
      });
    });
    document.querySelectorAll("[data-filter]").forEach((select) => {
      select.addEventListener("change", () => {
        state[select.dataset.filter] = select.value;
        render();
      });
    });
    document.querySelectorAll("[data-type-chip]").forEach((button) => {
      button.addEventListener("click", () => {
        state.type = button.dataset.typeChip;
        render();
      });
    });
    document.querySelectorAll("[data-stream-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.stream = button.dataset.streamTab;
        state.subject = "";
        render();
      });
    });
    document.querySelectorAll("#hero-search-input,#nav-search,#mobile-search").forEach((input) => {
      input.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          state.q = input.value.trim();
          if (location.hash.startsWith("#papers") || location.hash.startsWith("#subject")) render();
        }, 250);
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          state.q = input.value.trim();
          state.navOpen = false;
          location.hash = "#papers";
          render();
        }
      });
    });
    const searchBtn = document.getElementById("hero-search-btn");
    if (searchBtn) searchBtn.addEventListener("click", () => {
      state.q = document.getElementById("hero-search-input").value.trim();
      location.hash = "#papers";
      render();
    });
    document.querySelectorAll("[data-paper]").forEach((item) => {
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        location.hash = `paper=${item.dataset.paper}`;
      });
    });
    document.querySelectorAll("[data-paper-card]").forEach((item) => {
      const open = () => {
        location.hash = `paper=${item.dataset.paperCard}`;
      };
      item.addEventListener("click", open);
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });
    document.querySelectorAll("[data-open]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openResource(button.dataset.open);
      });
    });
    document.querySelectorAll("[data-preview]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openPreview(button.dataset.preview);
      });
    });
    document.querySelectorAll("[data-bookmark]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleBookmark(button.dataset.bookmark);
      });
    });
    document.querySelectorAll("[data-done]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleDone(button.dataset.done);
      });
    });
    document.querySelectorAll("[data-copy-link]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        copyShareLink(button.dataset.copyLink);
      });
    });
    document.querySelectorAll("[data-modal-close]").forEach((item) => {
      item.addEventListener("click", (event) => {
        if (event.target === item || item.tagName === "BUTTON") closeModal();
      });
    });
    document.querySelectorAll("[data-report]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        reportResource(button.dataset.report);
      });
    });
    document.querySelectorAll("[data-pomodoro-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.pomodoroAction === "toggle") togglePomodoro();
        if (button.dataset.pomodoroAction === "reset") resetPomodoro();
      });
    });
    document.querySelectorAll("[data-pomodoro-mode]").forEach((button) => {
      button.addEventListener("click", () => setPomodoroMode(button.dataset.pomodoroMode));
    });
  }

  function showToast(message, type = "info") {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    stack.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 20);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  function openPreview(id) {
    const row = state.resources.find((item) => item.id === id);
    if (!row || !urlFor(row)) {
      showToast("No preview link is saved for this resource yet.", "error");
      return;
    }
    state.modal = { type: "preview", id };
    render();
  }

  function closeModal() {
    state.modal = null;
    render();
  }

  function toggleBookmark(id) {
    let message = "";
    let type = "info";
    if (state.savedIds.has(id)) {
      state.savedIds.delete(id);
      message = "Removed from saved papers.";
    } else {
      state.savedIds.add(id);
      message = "Saved for later revision.";
      type = "success";
    }
    writeIdSet("aph.saved", state.savedIds);
    render();
    showToast(message, type);
  }

  function toggleDone(id) {
    let message = "";
    let type = "info";
    if (state.doneIds.has(id)) {
      state.doneIds.delete(id);
      message = "Marked as not done.";
    } else {
      state.doneIds.add(id);
      message = "Nice. Marked as done.";
      type = "success";
    }
    writeIdSet("aph.done", state.doneIds);
    render();
    showToast(message, type);
  }

  async function copyShareLink(id) {
    const link = `${location.origin}${location.pathname}#paper=${encodeURIComponent(id)}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast("Paper link copied.", "success");
    } catch (_) {
      prompt("Copy this paper link:", link);
    }
  }

  function setPomodoroMode(mode) {
    pomodoro.mode = mode === "break" ? "break" : "focus";
    pomodoro.running = false;
    pomodoro.remaining = pomodoro.mode === "focus" ? pomodoro.focusSeconds : pomodoro.breakSeconds;
    render();
  }

  function togglePomodoro() {
    pomodoro.running = !pomodoro.running;
    pomodoro.lastTick = Date.now();
    render();
  }

  function resetPomodoro() {
    pomodoro.running = false;
    pomodoro.remaining = pomodoro.mode === "focus" ? pomodoro.focusSeconds : pomodoro.breakSeconds;
    render();
  }

  function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoro.remaining / 60);
    const seconds = pomodoro.remaining % 60;
    const time = document.querySelector("[data-pomodoro-time]");
    const status = document.querySelector("[data-pomodoro-status]");
    if (time) time.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    if (status) status.textContent = pomodoro.running ? `${pomodoro.mode === "focus" ? "Focus" : "Break"} session running` : `${pomodoro.mode === "focus" ? "Focus" : "Break"} session ready`;
  }

  function tickPomodoro() {
    if (!pomodoro.running) return;
    const now = Date.now();
    const elapsed = Math.floor((now - pomodoro.lastTick) / 1000);
    if (elapsed < 1) return;
    pomodoro.lastTick += elapsed * 1000;
    pomodoro.remaining = Math.max(0, pomodoro.remaining - elapsed);
    if (pomodoro.remaining === 0) {
      pomodoro.mode = pomodoro.mode === "focus" ? "break" : "focus";
      pomodoro.remaining = pomodoro.mode === "focus" ? pomodoro.focusSeconds : pomodoro.breakSeconds;
      render();
      return;
    }
    updatePomodoroDisplay();
  }

  async function openResource(id) {
    const row = state.resources.find((item) => item.id === id);
    const url = row && urlFor(row);
    if (!url) {
      showToast("No download link is saved for this resource yet.", "error");
      return;
    }
    try {
      await updateDoc(doc(db, "resources", id), { downloadCount: increment(1) });
    } catch (_) {
      row.downloadCount = Number(row.downloadCount || 0) + 1;
      store.saveResource(row);
    }
    window.open(openableUrl(url), "_blank", "noopener");
    showToast("Opening the PDF.", "success");
  }

  async function reportResource(id) {
    const row = state.resources.find((item) => item.id === id);
    const message = prompt(`Report a problem with:\n${row ? row.title : "this resource"}`, "File not opening");
    if (message === null) return;
    const report = { resourceId: id, resourceTitle: row ? row.title : id, problemType: message || "Broken link", message: "", status: "open" };
    try {
      await addDoc(collection(db, "brokenReports"), { ...report, createdAt: serverTimestamp() });
    } catch (_) {
      store.saveReport(report);
    }
    showToast("Thanks. The report was saved for admin review.", "success");
  }

  function tickCountdown() {
    const cd = countdownParts();
    const days = document.querySelector('[data-countdown="days"]');
    const hours = document.querySelector('[data-countdown="hours"]');
    const minutes = document.querySelector('[data-countdown="minutes"]');
    if (days) days.textContent = cd.days;
    if (hours) hours.textContent = String(cd.hours).padStart(2, "0");
    if (minutes) minutes.textContent = String(cd.minutes).padStart(2, "0");
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("tdr-store-change", () => {
    state.settings = normalizeSettings(store.getSettings());
    state.subjects = store.getSubjects();
    render();
  });

  loadFirebaseData().then(render);
  setInterval(tickCountdown, 30000);
  setInterval(tickPomodoro, 1000);
})();
