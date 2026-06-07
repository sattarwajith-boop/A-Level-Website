/**
 * ═══════════════════════════════════════════════════════
 *  THE DARK ROOM — theme.js
 *  Handles light / dark mode toggle.
 *  Default theme: DARK
 *  Persists choice to localStorage so it survives refreshes.
 * ═══════════════════════════════════════════════════════
 */

(function () {
  const STORAGE_KEY = "tdr-theme";
  const ROOT        = document.documentElement;

  /* ── Apply theme to <html> as a data attribute ───── */
  function applyTheme(theme) {
    ROOT.setAttribute("data-theme", theme);           // drives CSS vars in styles.css
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleButton(theme);
  }

  /* ── Update every toggle button's label / icon ───── */
  function updateToggleButton(theme) {
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      if (theme === "dark") {
        btn.setAttribute("aria-label", "Switch to light mode");
        btn.innerHTML = `
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1"  x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22"  x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1"  y1="12" x2="3"  y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <span>Light</span>`;
      } else {
        btn.setAttribute("aria-label", "Switch to dark mode");
        btn.innerHTML = `
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <span>Dark</span>`;
      }
    });
  }

  /* ── Toggle between themes ───────────────────────── */
  function toggleTheme() {
    var current = ROOT.getAttribute("data-theme") || "dark";
    applyTheme(current === "light" ? "dark" : "light");
  }

  /* ── Attach click handler to all toggle buttons ─── */
  function attachListeners() {
    document.querySelectorAll(".theme-toggle").forEach(function (btn) {
      btn.addEventListener("click", toggleTheme);
    });
  }

  /* ── Boot: load saved preference (default = dark) ─ */
  function init() {
    var saved = localStorage.getItem(STORAGE_KEY) || "dark";
    applyTheme(saved);
    attachListeners();
  }

  /* Run after DOM is ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
