"use strict";

// El guard principal está en el <head> de index.html (inline).
// Aquí solo restauramos la visibilidad: si llegamos hasta este
// punto es porque Auth.getToken() existe → mostrar la página.
document.documentElement.style.visibility = "";

// ─────────────────────────────────────────────────
// Dashboard: estadísticas + tabla de recientes
// ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  // Menú de administración solo para ADMIN
  if (Auth.esAdmin()) {
    var elAdmin = document.getElementById("menu-admin");
    var elUsuarios = document.getElementById("menu-usuarios");
    if (elAdmin) elAdmin.style.display = "";
    if (elUsuarios) elUsuarios.style.display = "";
  }

  // Saludo personalizado
  var user = Auth.getUser();
  if (user) {
    var dashName = document.getElementById("dash-user-name");
    if (dashName) dashName.textContent = user.nombres || user.usuario;
  }

  cargarDashboard();
});

async function cargarDashboard() {
  try {
    var results = await Promise.all([
      api.get("/clientes"),
      api.get("/suscripciones"),
      api.get("/planes"),
    ]);
    var clientes = results[0];
    var suscripciones = results[1];
    var planes = results[2];

    document.getElementById("stat-clientes").textContent = clientes.length;
    document.getElementById("stat-planes").textContent = planes.length;

    var activas = suscripciones.filter(function (s) {
      return s.estado === "ACTIVO";
    }).length;
    var vencidas = suscripciones.filter(function (s) {
      return s.estado === "VENCIDO";
    }).length;
    document.getElementById("stat-activas").textContent = activas;
    document.getElementById("stat-vencidas").textContent = vencidas;

    // Últimas 5 suscripciones (más recientes primero)
    var recientes = suscripciones.slice().reverse().slice(0, 5);
    var tbody = document.getElementById("tbl-recientes");
    if (!tbody) return;

    if (!recientes.length) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center py-3 text-muted">Sin registros</td></tr>';
      return;
    }

    tbody.innerHTML = recientes
      .map(function (s) {
        return (
          "<tr>" +
          "<td>" +
          s.id +
          "</td>" +
          "<td><strong>" +
          s.nombre_empresa +
          "</strong></td>" +
          "<td>" +
          s.nombre_plan +
          "</td>" +
          '<td><span class="badge bg-label-secondary">' +
          s.tipo_pago +
          "</span></td>" +
          "<td>" +
          s.fecha_fin +
          "</td>" +
          "<td>" +
          badgeEstado(s.estado) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  } catch (e) {
    var tbody2 = document.getElementById("tbl-recientes");
    if (tbody2) {
      tbody2.innerHTML =
        '<tr><td colspan="6" class="text-center text-danger py-3">Error al cargar datos</td></tr>';
    }
  }
}

function badgeEstado(estado) {
  var map = { ACTIVO: "success", VENCIDO: "warning", CANCELADO: "danger" };
  return (
    '<span class="badge bg-label-' +
    (map[estado] || "secondary") +
    '">' +
    estado +
    "</span>"
  );
}
