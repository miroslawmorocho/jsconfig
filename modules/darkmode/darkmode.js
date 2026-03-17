const toggle = document.getElementById("darkToggle");

function applyMode(isDark) {
  document.documentElement.classList.toggle("dark-mode", isDark);
  localStorage.setItem("darkMode", isDark);
  toggle.checked = isDark;
}

/* Detectar preferencia del usuario SOLO si no hay storage */
const saved = localStorage.getItem("darkMode");

if (saved !== null) {
  applyMode(saved === "true");
} else {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyMode(prefersDark);
}

/* Escuchar cambio manual */
toggle.addEventListener("change", () => {
  applyMode(toggle.checked);
});
