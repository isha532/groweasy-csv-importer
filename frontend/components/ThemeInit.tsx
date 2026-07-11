const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("groweasy-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

/** Runs before paint so toggling dark mode never causes a flash of the wrong theme. */
export function ThemeInit() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
