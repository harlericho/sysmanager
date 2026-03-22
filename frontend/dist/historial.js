"use strict";
document.documentElement.style.visibility = "";

document.addEventListener("DOMContentLoaded", function () {
  renderNavUser();

  if (Auth.esAdmin()) {
    var menuAdmin = document.getElementById("menu-admin");
    var menuUsuarios = document.getElementById("menu-usuarios");
    if (menuAdmin) menuAdmin.style.display = "";
    if (menuUsuarios) menuUsuarios.style.display = "";
  }

  var params = new URLSearchParams(window.location.search);
  var idCliente = parseInt(params.get("id"), 10);

  if (!idCliente) {
    mostrarError(
      "No se indicó un cliente válido. Vuelve a la lista de clientes.",
    );
    return;
  }

  cargarHistorial(idCliente);
});

// ─── Carga principal ──────────────────────────────────────────────────────────

function cargarHistorial(idCliente) {
  Promise.all([
    api.get("/clientes/" + idCliente),
    api.get("/suscripciones"),
    api.get("/renovaciones"),
  ])
    .then(function (res) {
      var cliente = res[0];
      var todasLasSusc = res[1];
      var todasLasRenov = res[2];

      // Nombre del cliente en la cabecera
      document.getElementById("hist-nombre-cliente").textContent =
        cliente.nombre_empresa || "Cliente";

      // Filtrar suscripciones del cliente
      var misSusc = todasLasSusc.filter(function (s) {
        return parseInt(s.id_cliente) === idCliente;
      });

      // Construir lista de movimientos ordenados por fecha
      var movimientos = [];

      misSusc.forEach(function (s) {
        // Pago de instalación (solo LOCAL y precio > 0)
        if (parseFloat(s.precio_instalacion || 0) > 0) {
          movimientos.push({
            tipo: "INSTALACION",
            fecha: s.fecha_creacion
              ? s.fecha_creacion.slice(0, 10)
              : s.fecha_inicio,
            plan: s.nombre_plan,
            id_susc: s.id,
            periodo: "—",
            monto: parseFloat(s.precio_instalacion),
          });
        }

        // Renovaciones de esta suscripción
        var misRenov = todasLasRenov.filter(function (r) {
          return parseInt(r.id_suscripcion) === s.id;
        });
        misRenov.forEach(function (r) {
          movimientos.push({
            tipo: "RENOVACION",
            fecha: r.fecha_registro
              ? r.fecha_registro.slice(0, 10)
              : r.fecha_inicio,
            plan: s.nombre_plan,
            id_susc: s.id,
            periodo:
              formatFecha(r.fecha_inicio) + " → " + formatFecha(r.fecha_fin),
            monto: parseFloat(r.precio || 0),
          });
        });
      });

      // Ordenar por fecha ascendente
      movimientos.sort(function (a, b) {
        return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0;
      });

      // Totales
      var totalInst = movimientos
        .filter(function (m) {
          return m.tipo === "INSTALACION";
        })
        .reduce(function (s, m) {
          return s + m.monto;
        }, 0);
      var totalRenov = movimientos
        .filter(function (m) {
          return m.tipo === "RENOVACION";
        })
        .reduce(function (s, m) {
          return s + m.monto;
        }, 0);
      var totalGeneral = totalInst + totalRenov;

      document.getElementById("hist-total-inst").textContent =
        "$" + totalInst.toFixed(2);
      document.getElementById("hist-total-renov").textContent =
        "$" + totalRenov.toFixed(2);
      document.getElementById("hist-total-general").textContent =
        "$" + totalGeneral.toFixed(2);

      // Renderizar tabla
      renderTabla(movimientos, totalGeneral);

      // Mostrar contenido
      document.getElementById("hist-loading").style.display = "none";
      document.getElementById("hist-contenido").style.display = "";
    })
    .catch(function (err) {
      mostrarError(err.mensaje || err.error || "Error al cargar el historial.");
    });
}

// ─── Renderizar tabla ─────────────────────────────────────────────────────────

function renderTabla(movimientos, totalGeneral) {
  var tbody = document.getElementById("hist-tabla-body");

  if (!movimientos.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center py-5 text-muted">' +
      '<i class="bx bx-inbox bx-lg mb-2 d-block"></i>' +
      "Este cliente no tiene pagos registrados.</td></tr>";
    return;
  }

  tbody.innerHTML =
    movimientos
      .map(function (m, i) {
        var esInst = m.tipo === "INSTALACION";
        var badge = esInst
          ? '<span class="badge bg-label-warning"><i class="bx bx-download me-1"></i>Instalación</span>'
          : '<span class="badge bg-label-info"><i class="bx bx-refresh me-1"></i>Renovación</span>';

        return (
          "<tr>" +
          '<td><span class="text-muted small">' +
          (i + 1) +
          "</span></td>" +
          "<td>" +
          formatFecha(m.fecha) +
          "</td>" +
          "<td>" +
          badge +
          "</td>" +
          "<td>" +
          escapeHtml(m.plan || "—") +
          ' <small class="text-muted">#' +
          m.id_susc +
          "</small></td>" +
          '<td><small class="text-muted">' +
          escapeHtml(m.periodo) +
          "</small></td>" +
          '<td class="text-end fw-semibold ' +
          (esInst ? "text-warning" : "text-info") +
          '">' +
          "$" +
          m.monto.toFixed(2) +
          "</td>" +
          "</tr>"
        );
      })
      .join("") +
    '<tr class="table-success fw-bold">' +
    '<td colspan="5" class="text-end">TOTAL GENERAL</td>' +
    '<td class="text-end text-success">$' +
    totalGeneral.toFixed(2) +
    "</td>" +
    "</tr>";
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function mostrarError(msg) {
  document.getElementById("hist-loading").style.display = "none";
  var el = document.getElementById("hist-error");
  document.getElementById("hist-error-msg").textContent = msg;
  el.classList.remove("d-none");
}

function formatFecha(f) {
  if (!f) return "—";
  var p = String(f).slice(0, 10).split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
