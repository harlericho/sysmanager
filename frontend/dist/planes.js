"use strict";
document.documentElement.style.visibility = "";

window.planModule = (function () {
  let modalPlan = null;
  let modalEliminar = null;
  let idEliminar = null;
  let todosLosPlanes = [];
  const esAdmin = Auth.esAdmin();

  // ─── Inicializar ──────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    renderNavUser();

    if (esAdmin) {
      const menuAdmin = document.getElementById("menu-admin");
      const menuUsuarios = document.getElementById("menu-usuarios");
      if (menuAdmin) menuAdmin.style.display = "";
      if (menuUsuarios) menuUsuarios.style.display = "";

      // Solo ADMIN puede crear/editar/desactivar
      document.getElementById("btn-nuevo").classList.remove("d-none");
      document.getElementById("col-acciones").style.display = "";
    }

    modalPlan = new bootstrap.Modal(document.getElementById("modal-plan"));
    modalEliminar = new bootstrap.Modal(
      document.getElementById("modal-eliminar"),
    );

    document
      .getElementById("modal-plan")
      .addEventListener("hidden.bs.modal", limpiarModal);

    document
      .getElementById("btn-confirmar-eliminar")
      .addEventListener("click", ejecutarEliminar);

    document
      .getElementById("input-buscar")
      .addEventListener("input", filtrarTabla);

    cargarTabla();
  });

  // ─── Cargar tabla ─────────────────────────────────────────────────────────────

  function cargarTabla() {
    const tbody = document.getElementById("tabla-body");
    const cols = esAdmin ? 8 : 7;
    tbody.innerHTML =
      '<tr><td colspan="' +
      cols +
      '" class="text-center py-5">' +
      '<div class="spinner-border text-primary" role="status"></div>' +
      '<p class="mt-2 text-muted mb-0">Cargando planes...</p></td></tr>';

    api
      .get("/planes")
      .then(function (data) {
        todosLosPlanes = Array.isArray(data) ? data : [];
        renderTabla(todosLosPlanes);
      })
      .catch(function (err) {
        tbody.innerHTML =
          '<tr><td colspan="' +
          cols +
          '" class="text-center py-4 text-danger">' +
          '<i class="bx bx-error-circle bx-md"></i>' +
          '<p class="mb-0 mt-2">Error al cargar los planes: ' +
          (err.message || "Error desconocido") +
          "</p></td></tr>";
      });
  }

  function renderTabla(planes) {
    const tbody = document.getElementById("tabla-body");
    const footer = document.getElementById("footer-total");
    const cols = esAdmin ? 8 : 7;

    if (!planes || planes.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="' +
        cols +
        '" class="text-center py-5 text-muted">' +
        '<i class="bx bx-inbox bx-lg mb-2 d-block"></i>No se encontraron planes.</td></tr>';
      footer.textContent = "0 registros";
      return;
    }

    const activos = planes.filter(function (p) {
      return p.estado === "A";
    }).length;
    footer.textContent =
      planes.length + " registro(s) — " + activos + " activo(s)";

    tbody.innerHTML = planes
      .map(function (p, i) {
        const tipoBadge =
          p.tipo === "NUBE"
            ? '<span class="badge bg-label-info"><i class="bx bx-cloud me-1"></i>NUBE</span>'
            : '<span class="badge bg-label-warning"><i class="bx bx-desktop me-1"></i>LOCAL</span>';

        const estadoBadge =
          p.estado === "A"
            ? '<span class="badge bg-label-success">Activo</span>'
            : '<span class="badge bg-label-secondary">Inactivo</span>';

        const renovBadge =
          parseInt(p.permite_renovacion) === 1
            ? '<span class="badge bg-label-primary">Si</span>'
            : '<span class="badge bg-label-secondary">No</span>';

        const precio = parseFloat(p.precio || 0).toFixed(2);
        const duracion = parseInt(p.duracion_base);

        const accionesCol = esAdmin
          ? '<td class="text-center">' +
            '<button class="btn btn-sm btn-icon btn-outline-primary me-1" title="Editar" onclick="window.planModule.abrirModalEditar(' +
            p.id +
            ')"><i class="bx bx-edit"></i></button>' +
            (p.estado === "A"
              ? '<button class="btn btn-sm btn-icon btn-outline-danger" title="Desactivar" onclick="window.planModule.confirmarEliminar(' +
                p.id +
                ')"><i class="bx bx-minus-circle"></i></button>'
              : "") +
            "</td>"
          : "";

        return (
          "<tr>" +
          '<td><span class="text-muted small">' +
          (i + 1) +
          "</span></td>" +
          '<td><span class="fw-semibold">' +
          escapeHtml(p.nombre) +
          "</span></td>" +
          "<td>" +
          tipoBadge +
          "</td>" +
          '<td><span class="fw-semibold">' +
          duracion +
          '</span> <small class="text-muted">mes</small></td>' +
          "<td>$ " +
          precio +
          "</td>" +
          "<td>" +
          renovBadge +
          "</td>" +
          "<td>" +
          estadoBadge +
          "</td>" +
          accionesCol +
          "</tr>"
        );
      })
      .join("");
  }

  // ─── Busqueda local ───────────────────────────────────────────────────────────

  function filtrarTabla() {
    const q = document
      .getElementById("input-buscar")
      .value.toLowerCase()
      .trim();
    if (!q) {
      renderTabla(todosLosPlanes);
      return;
    }
    const filtrados = todosLosPlanes.filter(function (p) {
      return (
        (p.nombre && p.nombre.toLowerCase().includes(q)) ||
        (p.tipo && p.tipo.toLowerCase().includes(q))
      );
    });
    renderTabla(filtrados);
  }

  // ─── Modal Nuevo ──────────────────────────────────────────────────────────────

  function abrirModalNuevo() {
    limpiarModal();
    document.getElementById("modal-titulo").textContent = "Nuevo Plan";
    document.getElementById("campo-estado").style.display = "none";
    modalPlan.show();
  }

  // ─── Modal Editar ─────────────────────────────────────────────────────────────

  function abrirModalEditar(id) {
    limpiarModal();
    document.getElementById("modal-titulo").textContent = "Editar Plan";
    document.getElementById("btn-guardar").disabled = true;

    api
      .get("/planes/" + id)
      .then(function (p) {
        document.getElementById("f-id").value = p.id;
        document.getElementById("f-nombre").value = p.nombre || "";
        document.getElementById("f-tipo").value = p.tipo || "";
        document.getElementById("f-duracion_base").value =
          p.duracion_base || "";
        document.getElementById("f-precio").value =
          p.precio != null ? parseFloat(p.precio).toFixed(2) : "0.00";
        document.getElementById("f-permite_renovacion").value = String(
          parseInt(p.permite_renovacion),
        );
        const estadoVal = p.estado === "I" ? "I" : "A";
        document.querySelector(
          'input[name="estado"][value="' + estadoVal + '"]',
        ).checked = true;
        document.getElementById("campo-estado").style.display = "";
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.mensaje || err.error || "Error al cargar los datos del plan.",
        );
      })
      .finally(function () {
        document.getElementById("btn-guardar").disabled = false;
      });

    modalPlan.show();
  }

  // ─── Guardar ──────────────────────────────────────────────────────────────────

  function guardar() {
    const id = document.getElementById("f-id").value;
    const nombre = document.getElementById("f-nombre").value.trim();
    const tipo = document.getElementById("f-tipo").value;
    const duracion = document.getElementById("f-duracion_base").value.trim();

    // Limpiar validaciones previas
    ["f-nombre", "f-tipo", "f-duracion_base"].forEach(function (fid) {
      document.getElementById(fid).classList.remove("is-invalid");
    });

    let valido = true;
    if (!nombre) {
      document.getElementById("f-nombre").classList.add("is-invalid");
      valido = false;
    }
    if (!tipo) {
      document.getElementById("f-tipo").classList.add("is-invalid");
      valido = false;
    }
    if (!duracion || parseInt(duracion) < 1) {
      document.getElementById("f-duracion_base").classList.add("is-invalid");
      valido = false;
    }
    if (!valido) return;

    const payload = {
      nombre: nombre,
      tipo: tipo,
      duracion_base: parseInt(duracion),
      precio: parseFloat(document.getElementById("f-precio").value || 0),
      permite_renovacion: parseInt(
        document.getElementById("f-permite_renovacion").value,
      ),
    };

    if (id) {
      payload.estado = document.querySelector(
        'input[name="estado"]:checked',
      ).value;
    }

    const spinner = document.getElementById("btn-guardar-spinner");
    const btnG = document.getElementById("btn-guardar");
    spinner.classList.remove("d-none");
    btnG.disabled = true;

    const peticion = id
      ? api.put("/planes/" + id, payload)
      : api.post("/planes", payload);

    peticion
      .then(function (resp) {
        modalPlan.hide();
        mostrarAlertaGlobal(
          "success",
          resp.mensaje || "Operacion realizada con exito.",
        );
        cargarTabla();
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.mensaje || err.error || "No se pudo guardar el plan.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnG.disabled = false;
      });
  }

  // ─── Eliminar (desactivar) ────────────────────────────────────────────────────

  function confirmarEliminar(id) {
    idEliminar = id;
    var plan = todosLosPlanes.find(function (p) {
      return p.id == id;
    });
    document.getElementById("eliminar-nombre").textContent = plan
      ? plan.nombre
      : "este plan";
    modalEliminar.show();
  }

  function ejecutarEliminar() {
    if (!idEliminar) return;

    const spinner = document.getElementById("btn-eliminar-spinner");
    const btnE = document.getElementById("btn-confirmar-eliminar");
    spinner.classList.remove("d-none");
    btnE.disabled = true;

    api
      .delete("/planes/" + idEliminar)
      .then(function (resp) {
        if (!resp) return;
        modalEliminar.hide();
        mostrarAlertaGlobal(
          "warning",
          resp.mensaje || "Plan desactivado correctamente.",
        );
        cargarTabla();
      })
      .catch(function (err) {
        modalEliminar.hide();
        mostrarAlertaGlobal(
          "danger",
          (err && (err.mensaje || err.error)) ||
            "No se pudo desactivar el plan.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnE.disabled = false;
        idEliminar = null;
      });
  }

  // ─── Alertas ──────────────────────────────────────────────────────────────────

  function mostrarAlertaGlobal(tipo, msg) {
    const el = document.getElementById("alerta-global");
    if (!el) return;
    el.className = "alert alert-" + tipo + " alert-dismissible fade show";
    el.innerHTML =
      '<i class="bx ' +
      (tipo === "success"
        ? "bx-check-circle"
        : tipo === "warning"
          ? "bx-bell"
          : "bx-error-circle") +
      ' me-2"></i>' +
      escapeHtml(msg) +
      '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.className = "alert d-none";
    }, 4000);
  }

  function mostrarAlertaModal(tipo, msg) {
    const el = document.getElementById("alerta-modal");
    el.className = "alert alert-" + tipo;
    el.textContent = msg;
  }

  // ─── Limpiar modal ────────────────────────────────────────────────────────────

  function limpiarModal() {
    document.getElementById("form-plan").reset();
    document.getElementById("f-id").value = "";
    document.getElementById("alerta-modal").className =
      "alert alert-danger d-none";
    ["f-nombre", "f-tipo", "f-duracion_base"].forEach(function (fid) {
      document.getElementById(fid).classList.remove("is-invalid");
    });
    document.getElementById("campo-estado").style.display = "none";
    document.getElementById("btn-guardar").disabled = false;
    document.getElementById("btn-guardar-spinner").classList.add("d-none");
  }

  // ─── Utilidad ─────────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ─── API publica ──────────────────────────────────────────────────────────────
  return {
    abrirModalNuevo: abrirModalNuevo,
    abrirModalEditar: abrirModalEditar,
    guardar: guardar,
    confirmarEliminar: confirmarEliminar,
  };
})();
