const toggle = document.getElementById("darkToggle");

function applyMode(isDark) {
  document.documentElement.classList.toggle("dark-mode", isDark);
  localStorage.setItem("darkMode", isDark);
  toggle.checked = isDark;
}

toggle.addEventListener("change", () => {
  applyMode(toggle.checked);
});

/* Mantener preferencia */
if (localStorage.getItem("darkMode") === "true") {
  applyMode(true);
}
