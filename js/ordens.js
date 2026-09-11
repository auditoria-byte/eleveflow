/* ============================================================
   ORDENS DE SERVIÇO — LISTAGEM
   ============================================================ */
function preencherFiltroUsuarios(){
  const sel = document.getElementById('fUsuarioSel');
  sel.innerHTML = '<option value="">Todos</option>';
  usuarios.forEach(u => sel.innerHTML += `<option value="${u.nome}">${u.nome}</option>`);
}

function formatarDataHora(iso){
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR');
}

function renderizarTabela(){
  let lista = [...ordensServico];

  if (statusFiltroAtual !== 'todas') lista = lista.filter(os => os.situacao === statusFiltroAtual);

  const busca = (document.getElementById('buscaTabela').value || '').toLowerCase();
  if (busca) {
    lista = lista.filter(os =>
      (os.cliente||'').toLowerCase().includes(busca) ||
      String(os.id).includes(busca) ||
      (os.usuario||'').toLowerCase().includes(busca)
    );
  }

  if (filtroOSAtivo.dataInicial) lista = lista.filter(os => os.dataHora >= filtroOSAtivo.dataInicial);
  if (filtroOSAtivo.dataFinal) lista = lista.filter(os => os.dataHora <= filtroOSAtivo.dataFinal + 'T23:59');
  if (filtroOSAtivo.status) lista = lista.filter(os => os.situacao === filtroOSAtivo.status);
  if (filtroOSAtivo.tipo) lista = lista.filter(os => os.tipo === filtroOSAtivo.tipo);
  if (filtroOSAtivo.id) lista = lista.filter(os => String(os.id).includes(filtroOSAtivo.id));
  if (filtroOSAtivo.equipe) lista = lista.filter(os => os.equipe === filtroOSAtivo.equipe);
  if (filtroOSAtivo.usuario) lista = lista.filter(os => os.usuario === filtroOSAtivo.usuario);
  if (filtroOSAtivo.cliente) lista = lista.filter(os => (os.cliente||'').toLowerCase().includes(filtroOSAtivo.cliente.toLowerCase()));
  if (filtroOSAtivo.equipamento) lista = lista.filter(os => (os.equipamento||'').toLowerCase().includes(filtroOSAtivo.equipamento.toLowerCase()));

  document.getElementById('qtdTodas').textContent = ordensServico.length;
  ['preparacao','pendente','campo','retornada','cancelada'].forEach(s => {
    document.getElementById('qtd' + s.charAt(0).toUpperCase() + s.slice(1)).textContent =
      ordensServico.filter(os => os.situacao === s).length;
  });

  const tbody = document.getElementById('tabelaOS');
  tbody.innerHTML = '';
  document.getElementById('vazioOS').classList.toggle('hidden', lista.length > 0);
  document.getElementById('contadorResultados').textContent = `${lista.length} registro(s)`;

  lista.slice().reverse().forEach(os => {
    const avaliacaoTexto = os.avaliacao ? '⭐'.repeat(parseInt(os.avaliacao)) : '-';
    const laudoDesabilitado = !os.laudoUrl;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${os.id}</td>
      <td>${formatarDataHora(os.dataHora)}</td>
      <td>${formatarDataHora(os.dataHoraAceite)}</td>
      <td>${formatarDataHora(os.dataHoraChegada)}</td>
      <td>${formatarDataHora(os.dataHoraUltimaExecucao)}</td>
      <td><span class="tag-tipo ${os.tipo}">${os.tipo}</span></td>
      <td>${os.equipe || '-'}</td>
      <td>${os.usuario || '-'}</td>
      <td>${os.cliente || '-'}</td>
      <td>${os.equipamento || '-'}</td>
      <td>${os.zona || '-'}</td>
      <td><span class="tag-situacao ${os.situacao}">${os.situacao}</span></td>
      <td>${avaliacaoTexto}</td>
      <td class="acoes">
        <button class="btn-acao" onclick="abrirModalOS(${os.id})" title="Editar">✏️</button>
        <button class="btn-acao" onclick="cancelarOS(${os.id})" title="Cancelar OS">🗑️</button>
        <button class="btn-acao" onclick="verLaudo(${os.id})" title="Ver laudo" ${laudoDesabilitado ? 'disabled' : ''}>📄</button>
      </td>`;
    tbody.appendChild(tr);
  });

  if (mapaRastreioInstance && document.getElementById('view-principal').classList.contains('ativa')) {
    iniciarMapaRastreio();
  }
}
document.getElementById('buscaTabela').addEventListener('input', renderizarTabela);
document.querySelectorAll('.status-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.status-item').forEach(i => i.classList.remove('ativo'));
    item.classList.add('ativo');
    statusFiltroAtual = item.dataset.status;
    renderizarTabela();
  });
});

/* ============================================================
   MODAL DE EDIÇÃO DE OS
   ============================================================ */
function paraInputDatetime(iso){
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function deInputDatetime(valor){
  if (!valor) return null;
  return new Date(valor).toISOString();
}

function abrirModalOS(id){
  const os = ordensServico.find(x => x.id === id);
  if (!os) return;
  document.getElementById('editOSId').value = os.id;
  document.getElementById('editOSCliente').value = os.cliente || '';
  document.getElementById('editOSEquipamento').value = os.equipamento || '';
  document.getElementById('editOSZona').value = os.zona || '';
  document.getElementById('editOSTipo').value = os.tipo;
  document.getElementById('editOSSituacao').value = os.situacao;
  document.getElementById('editOSEquipe').value = os.equipe || '';
  document.getElementById('editOSUsuario').value = os.usuario || '';
  document.getElementById('editOSAceite').value = paraInputDatetime(os.dataHoraAceite);
  document.getElementById('editOSChegada').value = paraInputDatetime(os.dataHoraChegada);
  document.getElementById('editOSExecucao').value = paraInputDatetime(os.dataHoraUltimaExecucao);
  document.getElementById('editOSAvaliacao').value = os.avaliacao || '';
  document.getElementById('editOSObs').value = os.observacoes || '';
  document.getElementById('modalEditarOS').classList.add('ativo');
}
document.getElementById('btnCancelarModalOS').addEventListener('click', () => {
  document.getElementById('modalEditarOS').classList.remove('ativo');
});
document.getElementById('btnSalvarModalOS').addEventListener('click', () => {
  const id = parseInt(document.getElementById('editOSId').value);
  const os = ordensServico.find(x => x.id === id);
  if (!os) return;
  os.cliente = document.getElementById('editOSCliente').value.trim();
  os.equipamento = document.getElementById('editOSEquipamento').value.trim();
  os.zona = document.getElementById('editOSZona').value.trim();
  os.tipo = document.getElementById('editOSTipo').value;
  os.situacao = document.getElementById('editOSSituacao').value;
  os.equipe = document.getElementById('editOSEquipe').value.trim();
  os.usuario = document.getElementById('editOSUsuario').value.trim();
  os.dataHoraAceite = deInputDatetime(document.getElementById('editOSAceite').value);
  os.dataHoraChegada = deInputDatetime(document.getElementById('editOSChegada').value);
  os.dataHoraUltimaExecucao = deInputDatetime(document.getElementById('editOSExecucao').value);
  os.avaliacao = document.getElementById('editOSAvaliacao').value || null;
  os.observacoes = document.getElementById('editOSObs').value.trim();
  salvarOSLocalStorage();
  document.getElementById('modalEditarOS').classList.remove('ativo');
  renderizarTabela();
});

/* ============================================================
   CANCELAR OS (não exclui — só muda a situação p/ "cancelada")
   ============================================================ */
function cancelarOS(id){
  if (!confirm('Deseja cancelar esta Ordem de Serviço? O histórico será mantido.')) return;
  const os = ordensServico.find(x => x.id === id);
  if (!os) return;
  os.situacao = 'cancelada';
  salvarOSLocalStorage();
  renderizarTabela();
}

/* ============================================================
   VER LAUDO (placeholder — geração automática vem depois)
   ============================================================ */
function verLaudo(id){
  const os = ordensServico.find(x => x.id === id);
  if (!os || !os.laudoUrl) {
    alert('Laudo ainda não gerado para esta OS.');
    return;
  }
  window.open(os.laudoUrl, '_blank');
}

/* ============================================================
   FILTROS AVANÇADOS
   ============================================================ */
document.getElementById('btnAbrirFiltro').addEventListener('click', () => {
  document.getElementById('modalFiltro').classList.add('ativo');
});
document.getElementById('fecharModalFiltro').addEventListener('click', () => {
  document.getElementById('modalFiltro').classList.remove('ativo');
});
document.getElementById('btnLimparFiltro').addEventListener('click', () => {
  filtroOSAtivo = {};
  document.querySelectorAll('.campo-filtro input, .campo-filtro select').forEach(el => el.value = '');
  document.getElementById('btnAbrirFiltro').classList.remove('tem-filtro');
  document.getElementById('modalFiltro').classList.remove('ativo');
  renderizarTabela();
});
document.getElementById('btnAplicarFiltro').addEventListener('click', () => {
  filtroOSAtivo = {
    dataInicial: document.getElementById('fDataIncInicial').value,
    dataFinal: document.getElementById('fDataIncFinal').value,
    status: document.getElementById('fStatus').value,
    tipo: document.getElementById('fTipoOS').value,
    id: document.getElementById('fId').value,
    equipe: document.getElementById('fEquipe').value,
    usuario: document.getElementById('fUsuarioSel').value,
    cliente: document.getElementById('fCliente').value,
    equipamento: document.getElementById('fEquipamentoTxt').value
  };
  const temFiltro = Object.values(filtroOSAtivo).some(v => v);
  document.getElementById('btnAbrirFiltro').classList.toggle('tem-filtro', temFiltro);
  document.getElementById('modalFiltro').classList.remove('ativo');
  renderizarTabela();
});

document.getElementById('btnNovaOS').addEventListener('click', () => mostrarView('gerarOS'));
document.getElementById('btnVoltarListagem').addEventListener('click', () => mostrarView('listagemOS'));

/* ============================================================
   GERAR NOVA OS
   ============================================================ */
function abrirTelaGerarOS(){
  const agora = new Date();
  document.getElementById('previewDataHora2').value = agora.toLocaleString('pt-BR');
  document.getElementById('selTipoOS').value = '';
  document.getElementById('buscaCliente').value = '';
  document.getElementById('clienteSelecionadoId').value = '';
  document.getElementById('selEquipamento').innerHTML = '<option value="">Selecione o cliente primeiro</option>';
  document.getElementById('selEquipamento').disabled = true;
  document.getElementById('dicaEquipamento').textContent = 'Selecione um cliente para listar os equipamentos.';
  document.getElementById('alertaBloqueado').classList.add('hidden');
  document.getElementById('alertaChamado').classList.add('hidden');
  document.getElementById('blocoMapaAuto').style.display = 'none';
  document.getElementById('selSituacao').value = 'pendente';
  document.getElementById('selEquipe').value = '';
  document.getElementById('txtObservacoes').value = '';
  document.getElementById('btnSalvarOS').disabled = false;

  const selUsuario = document.getElementById('selUsuario');
  selUsuario.innerHTML = '<option value="">Selecione (opcional)</option>';
  usuarios.filter(u => u.status === 'ativo').forEach(u => {
    selUsuario.innerHTML += `<option value="${u.nome}">${u.nome} (${u.funcao})</option>`;
  });

  const selZona = document.getElementById('selZona');
  if (selZona) {
    selZona.innerHTML = '<option value="">Selecione (opcional)</option>';
    zonas.forEach(z => {
      selZona.innerHTML += `<option value="${z.nome}">${z.nome}</option>`;
    });
  }
}

const buscaClienteInput = document.getElementById('buscaCliente');
const listaAutocomplete = document.getElementById('listaAutocompleteCliente');
buscaClienteInput.addEventListener('input', () => {
  const termo = buscaClienteInput.value.toLowerCase();
  listaAutocomplete.innerHTML = '';
  if (!termo) { listaAutocomplete.classList.add('hidden'); return; }

  const encontrados = clientes.filter(c => c.nome.toLowerCase().includes(termo));
  if (!encontrados.length) { listaAutocomplete.classList.add('hidden'); return; }

  encontrados.forEach(c => {
    const div = document.createElement('div');
    div.className = 'autocomplete-item';
    div.innerHTML = `${c.nome} <span style="color:var(--texto-sec);font-size:11px;">(${c.setor || 'sem setor'})</span>`;
    div.addEventListener('click', () => selecionarClienteOS(c));
    listaAutocomplete.appendChild(div);
  });
  listaAutocomplete.classList.remove('hidden');
});

function selecionarClienteOS(cliente){
  buscaClienteInput.value = cliente.nome;
  document.getElementById('clienteSelecionadoId').value = cliente.id;
  listaAutocomplete.classList.add('hidden');

  const selEquip = document.getElementById('selEquipamento');
  selEquip.innerHTML = '';
  const elevadores = cliente.elevadores || [];

  if (!elevadores.length) {
    selEquip.innerHTML = '<option value="">Nenhum equipamento cadastrado</option>';
    selEquip.disabled = true;
    document.getElementById('dicaEquipamento').textContent = 'Este cliente não possui equipamentos cadastrados.';
  } else {
    selEquip.innerHTML = '<option value="">Selecione</option>';
    elevadores.forEach((e, i) => {
      selEquip.innerHTML += `<option value="Elevador ${i+1} - ${e.tipo}">Elevador ${i+1} - ${e.tipo} (${e.serie || 'sem identificação'})</option>`;
    });
    selEquip.disabled = false;
    document.getElementById('dicaEquipamento').textContent = `${elevadores.length} equipamento(s) disponível(is).`;
  }

  document.getElementById('alertaBloqueado').classList.toggle('hidden', cliente.status !== 'bloqueado');
  document.getElementById('btnSalvarOS').disabled = cliente.status === 'bloqueado';

  const edif = edificios.find(e => e.clienteId === cliente.id);
  const selZona = document.getElementById('selZona');
  if (edif && edif.zona && selZona) {
    const zonaObj = zonas.find(z => z.id === parseInt(edif.zona));
    if (zonaObj) selZona.value = zonaObj.nome;
  }

  window.clienteChamadoAtual = cliente;
  if (document.getElementById('selTipoOS').value === 'chamado') setTimeout(iniciarMapaTecnicosAuto, 100);
}

document.getElementById('selTipoOS').addEventListener('change', function(){
  const ehChamado = this.value === 'chamado';
  document.getElementById('alertaChamado').classList.toggle('hidden', !ehChamado);
  document.getElementById('blocoMapaAuto').style.display = ehChamado ? 'block' : 'none';
  if (ehChamado) setTimeout(iniciarMapaTecnicosAuto, 100);
});

document.getElementById('btnSalvarOS').addEventListener('click', () => {
  const tipo = document.getElementById('selTipoOS').value;
  const clienteId = document.getElementById('clienteSelecionadoId').value;
  const equipamento = document.getElementById('selEquipamento').value;

  if (!tipo) { alert('Selecione o Tipo de OS.'); return; }
  if (!clienteId) { alert('Selecione um Cliente.'); return; }
  if (!equipamento) { alert('Selecione o Equipamento.'); return; }

  const cliente = clientes.find(c => c.id === parseInt(clienteId));
  if (cliente && cliente.status === 'bloqueado') { alert('Cliente bloqueado. Não é possível gerar OS.'); return; }

  const selZona = document.getElementById('selZona');

  const novaOS = {
    id: Math.floor(100000 + Math.random() * 900000),
    dataHora: new Date().toISOString(),
    dataHoraAceite: null,
    dataHoraChegada: null,
    dataHoraUltimaExecucao: null,
    tipo,
    cliente: cliente ? cliente.nome : '-',
    equipamento,
    zona: selZona ? selZona.value : '',
    situacao: document.getElementById('selSituacao').value,
    equipe: document.getElementById('selEquipe').value,
    usuario: document.getElementById('selUsuario').value,
    observacoes: document.getElementById('txtObservacoes').value.trim(),
    avaliacao: null,
    laudoUrl: null
  };

  ordensServico.push(novaOS);
  salvarOSLocalStorage();
  alert('✅ Ordem de Serviço gerada com sucesso! ID: ' + novaOS.id);
  mostrarView('listagemOS');
});

