"use strict";

document.documentElement.style.visibility = "";

function fechaLocalHoy() {
  var d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

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
      api.get("/renovaciones"),
    ]);
    var clientes = results[0];
    var suscripciones = results[1];
    var renovaciones = results[2];

    document.getElementById("stat-clientes").textContent = clientes.length;

    var activas = suscripciones.filter(function (s) {
      return s.estado === "ACTIVO";
    }).length;
    var vencidas = suscripciones.filter(function (s) {
      return s.estado === "VENCIDO";
    }).length;
    document.getElementById("stat-activas").textContent = activas;
    document.getElementById("stat-vencidas").textContent = vencidas;

    // Suscripciones activas que vencen en los próximos 30 días
    var hoy = fechaLocalHoy();
    var d30 = new Date();
    d30.setDate(d30.getDate() + 30);
    var hoy30 =
      d30.getFullYear() +
      "-" +
      String(d30.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d30.getDate()).padStart(2, "0");
    var porVencer = suscripciones.filter(function (s) {
      return (
        s.estado === "ACTIVO" && s.fecha_fin >= hoy && s.fecha_fin <= hoy30
      );
    }).length;
    document.getElementById("stat-por-vencer").textContent = porVencer;

    // Ingresos del mes: renovaciones + instalaciones creadas este mes
    var mesActual = hoy.slice(0, 7); // "YYYY-MM"
    var ingRenovaciones = renovaciones
      .filter(function (r) {
        return r.fecha_registro && r.fecha_registro.slice(0, 7) === mesActual;
      })
      .reduce(function (sum, r) {
        return sum + parseFloat(r.precio || 0);
      }, 0);
    var ingInstalaciones = suscripciones
      .filter(function (s) {
        return (
          s.fecha_creacion &&
          s.fecha_creacion.slice(0, 7) === mesActual &&
          parseFloat(s.precio_instalacion || 0) > 0
        );
      })
      .reduce(function (sum, s) {
        return sum + parseFloat(s.precio_instalacion || 0);
      }, 0);
    var totalMes = ingRenovaciones + ingInstalaciones;
    document.getElementById("stat-ingresos").textContent =
      "$" + totalMes.toFixed(2);
    var partes = [];
    if (ingInstalaciones > 0)
      partes.push("instalaciones $" + ingInstalaciones.toFixed(2));
    if (ingRenovaciones > 0)
      partes.push("renovaciones $" + ingRenovaciones.toFixed(2));
    document.getElementById("stat-ingresos-detalle").textContent = partes.length
      ? partes.join(" + ")
      : "Sin ingresos registrados este mes";

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
