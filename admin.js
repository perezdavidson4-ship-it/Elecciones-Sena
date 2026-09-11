/* ============================================================
   admin.js — Gestión del Panel Jurado / Administrador
   ============================================================ */

const vistaAcceso = document.getElementById('vistaAcceso');
const vistaPanel = document.getElementById('vistaPanel');
const btnSalir = document.getElementById('btnSalir');

function mostrarPanelSiCorresponde() {
  if (Store.sesionAdminActiva()) {
    vistaAcceso.style.display = 'none';
    vistaPanel.style.display = 'block';
    btnSalir.style.display = 'inline-block';
    renderTodo();
  } else {
    vistaAcceso.style.display = 'block';
    vistaPanel.style.display = 'none';
    btnSalir.style.display = 'none';
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

// ---------- Control de Urna ----------

document.getElementById('btnAbrir').addEventListener('click', () => {
  Store.fijarUrna(true);
  renderEstadoUrna();
});

document.getElementById('btnCerrar').addEventListener('click', () => {
  Store.fijarUrna(false);
  renderEstadoUrna();
});

function renderEstadoUrna() {
  const abierta = Store.urnaHabilitada();
  const cont = document.getElementById('estadoUrnaTexto');
  cont.innerHTML = `
    <div class="estado-urna ${abierta ? 'abierta' : 'cerrada'}">
      <span class="punto"></span>
      ${abierta ? 'Urna abierta — se están recibiendo votos' : 'Urna cerrada — votación finalizada'}
    </div>`;
  document.getElementById('btnAbrir').disabled = abierta;
  document.getElementById('btnCerrar').disabled = !abierta;
}

// ---------- Gestión de Candidatos ----------

document.getElementById('formCandidato').addEventListener('submit', e => {
  e.preventDefault();
  const numero = document.getElementById('numero').value;
  const nombres = document.getElementById('nombres').value;
  const programa = document.getElementById('programa').value;
  const fotoUrl = document.getElementById('fotoUrl').value;

  try {
    Store.agregarCandidato({ numero, nombres, programa, fotoUrl });
    e.target.reset();
    renderCandidatos();
    renderResultados();
  } catch (err) {
    alert(err.message);
  }
});

function renderCandidatos() {
  const cont = document.getElementById('listaCandidatos');
  const candidatos = Store.obtenerCandidatos();

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
    btn.addEventListener('click', () => {
      if (confirm('¿Deseas eliminar este candidato?')) {
        Store.eliminarCandidato(btn.dataset.id);
        renderCandidatos();
        renderResultados();
      }
    });
  });
}

// ---------- Resultados ----------

function renderResultados() {
  const candidatos = Store.obtenerCandidatos();
  const conteo = Store.conteoPorCandidato();
  const total = Store.totalVotos();
  const votosBlanco = conteo['BLANCO'] || 0;

  document.getElementById('resumenTotal').innerHTML = `
    <div class="metrica"><strong>${total}</strong><span>Votos Registrados</span></div>
    <div class="metrica"><strong>${votosBlanco}</strong><span>En Blanco</span></div>
    <div class="metrica"><strong>${candidatos.length}</strong><span>Candidatos</span></div>
  `;

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

  const anchoBlanco = Math.round((votosBlanco / maximo) * 100);
  const filaBlanco = `
    <div class="resultado-fila">
      <div class="resultado-cabecera">
        <strong>Voto en blanco</strong>
        <span class="conteo">${votosBlanco} voto(s) (${total ? Math.round((votosBlanco / total) * 100) : 0}%)</span>
      </div>
      <div class="barra-fondo"><div class="barra-relleno" style="width:${anchoBlanco}%"></div></div>
    </div>`;

  document.getElementById('resultados').innerHTML =
    (candidatos.length === 0 ? '<p class="ayuda">Registra candidatos para habilitar los resultados.</p>' : filas) + filaBlanco;
}

document.getElementById('btnReiniciar').addEventListener('click', () => {
  if (confirm('¿Esta seguro de reiniciar la votación? Se borrarán todos los votos registrados.')) {
    Store.reiniciarVotacion();
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