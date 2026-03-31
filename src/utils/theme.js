export function getInitialTheme() {
  try {
    const saved = localStorage.getItem("ft_theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("ft_theme", theme);
  } catch {
    // ignore
  }
}