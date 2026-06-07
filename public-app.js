(function () {
  const store = window.TDRStore;
  const esc = store.esc;
  const streams = ["All Streams", "Physical Science", "Bio Science", "Commerce", "Arts", "Technology", "Common Resources"];
  const types = ["All Types", "Past Paper", "Marking Scheme", "Model Paper", "Term Test Paper", "School Paper", "Book", "Syllabus", "Short Note"];
  const mediums = ["All Mediums", "Tamil", "Sinhala", "English", "Bilingual"];

  let state = { q: "", stream: "", subject: "", type: "", medium: "", year: "" };

  function publishedResources() {
    return store.getResources().filter((row) => row.status === "published");
  }

  function filteredResources() {
    const q = state.q.toLowerCase();
    return publishedResources().filter((row) => {
      const haystack = [row.title, row.subject, row.stream, row.type, row.medium, row.year, row.source, ...(row.tags || [])].join(" ").toLowerCase();
      return (!q || haystack.includes(q)) &&
        (!state.stream || row.stream === state.stream) &&
        (!state.subject || row.subject === state.subject) &&
        (!state.type || row.type === state.type) &&
        (!state.medium || row.medium === state.medium) &&
        (!state.year || row.year === state.year);
    });
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

  function renderNav(settings) {
    const links = [
      ["Resources", "#resources"],
      ["Subjects", "#subjects"],
      ["Study Tools", "#tools"],
      ["Admin", "admin.html"]
    ].map(([label, href]) => `<a class="nav-link" href="${href}">${label}</a>`).join("");
    return `<nav>
      <a class="nav-logo" href="#top"><div class="nav-logo-icon">TDR</div><span class="nav-logo-text">${esc(settings.name)}</span></a>
      <div class="nav-links">${links}</div>
      <div class="nav-right">
        <div class="nav-search-box"><input id="nav-search" placeholder="Search papers, subjects..." type="text" value="${esc(state.q)}" /></div>
        <button class="theme-toggle" aria-label="Toggle theme"></button>
      </div>
    </nav>`;
  }

  function renderFilters(resources) {
    const subjects = ["All Subjects", ...unique(resources, "subject")];
    const years = ["All Years", ...unique(resources, "year").sort((a, b) => Number(b) - Number(a))];
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

  function renderResourceCard(row) {
    const url = row.fileUrl || row.externalUrl || "";
    return `<div class="resource-card" data-id="${esc(row.id)}">
      <div class="resource-card-top">
        <div class="resource-card-subject"><div class="resource-subject-dot" style="background:var(--blue)"></div><div class="resource-subject-name">${esc(row.subject)} - ${esc(row.stream)}</div></div>
        <div class="resource-card-title">${esc(row.title)}</div>
        <div class="resource-card-badges">
          <span class="badge badge-blue">${esc(row.type)}</span>
          <span class="badge badge-gray">${esc(row.medium)}</span>
          ${row.year ? `<span class="badge badge-amber">${esc(row.year)}</span>` : ""}
        </div>
        <div class="resource-detail-grid">
          <span><strong>Source</strong>${esc(row.source || "Not listed")}</span>
          <span><strong>File</strong>${esc(row.fileType || "PDF")}</span>
          <span><strong>Size</strong>${esc(row.fileSizeLabel || "Link")}</span>
          <span><strong>Downloads</strong>${Number(row.downloadCount || 0)}</span>
        </div>
      </div>
      <div class="resource-card-bottom resource-card-actions">
        <button class="resource-view-btn" data-view="${esc(row.id)}"${url ? "" : " disabled"}>View Online</button>
        <button class="resource-dl-btn" data-download="${esc(row.id)}"${url ? "" : " disabled"}>Download PDF</button>
        <button class="resource-view-btn" data-report="${esc(row.id)}">Report Link</button>
      </div>
    </div>`;
  }

  function renderSubjects() {
    const counts = publishedResources().reduce((acc, row) => {
      acc[row.subject] = (acc[row.subject] || 0) + 1;
      return acc;
    }, {});
    return store.getSubjects().filter((row) => row.status !== "hidden").sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map((row) => `
      <a class="subject-card" href="#resources" data-subject-link="${esc(row.name)}">
        <div class="subject-icon" style="background:rgba(37,99,235,0.1)">${esc(row.name.slice(0, 2).toUpperCase())}</div>
        <div><div class="subject-name">${esc(row.name)}</div><div class="subject-meta">${esc(row.stream || "A/L")} - ${counts[row.name] || 0} resources</div></div>
      </a>`).join("");
  }

  function render() {
    const settings = store.getSettings();
    document.title = settings.seoTitle || `${settings.name} - A/L Resources`;
    const resources = publishedResources();
    const shown = filteredResources();
    if (settings.maintenance === "true") {
      document.body.innerHTML = `<main class="hero" id="top"><div class="hero-content"><h1>${esc(settings.name)} is under maintenance.</h1><p>${esc(settings.tagline)}</p></div></main>`;
      return;
    }

    document.body.innerHTML = `${renderNav(settings)}
      <section class="hero" id="top">
        <div class="hero-grid-bg"></div>
        <div class="hero-content">
          <div class="hero-pretag"><span></span>Free A/L Resources - Sri Lanka</div>
          <h1>${esc(settings.name)}<br><em>resources that actually work.</em></h1>
          <p>${esc(settings.tagline)}</p>
          <div class="hero-search">
            <input id="hero-search-input" placeholder="Search subject, year, medium or paper type..." type="text" value="${esc(state.q)}" />
            <button class="hero-search-btn" id="hero-search-btn">Search</button>
          </div>
          ${settings.notice ? `<div class="source-credit" style="margin-top:18px">${esc(settings.notice)}</div>` : ""}
          ${renderFilters(resources)}
          <div class="hero-stats">
            <div class="hero-stat"><div class="hero-stat-num">${resources.length}</div><div class="hero-stat-lbl">Published resources</div></div>
            <div class="hero-stat"><div class="hero-stat-num">${store.getSubjects().length}</div><div class="hero-stat-lbl">Subjects</div></div>
            <div class="hero-stat"><div class="hero-stat-num">3</div><div class="hero-stat-lbl">Mediums</div></div>
            <div class="hero-stat"><div class="hero-stat-num">Local</div><div class="hero-stat-lbl">Admin ready</div></div>
          </div>
        </div>
      </section>
      <section style="padding:28px 32px;max-width:1180px;margin:0 auto" id="subjects">
        <div class="section-hdr"><h2>Subjects</h2><a href="admin.html">Manage in admin</a></div>
        <div class="subject-grid">${renderSubjects()}</div>
      </section>
      <section style="padding:28px 32px;max-width:1180px;margin:0 auto" id="resources">
        <div class="section-hdr"><h2>Resources</h2><a href="admin.html">Add resource</a></div>
        <div class="resource-grid">${shown.length ? shown.map(renderResourceCard).join("") : `<div class="resources-empty">No resources found. Try another filter or add resources in admin.</div>`}</div>
      </section>
      <section style="padding:28px 32px;max-width:1180px;margin:0 auto" id="tools">
        <div class="section-hdr"><h2>Study Tools</h2><a href="admin.html">Edit notice</a></div>
        <div class="tools-grid">
          <div class="tool-card"><div class="tool-icon">25</div><div class="tool-title">Pomodoro Timer</div><div class="tool-desc">Use 25 minute focused revision sessions with short breaks.</div></div>
          <div class="tool-card"><div class="tool-icon">Z</div><div class="tool-title">Z-score Guide</div><div class="tool-desc">Keep official university guidance links as resources in admin.</div></div>
          <div class="tool-card"><div class="tool-icon">PDF</div><div class="tool-title">Paper Library</div><div class="tool-desc">Filter by subject, year, medium and resource type.</div></div>
        </div>
      </section>
      <footer><div class="footer-inner"><div class="footer-brand"><div class="footer-logo"><div class="footer-logo-icon">TDR</div><span class="footer-logo-name">${esc(settings.name)}</span></div><p>${esc(settings.tagline)}</p></div></div><div class="footer-bottom"><span>© 2026 ${esc(settings.name)}</span><span>Sources: DoE Sri Lanka, e-Thaksalawa, NIE and clearly credited schools.</span></div></footer>`;

    bind();
    if (window.TDRTheme) window.TDRTheme.init();
  }

  function setQuery(value) {
    state.q = value.trim();
    render();
    location.hash = "#resources";
  }

  function bind() {
    document.querySelectorAll("[data-filter]").forEach((select) => {
      select.addEventListener("change", () => {
        state[select.dataset.filter] = select.value;
        render();
        location.hash = "#resources";
      });
    });
    document.querySelectorAll("#hero-search-input,#nav-search").forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") setQuery(input.value);
      });
    });
    const searchBtn = document.getElementById("hero-search-btn");
    if (searchBtn) searchBtn.addEventListener("click", () => setQuery(document.getElementById("hero-search-input").value));
    document.querySelectorAll("[data-subject-link]").forEach((link) => {
      link.addEventListener("click", () => {
        state.subject = link.dataset.subjectLink;
        render();
      });
    });
    document.querySelectorAll("[data-view],[data-download]").forEach((button) => {
      button.addEventListener("click", () => openResource(button.dataset.view || button.dataset.download));
    });
    document.querySelectorAll("[data-report]").forEach((button) => {
      button.addEventListener("click", () => reportResource(button.dataset.report));
    });
  }

  function openResource(id) {
    const rows = store.getResources();
    const row = rows.find((item) => item.id === id);
    const url = row && (row.fileUrl || row.externalUrl);
    if (!url) return;
    row.downloadCount = Number(row.downloadCount || 0) + 1;
    store.saveResource(row);
    window.open(url, "_blank", "noopener");
  }

  function reportResource(id) {
    const row = store.getResources().find((item) => item.id === id);
    const message = prompt(`Report a problem with:\n${row ? row.title : "this resource"}`, "File not opening");
    if (message === null) return;
    store.saveReport({ resourceId: id, resourceTitle: row ? row.title : id, problemType: message || "Broken link", message: "", status: "open" });
    alert("Thanks. The report is saved in the admin panel.");
  }

  window.addEventListener("tdr-store-change", render);
  render();
})();
