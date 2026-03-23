"use strict";
document.documentElement.style.visibility = "";

window.licenciaModule = (function () {
  let modalLicencia = null;
  let modalRevocar = null;
  let idRevocar = null;
  let todasLasLicencias = [];

  // ─── Inicializar ──────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    renderNavUser();

    if (Auth.esAdmin()) {
      const menuAdmin = document.getElementById("menu-admin");
      const menuUsuarios = document.getElementById("menu-usuarios");
      if (menuAdmin) menuAdmin.style.display = "";
      if (menuUsuarios) menuUsuarios.style.display = "";
    }

    modalLicencia = new bootstrap.Modal(
      document.getElementById("modal-licencia"),
    );
    modalRevocar = new bootstrap.Modal(
      document.getElementById("modal-revocar"),
    );

    document
      .getElementById("modal-licencia")
      .addEventListener("hidden.bs.modal", limpiarModal);

    document
      .getElementById("btn-confirmar-revocar")
      .addEventListener("click", ejecutarRevocar);

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
      '<p class="mt-2 text-muted mb-0">Cargando licencias...</p></td></tr>';

    api
      .get("/licencias")
      .then(function (data) {
        todasLasLicencias = Array.isArray(data) ? data : [];
        renderTabla(todasLasLicencias);
      })
      .catch(function (err) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="text-center py-4 text-danger">' +
          '<i class="bx bx-error-circle bx-md"></i>' +
          '<p class="mb-0 mt-2">Error al cargar: ' +
          (err.message || "Error desconocido") +
          "</p></td></tr>";
      });
  }

  function renderTabla(lista) {
    const tbody = document.getElementById("tabla-body");
    const footer = document.getElementById("footer-total");

    if (!lista || lista.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="9" class="text-center py-5 text-muted">' +
        '<i class="bx bx-key bx-lg mb-2 d-block"></i>No se encontraron licencias.</td></tr>';
      footer.textContent = "0 registros";
      return;
    }

    const activas = lista.filter(function (l) {
      return l.estado_display === "ACTIVA";
    }).length;
    footer.textContent =
      lista.length + " registro(s) — " + activas + " activa(s)";

    tbody.innerHTML = lista
      .map(function (l, i) {
        const estado = l.estado_display || l.estado;

        const estadoBadge =
          estado === "ACTIVA"
            ? '<span class="badge bg-label-success">ACTIVA</span>'
            : estado === "VENCIDA"
              ? '<span class="badge bg-label-warning">VENCIDA</span>'
              : '<span class="badge bg-label-danger">REVOCADA</span>';

        const claveCelda =
          '<span class="font-monospace fw-semibold text-primary">' +
          escapeHtml(l.clave_licencia) +
          "</span>" +
          '<button class="btn btn-sm btn-icon btn-outline-secondary ms-2" ' +
          'title="Copiar clave" onclick="window.licenciaModule.copiarClave(\'' +
          escapeHtml(l.clave_licencia) +
          "', this)\">" +
          '<i class="bx bx-copy"></i></button>';

        const diasNum = parseInt(l.dias_restantes, 10);
        let diasCelda;
        if (estado === "REVOCADA") {
          diasCelda = '<span class="text-muted">—</span>';
        } else if (estado === "VENCIDA" || diasNum <= 0) {
          diasCelda = '<span class="badge bg-label-danger">Vencida</span>';
        } else if (diasNum <= 30) {
          diasCelda =
            '<span class="badge bg-label-warning">' + diasNum + " días</span>";
        } else {
          diasCelda =
            '<span class="text-success fw-semibold">' +
            diasNum +
            " días</span>";
        }

        const btnRegenerar =
          estado === "ACTIVA"
            ? '<button class="btn btn-sm btn-icon btn-outline-warning me-1" title="Regenerar clave" onclick="window.licenciaModule.regenerarClave(' +
              l.id +
              ')"><i class="bx bx-refresh"></i></button>'
            : "";

        const btnRevocar =
          estado === "ACTIVA"
            ? '<button class="btn btn-sm btn-icon btn-outline-danger" title="Revocar" onclick="window.licenciaModule.confirmarRevocar(' +
              l.id +
              ')"><i class="bx bx-block"></i></button>'
            : "";

        return (
          "<tr>" +
          '<td><span class="text-muted small">' +
          (i + 1) +
          "</span></td>" +
          '<td><span class="fw-semibold">' +
          escapeHtml(l.nombre_empresa) +
          "</span></td>" +
          '<td><span class="badge bg-label-secondary">#' +
          l.id_suscripcion +
          "</span></td>" +
          "<td>" +
          claveCelda +
          "</td>" +
          "<td>" +
          estadoBadge +
          "</td>" +
          "<td>" +
          formatFecha(l.fecha_emision) +
          "</td>" +
          "<td>" +
          formatFecha(l.fecha_vencimiento) +
          "</td>" +
          '<td class="text-center">' +
          diasCelda +
          "</td>" +
          '<td class="text-center">' +
          btnRegenerar +
          btnRevocar +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  // ─── Filtro busqueda ──────────────────────────────────────────────────────────

  function filtrarTabla() {
    const q = document
      .getElementById("input-buscar")
      .value.toLowerCase()
      .trim();
    if (!q) {
      renderTabla(todasLasLicencias);
      return;
    }
    const filtrados = todasLasLicencias.filter(function (l) {
      return (
        (l.nombre_empresa && l.nombre_empresa.toLowerCase().includes(q)) ||
        (l.clave_licencia && l.clave_licencia.toLowerCase().includes(q))
      );
    });
    renderTabla(filtrados);
  }

  // ─── Modal Nuevo ──────────────────────────────────────────────────────────────

  function abrirModalNuevo() {
    limpiarModal();
    document.getElementById("modal-loading").style.display = "block";
    document.getElementById("form-licencia").style.display = "none";

    cargarSelectSuscripciones()
      .then(function () {
        document.getElementById("modal-loading").style.display = "none";
        document.getElementById("form-licencia").style.display = "block";
        modalLicencia.show();
      })
      .catch(function () {
        document.getElementById("modal-loading").style.display = "none";
        document.getElementById("form-licencia").style.display = "block";
        mostrarAlertaModal("danger", "Error al cargar suscripciones.");
        modalLicencia.show();
      });
  }

  function cargarSelectSuscripciones() {
    return api.get("/suscripciones").then(function (data) {
      const sel = document.getElementById("f-id_suscripcion");
      sel.innerHTML =
        '<option value="">-- Seleccione una suscripcion --</option>';
      // Solo suscripciones con tipo_pago LICENCIA y estado ACTIVO
      const elegibles = data.filter(function (s) {
        return s.tipo_pago === "LICENCIA" && s.estado === "ACTIVO";
      });
      if (elegibles.length === 0) {
        sel.innerHTML =
          '<option value="" disabled>No hay suscripciones de tipo LICENCIA activas</option>';
      } else {
        elegibles.forEach(function (s) {
          const opt = document.createElement("option");
          opt.value = s.id;
          opt.textContent =
            "#" + s.id + " — " + s.nombre_empresa + " (" + s.nombre_plan + ")";
          sel.appendChild(opt);
        });
      }
    });
  }

  // ─── Guardar (crear) ──────────────────────────────────────────────────────────

  function guardar() {
    const idSuscripcion = document
      .getElementById("f-id_suscripcion")
      .value.trim();
    const observaciones = document
      .getElementById("f-observaciones")
      .value.trim();

    document.getElementById("f-id_suscripcion").classList.remove("is-invalid");

    if (!idSuscripcion) {
      document.getElementById("f-id_suscripcion").classList.add("is-invalid");
      return;
    }

    const payload = {
      id_suscripcion: parseInt(idSuscripcion),
      observaciones: observaciones || null,
    };

    const spinner = document.getElementById("btn-guardar-spinner");
    const btnG = document.getElementById("btn-guardar");
    spinner.classList.remove("d-none");
    btnG.disabled = true;

    api
      .post("/licencias", payload)
      .then(function (resp) {
        modalLicencia.hide();
        mostrarAlertaGlobal(
          "success",
          "Licencia generada: " + (resp.clave_licencia || ""),
        );
        cargarTabla();
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.error || err.mensaje || "No se pudo generar la licencia.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnG.disabled = false;
      });
  }

  // ─── Regenerar clave ──────────────────────────────────────────────────────────

  function regenerarClave(id) {
    api
      .post("/licencias/" + id + "/regenerar-clave", {})
      .then(function (resp) {
        mostrarAlertaGlobal(
          "success",
          "Nueva clave: " + (resp.clave_licencia || ""),
        );
        cargarTabla();
      })
      .catch(function (err) {
        mostrarAlertaGlobal(
          "danger",
          err.error || err.mensaje || "No se pudo regenerar la clave.",
        );
      });
  }

  // ─── Revocar ──────────────────────────────────────────────────────────────────

  function confirmarRevocar(id) {
    idRevocar = id;
    var lic = todasLasLicencias.find(function (l) {
      return l.id == id;
    });
    document.getElementById("revocar-nombre").textContent = lic
      ? lic.nombre_empresa
      : "este cliente";
    modalRevocar.show();
  }

  function ejecutarRevocar() {
    if (!idRevocar) return;

    const spinner = document.getElementById("btn-revocar-spinner");
    const btnR = document.getElementById("btn-confirmar-revocar");
    spinner.classList.remove("d-none");
    btnR.disabled = true;

    api
      .delete("/licencias/" + idRevocar)
      .then(function (resp) {
        modalRevocar.hide();
        mostrarAlertaGlobal("warning", resp.mensaje || "Licencia revocada.");
        cargarTabla();
      })
      .catch(function (err) {
        modalRevocar.hide();
        mostrarAlertaGlobal(
          "danger",
          err.error || err.mensaje || "No se pudo revocar la licencia.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnR.disabled = false;
        idRevocar = null;
      });
  }

  // ─── Copiar clave ─────────────────────────────────────────────────────────────

  function copiarClave(clave, btn) {
    if (!navigator.clipboard) {
      mostrarAlertaGlobal("warning", "El portapapeles no esta disponible.");
      return;
    }
    navigator.clipboard.writeText(clave).then(function () {
      var icon = btn.querySelector("i");
      icon.className = "bx bx-check";
      btn.classList.remove("btn-outline-secondary");
      btn.classList.add("btn-outline-success");
      setTimeout(function () {
        icon.className = "bx bx-copy";
        btn.classList.add("btn-outline-secondary");
        btn.classList.remove("btn-outline-success");
      }, 2000);
      mostrarAlertaGlobal("success", "Clave copiada al portapapeles.");
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
      '<button type="button" class="btn-close" onclick="this.closest(\'#alerta-global\').className=\'alert d-none\'"></button>';
    clearTimeout(el._t);
    el._t = setTimeout(function () {
      el.className = "alert d-none";
    }, 5000);
  }

  function mostrarAlertaModal(tipo, msg) {
    const el = document.getElementById("alerta-modal");
    el.className = "alert alert-" + tipo;
    el.textContent = msg;
  }

  // ─── Limpiar modal ────────────────────────────────────────────────────────────

  function limpiarModal() {
    document.getElementById("form-licencia").reset();
    document.getElementById("f-id").value = "";
    document.getElementById("alerta-modal").className =
      "alert alert-danger d-none";
    document.getElementById("f-id_suscripcion").classList.remove("is-invalid");
    document.getElementById("btn-guardar").disabled = false;
    document.getElementById("btn-guardar-spinner").classList.add("d-none");
    document.getElementById("modal-loading").style.display = "none";
    document.getElementById("form-licencia").style.display = "block";
  }

  // ─── Utilidades ───────────────────────────────────────────────────────────────

  function formatFecha(f) {
    if (!f) return '<span class="text-muted">—</span>';
    var parts = f.slice(0, 10).split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
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

  // ─── API publica ──────────────────────────────────────────────────────────────
  return {
    abrirModalNuevo: abrirModalNuevo,
    guardar: guardar,
    confirmarRevocar: confirmarRevocar,
    regenerarClave: regenerarClave,
    copiarClave: copiarClave,
  };
})();
