/* ============================================================
   votar.js — Flujo de Votación del Aprendiz con Validación Nube
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const pasoIngreso = document.getElementById('pasoIngreso');
  const pasoTarjeton = document.getElementById('pasoTarjeton');
  const docInput = document.getElementById('docIdentidad');
  const btnVerificar = document.getElementById('btnVerificar');
  const msjError = document.getElementById('msjErrorIngreso');

  const modalConfirmacion = document.getElementById('modalConfirmacion');
  const modalExito = document.getElementById('modalExito');
  const textoSeleccion = document.getElementById('textoSeleccion');
  const btnConfirmarModal = document.getElementById('btnConfirmarModal');
  const btnCancelarModal = document.getElementById('btnCancelarModal');

  let idCandidatoSeleccionado = null;
  let documentoActual = '';

  // Escuchar clic en botón
  btnVerificar.addEventListener('click', procesarIngreso);

  // Escuchar tecla Enter en el input
  docInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') procesarIngreso();
  });

  async function procesarIngreso() {
    msjError.style.display = 'none';
    msjError.textContent = '';

    const doc = docInput.value.trim();

    if (!doc) {
      mostrarError('Por favor ingresa un número de documento válido.');
      return;
    }

    // Bloquear botón mientras se verifica en la hoja de cálculo
    btnVerificar.disabled = true;
    btnVerificar.textContent = 'Verificando censo...';

    try {
      // Verificar si está habilitado y si ya votó en Google Sheets
      const respuesta = await Store.verificarDocumento(doc);

      if (!respuesta.autorizado) {
        mostrarError(respuesta.motivo);
        return;
      }

      documentoActual = doc;
      
      // Asegurar apertura de urna si no está definida en la primera prueba
      if (localStorage.getItem('sena_urna_abierta') === null) {
        Store.fijarUrna(true);
      }

      // Pasar a la vista del tarjetón
      pasoIngreso.style.display = 'none';
      pasoTarjeton.style.display = 'block';

      renderizarTarjeton();

    } catch (err) {
      console.error(err);
      mostrarError('Ocurrió un error al verificar el documento. Verifica tu conexión a internet.');
    } finally {
      btnVerificar.disabled = false;
      btnVerificar.textContent = 'Continuar al Tarjetón';
    }
  }

  function mostrarError(mensaje) {
    msjError.textContent = mensaje;
    msjError.style.display = 'block';
  }

  function renderizarTarjeton() {
    const contenedorUrnaCerrada = document.getElementById('msjUrnaCerrada');
    const contenedorTarjeton = document.getElementById('contenedorTarjeton');
    const rejilla = document.getElementById('rejillaCandidatos');

    if (!Store.urnaHabilitada()) {
      contenedorUrnaCerrada.style.display = 'block';
      contenedorTarjeton.style.display = 'none';
      return;
    }

    contenedorUrnaCerrada.style.display = 'none';
    contenedorTarjeton.style.display = 'block';

    const candidatos = Store.obtenerCandidatos();

    let html = candidatos.map(c => `
      <div class="casilla" tabindex="0" role="button" data-id="${c.id}">
        ${c.fotoUrl 
          ? `<img class="foto" src="${escaparAtributo(c.fotoUrl)}" alt="Foto candidato">`
          : `<div class="foto" style="display:flex;align-items:center;justify-content:center;font-weight:bold;color:var(--verde-oscuro)">N.º ${c.numero}</div>`}
        <div class="num">Candidato N.º ${c.numero}</div>
        <div class="nombre">${escaparTexto(c.nombres)}</div>
        <small style="color:#666;">${escaparTexto(c.programa || '')}</small>
      </div>
    `).join('');

    // Agregar Voto en Blanco
    html += `
      <div class="casilla" tabindex="0" role="button" data-id="BLANCO">
        <div class="foto" style="display:flex;align-items:center;justify-content:center;background:#EEE;font-weight:bold;">BLANCO</div>
        <div class="num">Opción</div>
        <div class="nombre">Voto en Blanco</div>
      </div>
    `;

    rejilla.innerHTML = html;

    // Asignar evento click a cada casilla del tarjetón
    rejilla.querySelectorAll('.casilla').forEach(tarjeta => {
      tarjeta.addEventListener('click', () => abrirModalConfirmacion(tarjeta.dataset.id));
    });
  }

  function abrirModalConfirmacion(candidatoId) {
    idCandidatoSeleccionado = candidatoId;
    
    if (candidatoId === 'BLANCO') {
      textoSeleccion.textContent = 'Has seleccionado: Voto en Blanco';
    } else {
      const candidato = Store.obtenerCandidatos().find(c => c.id === candidatoId);
      textoSeleccion.textContent = `Has seleccionado a: ${candidato ? candidato.nombres : ''} (N.º ${candidato ? candidato.numero : ''})`;
    }

    modalConfirmacion.style.display = 'flex';
  }

  btnCancelarModal.addEventListener('click', () => {
    modalConfirmacion.style.display = 'none';
    idCandidatoSeleccionado = null;
  });

  btnConfirmarModal.addEventListener('click', async () => {
    if (!idCandidatoSeleccionado || !documentoActual) return;

    btnConfirmarModal.disabled = true;
    btnConfirmarModal.textContent = 'Registrando...';

    try {
      await Store.registrarVoto(documentoActual, idCandidatoSeleccionado);

      modalConfirmacion.style.display = 'none';
      modalExito.style.display = 'flex';

      // Reiniciar interfaz para el siguiente aprendiz tras 4 segundos
      setTimeout(() => {
        window.location.reload();
      }, 4000);
    } catch (err) {
      console.error(err);
      alert('Ocurrió un problema al guardar el voto. Por favor intenta nuevamente.');
      btnConfirmarModal.disabled = false;
      btnConfirmarModal.textContent = 'Votar Ahora';
    }
  });

  function escaparTexto(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function escaparAtributo(str) {
    return String(str).replace(/"/g, '&quot;');
  }
});