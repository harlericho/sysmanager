/**
 * theme.js — Modo oscuro / claro
 * Se carga en <head> ANTES del render para evitar flash de tema incorrecto.
 */
(function () {
  // Aplicar inmediatamente para evitar "flash" de tema incorrecto
  if (localStorage.getItem("sysmanager-theme") === "dark") {
    document.documentElement.classList.add("dark-mode");
  }
})();

function toggleDarkMode() {
  var isDark = document.documentElement.classList.toggle("dark-mode");
  localStorage.setItem("sysmanager-theme", isDark ? "dark" : "light");
  var icon = document.getElementById("theme-toggle-icon");
  if (icon) {
    icon.className = isDark ? "bx bx-sun fs-4" : "bx bx-moon fs-4";
  }
}

// Sincronizar el icono al cargar la página
document.addEventListener("DOMContentLoaded", function () {
  var icon = document.getElementById("theme-toggle-icon");
  if (icon) {
    var isDark = document.documentElement.classList.contains("dark-mode");
    icon.className = isDark ? "bx bx-sun fs-4" : "bx bx-moon fs-4";
  }
});
