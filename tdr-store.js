(function () {
  const KEYS = {
    resources: "tdr.resources",
    subjects: "tdr.subjects",
    announcements: "tdr.announcements",
    reports: "tdr.reports",
    settings: "tdr.settings"
  };

  const now = new Date().toISOString();

  const defaults = {
    settings: {
      name: "The Dark Room",
      tagline: "Sri Lankan G.C.E. A/L papers, marking schemes, books, syllabuses and notes.",
      email: "contact@thedarkroom.lk",
      telegram: "",
      facebook: "",
      whatsapp: "",
      seoTitle: "The Dark Room - Sri Lankan A/L Resources",
      seoDesc: "Free Sri Lankan A/L past papers, marking schemes, model papers, books, syllabuses and short notes.",
      notice: "Admin is now working locally. Add your real download links in Admin > Upload Resource.",
      maintenance: "false"
    },
    subjects: [
      { id: "chemistry", name: "Chemistry", stream: "Physical Science", desc: "Past papers, marking schemes, notes and syllabuses.", order: 1, status: "active" },
      { id: "physics", name: "Physics", stream: "Physical Science", desc: "Physics papers and revision resources.", order: 2, status: "active" },
      { id: "combined-maths", name: "Combined Mathematics", stream: "Physical Science", desc: "Combined Mathematics papers by year and medium.", order: 3, status: "active" },
      { id: "biology", name: "Biology", stream: "Bio Science", desc: "Biology papers, schemes and study material.", order: 4, status: "active" },
      { id: "accounting", name: "Accounting", stream: "Commerce", desc: "Commerce stream accounting resources.", order: 5, status: "active" },
      { id: "ict", name: "ICT", stream: "Technology", desc: "ICT papers and technology stream resources.", order: 6, status: "active" }
    ],
    announcements: [
      { id: "welcome", title: "Resource library is ready", message: "Use the admin panel to add real PDF links, subjects, notices and settings.", type: "update", status: "active", createdAt: now }
    ],
    reports: [],
    resources: [
      {
        id: "chemistry-2024-tamil-paper",
        title: "2024 A/L Chemistry Past Paper - Tamil Medium",
        subject: "Chemistry",
        stream: "Physical Science",
        type: "Past Paper",
        medium: "Tamil",
        year: "2024",
        examType: "G.C.E. Advanced Level",
        paperPart: "Full Paper",
        description: "Official-style resource entry. Replace the link with the real PDF in admin.",
        source: "Department of Examinations Sri Lanka",
        tags: ["chemistry", "2024", "tamil", "past paper"],
        fileUrl: "https://www.doenets.lk/",
        externalUrl: "",
        fileType: "PDF",
        fileSizeLabel: "Link",
        status: "published",
        featured: "yes",
        downloadCount: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "physics-2024-english-scheme",
        title: "2024 A/L Physics Marking Scheme - English Medium",
        subject: "Physics",
        stream: "Physical Science",
        type: "Marking Scheme",
        medium: "English",
        year: "2024",
        examType: "G.C.E. Advanced Level",
        paperPart: "Full Paper",
        description: "Marking scheme listing with source metadata.",
        source: "Department of Examinations Sri Lanka",
        tags: ["physics", "2024", "english", "marking scheme"],
        fileUrl: "https://www.doenets.lk/",
        externalUrl: "",
        fileType: "PDF",
        fileSizeLabel: "Link",
        status: "published",
        featured: "yes",
        downloadCount: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "ict-2023-sinhala-paper",
        title: "2023 A/L ICT Past Paper - Sinhala Medium",
        subject: "ICT",
        stream: "Technology",
        type: "Past Paper",
        medium: "Sinhala",
        year: "2023",
        examType: "G.C.E. Advanced Level",
        paperPart: "Full Paper",
        description: "Technology stream ICT paper entry.",
        source: "Department of Examinations Sri Lanka",
        tags: ["ict", "2023", "sinhala", "technology"],
        fileUrl: "https://www.doenets.lk/",
        externalUrl: "",
        fileType: "PDF",
        fileSizeLabel: "Link",
        status: "published",
        featured: "no",
        downloadCount: 0,
        createdAt: now,
        updatedAt: now
      }
    ]
  };

  function read(key) {
    try {
      const raw = localStorage.getItem(KEYS[key]);
      if (!raw) return structuredClone(defaults[key]);
      return JSON.parse(raw);
    } catch (_) {
      return structuredClone(defaults[key]);
    }
  }

  function write(key, value) {
    localStorage.setItem(KEYS[key], JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("tdr-store-change", { detail: { key } }));
    return value;
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function upsert(key, item, prefix) {
    const rows = read(key);
    const record = { ...item };
    if (!record.id) record.id = uid(prefix);
    const index = rows.findIndex((row) => row.id === record.id);
    const stamped = { ...record, updatedAt: new Date().toISOString() };
    if (index >= 0) rows[index] = stamped;
    else rows.unshift({ ...stamped, createdAt: stamped.createdAt || stamped.updatedAt });
    write(key, rows);
    return stamped;
  }

  function remove(key, id) {
    write(key, read(key).filter((row) => row.id !== id));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  window.TDRStore = {
    defaults,
    esc,
    read,
    write,
    uid,
    getSettings: () => read("settings"),
    saveSettings: (settings) => write("settings", { ...read("settings"), ...settings }),
    getResources: () => read("resources"),
    saveResource: (resource) => upsert("resources", resource, "resource"),
    deleteResource: (id) => remove("resources", id),
    getSubjects: () => read("subjects"),
    saveSubject: (subject) => upsert("subjects", subject, "subject"),
    deleteSubject: (id) => remove("subjects", id),
    getAnnouncements: () => read("announcements"),
    saveAnnouncement: (announcement) => upsert("announcements", announcement, "announcement"),
    deleteAnnouncement: (id) => remove("announcements", id),
    getReports: () => read("reports"),
    saveReport: (report) => upsert("reports", report, "report"),
    deleteReport: (id) => remove("reports", id),
    resetDemoData: () => {
      Object.keys(KEYS).forEach((key) => localStorage.removeItem(KEYS[key]));
      window.dispatchEvent(new CustomEvent("tdr-store-change", { detail: { key: "all" } }));
    }
  };
})();
