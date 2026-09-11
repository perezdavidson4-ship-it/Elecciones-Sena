/* ============================================================
   votar.js — Integración exacta con votar.html y Tiempo Real
   ============================================================ */

let intervaloMonitoreoUrna = null;

document.addEventListener('DOMContentLoaded', () => {
  const pasoIngreso = document.getElementById('pasoIngreso');
  const pasoTarjeton = document.getElementById('pasoTarjeton');
  const docInput = document.getElementById('docIdentidad');
  const btnVerificar = document.getElementById('btnVerificar');
  const msjError = document.getElementById('msjErrorIngreso');

  if (btnVerificar) {
    btnVerificar.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const doc = docInput.value.trim();

      if (!doc) {
        mostrarError('Por favor ingresa tu número de documento.');
        return;
      }

      // Validar si la urna sigue abierta antes de consultar el censo
      const urnaAbierta = await Store.urnaHabilitada();
      if (!urnaAbierta) {
        mostrarError('La urna se encuentra cerrada por el jurado.');
        return;
      }

      // Estado de carga visual
      btnVerificar.disabled = true;
      const textoOriginal = btnVerificar.textContent;
      btnVerificar.textContent = 'Validando censo...';
      ocultarError();

      try {
        // Consultar habilitación en Google Sheets
        const res = await Store.verificarDocumento(doc);

        if (res && res.autorizado) {
          sessionStorage.setItem('sena_doc_actual', doc);

          // Alternar pantallas según los IDs del HTML
          pasoIngreso.style.display = 'none';
          pasoTarjeton.style.display = 'block';

          await renderizarTarjeton();

          // Monitorear en segundo plano si el jurado cierra la urna en vivo
          if (!intervaloMonitoreoUrna) {
            intervaloMonitoreoUrna = setInterval(async () => {
              const sigueAbierta = await Store.urnaHabilitada();
              if (!sigueAbierta) {
                const contenedorUrnaCerrada = document.getElementById('msjUrnaCerrada');
                const contenedorTarjeton = document.getElementById('contenedorTarjeton');
                if (contenedorUrnaCerrada) contenedorUrnaCerrada.style.display = 'block';
                if (contenedorTarjeton) contenedorTarjeton.style.display = 'none';
              }
            }, 4000);
          }
        } else {
          mostrarError((res && res.motivo) ? res.motivo : 'No te encuentras habilitado en el censo electoral.');
        }
      } catch (err) {
        console.error('Error de conexión:', err);
        mostrarError('Ocurrió un error al verificar la cédula. Revisa la URL en store.js.');
      } finally {
        btnVerificar.disabled = false;
        btnVerificar.textContent = textoOriginal;
      }
    });
  }

  // Permitir la tecla Enter en el input de documento
  if (docInput) {
    docInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnVerificar.click();
      }
    });
  }

  function mostrarError(mensaje) {
    if (msjError) {
      msjError.textContent = mensaje;
      msjError.style.display = 'block';
    } else {
      alert(mensaje);
    }
  }

  function ocultarError() {
    if (msjError) {
      msjError.style.display = 'none';
    }
  }
});

async function renderizarTarjeton() {
  const contenedorUrnaCerrada = document.getElementById('msjUrnaCerrada');
  const contenedorTarjeton = document.getElementById('contenedorTarjeton');
  const rejilla = document.getElementById('rejillaCandidatos');

  if (!rejilla) return;

  // Consulta asíncrona a Google Sheets
  const urnaAbierta = await Store.urnaHabilitada();

  if (!urnaAbierta) {
    if (contenedorUrnaCerrada) contenedorUrnaCerrada.style.display = 'block';
    if (contenedorTarjeton) contenedorTarjeton.style.display = 'none';
    return;
  }

  if (contenedorUrnaCerrada) contenedorUrnaCerrada.style.display = 'none';
  if (contenedorTarjeton) contenedorTarjeton.style.display = 'block';

  rejilla.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Cargando tarjetón...</p>';

  const candidatos = await Store.obtenerCandidatos();

  let html = candidatos.map(c => `
    <div class="casilla" tabindex="0" role="button" data-id="${c.id}" data-nombre="${escaparAtributo(c.nombres)}">
      ${c.fotoUrl 
        ? `<img class="foto" src="${escaparAtributo(c.fotoUrl)}" alt="Foto candidato">`
        : `<div class="foto" style="display:flex;align-items:center;justify-content:center;font-weight:bold;color:var(--verde-sena)">N.º ${c.numero}</div>`}
      <div class="num">Candidato N.º ${c.numero}</div>
      <div class="nombre">${escaparTexto(c.nombres)}</div>
      <small style="color:#666;">${escaparTexto(c.programa || '')}</small>
    </div>
  `).join('');

  // Voto en blanco
  html += `
    <div class="casilla" tabindex="0" role="button" data-id="BLANCO" data-nombre="Voto en Blanco">
      <div class="foto" style="display:flex;align-items:center;justify-content:center;background:#EEE;font-weight:bold;">BLANCO</div>
      <div class="num">Opción</div>
      <div class="nombre">Voto en Blanco</div>
    </div>
  `;

  rejilla.innerHTML = html;

  // Manejar clic en los candidatos
  rejilla.querySelectorAll('.casilla').forEach(tarjeta => {
    tarjeta.addEventListener('click', () => {
      abrirModalConfirmacion(tarjeta.dataset.id, tarjeta.dataset.nombre);
    });
  });
}

let candidatoSeleccionadoId = null;

function abrirModalConfirmacion(id, nombre) {
  candidatoSeleccionadoId = id;
  const modal = document.getElementById('modalConfirmacion');
  const textoSeleccion = document.getElementById('textoSeleccion');
  
  if (textoSeleccion) {
    textoSeleccion.textContent = `Has seleccionado: ${nombre}`;
  }
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Configurar acciones dentro del Modal de Confirmación
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modalConfirmacion');
  const btnCancelar = document.getElementById('btnCancelarModal');
  const btnConfirmar = document.getElementById('btnConfirmarModal');
  const modalExito = document.getElementById('modalExito');

  if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
      candidatoSeleccionadoId = null;
    });
  }

  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', async () => {
      const doc = sessionStorage.getItem('sena_doc_actual');
      if (!doc || !candidatoSeleccionadoId) {
        alert('Sesión no válida. Ingrese su número de documento nuevamente.');
        location.reload();
        return;
      }

      btnConfirmar.disabled = true;

      try {
        await Store.registrarVoto(doc, candidatoSeleccionadoId);
        sessionStorage.removeItem('sena_doc_actual');

        if (intervaloMonitoreoUrna) {
          clearInterval(intervaloMonitoreoUrna);
        }

        if (modal) modal.style.display = 'none';
        if (modalExito) modalExito.style.display = 'flex';

        setTimeout(() => {
          location.reload();
        }, 3000);
      } catch (e) {
        alert('Ocurrió un error al registrar el voto. Intente nuevamente.');
        btnConfirmar.disabled = false;
      }
    });
  }
});

function escaparTexto(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function escaparAtributo(str) {
  return String(str || '').replace(/"/g, '&quot;');
}
