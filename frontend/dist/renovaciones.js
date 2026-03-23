"use strict";
document.documentElement.style.visibility = "";

window.renovacionModule = (function () {
  let modalRenovacion = null;
  let modalEliminar = null;
  let idEliminar = null;
  let todasLasRenovaciones = [];
  let datosActuales = [];

  // ─── Inicializar ──────────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    renderNavUser();

    if (Auth.esAdmin()) {
      const menuAdmin = document.getElementById("menu-admin");
      const menuUsuarios = document.getElementById("menu-usuarios");
      if (menuAdmin) menuAdmin.style.display = "";
      if (menuUsuarios) menuUsuarios.style.display = "";
    }

    modalRenovacion = new bootstrap.Modal(
      document.getElementById("modal-renovacion"),
    );
    modalEliminar = new bootstrap.Modal(
      document.getElementById("modal-eliminar"),
    );

    document
      .getElementById("modal-renovacion")
      .addEventListener("hidden.bs.modal", limpiarModal);

    document
      .getElementById("btn-confirmar-eliminar")
      .addEventListener("click", ejecutarEliminar);

    document
      .getElementById("input-buscar")
      .addEventListener("input", filtrarTabla);

    // Auto-calcular meses al cambiar fechas
    ["f-fecha_inicio", "f-fecha_fin"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", calcularMeses);
    });

    cargarTabla();
  });

  // ─── Cargar tabla ─────────────────────────────────────────────────────────────

  function cargarTabla() {
    const tbody = document.getElementById("tabla-body");
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center py-5">' +
      '<div class="spinner-border text-primary" role="status"></div>' +
      '<p class="mt-2 text-muted mb-0">Cargando renovaciones...</p></td></tr>';

    api
      .get("/renovaciones")
      .then(function (data) {
        todasLasRenovaciones = Array.isArray(data) ? data : [];
        renderTabla(todasLasRenovaciones);
      })
      .catch(function (err) {
        tbody.innerHTML =
          '<tr><td colspan="8" class="text-center py-4 text-danger">' +
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
        '<tr><td colspan="8" class="text-center py-5 text-muted">' +
        '<i class="bx bx-inbox bx-lg mb-2 d-block"></i>No se encontraron renovaciones.</td></tr>';
      footer.textContent = "0 registros";
      return;
    }

    // Total acumulado de precio
    const totalPrecio = lista.reduce(function (acc, r) {
      return acc + parseFloat(r.precio || 0);
    }, 0);
    footer.textContent =
      lista.length + " registro(s) — Total: $ " + totalPrecio.toFixed(2);

    tbody.innerHTML = lista
      .map(function (r, i) {
        const precio =
          parseFloat(r.precio || 0) > 0
            ? "$ " + parseFloat(r.precio).toFixed(2)
            : '<span class="text-muted">—</span>';

        const mesesBadge =
          '<span class="badge bg-label-primary">' +
          parseInt(r.meses) +
          " mes" +
          (parseInt(r.meses) !== 1 ? "es" : "") +
          "</span>";

        const btnEditar =
          '<button class="btn btn-sm btn-icon btn-outline-primary me-1" title="Editar" onclick="window.renovacionModule.abrirModalEditar(' +
          r.id +
          ')"><i class="bx bx-edit"></i></button>';

        const btnEliminar =
          '<button class="btn btn-sm btn-icon btn-outline-danger" title="Eliminar" onclick="window.renovacionModule.confirmarEliminar(' +
          r.id +
          ')"><i class="bx bx-trash"></i></button>';

        return (
          "<tr>" +
          '<td><span class="text-muted small">' +
          (i + 1) +
          "</span></td>" +
          '<td><span class="fw-semibold">' +
          escapeHtml(r.nombre_empresa) +
          "</span></td>" +
          '<td><span class="badge bg-label-secondary">#' +
          r.id_suscripcion +
          "</span></td>" +
          "<td>" +
          formatFecha(r.fecha_inicio) +
          "</td>" +
          "<td>" +
          formatFecha(r.fecha_fin) +
          "</td>" +
          "<td>" +
          mesesBadge +
          "</td>" +
          "<td>" +
          precio +
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

  // ─── Busqueda local ───────────────────────────────────────────────────────────

  function filtrarTabla() {
    const q = document
      .getElementById("input-buscar")
      .value.toLowerCase()
      .trim();
    if (!q) {
      renderTabla(todasLasRenovaciones);
      return;
    }
    const filtrados = todasLasRenovaciones.filter(function (r) {
      return r.nombre_empresa && r.nombre_empresa.toLowerCase().includes(q);
    });
    renderTabla(filtrados);
  }

  // ─── Auto-calcular meses ──────────────────────────────────────────────────────

  function calcularMeses() {
    const inicio = document.getElementById("f-fecha_inicio").value;
    const fin = document.getElementById("f-fecha_fin").value;
    if (!inicio || !fin) return;
    const d1 = new Date(inicio);
    const d2 = new Date(fin);
    if (d2 <= d1) return;
    const meses = Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30));
    if (meses > 0) document.getElementById("f-meses").value = meses;
  }

  // ─── Cargar select suscripciones ─────────────────────────────────────────────

  function cargarSelectSuscripciones() {
    return api.get("/suscripciones").then(function (data) {
      const sel = document.getElementById("f-id_suscripcion");
      sel.innerHTML =
        '<option value="">-- Seleccione una suscripcion --</option>';
      const activas = data.filter(function (s) {
        return s.estado === "ACTIVO";
      });
      activas.forEach(function (s) {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent =
          "#" + s.id + " — " + s.nombre_empresa + " (" + s.nombre_plan + ")";
        sel.appendChild(opt);
      });
    });
  }

  // ─── Modal Nuevo ──────────────────────────────────────────────────────────────

  function abrirModalNuevo() {
    limpiarModal();
    document.getElementById("modal-titulo").textContent = "Nueva Renovacion";
    modalRenovacion.show();

    document.getElementById("modal-loading").style.display = "";
    document.getElementById("form-renovacion").style.display = "none";

    cargarSelectSuscripciones()
      .then(function () {
        const hoy = fechaLocalHoy();
        document.getElementById("f-fecha_inicio").value = hoy;
      })
      .catch(function () {
        mostrarAlertaModal(
          "danger",
          "No se pudieron cargar las suscripciones activas.",
        );
      })
      .finally(function () {
        document.getElementById("modal-loading").style.display = "none";
        document.getElementById("form-renovacion").style.display = "";
      });
  }

  // ─── Modal Editar ─────────────────────────────────────────────────────────────

  function abrirModalEditar(id) {
    limpiarModal();
    document.getElementById("modal-titulo").textContent = "Editar Renovacion";
    document.getElementById("btn-guardar").disabled = true;
    document.getElementById("modal-loading").style.display = "";
    document.getElementById("form-renovacion").style.display = "none";
    modalRenovacion.show();

    Promise.all([cargarSelectSuscripciones(), api.get("/renovaciones/" + id)])
      .then(function (res) {
        const r = res[1];
        document.getElementById("f-id").value = r.id;
        // Agregar opcion actual si no esta en activas (suscripcion puede estar vencida)
        const sel = document.getElementById("f-id_suscripcion");
        let optExists = false;
        for (var i = 0; i < sel.options.length; i++) {
          if (String(sel.options[i].value) === String(r.id_suscripcion)) {
            optExists = true;
            break;
          }
        }
        if (!optExists) {
          const opt = document.createElement("option");
          opt.value = r.id_suscripcion;
          opt.textContent = "#" + r.id_suscripcion + " — " + r.nombre_empresa;
          sel.appendChild(opt);
        }
        sel.value = r.id_suscripcion;
        document.getElementById("f-fecha_inicio").value = r.fecha_inicio
          ? r.fecha_inicio.slice(0, 10)
          : "";
        document.getElementById("f-fecha_fin").value = r.fecha_fin
          ? r.fecha_fin.slice(0, 10)
          : "";
        document.getElementById("f-meses").value = r.meses || "";
        document.getElementById("f-precio").value = r.precio
          ? parseFloat(r.precio).toFixed(2)
          : "";
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.mensaje || err.error || "Error al cargar los datos.",
        );
      })
      .finally(function () {
        document.getElementById("modal-loading").style.display = "none";
        document.getElementById("form-renovacion").style.display = "";
        document.getElementById("btn-guardar").disabled = false;
      });
  }

  // ─── Guardar ──────────────────────────────────────────────────────────────────

  function guardar() {
    const id = document.getElementById("f-id").value;
    const idSuscripcion = document.getElementById("f-id_suscripcion").value;
    const fechaInicio = document.getElementById("f-fecha_inicio").value;
    const fechaFin = document.getElementById("f-fecha_fin").value;
    const meses = document.getElementById("f-meses").value;

    ["f-id_suscripcion", "f-fecha_inicio", "f-fecha_fin", "f-meses"].forEach(
      function (fid) {
        document.getElementById(fid).classList.remove("is-invalid");
      },
    );

    let valido = true;
    if (!idSuscripcion) {
      document.getElementById("f-id_suscripcion").classList.add("is-invalid");
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
    if (!meses || parseInt(meses) < 1) {
      document.getElementById("f-meses").classList.add("is-invalid");
      valido = false;
    }
    if (!valido) return;

    const payload = {
      id_suscripcion: parseInt(idSuscripcion),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      meses: parseInt(meses),
      precio: parseFloat(document.getElementById("f-precio").value || 0),
    };

    // En edicion, id_suscripcion no se puede cambiar por el modelo (solo campos de update)
    if (id) {
      delete payload.id_suscripcion;
    }

    const spinner = document.getElementById("btn-guardar-spinner");
    const btnG = document.getElementById("btn-guardar");
    spinner.classList.remove("d-none");
    btnG.disabled = true;

    const peticion = id
      ? api.put("/renovaciones/" + id, payload)
      : api.post("/renovaciones", payload);

    peticion
      .then(function (resp) {
        modalRenovacion.hide();
        mostrarAlertaGlobal(
          "success",
          resp.mensaje || "Operacion realizada con exito.",
        );
        cargarTabla();
      })
      .catch(function (err) {
        mostrarAlertaModal(
          "danger",
          err.mensaje || err.error || "No se pudo guardar la renovacion.",
        );
      })
      .finally(function () {
        spinner.classList.add("d-none");
        btnG.disabled = false;
      });
  }

  // ─── Eliminar (fisico) ────────────────────────────────────────────────────────

  function confirmarEliminar(id) {
    idEliminar = id;
    modalEliminar.show();
  }

  function ejecutarEliminar() {
    if (!idEliminar) return;

    const spinner = document.getElementById("btn-eliminar-spinner");
    const btnE = document.getElementById("btn-confirmar-eliminar");
    spinner.classList.remove("d-none");
    btnE.disabled = true;

    api
      .delete("/renovaciones/" + idEliminar)
      .then(function (resp) {
        modalEliminar.hide();
        mostrarAlertaGlobal("warning", resp.mensaje || "Renovacion eliminada.");
        cargarTabla();
      })
      .catch(function (err) {
        modalEliminar.hide();
        mostrarAlertaGlobal(
          "danger",
          err.mensaje || err.error || "No se pudo eliminar.",
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
    document.getElementById("form-renovacion").reset();
    document.getElementById("f-id").value = "";
    document.getElementById("alerta-modal").className =
      "alert alert-danger d-none";
    ["f-id_suscripcion", "f-fecha_inicio", "f-fecha_fin", "f-meses"].forEach(
      function (fid) {
        document.getElementById(fid).classList.remove("is-invalid");
      },
    );
    document.getElementById("btn-guardar").disabled = false;
    document.getElementById("btn-guardar-spinner").classList.add("d-none");
    document.getElementById("modal-loading").style.display = "none";
    document.getElementById("form-renovacion").style.display = "";
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
    var p = f.slice(0, 10).split("-");
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
    doc.text("Historial de Renovaciones", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Generado: " + new Date().toLocaleDateString("es-ES"), 14, 22);

    const totalPrecio = datosActuales.reduce(function (acc, r) {
      return acc + parseFloat(r.precio || 0);
    }, 0);
    doc.text(
      "Total: " +
        datosActuales.length +
        " registro(s)  |  Acumulado: $ " +
        totalPrecio.toFixed(2),
      14,
      27,
    );

    const columns = [
      "#",
      "Cliente",
      "Suscripcion #",
      "Fecha Inicio",
      "Fecha Fin",
      "Meses",
      "Precio",
    ];
    const rows = datosActuales.map(function (r, i) {
      return [
        i + 1,
        r.nombre_empresa || "",
        "#" + (r.id_suscripcion || ""),
        r.fecha_inicio ? r.fecha_inicio.slice(0, 10) : "",
        r.fecha_fin ? r.fecha_fin.slice(0, 10) : "",
        parseInt(r.meses) || 0,
        parseFloat(r.precio || 0) > 0
          ? "$ " + parseFloat(r.precio).toFixed(2)
          : "—",
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
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        2: { halign: "center" },
      },
    });

    doc.save("renovaciones_" + fechaLocalHoy() + ".pdf");
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
        "Suscripcion #",
        "Fecha Inicio",
        "Fecha Fin",
        "Meses",
        "Precio",
      ],
    ];
    datosActuales.forEach(function (r, i) {
      wsData.push([
        i + 1,
        r.nombre_empresa || "",
        r.id_suscripcion || "",
        r.fecha_inicio ? r.fecha_inicio.slice(0, 10) : "",
        r.fecha_fin ? r.fecha_fin.slice(0, 10) : "",
        parseInt(r.meses) || 0,
        parseFloat(r.precio || 0),
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 14 },
      { wch: 13 },
      { wch: 13 },
      { wch: 8 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Renovaciones");
    XLSX.writeFile(wb, "renovaciones_" + fechaLocalHoy() + ".xlsx");
  }

  // ─── API publica ──────────────────────────────────────────────────────────────
  return {
    abrirModalNuevo: abrirModalNuevo,
    abrirModalEditar: abrirModalEditar,
    guardar: guardar,
    confirmarEliminar: confirmarEliminar,
    exportarPDF: exportarPDF,
    exportarExcel: exportarExcel,
  };
})();
