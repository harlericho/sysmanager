"use strict";
document.documentElement.style.visibility = "";

window.usuarioModule = (function () {
  let modalUsuario = null;
  let modalDesactivar = null;
  let idDesactivar = null;
  let todosLosUsuarios = [];
  const usuarioActualId = (Auth.getUser() || {}).id;

  // ─── Inicializar ──────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    renderNavUser();

    // Seccion admin siempre visible en esta pagina (solo llegan admins)
    var menuAdmin = document.getElementById("menu-admin");
    var menuUsuarios = document.getElementById("menu-usuarios");
    if (menuAdmin) menuAdmin.style.display = "";
    if (menuUsuarios) menuUsuarios.style.display = "";

    modalUsuario = new bootstrap.Modal(
      document.getElementById("modal-usuario"),
    );
    modalDesactivar = new bootstrap.Modal(
      document.getElementById("modal-desactivar"),
    );

    document
      .getElementById("modal-usuario")
      .addEventListener("hidden.bs.modal", limpiarModal);

    document
      .getElementById("btn-confirmar-desactivar")
      .addEventListener("click", ejecutarDesactivar);

    document
      .getElementById("input-buscar")
      .addEventListener("input", filtrarTabla);

    // Toggle ver/ocultar password
    document
      .getElementById("btn-ver-password")
      .addEventListener("click", function () {
        var inp = document.getElementById("f-password");
        var ico = document.getElementById("ico-ojo");
        if (inp.type === "password") {
          inp.type = "text";
          ico.className = "bx bx-show";
        } else {
          inp.type = "password";
          ico.className = "bx bx-hide";
        }
      });

    cargarTabla();
  });

  // ─── Cargar tabla ─────────────────────────────────────────────────────────────

  function cargarTabla() {
    var tbody = document.getElementById("tabla-body");
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center py-5">' +
      '<div class="spinner-border text-primary" role="status"></div>' +
      '<p class="mt-2 text-muted mb-0">Cargando usuarios...</p></td></tr>';

    api
      .get("/usuarios")
      .then(function (data) {
        todosLosUsuarios = Array.isArray(data) ? data : [];
        renderTabla(todosLosUsuarios);
      })
      .catch(function (err) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-center py-4 text-danger">' +
          '<i class="bx bx-error-circle bx-md"></i>' +
          '<p class="mb-0 mt-2">Error al cargar: ' +
          (err.message || "Error desconocido") +
          "</p></td></tr>";
      });
  }

  function renderTabla(lista) {
    var tbody = document.getElementById("tabla-body");
    var footer = document.getElementById("footer-total");

    if (!lista || lista.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center py-5 text-muted">' +
        '<i class="bx bx-inbox bx-lg mb-2 d-block"></i>No se encontraron usuarios.</td></tr>';
      footer.textContent = "0 registros";
      return;
    }

    var admins = lista.filter(function (u) {
      return u.rol === "ADMIN";
    }).length;
    footer.textContent =
      lista.length + " registro(s) — " + admins + " admin(s)";

    tbody.innerHTML = lista
      .map(function (u, i) {
        var rolBadge =
          u.rol === "ADMIN"
            ? '<span class="badge bg-label-danger"><i class="bx bx-shield me-1"></i>ADMIN</span>'
            : '<span class="badge bg-label-info"><i class="bx bx-user me-1"></i>EMPLEADO</span>';

        var estadoBadge =
          u.estado === "A"
            ? '<span class="badge bg-label-success">Activo</span>'
            : '<span class="badge bg-label-secondary">Inactivo</span>';

        var esSelf = String(u.id) === String(usuarioActualId);
        var selfLabel = esSelf
          ? ' <span class="badge bg-label-primary ms-1">Tu cuenta</span>'
          : "";

        var btnEditar =
          '<button class="btn btn-sm btn-icon btn-outline-primary me-1" title="Editar" onclick="window.usuarioModule.abrirModalEditar(' +
          u.id +
          ')"><i class="bx bx-edit"></i></button>';

        var btnDesactivar =
          !esSelf && u.estado === "A"
            ? '<button class="btn btn-sm btn-icon btn-outline-danger" title="Desactivar" onclick="window.usuarioModule.confirmarDesactivar(' +
              u.id +
              ')"><i class="bx bx-user-minus"></i></button>'
            : "";

        return (
          "<tr>" +
          '<td><span class="text-muted small">' +
          (i + 1) +
          "</span></td>" +
          '<td><span class="fw-semibold">' +
          escapeHtml(u.nombres) +
          "</span>" +
          selfLabel +
          "</td>" +
          "<td><code>" +
          escapeHtml(u.usuario) +
          "</code></td>" +
          "<td>" +
          rolBadge +
          "</td>" +
          "<td>" +
          estadoBadge +
          "</td>" +
          '<td class="text-center">' +
          btnEditar +
          btnDesactivar +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  // ─── Busqueda local ───────────────────────────────────────────────────────────

  function filtrarTabla() {
    var q = document.getElementById("input-buscar").value.toLowerCase().trim();
    if (!q) {
      renderTabla(todosLosUsuarios);
      return;
    }
    var filtrados = todosLosUsuarios.filter(function (u) {
      return (
        (u.nombres && u.nombres.toLowerCase().includes(q)) ||
        (u.usuario && u.usuario.toLowerCase().includes(q))
      );
    });
    renderTabla(filtrados);
  }

  // ─── Modal Nuevo ──────────────────────────────────────────────────────────────

  function abrirModalNuevo() {
    limpiarModal();
    document.getElementById("modal-titulo").textContent = "Nuevo Usuario";
    document.getElementById("campo-estado").style.display = "none";
    document.getElementById("password-requerido").style.display = "";
    document.getElementById("password-opcional").classList.add("d-none");
    modalUsuario.show();
  }

  // ─── Modal Editar ─────────────────────────────────────────────────────────────

  function abrirModalEditar(id) {
    limpiarModal();
    document.getElementById("modal-titulo").textContent = "Editar Usuario";
    document.getElementById("btn-guardar").disabled = true;
    // Password opcional al editar
    document.getElementById("password-requerido").style.display = "none";
    document.getElementById("password-opcional").classList.remove("d-none");

    api
      .get("/usuarios/" + id)
      .then(function (u) {
        document.getElementById("f-id").value = u.id;
        document.getElementById("f-nombres").value = u.nombres || "";
        document.getElementById("f-usuario").value = u.usuario || "";
        document.getElementById("f-rol").value = u.rol || "";
        var estadoVal = u.estado === "I" ? "I" : "A";
        document.querySelector(
          'input[name="estado"][value="' + estadoVal + '"]',
        ).checked = true;
        document.getElementById("campo-estado").style.display = "";
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.mensaje || err.error || "Error al cargar los datos del usuario.",
        );
      })
      .finally(function () {
        document.getElementById("btn-guardar").disabled = false;
      });

    modalUsuario.show();
  }

  // ─── Guardar ──────────────────────────────────────────────────────────────────

  function guardar() {
    var id = document.getElementById("f-id").value;
    var nombres = document.getElementById("f-nombres").value.trim();
    var usuario = document.getElementById("f-usuario").value.trim();
    var rol = document.getElementById("f-rol").value;
    var password = document.getElementById("f-password").value;

    ["f-nombres", "f-usuario", "f-rol", "f-password"].forEach(function (fid) {
      document.getElementById(fid).classList.remove("is-invalid");
    });

    var valido = true;
    if (!nombres) {
      document.getElementById("f-nombres").classList.add("is-invalid");
      valido = false;
    }
    if (!usuario) {
      document.getElementById("f-usuario").classList.add("is-invalid");
      valido = false;
    }
    if (!rol) {
      document.getElementById("f-rol").classList.add("is-invalid");
      valido = false;
    }
    if (!id && !password) {
      // En creacion la password es obligatoria
      document.getElementById("f-password").classList.add("is-invalid");
      document.getElementById("password-feedback").textContent =
        "La contrasena es requerida.";
      valido = false;
    }
    if (!valido) return;

    var payload = {
      nombres: nombres,
      usuario: usuario,
      rol: rol,
    };
    if (id) {
      payload.estado = document.querySelector(
        'input[name="estado"]:checked',
      ).value;
      if (password) payload.password = password;
    } else {
      payload.password = password;
    }

    var spinner = document.getElementById("btn-guardar-spinner");
    var btnG = document.getElementById("btn-guardar");
    spinner.classList.remove("d-none");
    btnG.disabled = true;

    var peticion = id
      ? api.put("/usuarios/" + id, payload)
      : api.post("/usuarios", payload);

    peticion
      .then(function (resp) {
        modalUsuario.hide();
        mostrarAlertaGlobal(
          "success",
          resp.mensaje || "Operacion realizada con exito.",
        );
        cargarTabla();
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.mensaje || err.error || "No se pudo guardar el usuario.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnG.disabled = false;
      });
  }

  // ─── Desactivar ───────────────────────────────────────────────────────────────

  function confirmarDesactivar(id) {
    idDesactivar = id;
    var usuario = todosLosUsuarios.find(function (u) {
      return u.id == id;
    });
    document.getElementById("desactivar-nombre").textContent = usuario
      ? usuario.nombres
      : "este usuario";
    modalDesactivar.show();
  }

  function ejecutarDesactivar() {
    if (!idDesactivar) return;

    var spinner = document.getElementById("btn-desactivar-spinner");
    var btnD = document.getElementById("btn-confirmar-desactivar");
    spinner.classList.remove("d-none");
    btnD.disabled = true;

    api
      .delete("/usuarios/" + idDesactivar)
      .then(function (resp) {
        if (!resp) return;
        modalDesactivar.hide();
        mostrarAlertaGlobal(
          "warning",
          resp.mensaje || "Usuario desactivado correctamente.",
        );
        cargarTabla();
      })
      .catch(function (err) {
        modalDesactivar.hide();
        mostrarAlertaGlobal(
          "danger",
          (err && (err.mensaje || err.error)) ||
            "No se pudo desactivar el usuario.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnD.disabled = false;
        idDesactivar = null;
      });
  }

  // ─── Alertas ──────────────────────────────────────────────────────────────────

  function mostrarAlertaGlobal(tipo, msg) {
    var el = document.getElementById("alerta-global");
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
    var el = document.getElementById("alerta-modal");
    el.className = "alert alert-" + tipo;
    el.textContent = msg;
  }

  // ─── Limpiar modal ────────────────────────────────────────────────────────────

  function limpiarModal() {
    document.getElementById("form-usuario").reset();
    document.getElementById("f-id").value = "";
    document.getElementById("alerta-modal").className =
      "alert alert-danger d-none";
    ["f-nombres", "f-usuario", "f-rol", "f-password"].forEach(function (fid) {
      document.getElementById(fid).classList.remove("is-invalid");
    });
    document.getElementById("campo-estado").style.display = "none";
    document.getElementById("btn-guardar").disabled = false;
    document.getElementById("btn-guardar-spinner").classList.add("d-none");
    // Restaurar password a tipo password y ocultar
    document.getElementById("f-password").type = "password";
    document.getElementById("ico-ojo").className = "bx bx-hide";
    document.getElementById("password-feedback").textContent =
      "Este campo es requerido.";
  }

  // ─── Utilidades ───────────────────────────────────────────────────────────────

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
    confirmarDesactivar: confirmarDesactivar,
  };
})();
