/* ============================================================
   DADOS PERSISTIDOS (localStorage)
   ============================================================ */
let usuarios = JSON.parse(localStorage.getItem('elevaflow-usuarios')) || [
  { id: 1, nome: 'Tiago Salim Gomes', login: 'TIAGOSALIM', senha: 'Tsg2942', funcao: 'Administrador', status: 'ativo' }
];
let clientes = JSON.parse(localStorage.getItem('elevaflow-clientes')) || [];
let edificios = JSON.parse(localStorage.getItem('elevaflow-edificios')) || [];
let ordensServico = JSON.parse(localStorage.getItem('elevaflow-os')) || [];
let zonas = JSON.parse(localStorage.getItem('elevaflow-zonas')) || [];
let mapaInstance = null, mapaAutoInstance = null, mapaRastreioInstance = null;
let filtroOSAtivo = {};
let statusFiltroAtual = 'todas';

function salvarUsuariosLocalStorage(){ localStorage.setItem('elevaflow-usuarios', JSON.stringify(usuarios)); }
function salvarClientesLocalStorage(){ localStorage.setItem('elevaflow-clientes', JSON.stringify(clientes)); }
function salvarEdificiosLocalStorage(){ localStorage.setItem('elevaflow-edificios', JSON.stringify(edificios)); }
function salvarOSLocalStorage(){ localStorage.setItem('elevaflow-os', JSON.stringify(ordensServico)); }
function salvarZonasLocalStorage(){ localStorage.setItem('elevaflow-zonas', JSON.stringify(zonas)); }

/* ============================================================
   GEOCODIFICAÇÃO DE ENDEREÇO (Nominatim/OpenStreetMap - gratuito)
   ============================================================ */
async function geocodificarEndereco(cliente){
  const endereco = `${cliente.rua||''} ${cliente.numero||''}, ${cliente.bairro||''}, ${cliente.cidade||''}, ${cliente.uf||''}, Brasil`;
  if (!cliente.rua && !cliente.cidade) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch(e) {
    console.warn('Erro ao geocodificar endereço:', e);
  }
  return null;
}

const FUNCOES_RASTREIO = ['Gestor Técnico', 'Técnico', 'Supervisor'];

/* ============================================================
   TEMA CLARO/ESCURO
   ============================================================ */
function alternarTema(){
  const atual = document.documentElement.getAttribute('data-theme');
  const novo = atual === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', novo);
  document.getElementById('iconeTema').textContent = novo === 'dark' ? '☀️' : '🌙';
  document.getElementById('labelTema').textContent = novo === 'dark' ? 'Modo claro' : 'Modo escuro';
  localStorage.setItem('elevaflow-tema', novo);
}
(function initTema(){
  const salvo = localStorage.getItem('elevaflow-tema');
  if (salvo === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();
document.addEventListener('DOMContentLoaded', () => {
  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    document.getElementById('iconeTema').textContent = '☀️';
    document.getElementById('labelTema').textContent = 'Modo claro';
  }
});

/* ============================================================
   NAVEGAÇÃO
   ============================================================ */
function mostrarView(nome){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('ativa'));
  const v = document.getElementById('view-' + nome);
  if (v) v.classList.add('ativa');

  document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`.nav-item[data-view="${nome}"]`).forEach(n => n.classList.add('active'));

  if (nome === 'principal') {
    renderCards(); renderAlertas(); renderPreventivas();
    setTimeout(() => { iniciarMapa(); iniciarMapaRastreio(); }, 100);
  }
  if (nome === 'clientes') renderizarTabelaClientes();
  if (nome === 'edificios') renderizarTabelaEdificios();
  if (nome === 'zonas') renderizarTabelaZonas();
  if (nome === 'usuarios') renderizarTabelaUsuarios();
  if (nome === 'listagemOS') { preencherFiltroUsuarios(); renderizarTabela(); }
  if (nome === 'gerarOS') abrirTelaGerarOS();
}

document.querySelectorAll('.nav-item[data-view]').forEach(item => {
  item.addEventListener('click', () => {
    if (item.dataset.view === 'cadastro-cliente' && document.getElementById('clienteEditId').value !== '') {
      cancelarEdicaoCliente();
    }
    mostrarView(item.dataset.view);
  });
});

document.getElementById('menuCadastro').addEventListener('click', () => {
  document.getElementById('menuCadastro').classList.toggle('aberto');
  document.getElementById('submenuCadastro').classList.toggle('aberto');
});
document.getElementById('menuOS').addEventListener('click', () => {
  document.getElementById('menuOS').classList.toggle('aberto');
  document.getElementById('submenuOS').classList.toggle('aberto');
});
document.getElementById('logoPrincipal').addEventListener('click', () => mostrarView('principal'));

/* ============================================================
   LOGIN
   ============================================================ */
document.getElementById('loginForm').addEventListener('submit', function(e){
  e.preventDefault();
  const login = document.getElementById('usuario').value.trim();
  const senha = document.getElementById('senha').value;
  const errMsg = document.getElementById('errorMsg');
  errMsg.style.display = 'none';

  const u = usuarios.find(u => u.login.toLowerCase() === login.toLowerCase());
  if (!u) { errMsg.textContent = 'Usuário não encontrado.'; errMsg.style.display='block'; return; }
  if (u.status === 'inativo') { errMsg.textContent = 'Usuário inativo'; errMsg.style.display='block'; return; }
  if (u.senha !== senha) { errMsg.textContent = 'Senha incorreta'; errMsg.style.display='block'; return; }
  entrarNoApp(u);
});
function entrarNoApp(usuario){
  document.getElementById('tela-login').style.display='none';
  document.getElementById('app').style.display='flex';
  const primeiroNome = usuario.nome.split(' ')[0];
  const iniciais = usuario.nome.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();
  document.getElementById('nomeUsuarioLogado').textContent='Olá, ' + usuario.nome;
  document.getElementById('tituloTopo').textContent='Bem-vindo, ' + primeiroNome + ' 👋';
  document.getElementById('tituloBoasVindas').textContent='Bem-vindo, ' + primeiroNome + ' 👋';
  document.getElementById('avatarUsuario').textContent=iniciais;
  mostrarView('principal');
}
document.getElementById('btnSair').addEventListener('click', ()=>{
  document.getElementById('app').style.display='none';
  document.getElementById('tela-login').style.display='flex';
  document.getElementById('loginForm').reset();
});

