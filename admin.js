/* ============================================================
   admin.js — Gestión del Panel Jurado / Administrador en Tiempo Real
   ============================================================ */

const vistaAcceso = document.getElementById('vistaAcceso');
const vistaPanel = document.getElementById('vistaPanel');
const btnSalir = document.getElementById('btnSalir');

let intervaloEscrutinio = null;

function mostrarPanelSiCorresponde() {
  if (Store.sesionAdminActiva()) {
    vistaAcceso.style.display = 'none';
    vistaPanel.style.display = 'block';
    btnSalir.style.display = 'inline-block';
    
    renderTodo();
    
    // Iniciar actualización automática cada 5 segundos
    if (!intervaloEscrutinio) {
      intervaloEscrutinio = setInterval(renderResultados, 5000);
    }
  } else {
    vistaAcceso.style.display = 'block';
    vistaPanel.style.display = 'none';
    btnSalir.style.display = 'none';
    
    if (intervaloEscrutinio) {
      clearInterval(intervaloEscrutinio);
      intervaloEscrutinio = null;
    }
  }
}

// ---------- Autenticación Admin ----------

document.getElementById('btnEntrar').addEventListener('click', intentarEntrar);
document.getElementById('claveAdmin').addEventListener('keydown', e => {
  if (e.key === 'Enter') intentarEntrar();
});

function intentarEntrar() {
  const clave = document.getElementById('claveAdmin').value;
  const errorClave = document.getElementById('errorClave');
  if (Store.iniciarSesionAdmin(clave)) {
    errorClave.style.display = 'none';
    mostrarPanelSiCorresponde();
  } else {
    errorClave.style.display = 'block';
  }
}

btnSalir.addEventListener('click', e => {
  e.preventDefault();
  Store.cerrarSesionAdmin();
  mostrarPanelSiCorresponde();
});

// ---------- Control de Urna (Actualizado con async/await) ----------

document.getElementById('btnAbrir').addEventListener('click', async () => {
  document.getElementById('btnAbrir').disabled = true;
  await Store.fijarUrna(true);
  await renderEstadoUrna();
});

document.getElementById('btnCerrar').addEventListener('click', async () => {
  document.getElementById('btnCerrar').disabled = true;
  await Store.fijarUrna(false);
  await renderEstadoUrna();
});

async function renderEstadoUrna() {
  const abierta = await Store.urnaHabilitada();
  const cont = document.getElementById('estadoUrnaTexto');
  if (cont) {
    cont.innerHTML = `
      <div class="estado-urna ${abierta ? 'abierta' : 'cerrada'}">
        <span class="punto"></span>
        ${abierta ? 'Urna abierta — se están recibiendo votos' : 'Urna cerrada — votación finalizada'}
      </div>`;
  }
  const btnAbrir = document.getElementById('btnAbrir');
  const btnCerrar = document.getElementById('btnCerrar');
  if (btnAbrir) btnAbrir.disabled = abierta;
  if (btnCerrar) btnCerrar.disabled = !abierta;
}

// ---------- Gestión de Candidatos ----------

document.getElementById('formCandidato').addEventListener('submit', async e => {
  e.preventDefault();
  const numero = document.getElementById('numero').value;
  const nombres = document.getElementById('nombres').value;
  const programa = document.getElementById('programa').value;
  const fotoUrl = document.getElementById('fotoUrl').value;

  try {
    await Store.agregarCandidato({ numero, nombres, programa, fotoUrl });
    e.target.reset();
    renderCandidatos();
    renderResultados();
  } catch (err) {
    alert(err.message);
  }
});

async function renderCandidatos() {
  const cont = document.getElementById('listaCandidatos');
  cont.innerHTML = '<p class="ayuda">Cargando candidatos...</p>';
  
  const candidatos = await Store.obtenerCandidatos();

  if (candidatos.length === 0) {
    cont.innerHTML = '<p class="ayuda">No hay candidatos registrados aún.</p>';
    return;
  }

  cont.innerHTML = candidatos.map(c => `
    <div class="fila-candidato">
      <div class="numero-insignia">${c.numero}</div>
      ${c.fotoUrl
        ? `<img class="miniatura" src="${escaparAtributo(c.fotoUrl)}" alt="">`
        : `<div class="miniatura"></div>`}
      <div class="info">
        <strong>${escaparTexto(c.nombres)}</strong>
        <span>${escaparTexto(c.programa || 'Sin ficha asignada')}</span>
      </div>
      <button class="icono-boton" data-id="${c.id}">Eliminar</button>
    </div>
  `).join('');

  cont.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('¿Deseas eliminar este candidato?')) {
        await Store.eliminarCandidato(btn.dataset.id);
        renderCandidatos();
        renderResultados();
      }
    });
  });
}

// ---------- Resultados y Porcentajes en Tiempo Real ----------

async function renderResultados() {
  const candidatos = await Store.obtenerCandidatos();
  const datosVotos = await Store.obtenerResultadosNube();
  
  const conteo = datosVotos.conteo || {};
  const total = datosVotos.total || 0;
  const votosBlanco = conteo['BLANCO'] || 0;

  const resumenTotal = document.getElementById('resumenTotal');
  if (resumenTotal) {
    resumenTotal.innerHTML = `
      <div class="metrica"><strong>${total}</strong><span>Votos Registrados</span></div>
      <div class="metrica"><strong>${votosBlanco}</strong><span>En Blanco</span></div>
      <div class="metrica"><strong>${candidatos.length}</strong><span>Candidatos</span></div>
    `;
  }

  const maximo = Math.max(1, ...candidatos.map(c => conteo[c.id] || 0), votosBlanco);

  const filas = candidatos.map(c => {
    const votos = conteo[c.id] || 0;
    const pct = total ? Math.round((votos / total) * 100) : 0;
    const ancho = Math.round((votos / maximo) * 100);
    const esGanador = votos > 0 && votos === maximo;
    return `
      <div class="resultado-fila">
        <div class="resultado-cabecera">
          <strong>N.º ${c.numero} · ${escaparTexto(c.nombres)}</strong>
          <span class="conteo">${votos} voto(s) (${pct}%)</span>
        </div>
        <div class="barra-fondo">
          <div class="barra-relleno ${esGanador ? 'ganador' : ''}" style="width:${ancho}%"></div>
        </div>
      </div>`;
  }).join('');

  const pctBlanco = total ? Math.round((votosBlanco / total) * 100) : 0;
  const anchoBlanco = Math.round((votosBlanco / maximo) * 100);
  const filaBlanco = `
    <div class="resultado-fila">
      <div class="resultado-cabecera">
        <strong>Voto en blanco</strong>
        <span class="conteo">${votosBlanco} voto(s) (${pctBlanco}%)</span>
      </div>
      <div class="barra-fondo"><div class="barra-relleno" style="width:${anchoBlanco}%"></div></div>
    </div>`;

  const resultadosCont = document.getElementById('resultados');
  if (resultadosCont) {
    resultadosCont.innerHTML =
      (candidatos.length === 0 ? '<p class="ayuda">Registra candidatos para habilitar los resultados.</p>' : filas) + filaBlanco;
  }
}

document.getElementById('btnReiniciar').addEventListener('click', async () => {
  if (confirm('¿Está seguro de reiniciar la votación? Se borrarán todos los votos registrados.')) {
    await Store.reiniciarVotacion();
    renderResultados();
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

function renderTodo() {
  renderEstadoUrna();
  renderCandidatos();
  renderResultados();
}

mostrarPanelSiCorresponde();
