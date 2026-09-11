/* ============================================================
   store.js — Sincronización Global y Tiempo Real con Google Sheets
   ============================================================ */

// Reemplaza esta URL por la de tu despliegue en Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx892IAxBdQp7EIg4wOreDTlurXzzrM32iYBTyeu0GnZaEd9htTfEXz1mCcRgfUbA9mvg/exec";

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

  urnaHabilitada() {
    const estado = localStorage.getItem('sena_urna_abierta');
    return estado === null ? true : JSON.parse(estado);
  },

  fijarUrna(estado) {
    localStorage.setItem('sena_urna_abierta', JSON.stringify(estado));
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
