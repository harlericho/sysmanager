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

// Datos en memoria para búsqueda global
var _datosGlobales = {
  clientes: [],
  planes: [],
  suscripciones: [],
  renovaciones: [],
};

// ─────────────────────────────────────────────────
// Dashboard: estadísticas + tabla de recientes
// ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", function () {
  iniciarBuscador();
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
      api.get("/planes"),
    ]);
    var clientes = results[0];
    var suscripciones = results[1];
    var renovaciones = results[2];
    var planes = results[3];
    _datosGlobales = {
      clientes: clientes,
      planes: planes,
      suscripciones: suscripciones,
      renovaciones: renovaciones,
    };

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

function iniciarBuscador() {
  var input = document.getElementById("navbar-buscar");
  var dropdown = document.getElementById("search-results");
  if (!input || !dropdown) return;

  input.addEventListener("input", function () {
    var q = this.value.trim().toLowerCase();
    if (q.length < 2) {
      dropdown.style.display = "none";
      return;
    }
    var html = "";

    // Clientes
    var rClientes = _datosGlobales.clientes
      .filter(function (c) {
        return (
          (c.nombre_empresa && c.nombre_empresa.toLowerCase().includes(q)) ||
          (c.ruc && c.ruc.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
        );
      })
      .slice(0, 4);
    if (rClientes.length) {
      html += seccionHeader("Clientes");
      rClientes.forEach(function (c) {
        html +=
          '<a href="historial.html?id=' +
          c.id +
          '" class="d-flex align-items-center px-3 py-2 search-item">' +
          '<i class="bx bx-buildings me-2 text-primary"></i>' +
          '<div><div class="fw-semibold" style="font-size:.875rem;">' +
          c.nombre_empresa +
          "</div>" +
          '<small class="text-muted">' +
          (c.ruc || "") +
          (c.email ? " · " + c.email : "") +
          "</small></div></a>";
      });
    }

    // Planes
    var rPlanes = _datosGlobales.planes
      .filter(function (p) {
        return (
          (p.nombre && p.nombre.toLowerCase().includes(q)) ||
          (p.tipo && p.tipo.toLowerCase().includes(q))
        );
      })
      .slice(0, 3);
    if (rPlanes.length) {
      html += seccionHeader("Planes");
      rPlanes.forEach(function (p) {
        html +=
          '<a href="planes.html" class="d-flex align-items-center px-3 py-2 search-item">' +
          '<i class="bx bx-package me-2 text-info"></i>' +
          '<div><div class="fw-semibold" style="font-size:.875rem;">' +
          p.nombre +
          "</div>" +
          '<small class="text-muted">' +
          p.tipo +
          "</small></div></a>";
      });
    }

    // Suscripciones
    var rSusc = _datosGlobales.suscripciones
      .filter(function (s) {
        return (
          (s.nombre_empresa && s.nombre_empresa.toLowerCase().includes(q)) ||
          (s.nombre_plan && s.nombre_plan.toLowerCase().includes(q))
        );
      })
      .slice(0, 3);
    if (rSusc.length) {
      html += seccionHeader("Suscripciones");
      rSusc.forEach(function (s) {
        html +=
          '<a href="suscripciones.html" class="d-flex align-items-center px-3 py-2 search-item">' +
          '<i class="bx bx-file me-2 text-success"></i>' +
          '<div><div class="fw-semibold" style="font-size:.875rem;">' +
          s.nombre_empresa +
          "</div>" +
          '<small class="text-muted">' +
          s.nombre_plan +
          " · " +
          s.estado +
          "</small></div></a>";
      });
    }

    // Renovaciones
    var rRenov = _datosGlobales.renovaciones
      .filter(function (r) {
        return r.nombre_empresa && r.nombre_empresa.toLowerCase().includes(q);
      })
      .slice(0, 3);
    if (rRenov.length) {
      html += seccionHeader("Renovaciones");
      rRenov.forEach(function (r) {
        html +=
          '<a href="renovaciones.html" class="d-flex align-items-center px-3 py-2 search-item">' +
          '<i class="bx bx-refresh me-2 text-warning"></i>' +
          '<div><div class="fw-semibold" style="font-size:.875rem;">' +
          r.nombre_empresa +
          "</div>" +
          '<small class="text-muted">' +
          (r.fecha_registro ? r.fecha_registro.slice(0, 10) : "") +
          "</small></div></a>";
      });
    }

    if (!html) {
      html =
        '<div class="px-3 py-3 text-muted text-center" style="font-size:.875rem;">Sin resultados para &ldquo;' +
        q +
        "&rdquo;</div>";
    }
    dropdown.innerHTML = html;
    dropdown.style.display = "block";
  });

  // Cerrar al hacer click fuera
  document.addEventListener("click", function (e) {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });

  // Cerrar con Escape
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      dropdown.style.display = "none";
      this.value = "";
    }
  });
}

function seccionHeader(titulo) {
  return (
    '<div class="px-3 pt-2 pb-1" style="border-top:1px solid #f0f0f0;"><small class="text-muted fw-semibold text-uppercase" style="font-size:.7rem;letter-spacing:.05em;">' +
    titulo +
    "</small></div>"
  );
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
