/* ============================================================
   DASHBOARD — CARDS E ALERTAS
   ============================================================ */
function renderCards(){
  document.getElementById('cardTotalChamados').textContent = ordensServico.filter(os => os.tipo === 'chamado').length;

  const preventivas = ordensServico.filter(os => os.tipo === 'preventiva');
  const percPreventivas = clientes.length ? Math.round((preventivas.length / clientes.length) * 100) : 0;
  document.getElementById('cardPreventivasOk').textContent = percPreventivas + '%';

  document.getElementById('cardClientesCriticos').textContent = 0;
  document.getElementById('cardReincidencias').textContent = 0;
}

function renderAlertas(){
  const listaRe = document.getElementById('listaReincidencias');
  const listaCr = document.getElementById('listaClientesCriticos');
  listaRe.innerHTML = '<div class="vazio-alerta">Nenhuma reincidência no período.</div>';
  listaCr.innerHTML = '<div class="vazio-alerta">Nenhum cliente crítico no período.</div>';
}

function renderPreventivas(){
  const container = document.getElementById('containerPreventivas');
  if (!clientes.length) {
    container.innerHTML = '<div class="vazio-alerta">Nenhum cliente cadastrado ainda.</div>';
    return;
  }
  container.innerHTML = clientes.map(c => `
    <div class="barra-progresso-container">
      <div class="barra-progresso-label"><span>${c.nome}</span><span>0%</span></div>
      <div class="barra-progresso-bg"><div class="barra-progresso-fill" style="width:0%;background:var(--verde);"></div></div>
    </div>
  `).join('');
}

/* ============================================================
   MAPAS (LEAFLET) — COM MARCADORES REAIS
   ============================================================ */
function criarIconeColorido(cor){
  return L.divIcon({
    className: 'marcador-custom',
    html: `<div style="background:${cor};width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.4);"></div>`,
    iconSize: [16,16],
    iconAnchor: [8,8]
  });
}

function iniciarMapa(){
  const el = document.getElementById('mapa');
  if (!el) return;
  if (mapaInstance) { mapaInstance.remove(); mapaInstance = null; }
  mapaInstance = L.map('mapa').setView([-26.9, -48.6], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapaInstance);

  const clientesComLocalizacao = clientes.filter(c => c.lat && c.lng);
  const bounds = [];

  clientesComLocalizacao.forEach(c => {
    const cor = '#27AE60';
    const marcador = L.marker([c.lat, c.lng], { icon: criarIconeColorido(cor) }).addTo(mapaInstance);
    const endereco = c.rua ? `${c.rua}, ${c.numero||''} - ${c.bairro||''}, ${c.cidade||''}/${c.uf||''}` : '—';
    marcador.bindPopup(`
      <strong>${c.nome}</strong>
      <div class="popup-endereco">${endereco}</div>
      <span class="popup-badge" style="background:${cor};color:#fff;">${c.status}</span>
    `);
    bounds.push([c.lat, c.lng]);
  });

  if (bounds.length) mapaInstance.fitBounds(bounds, { padding:[30,30], maxZoom:14 });
}

function iniciarMapaRastreio(){
  const el = document.getElementById('mapaRastreio');
  if (!el) return;
  if (mapaRastreioInstance) { mapaRastreioInstance.remove(); mapaRastreioInstance = null; }
  mapaRastreioInstance = L.map('mapaRastreio').setView([-26.9, -48.6], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapaRastreioInstance);

  const tecnicos = usuarios.filter(u => FUNCOES_RASTREIO.includes(u.funcao) && u.status === 'ativo');
  const bounds = [];
  let algumPlotado = false;

  tecnicos.forEach(tec => {
    const osCampo = ordensServico
      .filter(os => os.usuario === tec.nome && os.situacao === 'campo')
      .sort((a,b) => new Date(b.dataHora) - new Date(a.dataHora))[0];

    if (!osCampo) return;

    const cliente = clientes.find(c => c.nome === osCampo.cliente);
    if (!cliente || !cliente.lat) return;

    const cor = osCampo.tipo === 'chamado' ? '#EF4444' : '#3B82F6';
    const statusTexto = osCampo.tipo === 'chamado' ? 'Em Chamado' : 'Em Outro Serviço';

    const marcador = L.marker([cliente.lat, cliente.lng], { icon: criarIconeColorido(cor) }).addTo(mapaRastreioInstance);
    marcador.bindPopup(`
      <strong>${tec.nome}</strong>
      <div class="popup-endereco">${tec.funcao} — atendendo ${cliente.nome}</div>
      <span class="popup-badge" style="background:${cor};color:#fff;">${statusTexto}</span>
    `);
    bounds.push([cliente.lat, cliente.lng]);
    algumPlotado = true;
  });

  document.getElementById('listaRastreioVazio').classList.toggle('hidden', algumPlotado);

  if (bounds.length) mapaRastreioInstance.fitBounds(bounds, { padding:[30,30], maxZoom:14 });
}

function iniciarMapaTecnicosAuto(){
  const el = document.getElementById('mapaTecnicosAuto');
  if (!el) return;
  if (mapaAutoInstance) { mapaAutoInstance.remove(); mapaAutoInstance = null; }

  const cliente = window.clienteChamadoAtual;
  const centro = (cliente && cliente.lat) ? [cliente.lat, cliente.lng] : [-26.9, -48.6];

  mapaAutoInstance = L.map('mapaTecnicosAuto').setView(centro, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapaAutoInstance);

  if (cliente && cliente.lat) {
    L.marker(centro, { icon: criarIconeColorido('#f97316') }).addTo(mapaAutoInstance)
      .bindPopup(`<strong>${cliente.nome}</strong><div class="popup-endereco">Local do chamado</div>`)
      .openPopup();
  }
}
