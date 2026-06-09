/**
 * =======================================================
 *  A/L PAPER HUB - config.js
 *  All editable site content lives here.
 *  Change text, links, stats, cards, and data without
 *  touching index.html or styles.css.
 * =======================================================
 */

const SITE = {

  /* -- BRAND ------------------------------------------- */
  name: "A/L Paper Hub",
  tagline: "Dark-mode A/L paper library for Sri Lankan students - fast filters, clear PDF details, and direct download pages.",
  footerTagline: "Sri Lankan A/L past papers, marking schemes, model papers, syllabuses, books and notes arranged by stream, subject, year and medium.",
  copyright: "(c) 2026 A/L Paper Hub. Educational resources for Sri Lankan A/L students.",
  footerSources: "Sources: Dept. of Examinations - e-Thaksalawa - NIE Sri Lanka",

  /* -- NAV LINKS ---------------------------------------- */
  navLinks: [
    { label: "Past Papers",      href: "#", active: true  },
    { label: "Model Papers",     href: "#", active: false },
    { label: "Marking Schemes",  href: "#", active: false },
    { label: "Books & Syllabuses", href: "#", active: false },
    { label: "Short Notes",      href: "#", active: false },
    { label: "Study Tools",      href: "#", active: false },
    { label: "Blog",             href: "#", active: false },
  ],

  /* -- FOOTER COLUMNS ----------------------------------- */
  footerCols: [
    {
      heading: "Resources",
      links: [
        { label: "Past Papers",      href: "#" },
        { label: "Marking Schemes",  href: "#" },
        { label: "Model Papers",     href: "#" },
        { label: "Term Test Papers", href: "#" },
        { label: "School Papers",    href: "#" },
      ],
    },
    {
      heading: "Subjects",
      links: [
        { label: "Chemistry",         href: "#" },
        { label: "Physics",           href: "#" },
        { label: "Combined Maths",    href: "#" },
        { label: "Biology",           href: "#" },
        { label: "Accounting",        href: "#" },
      ],
    },
    {
      heading: "About",
      links: [
        { label: "About Us",          href: "#" },
        { label: "Privacy Policy",    href: "#" },
        { label: "Terms of Use",      href: "#" },
        { label: "Disclaimer",        href: "#" },
        { label: "Contact Us",        href: "#" },
        { label: "Report Broken Link", href: "#" },
      ],
    },
  ],

  /* ======================================================
     PAGE 1 - HOMEPAGE
  ====================================================== */
  hero: {
    pretag:   "Free A/L Resources - Sri Lanka",
    headline: "Your A/L resources,<br><em>finally organized.</em>",
    sub:      "Past papers, marking schemes, model papers and notes for all streams - Tamil, Sinhala and English medium. Clean, fast, no nonsense.",
    searchPlaceholder: "Search papers, subjects...",
    tags: [
      { label: "Chemistry Tamil",   href: "#" },
      { label: "Physics Sinhala",   href: "#" },
      { label: "Combined Maths Tamil", href: "#" },
      { label: "Biology Sinhala",   href: "#" },
      { label: "Accounting",        href: "#" },
      { label: "ICT",               href: "#" },
    ],
    stats: [
      { num: "Growing",   lbl: "Resource library" },
      { num: "All",       lbl: "Main A/L streams" },
      { num: "Weekly",    lbl: "New updates" },
      { num: "3 Mediums", lbl: "Tamil - Sinhala - English" },
    ],
  },

  homeFilters: [
    { label: "Stream",  options: ["Physical Science", "Bio Science", "Commerce", "Arts", "Technology", "Common"] },
    { label: "Subject", options: ["Chemistry", "Physics", "Combined Mathematics", "Biology", "ICT", "Accounting"] },
    { label: "Year",    options: ["2025", "2024", "2023", "2022", "2021", "2020"] },
    { label: "Medium",  options: ["Tamil", "Sinhala", "English"] },
    { label: "Type",    options: ["Past Paper", "Marking Scheme", "Model Paper", "Term Test", "Book / Syllabus", "Short Notes"] },
    { label: "File",    options: ["PDF", "View Online", "Direct Download"] },
  ],

  quickCards: [
    { icon: "📄", iconBg: "rgba(232,160,48,0.12)",  title: "Past Papers",      count: "By year & medium",   href: "#" },
    { icon: "✅", iconBg: "rgba(74,144,217,0.12)", title: "Marking Schemes",  count: "Answer guides",      href: "#" },
    { icon: "📝", iconBg: "rgba(61,171,106,0.10)",  title: "Model Papers",     count: "Practice papers",     href: "#" },
    { icon: "📚", iconBg: "rgba(139,110,232,0.12)", title: "Books & Syllabuses", count: "Official guides",  href: "#" },
    { icon: "⚡", iconBg: "rgba(47,191,175,0.10)",  title: "Short Notes",      count: "Fast revision",      href: "#" },
  ],

  streamTabs: ["Science", "Commerce", "Arts", "Technology", "Common"],

  subjects: [
    { icon: "⚗️", color: "rgba(232,160,48,0.12)",   name: "Chemistry",                   meta: "Tamil - Sinhala - English", href: "#" },
    { icon: "🔭", color: "rgba(74,144,217,0.12)",    name: "Physics",                     meta: "Tamil - Sinhala - English", href: "#" },
    { icon: "🧬", color: "rgba(61,171,106,0.10)",    name: "Biology",                     meta: "Tamil - Sinhala - English", href: "#" },
    { icon: "📐", color: "rgba(139,110,232,0.12)",   name: "Combined Mathematics",        meta: "Tamil - Sinhala - English", href: "#" },
    { icon: "🌱", color: "rgba(47,191,175,0.10)",    name: "Agricultural Science",        meta: "Sinhala - Tamil",           href: "#" },
    { icon: "🔬", color: "rgba(217,92,92,0.10)",     name: "Science for Technology",      meta: "Sinhala - English",          href: "#" },
    { icon: "💻", color: "rgba(232,160,48,0.12)",    name: "Information & Comm. Tech",    meta: "Sinhala - English",         href: "#" },
    { icon: "⚙️", color: "rgba(74,144,217,0.12)",    name: "Engineering Technology",      meta: "Sinhala - Tamil",           href: "#" },
  ],

  recentResources: [
    { dotColor: "#f4c35a", subject: "Chemistry - Science",       title: "2024 A/L Chemistry Past Paper - Tamil Medium",                   badges: [["amber","Official"],["gray","Tamil"],["blue","Past Paper"]],    year: "2024", medium: "Tamil", type: "Past Paper",    pages: "16", size: "4.2 MB - PDF" },
    { dotColor: "#38bdf8", subject: "Physics - Science",         title: "2024 A/L Physics Marking Scheme - English Medium",              badges: [["amber","Official"],["gray","English"],["green","Marking Scheme"]], year: "2024", medium: "English", type: "Marking Scheme", pages: "22", size: "3.8 MB - PDF" },
    { dotColor: "#818cf8", subject: "Combined Maths - Science",  title: "2023 A/L Combined Mathematics Past Paper - Sinhala Medium",     badges: [["amber","Official"],["gray","Sinhala"],["blue","Past Paper"]],   year: "2023", medium: "Sinhala", type: "Past Paper", pages: "28", size: "5.1 MB - PDF" },
    { dotColor: "#22c55e", subject: "Accounting - Commerce",     title: "2024 A/L Accounting Model Paper - Sinhala Medium",              badges: [["gray","Sinhala"],["green","Model Paper"],["gray","e-Thaksalawa"]], year: "2024", medium: "Sinhala", type: "Model Paper", pages: "18", size: "2.9 MB - PDF" },
    { dotColor: "#2dd4bf", subject: "ICT - Technology",          title: "2024 A/L ICT Past Paper - Sinhala & English Medium",            badges: [["amber","Official"],["gray","Bilingual"],["blue","Past Paper"]],  year: "2024", medium: "Bilingual", type: "Past Paper", pages: "14", size: "3.2 MB - PDF" },
    { dotColor: "#fb7185", subject: "Economics - Commerce",      title: "2023 A/L Economics Past Paper - Tamil Medium",                  badges: [["amber","Official"],["gray","Tamil"],["blue","Past Paper"]],      year: "2023", medium: "Tamil", type: "Past Paper", pages: "20", size: "3.5 MB - PDF" },
  ],

  countdown: {
    title:    "G.C.E. Advanced Level Examination",
    subtitle: "Start revision today. Download subject papers by year, medium and type.",
    btnLabel: "Get Study Plan ->",
    /* These numbers are for display only in the static preview */
    days: "Plan", hours: "Revise", minutes: "Win",
  },

  tools: [
    { icon: "⏱️", title: "Pomodoro Timer",             desc: "25-minute focus sessions with short breaks. Track your daily study hours." },
    { icon: "🗓️", title: "Study Timetable Generator",  desc: "Build a personalized weekly revision plan based on your exam date and subjects." },
    { icon: "📊", title: "Z-score Guide",               desc: "Understand how Z-scores work, cutoffs by stream, and university entry requirements." },
  ],

  blogs: [
    { tag: "Study Strategy", title: "How to use past papers effectively for A/L Chemistry revision",          date: "May 20, 2025 - 5 min read" },
    { tag: "MCQ Guide",      title: "Preparing for the A/L Physics MCQ paper - section by section",          date: "May 15, 2025 - 7 min read" },
    { tag: "Z-score",        title: "Understanding Z-scores and university entry for Sri Lankan A/L students", date: "May 10, 2025 - 8 min read" },
  ],

  /* ======================================================
     PAGE 2 - SUBJECT PAGE (Chemistry example)
  ====================================================== */
  subjectPage: {
    breadcrumb: ["Home", "Past Papers", "Chemistry"],
    icon:   "Chem",
    stream: "Science Stream",
    name:   "Chemistry",
    desc:   "Official past papers, model papers, marking schemes, notes & syllabuses - Tamil, Sinhala & English medium.",
    stats:  [
      { num: "Growing",   lbl: "Library" },
      { num: "2020-2024", lbl: "Year Range" },
      { num: "3",         lbl: "Mediums" },
    ],
    filterTypes: ["All Types", "Past Papers", "Marking Schemes", "Model Papers", "Term Tests", "Books", "Notes"],
    filterStreams: ["Science Stream", "Commerce Stream", "Arts Stream", "Technology Stream", "Common"],
    filterYears: ["All Years", "2024", "2023", "2022", "2021", "2020"],
    filterMediums: ["All Mediums", "Tamil", "Sinhala", "English"],
    filterSort: ["Newest First", "Most Downloaded"],
    resources: [
      { icon: "PDF", title: "2024 A/L Chemistry Past Paper - Tamil Medium (Paper I & II)", badges: [["amber","Official"],["blue","Past Paper"],["gray","Tamil"],["gray","2024"]], pages: "16", size: "4.2 MB - PDF", downloads: "PDF ready", source: "Dept. of Examinations SL" },
      { icon: "OK", title: "2024 A/L Chemistry Marking Scheme - Tamil Medium",            badges: [["amber","Official"],["green","Marking Scheme"],["gray","Tamil"],["gray","2024"]], pages: "22", size: "3.1 MB - PDF", downloads: "PDF ready", source: "Dept. of Examinations SL" },
      { icon: "PDF", title: "2024 A/L Chemistry Past Paper - Sinhala Medium (Paper I & II)", badges: [["amber","Official"],["blue","Past Paper"],["gray","Sinhala"],["gray","2024"]], pages: "16", size: "4.0 MB - PDF", downloads: "PDF ready", source: "Dept. of Examinations SL" },
      { icon: "Book", title: "2024 A/L Chemistry Model Paper - e-Thaksalawa (English Medium)", badges: [["gray","e-Thaksalawa"],["green","Model Paper"],["gray","English"],["gray","2024"]], pages: "20", size: "2.8 MB - PDF", downloads: "PDF ready", source: "e-Thaksalawa MOE" },
      { icon: "List", title: "A/L Chemistry Syllabus 2024 - NIE Sri Lanka (All Mediums)",   badges: [["amber","Official"],["purple","Syllabus"],["gray","All Mediums"]], pages: "48", size: "6.2 MB - PDF", downloads: "PDF ready", source: "NIE Sri Lanka" },
      { icon: "PDF", title: "2023 A/L Chemistry Past Paper - Tamil Medium",                badges: [["amber","Official"],["blue","Past Paper"],["gray","Tamil"],["gray","2023"]], pages: "16", size: "3.9 MB - PDF", downloads: "PDF ready", source: "Dept. of Examinations SL" },
    ],
  },

  /* ======================================================
     PAGE 3 - RESOURCE DOWNLOAD PAGE
  ====================================================== */
  downloadPage: {
    breadcrumb: ["Home", "Past Papers", "2024", "Chemistry", "Tamil Medium"],
    title:    "2024 A/L Chemistry Past Paper - Tamil Medium",
    subtitle: "Paper I & II - G.C.E. Advanced Level Examination 2024",
    officialBadge: "OK Official - Dept. of Examinations SL",
    papers: [
      { name: "Paper I (MCQ)" },
      { name: "Paper II (Structured & Essay)" },
    ],
    meta: [
      { key: "Subject",   val: "Chemistry" },
      { key: "Stream",    val: "Science Stream" },
      { key: "Year",      val: "2024" },
      { key: "Exam Type", val: "G.C.E. Advanced Level" },
      { key: "Medium",    val: "Tamil (à®¤à®®à®¿à®´à¯)" },
      { key: "Paper",     val: "Full Paper (I & II)" },
      { key: "Pages",     val: "16 pages" },
      { key: "File Size", val: "4.2 MB - PDF" },
      { key: "Source",    val: "Dept. of Examinations SL" },
      { key: "Download Type", val: "Direct PDF + View Online" },
    ],
    downloadBtn:    "Download Download Paper PDF - 4.2 MB",
    viewBtn:        "Link View PDF Online",
    schemeBtn:      "List Download Marking Scheme",
    reportText:     "Report a broken link or issue with this file",
    disclaimer:     `A/L Paper Hub provides educational resources for Sri Lankan A/L students. Some papers are official public examination resources or publicly available educational materials. Copyright belongs to the respective owners (Department of Examinations Sri Lanka, Ministry of Education, NIE Sri Lanka, and respective schools/institutions). If you are a copyright owner and want a resource removed or corrected, please <a href="#">contact us</a>.`,
    sourceCredit:   `This paper is an official resource published by the <strong>Department of Examinations Sri Lanka</strong> (doenets.lk). The copyright belongs to the Department of Examinations, Sri Lanka. A/L Paper Hub provides this for educational access only.`,
    sidebar: {
      markingScheme: {
        title: "2024 A/L Chemistry Marking Scheme - Tamil Medium",
        btnLabel: "Download Marking Scheme",
      },
      related: [
        { icon: "PDF", title: "2023 A/L Chemistry Past Paper - Tamil Medium",  meta: "Past Paper - Tamil - 2023" },
        { icon: "PDF", title: "2024 Chemistry Past Paper - Sinhala Medium",    meta: "Past Paper - Sinhala - 2024" },
        { icon: "Book", title: "2024 Chemistry Model Paper - e-Thaksalawa",     meta: "Model Paper - English - 2024" },
        { icon: "List", title: "A/L Chemistry Syllabus 2024 - NIE",             meta: "Syllabus - All Mediums" },
      ],
      allChemistry: [
        { label: "Past Papers",      count: "By year" },
        { label: "Marking Schemes",  count: "Answers" },
        { label: "Model Papers",     count: "Practice" },
        { label: "Short Notes",      count: "Revision" },
      ],
    },
  },
};
