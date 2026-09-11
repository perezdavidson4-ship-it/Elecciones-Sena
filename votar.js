async function renderizarTarjeton() {
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

    rejilla.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Cargando tarjetón...</p>';

    // Obtener candidatos directamente desde Google Sheets
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

    // Agregar Voto en Blanco
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
