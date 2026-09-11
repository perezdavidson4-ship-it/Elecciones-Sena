/* ============================================================
   votar.js — Proceso de Validación y Votación del Aprendiz
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const formIngreso = document.getElementById('formIngreso');
  const btnContinuar = document.getElementById('btnContinuar');
  const txtDoc = document.getElementById('numDoc');
  const errorDoc = document.getElementById('errorDoc');
  const vistaIngreso = document.getElementById('vistaIngreso');
  const vistaTarjeton = document.getElementById('vistaTarjeton');

  if (formIngreso) {
    formIngreso.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const doc = txtDoc.value.trim();
      if (!doc) return;

      // Estado visual de carga en el botón
      btnContinuar.disabled = true;
      const textoOriginal = btnContinuar.textContent;
      btnContinuar.textContent = 'Validando censo...';
      if (errorDoc) errorDoc.style.display = 'none';

      try {
        // Consultar habilitación en Google Sheets
        const res = await Store.verificarDocumento(doc);

        if (res.autorizado) {
          // Guardar cédula en sesión temporal
          sessionStorage.setItem('sena_doc_actual', doc);
          
          // Cambiar a la pantalla del tarjetón
          vistaIngreso.style.display = 'none';
          vistaTarjeton.style.display = 'block';
          
          // Cargar candidatos
          await renderizarTarjeton();
        } else {
          // Mostrar mensaje de error si no está en lista o ya votó
          if (errorDoc) {
            errorDoc.textContent = res.motivo || 'No autorizado para votar.';
            errorDoc.style.display = 'block';
          } else {
            alert(res.motivo || 'No autorizado para votar.');
          }
        }
      } catch (err) {
        console.error(err);
        alert('Ocurrió un error al conectar con el servidor. Verifica la URL de Google Apps Script.');
      } finally {
        btnContinuar.disabled = false;
        btnContinuar.textContent = textoOriginal;
      }
    });
  }
});

async function renderizarTarjeton() {
  const contenedorUrnaCerrada = document.getElementById('msjUrnaCerrada');
  const contenedorTarjeton = document.getElementById('contenedorTarjeton');
  const rejilla = document.getElementById('rejillaCandidatos');

  if (!Store.urnaHabilitada()) {
    if (contenedorUrnaCerrada) contenedorUrnaCerrada.style.display = 'block';
    if (contenedorTarjeton) contenedorTarjeton.style.display = 'none';
    return;
  }

  if (contenedorUrnaCerrada) contenedorUrnaCerrada.style.display = 'none';
  if (contenedorTarjeton) contenedorTarjeton.style.display = 'block';

  rejilla.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Cargando tarjetón...</p>';

  const candidatos = await Store.obtenerCandidatos();

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

  html += `
    <div class="casilla" tabindex="0" role="button" data-id="BLANCO">
      <div class="foto" style="display:flex;align-items:center;justify-content:center;background:#EEE;font-weight:bold;">BLANCO</div>
      <div class="num">Opción</div>
      <div class="nombre">Voto en Blanco</div>
    </div>
  `;

  rejilla.innerHTML = html;

  rejilla.querySelectorAll('.casilla').forEach(tarjeta => {
    tarjeta.addEventListener('click', () => abrirModalConfirmacion(tarjeta.dataset.id));
  });
}

function abrirModalConfirmacion(candidatoId) {
  if (confirm('¿Está seguro de registrar su voto por esta opción?')) {
    procesarVoto(candidatoId);
  }
}

async function procesarVoto(candidatoId) {
  const doc = sessionStorage.getItem('sena_doc_actual');
  if (!doc) {
    alert('Error de sesión. Por favor ingrese su documento de nuevo.');
    location.reload();
    return;
  }

  try {
    await Store.registrarVoto(doc, candidatoId);
    sessionStorage.removeItem('sena_doc_actual');
    alert('¡Su voto ha sido registrado con éxito!');
    location.reload();
  } catch (e) {
    alert('Error al guardar el voto. Intente de nuevo.');
  }
}

function escaparTexto(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function escaparAtributo(str) {
  return String(str).replace(/"/g, '&quot;');
}
