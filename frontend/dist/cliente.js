"use strict";
document.documentElement.style.visibility = "";

window.clienteModule = (function () {
  let modalCliente = null;
  let modalEliminar = null;
  let idEliminar = null;
  let todosLosClientes = [];

  // ─── Inicializar ─────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    renderNavUser();

    if (Auth.esAdmin()) {
      const menuAdmin = document.getElementById("menu-admin");
      const menuUsuarios = document.getElementById("menu-usuarios");
      if (menuAdmin) menuAdmin.style.display = "";
      if (menuUsuarios) menuUsuarios.style.display = "";
    }

    modalCliente = new bootstrap.Modal(
      document.getElementById("modal-cliente"),
    );
    modalEliminar = new bootstrap.Modal(
      document.getElementById("modal-eliminar"),
    );

    document
      .getElementById("modal-cliente")
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
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center py-5">' +
      '<div class="spinner-border text-primary" role="status"></div>' +
      '<p class="mt-2 text-muted mb-0">Cargando clientes...</p></td></tr>';

    api
      .get("/clientes")
      .then(function (data) {
        todosLosClientes = Array.isArray(data) ? data : [];
        renderTabla(todosLosClientes);
      })
      .catch(function (err) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="text-center py-4 text-danger">' +
          '<i class="bx bx-error-circle bx-md"></i>' +
          '<p class="mb-0 mt-2">Error al cargar los clientes: ' +
          (err.message || "Error desconocido") +
          "</p></td></tr>";
      });
  }

  function renderTabla(clientes) {
    const tbody = document.getElementById("tabla-body");
    const footer = document.getElementById("footer-total");

    if (!clientes || clientes.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center py-5 text-muted">' +
        '<i class="bx bx-inbox bx-lg mb-2 d-block"></i>No se encontraron clientes.</td></tr>';
      footer.textContent = "0 registros";
      return;
    }

    const activos = clientes.filter(function (c) {
      return c.estado === "A";
    }).length;
    footer.textContent =
      clientes.length + " registro(s) — " + activos + " activo(s)";

    tbody.innerHTML = clientes
      .map(function (c, i) {
        const estadoBadge =
          c.estado === "A"
            ? '<span class="badge bg-label-success">Activo</span>'
            : '<span class="badge bg-label-secondary">Inactivo</span>';

        const btnEditar = Auth.esAdmin()
          ? '<button class="btn btn-sm btn-icon btn-outline-primary me-1" title="Editar" onclick="window.clienteModule.abrirModalEditar(' +
            c.id +
            ')"><i class="bx bx-edit"></i></button>'
          : "";

        const btnEliminar =
          Auth.esAdmin() && c.estado === "A"
            ? '<button class="btn btn-sm btn-icon btn-outline-danger" title="Desactivar" onclick="window.clienteModule.confirmarEliminar(' +
              c.id +
              ')"><i class="bx bx-user-minus"></i></button>'
            : "";

        return (
          "<tr>" +
          '<td><span class="text-muted small">' +
          (i + 1) +
          "</span></td>" +
          '<td><span class="fw-semibold">' +
          escapeHtml(c.nombre_empresa) +
          "</span></td>" +
          "<td>" +
          (c.ruc ? escapeHtml(c.ruc) : '<span class="text-muted">—</span>') +
          "</td>" +
          "<td>" +
          (c.email
            ? '<a href="mailto:' +
              escapeHtml(c.email) +
              '">' +
              escapeHtml(c.email) +
              "</a>"
            : '<span class="text-muted">—</span>') +
          "</td>" +
          "<td>" +
          (c.telefono
            ? escapeHtml(c.telefono)
            : '<span class="text-muted">—</span>') +
          "</td>" +
          "<td>" +
          estadoBadge +
          "</td>" +
          '<td class="text-center">' +
          btnEditar +
          btnEliminar +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  // ─── Búsqueda local ────────────────────────────────────────────────────────────

  function filtrarTabla() {
    const q = document
      .getElementById("input-buscar")
      .value.toLowerCase()
      .trim();
    if (!q) {
      renderTabla(todosLosClientes);
      return;
    }
    const filtrados = todosLosClientes.filter(function (c) {
      return (
        (c.nombre_empresa && c.nombre_empresa.toLowerCase().includes(q)) ||
        (c.ruc && c.ruc.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.telefono && c.telefono.toLowerCase().includes(q))
      );
    });
    renderTabla(filtrados);
  }

  // ─── Modal Nuevo ─────────────────────────────────────────────────────────────────

  function abrirModalNuevo() {
    limpiarModal();
    document.getElementById("modal-titulo").textContent = "Nuevo Cliente";
    document.getElementById("campo-estado").style.display = "none";
    modalCliente.show();
  }

  // ─── Modal Editar ─────────────────────────────────────────────────────────────────

  function abrirModalEditar(id) {
    limpiarModal();
    document.getElementById("modal-titulo").textContent = "Editar Cliente";
    document.getElementById("btn-guardar").disabled = true;

    api
      .get("/clientes/" + id)
      .then(function (c) {
        document.getElementById("f-id").value = c.id;
        document.getElementById("f-nombre_empresa").value =
          c.nombre_empresa || "";
        document.getElementById("f-ruc").value = c.ruc || "";
        document.getElementById("f-telefono").value = c.telefono || "";
        document.getElementById("f-email").value = c.email || "";
        document.getElementById("f-usuario").value = c.usuario || "";
        const estadoVal = c.estado === "I" ? "I" : "A";
        document.querySelector(
          'input[name="estado"][value="' + estadoVal + '"]',
        ).checked = true;
        document.getElementById("campo-estado").style.display = "";
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.mensaje || err.error || "Error al cargar los datos del cliente.",
        );
      })
      .finally(function () {
        document.getElementById("btn-guardar").disabled = false;
      });

    modalCliente.show();
  }

  // ─── Guardar (crear o editar) ──────────────────────────────────────────────────

  function guardar() {
    const id = document.getElementById("f-id").value;
    const nombreEmpresa = document
      .getElementById("f-nombre_empresa")
      .value.trim();

    const inputNombre = document.getElementById("f-nombre_empresa");
    inputNombre.classList.remove("is-invalid");

    if (!nombreEmpresa) {
      inputNombre.classList.add("is-invalid");
      inputNombre.focus();
      return;
    }

    const payload = {
      nombre_empresa: nombreEmpresa,
      ruc: document.getElementById("f-ruc").value.trim(),
      telefono: document.getElementById("f-telefono").value.trim(),
      email: document.getElementById("f-email").value.trim(),
      usuario: document.getElementById("f-usuario").value.trim(),
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
      ? api.put("/clientes/" + id, payload)
      : api.post("/clientes", payload);

    peticion
      .then(function (resp) {
        modalCliente.hide();
        mostrarAlertaGlobal(
          "success",
          resp.mensaje || "Operacion realizada con exito.",
        );
        cargarTabla();
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.mensaje || err.error || "No se pudo guardar el cliente.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnG.disabled = false;
      });
  }

  // ─── Eliminar (desactivar) ─────────────────────────────────────────────────────

  function confirmarEliminar(id) {
    idEliminar = id;
    var cliente = todosLosClientes.find(function (c) {
      return c.id == id;
    });
    document.getElementById("eliminar-nombre").textContent = cliente
      ? cliente.nombre_empresa
      : "este cliente";
    modalEliminar.show();
  }

  function ejecutarEliminar() {
    if (!idEliminar) return;

    const spinner = document.getElementById("btn-eliminar-spinner");
    const btnE = document.getElementById("btn-confirmar-eliminar");
    spinner.classList.remove("d-none");
    btnE.disabled = true;

    api
      .delete("/clientes/" + idEliminar)
      .then(function (resp) {
        if (!resp) return; // navegación por 401 en curso
        modalEliminar.hide();
        mostrarAlertaGlobal(
          "warning",
          resp.mensaje || "Cliente desactivado correctamente.",
        );
        cargarTabla();
      })
      .catch(function (err) {
        modalEliminar.hide();
        mostrarAlertaGlobal(
          "danger",
          (err && (err.mensaje || err.error)) ||
            "No se pudo desactivar el cliente.",
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

  // ─── Limpiar modal ─────────────────────────────────────────────────────────────

  function limpiarModal() {
    document.getElementById("form-cliente").reset();
    document.getElementById("f-id").value = "";
    document.getElementById("alerta-modal").className =
      "alert alert-danger d-none";
    document.getElementById("f-nombre_empresa").classList.remove("is-invalid");
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

  // ─── API pública ──────────────────────────────────────────────────────────────
  return {
    abrirModalNuevo: abrirModalNuevo,
    abrirModalEditar: abrirModalEditar,
    guardar: guardar,
    confirmarEliminar: confirmarEliminar,
  };
})();
