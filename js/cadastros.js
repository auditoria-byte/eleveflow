/* ============================================================
   CEP
   ============================================================ */
const cepInput = document.getElementById('cep');
const loadingCep = document.getElementById('loadingCep');
cepInput.addEventListener('blur', async ()=>{
  const cep = cepInput.value.replace(/\D/g,'');
  if (cep.length!==8) return;
  loadingCep.style.display='block';
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (!data.erro) {
      document.getElementById('rua').value = data.logradouro;
      document.getElementById('bairro').value = data.bairro;
      document.getElementById('cidade').value = data.localidade;
      document.getElementById('uf').value = data.uf;
    } else { alert('CEP não encontrado'); }
  } catch(e) { alert('Erro ao buscar CEP'); }
  finally { loadingCep.style.display='none'; }
});

/* ============================================================
   EQUIPAMENTOS DINÂMICOS (Cadastro de Cliente)
   ============================================================ */
const qtdElevadoresInput = document.getElementById('qtdElevadores');
const containerElevadores = document.getElementById('containerElevadores');
const tituloElevadores = document.getElementById('tituloElevadores');

function gerarCamposElevadores(qtd, dadosExistentes = []){
  containerElevadores.innerHTML = '';
  tituloElevadores.classList.toggle('hidden', qtd <= 0);

  for (let i = 0; i < qtd; i++){
    const dados = dadosExistentes[i] || {};
    const div = document.createElement('div');
    div.className = 'elevador-card';
    div.innerHTML = `
      <div class="titulo-elevador">🛗 Elevador ${i+1}</div>
      <div class="elevador-grid">
        <div class="input-group">
          <label>Tipo</label>
          <select class="elev-tipo">
            <option value="Convencional" ${dados.tipo==='Convencional'?'selected':''}>Convencional</option>
            <option value="Plataforma" ${dados.tipo==='Plataforma'?'selected':''}>Plataforma</option>
          </select>
        </div>
        <div class="input-group">
          <label>Contrato</label>
          <select class="elev-contrato">
            <option value="Mensal" ${dados.contrato==='Mensal'?'selected':''}>Mensal</option>
            <option value="Bimestral" ${dados.contrato==='Bimestral'?'selected':''}>Bimestral</option>
            <option value="Trimestral" ${dados.contrato==='Trimestral'?'selected':''}>Trimestral</option>
            <option value="Integral (Cobertura de Peças)" ${dados.contrato==='Integral (Cobertura de Peças)'?'selected':''}>Integral (Cobertura de Peças)</option>
            <option value="Avulso" ${dados.contrato==='Avulso'?'selected':''}>Avulso</option>
          </select>
        </div>
        <div class="input-group">
          <label>Nº de Série / Identificação</label>
          <input type="text" class="elev-serie" value="${dados.serie || ''}">
        </div>
      </div>
    `;
    containerElevadores.appendChild(div);
  }
}
qtdElevadoresInput.addEventListener('input', () => {
  const qtd = parseInt(qtdElevadoresInput.value) || 0;
  gerarCamposElevadores(qtd);
});

function coletarElevadoresDoFormulario(){
  const cards = containerElevadores.querySelectorAll('.elevador-card');
  return Array.from(cards).map(card => ({
    tipo: card.querySelector('.elev-tipo').value,
    contrato: card.querySelector('.elev-contrato').value,
    serie: card.querySelector('.elev-serie').value.trim()
  }));
}

/* ============================================================
   SALVAR / EDITAR CLIENTE (COM GEOCODIFICAÇÃO)
   ============================================================ */
document.getElementById('formCliente').addEventListener('submit', async function(e){
  e.preventDefault();

  const editId = document.getElementById('clienteEditId').value;
  const statusSelecionado = document.querySelector('input[name="status"]:checked').value;

  const clienteObj = {
    id: editId ? parseInt(editId) : Date.now(),
    nome: document.getElementById('nome').value.trim(),
    documento: document.getElementById('documento').value.trim(),
    setor: document.getElementById('setor').value,
    telefone: document.getElementById('telefone').value.trim(),
    email: document.getElementById('email').value.trim(),
    cep: document.getElementById('cep').value.trim(),
    rua: document.getElementById('rua').value.trim(),
    numero: document.getElementById('numero').value.trim(),
    complemento: document.getElementById('complemento').value.trim(),
    bairro: document.getElementById('bairro').value.trim(),
    cidade: document.getElementById('cidade').value.trim(),
    uf: document.getElementById('uf').value.trim(),
    qtdElevadores: parseInt(qtdElevadoresInput.value) || 0,
    elevadores: coletarElevadoresDoFormulario(),
    status: statusSelecionado,
    observacoes: document.getElementById('observacoes').value.trim()
  };

  const clienteAntigo = editId ? clientes.find(c => c.id === parseInt(editId)) : null;
  const enderecoMudou = !clienteAntigo ||
    clienteAntigo.rua !== clienteObj.rua ||
    clienteAntigo.numero !== clienteObj.numero ||
    clienteAntigo.cidade !== clienteObj.cidade;

  const btnSalvar = document.getElementById('btnSalvarCliente');
  btnSalvar.disabled = true;
  btnSalvar.textContent = 'Localizando endereço no mapa...';

  if (enderecoMudou) {
    const coords = await geocodificarEndereco(clienteObj);
    if (coords) { clienteObj.lat = coords.lat; clienteObj.lng = coords.lng; }
    else { clienteObj.lat = null; clienteObj.lng = null; }
  } else {
    clienteObj.lat = clienteAntigo.lat;
    clienteObj.lng = clienteAntigo.lng;
  }

  btnSalvar.disabled = false;
  btnSalvar.textContent = editId ? 'Salvar Alterações' : 'Salvar Cliente';

  if (editId) {
    const idx = clientes.findIndex(c => c.id === parseInt(editId));
    if (idx > -1) clientes[idx] = clienteObj;
  } else {
    clientes.push(clienteObj);
  }

  salvarClientesLocalStorage();
  sincronizarEdificioComCliente(clienteObj);

  if (clienteObj.lat) {
    alert('✅ Cliente salvo com sucesso! Localização encontrada no mapa.');
  } else {
    alert('✅ Cliente salvo com sucesso! ⚠️ Não foi possível localizar o endereço no mapa — verifique rua/cidade.');
  }
  cancelarEdicaoCliente();
  mostrarView('clientes');
});

function cancelarEdicaoCliente(){
  document.getElementById('formCliente').reset();
  document.getElementById('clienteEditId').value = '';
  document.getElementById('badgeEdicao').classList.add('hidden');
  document.getElementById('tituloFormCliente').childNodes[0].textContent = 'Cadastro de Cliente ';
  document.getElementById('btnSalvarCliente').textContent = 'Salvar Cliente';
  document.getElementById('btnCancelarEdicao').style.display = 'none';
  containerElevadores.innerHTML = '';
  tituloElevadores.classList.add('hidden');
}
document.getElementById('btnCancelarEdicao').addEventListener('click', cancelarEdicaoCliente);

function editarCliente(id){
  const c = clientes.find(x => x.id === id);
  if (!c) return;

  document.getElementById('clienteEditId').value = c.id;
  document.getElementById('nome').value = c.nome;
  document.getElementById('documento').value = c.documento || '';
  document.getElementById('setor').value = c.setor || '';
  document.getElementById('telefone').value = c.telefone || '';
  document.getElementById('email').value = c.email || '';
  document.getElementById('cep').value = c.cep || '';
  document.getElementById('rua').value = c.rua || '';
  document.getElementById('numero').value = c.numero || '';
  document.getElementById('complemento').value = c.complemento || '';
  document.getElementById('bairro').value = c.bairro || '';
  document.getElementById('cidade').value = c.cidade || '';
  document.getElementById('uf').value = c.uf || '';
  document.getElementById('qtdElevadores').value = c.qtdElevadores || 0;
  document.getElementById('observacoes').value = c.observacoes || '';

  document.querySelectorAll('input[name="status"]').forEach(r => r.checked = (r.value === c.status));

  gerarCamposElevadores(c.qtdElevadores || 0, c.elevadores || []);

  document.getElementById('badgeEdicao').classList.remove('hidden');
  document.getElementById('tituloFormCliente').childNodes[0].textContent = 'Editar Cliente ';
  document.getElementById('btnSalvarCliente').textContent = 'Salvar Alterações';
  document.getElementById('btnCancelarEdicao').style.display = 'inline-block';

  mostrarView('cadastro-cliente');
}

function excluirCliente(id){
  if (!confirm('Deseja realmente excluir este cliente?')) return;
  clientes = clientes.filter(c => c.id !== id);
  salvarClientesLocalStorage();
  edificios = edificios.filter(e => e.clienteId !== id);
  salvarEdificiosLocalStorage();
  renderizarTabelaClientes();
}

/* ============================================================
   TABELA DE CLIENTES
   ============================================================ */
function renderizarTabelaClientes(){
  const nomeF = (document.getElementById('filtroNome').value || '').toLowerCase();
  const endF = (document.getElementById('filtroEndereco').value || '').toLowerCase();
  const setorF = document.getElementById('filtroSetor').value;
  const contratoF = document.getElementById('filtroContrato').value;
  const equipF = document.getElementById('filtroEquipamento').value;

  const lista = clientes.filter(c => {
    const endereco = `${c.rua||''} ${c.numero||''} ${c.bairro||''} ${c.cidade||''}`.toLowerCase();
    const temContrato = !contratoF || (c.elevadores||[]).some(e => e.contrato === contratoF);
    const temEquip = !equipF || (c.elevadores||[]).some(e => e.tipo === equipF);
    return c.nome.toLowerCase().includes(nomeF) &&
           endereco.includes(endF) &&
           (!setorF || c.setor === setorF) &&
           temContrato && temEquip;
  });

  const tbody = document.getElementById('tabelaClientes');
  tbody.innerHTML = '';
  document.getElementById('mensagemVaziaClientes').style.display = lista.length ? 'none' : 'block';

  lista.forEach(c => {
    const endereco = c.rua ? `${c.rua}, ${c.numero||''} - ${c.bairro||''}, ${c.cidade||''}/${c.uf||''}` : '—';
    const contratos = [...new Set((c.elevadores||[]).map(e=>e.contrato))].join(', ') || '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.nome}</td>
      <td>${endereco}</td>
      <td>${c.qtdElevadores || 0}</td>
      <td><span class="setor-tag">${c.setor || '-'}</span></td>
      <td>${contratos}</td>
      <td><span class="badge ${c.status}">${c.status}</span></td>
      <td class="acoes">
        <button class="btn-acao" onclick="editarCliente(${c.id})" title="Editar">✏️</button>
        <button class="btn-acao" onclick="excluirCliente(${c.id})" title="Excluir">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}
['filtroNome','filtroEndereco','filtroSetor','filtroContrato','filtroEquipamento'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderizarTabelaClientes);
  document.getElementById(id).addEventListener('change', renderizarTabelaClientes);
});

/* ============================================================
   EDIFÍCIOS — sincronizados automaticamente com Cliente
   ============================================================ */
function sincronizarEdificioComCliente(cliente){
  const endereco = cliente.rua
    ? `${cliente.rua}, ${cliente.numero||''} - ${cliente.bairro||''}, ${cliente.cidade||''}/${cliente.uf||''}`
    : '—';
  const tipos = [...new Set((cliente.elevadores||[]).map(e=>e.tipo))].join(', ') || '-';
  const contratos = [...new Set((cliente.elevadores||[]).map(e=>e.contrato))].join(', ') || '-';

  let edif = edificios.find(e => e.clienteId === cliente.id);
  if (edif) {
    edif.nome = cliente.nome;
    edif.setor = cliente.setor;
    edif.endereco = endereco;
    edif.qtdElevadores = cliente.qtdElevadores;
    edif.tipo = tipos;
    edif.contrato = contratos;
    edif.status = cliente.status;
    edif.lat = cliente.lat;
    edif.lng = cliente.lng;
  } else {
    edificios.push({
      id: Date.now(),
      clienteId: cliente.id,
      nome: cliente.nome,
      zona: '',
      setor: cliente.setor,
      endereco: endereco,
      qtdElevadores: cliente.qtdElevadores,
      tipo: tipos,
      contrato: contratos,
      status: cliente.status,
      lat: cliente.lat,
      lng: cliente.lng
    });
  }
  salvarEdificiosLocalStorage();
}

function renderizarTabelaEdificios(){
  const nomeF = (document.getElementById('filtroEdifNome').value || '').toLowerCase();
  const setorF = document.getElementById('filtroEdifSetor').value;
  const statusF = document.getElementById('filtroEdifStatus').value;

  const lista = edificios.filter(e =>
    e.nome.toLowerCase().includes(nomeF) &&
    (!setorF || e.setor === setorF) &&
    (!statusF || e.status === statusF)
  );

  const tbody = document.getElementById('tabelaEdificios');
  tbody.innerHTML = '';
  document.getElementById('mensagemVaziaEdificios').style.display = lista.length ? 'none' : 'block';

  lista.forEach(e => {
    const zonaObj = zonas.find(z => z.id === parseInt(e.zona));
    const zonaLabel = zonaObj ? zonaObj.nome : (e.zona || '-');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.clienteId}</td>
      <td>${e.nome}</td>
      <td>${zonaLabel}</td>
      <td><span class="setor-tag">${e.setor || '-'}</span></td>
      <td>${e.endereco}</td>
      <td>${e.qtdElevadores || 0}</td>
      <td>${e.tipo || '-'}</td>
      <td>${e.contrato || '-'}</td>
      <td><span class="badge ${e.status}">${e.status}</span></td>
      <td class="acoes">
  <button class="btn-acao" onclick="abrirModalEdificio(${e.id})" title="Editar">✏️</button>
  <button class="btn-acao" onclick="excluirEdificio(${e.id})" title="Excluir">🗑️</button>
</td>`;
    tbody.appendChild(tr);
  });
}
['filtroEdifNome','filtroEdifSetor','filtroEdifStatus'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderizarTabelaEdificios);
  document.getElementById(id).addEventListener('change', renderizarTabelaEdificios);
});

/* ============================================================
   MODAL EDITAR EDIFÍCIO — ZONA DEFINE O SETOR AUTOMATICAMENTE
   ============================================================ */
function preencherSelectZonaEdificio(zonaSelecionada){
  const sel = document.getElementById('edifZona');
  sel.innerHTML = '<option value="">Selecione uma zona</option>';
  zonas.forEach(z => {
    const usuario = usuarios.find(u => u.id === z.usuarioId);
    const label = usuario ? `${z.nome} (${z.setor}) - ${usuario.nome}` : `${z.nome} (${z.setor})`;
    sel.innerHTML += `<option value="${z.id}">${label}</option>`;
  });
  sel.value = zonaSelecionada || '';
}

function atualizarSetorPelaZona(){
  const zonaId = parseInt(document.getElementById('edifZona').value);
  const zonaObj = zonas.find(z => z.id === zonaId);
  document.getElementById('edifSetor').value = zonaObj ? zonaObj.setor : '';
}

function abrirModalEdificio(id){
  const e = edificios.find(x => x.id === id);
  if (!e) return;
  document.getElementById('edifId').value = e.id;
  document.getElementById('edifClienteId').value = e.clienteId;
  document.getElementById('edifNome').value = e.nome;
  document.getElementById('edifEndereco').value = e.endereco;
  document.getElementById('edifQtdElevadores').value = e.qtdElevadores || 0;
  document.getElementById('edifTipo').value = e.tipo || '';
  document.getElementById('edifContrato').value = e.contrato || '';
  document.getElementById('edifStatus').value = e.status;
  preencherSelectZonaEdificio(e.zona);
  atualizarSetorPelaZona();
  document.getElementById('modalEditarEdificio').classList.add('ativo');
}
document.getElementById('edifZona').addEventListener('change', atualizarSetorPelaZona);
document.getElementById('btnCancelarModalEdif').addEventListener('click', () => {
  document.getElementById('modalEditarEdificio').classList.remove('ativo');
});

document.getElementById('btnSalvarModalEdif').addEventListener('click', () => {
  const id = parseInt(document.getElementById('edifId').value);
  const e = edificios.find(x => x.id === id);
  if (!e) return;
  e.nome = document.getElementById('edifNome').value.trim();
  e.zona = document.getElementById('edifZona').value;
  e.setor = document.getElementById('edifSetor').value;
  e.endereco = document.getElementById('edifEndereco').value.trim();
  e.status = document.getElementById('edifStatus').value;
  salvarEdificiosLocalStorage();
  document.getElementById('modalEditarEdificio').classList.remove('ativo');
  renderizarTabelaEdificios();
  alert('✅ Edifício atualizado com sucesso!');
});

function excluirEdificio(id){
  if (!confirm('Deseja realmente excluir este edifício?')) return;
  edificios = edificios.filter(e => e.id !== id);
  salvarEdificiosLocalStorage();
  renderizarTabelaEdificios();
}

/* ============================================================
   ZONAS DE ATENDIMENTO
   ============================================================ */
function preencherSelectUsuariosZona(){
  const sel = document.getElementById('inputZonaUsuario');
  const valorAtual = sel.value;
  sel.innerHTML = '<option value="">Selecione o usuário</option>';
  usuarios.filter(u => u.status === 'ativo').forEach(u => {
    sel.innerHTML += `<option value="${u.id}">${u.nome} (${u.funcao})</option>`;
  });
  sel.value = valorAtual;
}

function renderizarTabelaZonas(){
  preencherSelectUsuariosZona();
  const tbody = document.getElementById('tabelaZonas');
  tbody.innerHTML = '';
  document.getElementById('mensagemVaziaZonas').style.display = zonas.length ? 'none' : 'block';

  zonas.forEach(z => {
    const usuario = usuarios.find(u => u.id === z.usuarioId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${z.nome}</td>
      <td><span class="setor-tag">${z.setor || '-'}</span></td>
      <td>${usuario ? usuario.nome : '⚠️ Usuário removido'}</td>
      <td>${usuario ? usuario.funcao : '-'}</td>
      <td class="acoes">
        <button class="btn-acao" onclick="editarZona(${z.id})" title="Editar">✏️</button>
        <button class="btn-acao" onclick="excluirZona(${z.id})" title="Excluir">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('btnAdicionarZona').addEventListener('click', () => {
  const nome = document.getElementById('inputZonaNome').value.trim();
  const setor = document.getElementById('inputZonaSetor').value;
  const usuarioId = parseInt(document.getElementById('inputZonaUsuario').value);
  const editId = document.getElementById('zonaEditId').value;

  if (!nome || !setor || !usuarioId) { alert('Preencha nome, setor e usuário responsável.'); return; }

  if (editId) {
    const z = zonas.find(x => x.id === parseInt(editId));
    if (z) { z.nome = nome; z.setor = setor; z.usuarioId = usuarioId; }
    cancelarEdicaoZona();
  } else {
    zonas.push({ id: Date.now(), nome, setor, usuarioId });
  }

  salvarZonasLocalStorage();
  document.getElementById('inputZonaNome').value = '';
  document.getElementById('inputZonaSetor').value = '';
  document.getElementById('inputZonaUsuario').value = '';
  renderizarTabelaZonas();
});

function editarZona(id){
  const z = zonas.find(x => x.id === id);
  if (!z) return;
  document.getElementById('zonaEditId').value = z.id;
  document.getElementById('inputZonaNome').value = z.nome;
  document.getElementById('inputZonaSetor').value = z.setor;
  preencherSelectUsuariosZona();
  document.getElementById('inputZonaUsuario').value = z.usuarioId;
  document.getElementById('btnAdicionarZona').textContent = 'Salvar Alterações';
  document.getElementById('btnCancelarEdicaoZona').style.display = 'inline-block';
}
function cancelarEdicaoZona(){
  document.getElementById('zonaEditId').value = '';
  document.getElementById('btnAdicionarZona').textContent = '+ Adicionar Zona';
  document.getElementById('btnCancelarEdicaoZona').style.display = 'none';
}
document.getElementById('btnCancelarEdicaoZona').addEventListener('click', () => {
  cancelarEdicaoZona();
  document.getElementById('inputZonaNome').value = '';
  document.getElementById('inputZonaSetor').value = '';
  document.getElementById('inputZonaUsuario').value = '';
});
function excluirZona(id){
  if (!confirm('Deseja realmente excluir esta zona?')) return;
  zonas = zonas.filter(z => z.id !== id);
  salvarZonasLocalStorage();
  renderizarTabelaZonas();
}

/* ============================================================
   USUÁRIOS
   ============================================================ */
function renderizarTabelaUsuarios(){
  const tbody = document.getElementById('tabelaUsuarios');
  tbody.innerHTML = '';
  document.getElementById('mensagemVaziaUsuarios').style.display = usuarios.length ? 'none' : 'block';

  usuarios.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.nome}</td>
      <td>${u.login}</td>
      <td><span class="funcao-tag">${u.funcao}</span></td>
      <td><span class="badge ${u.status}">${u.status}</span></td>
      <td class="acoes">
        <button class="btn-acao" onclick="abrirModalUsuario(${u.id})" title="Editar">✏️</button>
        <button class="btn-acao" onclick="alternarStatusUsuario(${u.id})" title="Ativar/Inativar">🔄</button>
        <button class="btn-acao" onclick="excluirUsuario(${u.id})" title="Excluir">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('btnAdicionar').addEventListener('click', () => {
  const nome = document.getElementById('inputNome').value.trim();
  const login = document.getElementById('inputLogin').value.trim();
  const senha = document.getElementById('inputSenha').value;
  const funcao = document.getElementById('inputFuncao').value;

  if (!nome || !login || !senha || !funcao) { alert('Preencha todos os campos.'); return; }
  if (usuarios.some(u => u.login.toLowerCase() === login.toLowerCase())) { alert('Login já existe.'); return; }

  usuarios.push({ id: Date.now(), nome, login, senha, funcao, status: 'ativo' });
  salvarUsuariosLocalStorage();
  document.getElementById('inputNome').value = '';
  document.getElementById('inputLogin').value = '';
  document.getElementById('inputSenha').value = '';
  document.getElementById('inputFuncao').value = '';
  renderizarTabelaUsuarios();
});

function abrirModalUsuario(id){
  const u = usuarios.find(x => x.id === id);
  if (!u) return;
  document.getElementById('editId').value = u.id;
  document.getElementById('editNome').value = u.nome;
  document.getElementById('editLogin').value = u.login;
  document.getElementById('editFuncao').value = u.funcao;
  document.getElementById('editSenha').value = '';
  document.getElementById('modalEditar').classList.add('ativo');
}
document.getElementById('btnCancelarModal').addEventListener('click', () => {
  document.getElementById('modalEditar').classList.remove('ativo');
});
document.getElementById('btnSalvarModal').addEventListener('click', () => {
  const id = parseInt(document.getElementById('editId').value);
  const u = usuarios.find(x => x.id === id);
  if (!u) return;
  u.nome = document.getElementById('editNome').value.trim();
  u.login = document.getElementById('editLogin').value.trim();
  u.funcao = document.getElementById('editFuncao').value;
  const novaSenha = document.getElementById('editSenha').value;
  if (novaSenha) u.senha = novaSenha;
  salvarUsuariosLocalStorage();
  document.getElementById('modalEditar').classList.remove('ativo');
  renderizarTabelaUsuarios();
});
function alternarStatusUsuario(id){
  const u = usuarios.find(x => x.id === id);
  if (!u) return;
  u.status = u.status === 'ativo' ? 'inativo' : 'ativo';
  salvarUsuariosLocalStorage();
  renderizarTabelaUsuarios();
}
function excluirUsuario(id){
  if (!confirm('Deseja realmente excluir este usuário?')) return;
  usuarios = usuarios.filter(u => u.id !== id);
  salvarUsuariosLocalStorage();
  renderizarTabelaUsuarios();
}
