"use strict";

// El guard principal (si hay sesión → redirigir a index) está en
// el <head> de login.html como inline script.
// Si llegamos aquí es porque NO hay sesión → mostrar el login.
document.documentElement.style.visibility = "";

// ─────────────────────────────────────────────────
// Lógica del formulario de login
// ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("formAuthentication");
  var alertEl = document.getElementById("alert-login");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    alertEl.classList.add("d-none");

    var usuario = (document.getElementById("username").value || "").trim();
    var password = document.getElementById("password").value || "";
    var btn = form.querySelector('button[type="submit"]');

    if (!usuario || !password) {
      mostrarAlerta("Por favor ingresa usuario y contraseña.");
      return;
    }

    // Estado de carga
    btn.disabled = true;
    var textoOrig = btn.innerHTML;
    btn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-1"></span> Iniciando...';

    try {
      // Usamos fetch directo para que un 401 (credenciales inválidas)
      // no active el redirect global de apiRequest().
      var res = await fetch(API_BASE + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario, password: password }),
      });
      var data = await res.json();
      if (!res.ok) throw data;
      Auth.setSession(data.token, data.usuario);
      // replace() evita que el botón "atrás" regrese al login
      window.location.replace("index.html");
    } catch (err) {
      mostrarAlerta(
        (err && err.mensaje) ||
          (err && err.error) ||
          "Usuario o contraseña incorrectos.",
      );
      btn.disabled = false;
      btn.innerHTML = textoOrig;
    }
  });

  function mostrarAlerta(msg) {
    alertEl.textContent = msg;
    alertEl.classList.remove("d-none");
  }
});
