/* ============================================================
   store.js — Sincronización Global y Tiempo Real con Google Sheets
   ============================================================ */

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby-vBGTadWx9kj42s9tXaBuMrUc7Eq3IV1eAQgTKNiQ0F_VTKM3i03tj7dfb3CwCiSt/exec";

const Store = {
  async obtenerCandidatos() {
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=obtenerCandidatos`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async agregarCandidato(candidato) {
    candidato.id = 'cand_' + Date.now();
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'agregarCandidato', candidato })
    });
  },

  async eliminarCandidato(id) {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'eliminarCandidato', id })
    });
  },

  // Consulta en vivo a la hoja de Google Sheets si la urna está abierta
  async urnaHabilitada() {
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=obtenerEstadoUrna`);
      const data = await res.json();
      return data.abierta;
    } catch (e) {
      console.error(e);
      return true;
    }
  },

  // Envía la orden a Google Sheets para abrir o cerrar la urna
  async fijarUrna(estado) {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'cambiarEstadoUrna', abierta: estado })
    });
  },

  async verificarDocumento(doc) {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=verificar&doc=${encodeURIComponent(doc)}`);
    return await res.json();
  },

  async registrarVoto(doc, candidatoId) {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'voto', doc: doc, candidatoId: candidatoId })
    });
  },

  // Obtiene los datos del escrutinio en vivo desde la hoja de cálculo
  async obtenerResultadosNube() {
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=obtenerVotos`);
      return await res.json();
    } catch (e) {
      console.error(e);
      return { conteo: {}, total: 0 };
    }
  },

  iniciarSesionAdmin(clave) {
    if (clave === 'admin123') {
      sessionStorage.setItem('sena_admin_session', '1');
      return true;
    }
    return false;
  },

  sesionAdminActiva() {
    return sessionStorage.getItem('sena_admin_session') === '1';
  },

  cerrarSesionAdmin() {
    sessionStorage.removeItem('sena_admin_session');
  },

  async reiniciarVotacion() {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'reiniciarVotacion' })
    });
  }
};
