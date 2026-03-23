"use strict";
document.documentElement.style.visibility = "";

window.suscripcionModule = (function () {
  let modalSuscripcion = null;
  let modalCancelar = null;
  let idCancelar = null;
  let modalCorreo = null;
  let idCorreo = null;
  let todasLasSuscripciones = [];
  let datosActuales = [];
  let filtroActivoEstado = "";
  let planesCache = [];

  // ─── Inicializar ──────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    renderNavUser();

    if (Auth.esAdmin()) {
      const menuAdmin = document.getElementById("menu-admin");
      const menuUsuarios = document.getElementById("menu-usuarios");
      if (menuAdmin) menuAdmin.style.display = "";
      if (menuUsuarios) menuUsuarios.style.display = "";
    }

    modalSuscripcion = new bootstrap.Modal(
      document.getElementById("modal-suscripcion"),
    );
    modalCancelar = new bootstrap.Modal(
      document.getElementById("modal-cancelar"),
    );
    modalCorreo = new bootstrap.Modal(document.getElementById("modal-correo"));

    document
      .getElementById("modal-suscripcion")
      .addEventListener("hidden.bs.modal", limpiarModal);

    document
      .getElementById("btn-confirmar-cancelar")
      .addEventListener("click", ejecutarCancelar);

    document
      .getElementById("btn-confirmar-correo")
      .addEventListener("click", ejecutarEnviarCorreo);

    document
      .getElementById("input-buscar")
      .addEventListener("input", aplicarFiltros);

    cargarTabla();
  });

  // ─── Cargar tabla ─────────────────────────────────────────────────────────────

  function cargarTabla() {
    const tbody = document.getElementById("tabla-body");
    tbody.innerHTML =
      '<tr><td colspan="9" class="text-center py-5">' +
      '<div class="spinner-border text-primary" role="status"></div>' +
      '<p class="mt-2 text-muted mb-0">Cargando suscripciones...</p></td></tr>';

    api
      .get("/suscripciones")
      .then(function (data) {
        todasLasSuscripciones = Array.isArray(data) ? data : [];
        aplicarFiltros();
      })
      .catch(function (err) {
        tbody.innerHTML =
          '<tr><td colspan="9" class="text-center py-4 text-danger">' +
          '<i class="bx bx-error-circle bx-md"></i>' +
          '<p class="mb-0 mt-2">Error al cargar: ' +
          (err.message || "Error desconocido") +
          "</p></td></tr>";
      });
  }

  function renderTabla(lista) {
    const tbody = document.getElementById("tabla-body");
    const footer = document.getElementById("footer-total");
    datosActuales = Array.isArray(lista) ? lista : [];

    if (!lista || lista.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="9" class="text-center py-5 text-muted">' +
        '<i class="bx bx-inbox bx-lg mb-2 d-block"></i>No se encontraron suscripciones.</td></tr>';
      footer.textContent = "0 registros";
      return;
    }

    const activos = lista.filter(function (s) {
      return s.estado === "ACTIVO";
    }).length;
    footer.textContent =
      lista.length + " registro(s) — " + activos + " activo(s)";

    tbody.innerHTML = lista
      .map(function (s, i) {
        const estadoBadge =
          {
            ACTIVO: '<span class="badge bg-label-success">ACTIVO</span>',
            VENCIDO: '<span class="badge bg-label-warning">VENCIDO</span>',
            CANCELADO: '<span class="badge bg-label-danger">CANCELADO</span>',
          }[s.estado] ||
          '<span class="badge bg-label-secondary">' +
            escapeHtml(s.estado) +
            "</span>";

        const tipoBadge =
          {
            MENSUAL: '<span class="badge bg-label-info">MENSUAL</span>',
            ANUAL: '<span class="badge bg-label-primary">ANUAL</span>',
            LICENCIA: '<span class="badge bg-label-warning">LICENCIA</span>',
          }[s.tipo_pago] ||
          '<span class="badge bg-label-secondary">' +
            escapeHtml(s.tipo_pago) +
            "</span>";

        const hoy = fechaLocalHoy();
        const estaVenciendo =
          s.estado === "ACTIVO" && s.fecha_fin && s.fecha_fin <= hoy;
        const filaClass = estaVenciendo ? ' class="table-warning"' : "";

        const btnEditar =
          '<button class="btn btn-sm btn-icon btn-outline-primary me-1" title="Editar" onclick="window.suscripcionModule.abrirModalEditar(' +
          s.id +
          ')"><i class="bx bx-edit"></i></button>';

        const btnCorreo =
          '<button class="btn btn-sm btn-icon btn-outline-info me-1" title="Reenviar correo" onclick="window.suscripcionModule.enviarCorreo(' +
          s.id +
          ')"><i class="bx bx-envelope"></i></button>';

        const btnCancelar =
          s.estado !== "CANCELADO"
            ? '<button class="btn btn-sm btn-icon btn-outline-danger" title="Cancelar" onclick="window.suscripcionModule.confirmarCancelar(' +
              s.id +
              ')"><i class="bx bx-x-circle"></i></button>'
            : "";

        const costoCelda =
          s.tipo_plan === "LOCAL" && parseFloat(s.precio_instalacion) > 0
            ? '<span class="fw-semibold text-success">$' +
              parseFloat(s.precio_instalacion).toFixed(2) +
              "</span>"
            : '<span class="text-muted">—</span>';

        return (
          "<tr" +
          filaClass +
          ">" +
          '<td><span class="text-muted small">' +
          (i + 1) +
          "</span></td>" +
          '<td><span class="fw-semibold">' +
          escapeHtml(s.nombre_empresa) +
          "</span></td>" +
          "<td>" +
          escapeHtml(s.nombre_plan) +
          "</td>" +
          "<td>" +
          costoCelda +
          "</td>" +
          "<td>" +
          formatFecha(s.fecha_inicio) +
          "</td>" +
          "<td>" +
          formatFecha(s.fecha_fin) +
          "</td>" +
          "<td>" +
          tipoBadge +
          "</td>" +
          "<td>" +
          estadoBadge +
          "</td>" +
          '<td class="text-center">' +
          btnEditar +
          btnCorreo +
          btnCancelar +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  // ─── Filtros ──────────────────────────────────────────────────────────────────

  function filtrarEstado(estado) {
    filtroActivoEstado = estado;

    // Actualizar botones activos
    [
      "filtro-todos",
      "filtro-activo",
      "filtro-vencido",
      "filtro-cancelado",
    ].forEach(function (id) {
      document.getElementById(id).classList.remove("active");
    });
    var mapa = {
      "": "filtro-todos",
      ACTIVO: "filtro-activo",
      VENCIDO: "filtro-vencido",
      CANCELADO: "filtro-cancelado",
    };
    if (mapa[estado])
      document.getElementById(mapa[estado]).classList.add("active");

    aplicarFiltros();
  }

  function aplicarFiltros() {
    const q = document
      .getElementById("input-buscar")
      .value.toLowerCase()
      .trim();
    let resultado = todasLasSuscripciones;

    if (filtroActivoEstado) {
      resultado = resultado.filter(function (s) {
        return s.estado === filtroActivoEstado;
      });
    }
    if (q) {
      resultado = resultado.filter(function (s) {
        return (
          (s.nombre_empresa && s.nombre_empresa.toLowerCase().includes(q)) ||
          (s.nombre_plan && s.nombre_plan.toLowerCase().includes(q))
        );
      });
    }
    renderTabla(resultado);
  }

  // ─── Cargar selects ───────────────────────────────────────────────────────────

  function cargarSelects() {
    return Promise.all([api.get("/clientes"), api.get("/planes")]).then(
      function (resultados) {
        const clientes = resultados[0];
        const planes = resultados[1];
        planesCache = planes;

        const selCliente = document.getElementById("f-id_cliente");
        selCliente.innerHTML =
          '<option value="">-- Seleccione un cliente --</option>';
        clientes
          .filter(function (c) {
            return c.estado === "A";
          })
          .forEach(function (c) {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent =
              c.nombre_empresa + (c.ruc ? " (" + c.ruc + ")" : "");
            selCliente.appendChild(opt);
          });

        const selPlan = document.getElementById("f-id_plan");
        selPlan.innerHTML =
          '<option value="">-- Seleccione un plan --</option>';
        planes
          .filter(function (p) {
            return p.estado === "A";
          })
          .forEach(function (p) {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.dataset.tipo = p.tipo;
            opt.textContent =
              p.nombre + " (" + p.tipo + " — " + p.duracion_base + " mes)";
            selPlan.appendChild(opt);
          });

        selPlan.removeEventListener("change", actualizarCampoPrecioInstalacion);
        selPlan.addEventListener("change", actualizarCampoPrecioInstalacion);
      },
    );
  }

  // ─── Mostrar/ocultar campo precio instalacion ─────────────────────────────────

  function actualizarCampoPrecioInstalacion() {
    const selPlan = document.getElementById("f-id_plan");
    const selectedOpt = selPlan.options[selPlan.selectedIndex];
    const tipoPlan = selectedOpt ? selectedOpt.dataset.tipo || "" : "";
    const campo = document.getElementById("campo-precio-instalacion");
    if (tipoPlan === "LOCAL") {
      campo.style.display = "";
    } else {
      campo.style.display = "none";
      document.getElementById("f-precio_instalacion").value = "";
    }
  }

  // ─── Modal Nuevo ──────────────────────────────────────────────────────────────

  function abrirModalNuevo() {
    limpiarModal();
    document.getElementById("modal-titulo").textContent = "Nueva Suscripcion";
    document.getElementById("campo-estado").style.display = "none";
    modalSuscripcion.show();

    document.getElementById("modal-loading").style.display = "";
    document.getElementById("form-suscripcion").style.display = "none";

    cargarSelects()
      .then(function () {
        const hoy = fechaLocalHoy();
        document.getElementById("f-fecha_inicio").value = hoy;
      })
      .catch(function () {
        mostrarAlertaModal(
          "danger",
          "No se pudieron cargar clientes o planes.",
        );
      })
      .finally(function () {
        document.getElementById("modal-loading").style.display = "none";
        document.getElementById("form-suscripcion").style.display = "";
      });
  }

  // ─── Modal Editar ─────────────────────────────────────────────────────────────

  function abrirModalEditar(id) {
    limpiarModal();
    document.getElementById("modal-titulo").textContent = "Editar Suscripcion";
    document.getElementById("btn-guardar").disabled = true;
    document.getElementById("modal-loading").style.display = "";
    document.getElementById("form-suscripcion").style.display = "none";
    modalSuscripcion.show();

    Promise.all([cargarSelects(), api.get("/suscripciones/" + id)])
      .then(function (res) {
        const s = res[1];
        document.getElementById("f-id").value = s.id;
        document.getElementById("f-id_cliente").value = s.id_cliente;
        document.getElementById("f-id_plan").value = s.id_plan;
        document.getElementById("f-fecha_inicio").value = s.fecha_inicio
          ? s.fecha_inicio.slice(0, 10)
          : "";
        document.getElementById("f-fecha_fin").value = s.fecha_fin
          ? s.fecha_fin.slice(0, 10)
          : "";
        document.getElementById("f-tipo_pago").value = s.tipo_pago;
        document.getElementById("f-estado").value = s.estado;
        document.getElementById("campo-estado").style.display = "";
        actualizarCampoPrecioInstalacion();
        if (s.tipo_plan === "LOCAL") {
          document.getElementById("f-precio_instalacion").value = parseFloat(
            s.precio_instalacion || 0,
          ).toFixed(2);
        }
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.mensaje || err.error || "Error al cargar los datos.",
        );
      })
      .finally(function () {
        document.getElementById("modal-loading").style.display = "none";
        document.getElementById("form-suscripcion").style.display = "";
        document.getElementById("btn-guardar").disabled = false;
      });
  }

  // ─── Guardar ──────────────────────────────────────────────────────────────────

  function guardar() {
    const id = document.getElementById("f-id").value;
    const idCliente = document.getElementById("f-id_cliente").value;
    const idPlan = document.getElementById("f-id_plan").value;
    const fechaInicio = document.getElementById("f-fecha_inicio").value;
    const fechaFin = document.getElementById("f-fecha_fin").value;
    const tipoPago = document.getElementById("f-tipo_pago").value;

    [
      "f-id_cliente",
      "f-id_plan",
      "f-fecha_inicio",
      "f-fecha_fin",
      "f-tipo_pago",
    ].forEach(function (fid) {
      document.getElementById(fid).classList.remove("is-invalid");
    });

    let valido = true;
    if (!idCliente) {
      document.getElementById("f-id_cliente").classList.add("is-invalid");
      valido = false;
    }
    if (!idPlan) {
      document.getElementById("f-id_plan").classList.add("is-invalid");
      valido = false;
    }
    if (!fechaInicio) {
      document.getElementById("f-fecha_inicio").classList.add("is-invalid");
      valido = false;
    }
    if (!fechaFin) {
      document.getElementById("f-fecha_fin").classList.add("is-invalid");
      valido = false;
    }
    if (!tipoPago) {
      document.getElementById("f-tipo_pago").classList.add("is-invalid");
      valido = false;
    }
    if (!valido) return;

    const payload = {
      id_cliente: parseInt(idCliente),
      id_plan: parseInt(idPlan),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      tipo_pago: tipoPago,
    };

    const campoPrecio = document.getElementById("campo-precio-instalacion");
    if (campoPrecio && campoPrecio.style.display !== "none") {
      const rawPrecio = document.getElementById("f-precio_instalacion").value;
      payload.precio_instalacion = parseFloat(rawPrecio) || 0;
    } else {
      payload.precio_instalacion = 0;
    }

    if (id) {
      payload.estado = document.getElementById("f-estado").value;
    }

    const spinner = document.getElementById("btn-guardar-spinner");
    const btnG = document.getElementById("btn-guardar");
    spinner.classList.remove("d-none");
    btnG.disabled = true;

    const peticion = id
      ? api.put("/suscripciones/" + id, payload)
      : api.post("/suscripciones", payload);

    peticion
      .then(function (resp) {
        modalSuscripcion.hide();
        mostrarAlertaGlobal(
          "success",
          resp.mensaje || "Operacion realizada con exito.",
        );
        cargarTabla();
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.mensaje || err.error || "No se pudo guardar la suscripcion.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnG.disabled = false;
      });
  }

  // ─── Reenviar correo ──────────────────────────────────────────────────────────

  function enviarCorreo(id) {
    idCorreo = id;
    var sus = todasLasSuscripciones.find(function (s) {
      return s.id == id;
    });
    document.getElementById("correo-nombre").textContent = sus
      ? sus.nombre_empresa
      : "este cliente";
    modalCorreo.show();
  }

  function ejecutarEnviarCorreo() {
    if (!idCorreo) return;

    const spinner = document.getElementById("btn-correo-spinner");
    const btnC = document.getElementById("btn-confirmar-correo");
    spinner.classList.remove("d-none");
    btnC.disabled = true;

    api
      .post("/suscripciones/" + idCorreo + "/enviar-correo", {})
      .then(function (resp) {
        modalCorreo.hide();
        mostrarAlertaGlobal(
          "success",
          resp.mensaje || "Correo enviado correctamente.",
        );
      })
      .catch(function (err) {
        modalCorreo.hide();
        mostrarAlertaGlobal(
          "danger",
          (err && (err.error || err.mensaje)) || "No se pudo enviar el correo.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnC.disabled = false;
        idCorreo = null;
      });
  }

  // ─── Cancelar suscripcion ─────────────────────────────────────────────────────

  function confirmarCancelar(id) {
    idCancelar = id;
    var sus = todasLasSuscripciones.find(function (s) {
      return s.id == id;
    });
    document.getElementById("cancelar-nombre").textContent = sus
      ? sus.nombre_empresa
      : "esta suscripcion";
    modalCancelar.show();
  }

  function ejecutarCancelar() {
    if (!idCancelar) return;

    const spinner = document.getElementById("btn-cancelar-spinner");
    const btnC = document.getElementById("btn-confirmar-cancelar");
    spinner.classList.remove("d-none");
    btnC.disabled = true;

    api
      .delete("/suscripciones/" + idCancelar)
      .then(function (resp) {
        if (!resp) return;
        modalCancelar.hide();
        mostrarAlertaGlobal(
          "warning",
          resp.mensaje || "Suscripcion cancelada.",
        );
        cargarTabla();
      })
      .catch(function (err) {
        modalCancelar.hide();
        mostrarAlertaGlobal(
          "danger",
          (err && (err.mensaje || err.error)) || "No se pudo cancelar.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnC.disabled = false;
        idCancelar = null;
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
    }, 4000);
  }

  function mostrarAlertaModal(tipo, msg) {
    const el = document.getElementById("alerta-modal");
    el.className = "alert alert-" + tipo;
    el.textContent = msg;
  }

  // ─── Limpiar modal ────────────────────────────────────────────────────────────

  function limpiarModal() {
    document.getElementById("form-suscripcion").reset();
    document.getElementById("f-id").value = "";
    document.getElementById("alerta-modal").className =
      "alert alert-danger d-none";
    [
      "f-id_cliente",
      "f-id_plan",
      "f-fecha_inicio",
      "f-fecha_fin",
      "f-tipo_pago",
    ].forEach(function (fid) {
      document.getElementById(fid).classList.remove("is-invalid");
    });
    document.getElementById("campo-estado").style.display = "none";
    document.getElementById("campo-precio-instalacion").style.display = "none";
    document.getElementById("f-precio_instalacion").value = "";
    document.getElementById("btn-guardar").disabled = false;
    document.getElementById("btn-guardar-spinner").classList.add("d-none");
    document.getElementById("modal-loading").style.display = "none";
    document.getElementById("form-suscripcion").style.display = "";
  }

  // ─── Utilidades ───────────────────────────────────────────────────────────────

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

  // ─── Exportar PDF ─────────────────────────────────────────────────────────────

  function exportarPDF() {
    if (!window.jspdf) {
      alert("La libreria jsPDF no esta disponible. Verifique su conexion.");
      return;
    }
    if (datosActuales.length === 0) {
      mostrarAlertaGlobal("warning", "No hay datos para exportar.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.setTextColor(99, 89, 210);
    doc.text("Listado de Suscripciones", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Generado: " + new Date().toLocaleDateString("es-ES"), 14, 22);
    doc.text("Total: " + datosActuales.length + " registro(s)", 14, 27);

    const columns = [
      "#",
      "Cliente",
      "Plan",
      "Costo Inst.",
      "Inicio",
      "Fin",
      "Tipo Pago",
      "Estado",
    ];
    const rows = datosActuales.map(function (s, i) {
      const costo =
        s.tipo_plan === "LOCAL" && parseFloat(s.precio_instalacion) > 0
          ? "$ " + parseFloat(s.precio_instalacion).toFixed(2)
          : "—";
      return [
        i + 1,
        s.nombre_empresa || "",
        s.nombre_plan || "",
        costo,
        s.fecha_inicio ? s.fecha_inicio.slice(0, 10) : "",
        s.fecha_fin ? s.fecha_fin.slice(0, 10) : "",
        s.tipo_pago || "",
        s.estado || "",
      ];
    });

    doc.autoTable({
      head: [columns],
      body: rows,
      startY: 32,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: {
        fillColor: [99, 89, 210],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      columnStyles: { 0: { halign: "center", cellWidth: 10 } },
    });

    doc.save("suscripciones_" + fechaLocalHoy() + ".pdf");
  }

  // ─── Exportar Excel ───────────────────────────────────────────────────────────

  function exportarExcel() {
    if (!window.XLSX) {
      alert("La libreria SheetJS no esta disponible. Verifique su conexion.");
      return;
    }
    if (datosActuales.length === 0) {
      mostrarAlertaGlobal("warning", "No hay datos para exportar.");
      return;
    }
    const wsData = [
      [
        "#",
        "Cliente",
        "Plan",
        "Costo Inst.",
        "Inicio",
        "Fin",
        "Tipo Pago",
        "Estado",
      ],
    ];
    datosActuales.forEach(function (s, i) {
      wsData.push([
        i + 1,
        s.nombre_empresa || "",
        s.nombre_plan || "",
        s.tipo_plan === "LOCAL" && parseFloat(s.precio_instalacion) > 0
          ? parseFloat(s.precio_instalacion)
          : 0,
        s.fecha_inicio ? s.fecha_inicio.slice(0, 10) : "",
        s.fecha_fin ? s.fecha_fin.slice(0, 10) : "",
        s.tipo_pago || "",
        s.estado || "",
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Ancho de columnas
    ws["!cols"] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Suscripciones");
    XLSX.writeFile(wb, "suscripciones_" + fechaLocalHoy() + ".xlsx");
  }

  // ─── API publica ──────────────────────────────────────────────────────────────
  return {
    abrirModalNuevo: abrirModalNuevo,
    abrirModalEditar: abrirModalEditar,
    guardar: guardar,
    confirmarCancelar: confirmarCancelar,
    filtrarEstado: filtrarEstado,
    enviarCorreo: enviarCorreo,
    exportarPDF: exportarPDF,
    exportarExcel: exportarExcel,
  };
})();
