// js/api.js — Configuración central de la API y helpers de fetch

"use strict";

// DESARROLLO LOCAL (php -S):
// const API_BASE = "http://localhost:8000";
// LARAGON / WAMP local:
// const API_BASE = "http://localhost/sysmanager/backend/public";
// PRODUCCIÓN HOSTINGER:
const API_BASE = "https://solucionesitec.com/sysmanager/backend/public";

// ================================
// Auth helpers
// ================================
const Auth = {
  getToken() {
    return localStorage.getItem("token");
  },
  getUser() {
    return JSON.parse(localStorage.getItem("user") || "null");
  },
  setSession(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
  requiereAuth() {
    if (!this.getToken()) {
      // replace() evita que la página protegida quede en el historial
      window.location.replace("login.html");
    }
  },
  esAdmin() {
    const u = this.getUser();
    return u && u.rol === "ADMIN";
  },
  logout() {
    this.clear();
    // replace() borra el dashboard del historial → el botón "atrás" no regresa
    window.location.replace("login.html");
  },
};

// ================================
// Fetch helper
// ================================
async function apiRequest(method, endpoint, body = null) {
  const token = Auth.getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(API_BASE + endpoint, opts);

  if (res.status === 401 || res.status === 403) {
    Auth.clear();
    window.location.replace("login.html");
    return;
  }

  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

const api = {
  get: (url) => apiRequest("GET", url),
  post: (url, body) => apiRequest("POST", url, body),
  put: (url, body) => apiRequest("PUT", url, body),
  delete: (url) => apiRequest("DELETE", url),
};

// ================================
// Mostrar nombre/rol del usuario en navbar
// ================================
function renderNavUser() {
  const user = Auth.getUser();
  if (!user) return;
  const nameEl = document.getElementById("nav-user-name");
  const roleEl = document.getElementById("nav-user-role");
  if (nameEl) nameEl.textContent = user.nombres || user.usuario;
  if (roleEl) roleEl.textContent = user.rol;
}

// Ejecutar al cargar
document.addEventListener("DOMContentLoaded", renderNavUser);

// Protección contra bfcache: cuando el navegador restaura una página
// desde el historial (botón "atrás") sin volver a ejecutar los scripts,
// pageshow con e.persisted=true es el único evento que se dispara.
window.addEventListener("pageshow", function (e) {
  if (e.persisted && !Auth.getToken()) {
    // La sesión ya no existe → ocultar y redirigir
    document.documentElement.style.visibility = "hidden";
    window.location.replace("login.html");
  }
});
