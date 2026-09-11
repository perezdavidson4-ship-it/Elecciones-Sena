/* ============================================================
   store.js — Manejo de LocalStorage y Conexión con Google Sheets
   ============================================================ */

// Reemplaza esta URL por la de tu despliegue en Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyYynp9gx3zKur3KShfd_R5ZEx_prPIW5vZ7lanHSu1n9SYMmaIiqq47towiGVWA16tjw/exec";

const Store = {
  obtenerCandidatos() {
    return JSON.parse(localStorage.getItem('sena_candidatos')) || [];
  },

  agregarCandidato(candidato) {
    const candidatos = this.obtenerCandidatos();
    if (candidatos.some(c => String(c.numero) === String(candidato.numero))) {
      throw new Error('Ya existe un candidato registrado con ese número de tarjetón.');
    }
    candidato.id = 'cand_' + Date.now();
    candidatos.push(candidato);
    localStorage.setItem('sena_candidatos', JSON.stringify(candidatos));
  },

  eliminarCandidato(id) {
    const candidatos = this.obtenerCandidatos().filter(c => c.id !== id);
    localStorage.setItem('sena_candidatos', JSON.stringify(candidatos));
  },

  urnaHabilitada() {
    const estado = localStorage.getItem('sena_urna_abierta');
    return estado === null ? true : JSON.parse(estado);
  },

  fijarUrna(estado) {
    localStorage.setItem('sena_urna_abierta', JSON.stringify(estado));
  },

  // Consulta a Google Sheets si el documento está habilitado y si ya votó
  async verificarDocumento(doc) {
    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=verificar&doc=${encodeURIComponent(doc)}`);
    return await res.json();
  },

  // Registra la cédula en Google Sheets y suma el voto anónimo localmente
  async registrarVoto(doc, candidatoId) {
    // 1. Enviar cédula al Excel / Google Sheets
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc: doc })
    });

    // 2. Registrar voto anónimo en LocalStorage para conteo
    const votos = JSON.parse(localStorage.getItem('sena_votos')) || [];
    votos.push({ candidatoId, fecha: new Date().toISOString() });
    localStorage.setItem('sena_votos', JSON.stringify(votos));
  },

  conteoPorCandidato() {
    const votos = JSON.parse(localStorage.getItem('sena_votos')) || [];
    return votos.reduce((acc, v) => {
      acc[v.candidatoId] = (acc[v.candidatoId] || 0) + 1;
      return acc;
    }, {});
  },

  totalVotos() {
    const votos = JSON.parse(localStorage.getItem('sena_votos')) || [];
    return votos.length;
  },

  iniciarSesionAdmin(clave) {
    if (clave === 'admin123') { // Clave predeterminada
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

  reiniciarVotacion() {
    localStorage.removeItem('sena_votos');
  }
};