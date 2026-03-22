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
  // Decodifica el payload del JWT (sin verificar firma) y devuelve exp en ms.
  getTokenExpiry() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(b64));
      return payload.exp ? payload.exp * 1000 : null;
    } catch (e) {
      return null;
    }
  },
  setSession(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    scheduleAutoLogout(); // programar expiración automática al iniciar sesión
  },
  clear() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
  requiereAuth() {
    if (!this.getToken()) {
      window.location.replace("login.html");
    }
  },
  esAdmin() {
    const u = this.getUser();
    return u && u.rol === "ADMIN";
  },
  logout() {
    this.clear();
    window.location.replace("login.html");
  },
};

// ================================
// Auto-logout por expiración del token
// ================================
var _autoLogoutTimer = null;

function scheduleAutoLogout() {
  clearTimeout(_autoLogoutTimer);
  var exp = Auth.getTokenExpiry();
  if (!exp) return;
  var ms = exp - Date.now();
  if (ms <= 0) {
    // Ya expiró (ej: página recargada con token vencido)
    Auth.clear();
    window.location.replace("login.html");
    return;
  }
  _autoLogoutTimer = setTimeout(function () {
    Auth.clear();
    window.location.replace("login.html");
  }, ms);
}

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
document.addEventListener("DOMContentLoaded", function () {
  renderNavUser();
  scheduleAutoLogout(); // reprogramar si el usuario recargó la página
});

// ── Protección bfcache (botón "atrás" tras cerrar sesión) ────────────────────
window.addEventListener("pagehide", function (e) {
  if (e.persisted) {
    // Guardar la página en bfcache como invisible para evitar flash
    document.documentElement.style.visibility = "hidden";
  }
});

window.addEventListener("pageshow", function (e) {
  if (!e.persisted) return;
  if (!Auth.getToken()) {
    window.location.replace("login.html");
  } else {
    document.documentElement.style.visibility = "";
    scheduleAutoLogout(); // reprogramar tras restauración desde bfcache
  }
});
