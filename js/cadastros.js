window.onFirebaseReady(() => {
  const { collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, serverTimestamp } = window.fs;
  const db = window.db;

  let CLIENTES = [], ZONAS = [], USUARIOS = [], EDIFICIOS = [];
  let editandoClienteId = null;

  // ============ HELPERS ============
  const setores = { centro: "Centro", praia: "Praia", continente: "Continente", balneario: "Balneário Camboriú", lages: "Lages" };

  async function carregarTudo() {
    const [cSnap, zSnap, uSnap, eSnap] = await Promise.all([
      getDocs(collection(db, "clientes")),
      getDocs(collection(db, "zonas")),
      getDocs(collection(db, "usuarios")),
      getDocs(collection(db, "edificios"))
    ]);
    CLIENTES = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    ZONAS = zSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    USUARIOS = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    EDIFICIOS = eSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderizarClientes();
    renderizarEdificios();
    renderizarZonas();
    renderizarUsuarios();
    popularSelectsZonaUsuario();
  }

  // ============ CEP (ViaCEP) ============
  const cepInput = document.getElementById("cep");
  cepInput.addEventListener("blur", async () => {
    const cep = cepInput.value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    document.getElementById("loadingCep").style.display = "inline";
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await resp.json();
      if (!data.erro) {
        document.getElementById("rua").value = data.logradouro || "";
        document.getElementById("bairro").value = data.bairro || "";
        document.getElementById("cidade").value = data.localidade || "";
        document.getElementById("uf").value = data.uf || "";
      }
    } catch (e) { console.warn("Erro CEP:", e); }
    document.getElementById("loadingCep").style.display = "none";
  });

  // ============ EQUIPAMENTOS DINÂMICOS ============
  const qtdInput = document.getElementById("qtdElevadores");
  const containerElevadores = document.getElementById("containerElevadores");
  const tituloElevadores = document.getElementById("tituloElevadores");

  function montarCardsElevadores(qtd, dadosExistentes = []) {
    containerElevadores.innerHTML = "";
    tituloElevadores.classList.toggle("hidden", qtd <= 0);
    for (let i = 0; i < qtd; i++) {
      const dados = dadosExistentes[i] || {};
      const card = document.createElement("div");
      card.className = "elevador-card";
      card.innerHTML = `
        <div class="titulo-elevador">🛗 Equipamento ${i + 1}</div>
        <div class="elevador-grid">
          <div class="input-group"><label>Tipo</label>
            <select class="elev-tipo">
              <option value="Convencional" ${dados.tipo === "Convencional" ? "selected" : ""}>Convencional</option>
              <option value="Plataforma" ${dados.tipo === "Plataforma" ? "selected" : ""}>Plataforma</option>
            </select>
          </div>
          <div class="input-group"><label>Identificação</label>
            <input type="text" class="elev-nome" placeholder="Ex: Social, Serviço..." value="${dados.nome || ""}">
          </div>
          <div class="input-group"><label>Capacidade (kg)</label>
            <input type="number" class="elev-capacidade" value="${dados.capacidade || ""}">
          </div>
        </div>`;
      containerElevadores.appendChild(card);
    }
  }
  qtdInput.addEventListener("input", () => montarCardsElevadores(parseInt(qtdInput.value) || 0));

  function coletarElevadores() {
    const cards = containerElevadores.querySelectorAll(".elevador-card");
    return Array.from(cards).map(c => ({
      tipo: c.querySelector(".elev-tipo").value,
      nome: c.querySelector(".elev-nome").value,
      capacidade: c.querySelector(".elev-capacidade").value
    }));
  }

  // ============ SALVAR CLIENTE ============
  const formCliente = document.getElementById("formCliente");
  formCliente.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dados = {
      nome: document.getElementById("nome").value.trim(),
      documento: document.getElementById("documento").value.trim(),
      setor: document.getElementById("setor").value,
      telefone: document.getElementById("telefone").value.trim(),
      email: document.getElementById("email").value.trim(),
      cep: document.getElementById("cep").value.trim(),
      rua: document.getElementById("rua").value.trim(),
      numero: document.getElementById("numero").value.trim(),
      complemento: document.getElementById("complemento").value.trim(),
      bairro: document.getElementById("bairro").value.trim(),
      cidade: document.getElementById("cidade").value.trim(),
      uf: document.getElementById("uf").value.trim(),
      qtdElevadores: parseInt(document.getElementById("qtdElevadores").value) || 0,
      status: document.querySelector('input[name="status"]:checked').value,
      observacoes: document.getElementById("observacoes").value.trim(),
      elevadores: coletarElevadores()
    };

    try {
      let clienteId;
      if (editandoClienteId) {
        await updateDoc(doc(db, "clientes", editandoClienteId), dados);
        clienteId = editandoClienteId;
      } else {
        dados.criadoEm = serverTimestamp();
        const ref = await addDoc(collection(db, "clientes"), dados);
        clienteId = ref.id;
      }

      // Gera/atualiza edifício vinculado automaticamente
      await setDoc(doc(db, "edificios", clienteId), {
        clienteId,
        nome: dados.nome,
        setor: dados.setor,
        endereco: `${dados.rua}, ${dados.numero} - ${dados.bairro}, ${dados.cidade}/${dados.uf}`,
        qtdElevadores: dados.qtdElevadores,
        tipo: dados.elevadores.map(el => el.tipo).join(", ") || "-",
        status: dados.status,
        zona: EDIFICIOS.find(ed => ed.id === clienteId)?.zona || "",
        contrato: EDIFICIOS.find(ed => ed.id === clienteId)?.contrato || "Avulso"
      }, { merge: true });

      alert(editandoClienteId ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
      cancelarEdicaoCliente();
      await carregarTudo();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cliente. Veja o console.");
    }
  });

  function cancelarEdicaoCliente() {
    formCliente.reset();
    document.getElementById("clienteEditId").value = "";
    document.getElementById("badgeEdicao").classList.add("hidden");
    document.getElementById("btnCancelarEdicao").style.display = "none";
    document.getElementById("btnSalvarCliente").textContent = "Salvar Cliente";
    montarCardsElevadores(0);
    editandoClienteId = null;
  }
  document.getElementById("btnCancelarEdicao").addEventListener("click", cancelarEdicaoCliente);

  window.editarCliente = function (id) {
    const c = CLIENTES.find(x => x.id === id);
    if (!c) return;
    editandoClienteId = id;
    document.getElementById("clienteEditId").value = id;
    document.getElementById("nome").value = c.nome || "";
    document.getElementById("documento").value = c.documento || "";
    document.getElementById("setor").value = c.setor || "";
    document.getElementById("telefone").value = c.telefone || "";
    document.getElementById("email").value = c.email || "";
    document.getElementById("cep").value = c.cep || "";
    document.getElementById("rua").value = c.rua || "";
    document.getElementById("numero").value = c.numero || "";
    document.getElementById("complemento").value = c.complemento || "";
    document.getElementById("bairro").value = c.bairro || "";
    document.getElementById("cidade").value = c.cidade || "";
    document.getElementById("uf").value = c.uf || "";
    document.getElementById("qtdElevadores").value = c.qtdElevadores || 0;
    document.getElementById("observacoes").value = c.observacoes || "";
    document.querySelector(`input[name="status"][value="${c.status}"]`).checked = true;
    montarCardsElevadores(c.qtdElevadores || 0, c.elevadores || []);
    document.getElementById("badgeEdicao").classList.remove("hidden");
    document.getElementById("btnCancelarEdicao").style.display = "inline-block";
    document.getElementById("btnSalvarCliente").textContent = "Atualizar Cliente";
    document.querySelector('[data-view="cadastro-cliente"]').click();
  };

  window.excluirCliente = async function (id) {
    if (!confirm("Deseja realmente excluir este cliente e o edifício vinculado?")) return;
    await deleteDoc(doc(db, "clientes", id));
    await deleteDoc(doc(db, "edificios", id)).catch(() => {});
    await carregarTudo();
  };

  // ============ RENDER CLIENTES ============
  function renderizarClientes() {
    const nomeF = document.getElementById("filtroNome").value.toLowerCase();
    const endF = document.getElementById("filtroEndereco").value.toLowerCase();
    const setorF = document.getElementById("filtroSetor").value;
    const contratoF = document.getElementById("filtroContrato").value; // FIX: lê o filtro de contrato
    const equipF = document.getElementById("filtroEquipamento").value;

    const filtrados = CLIENTES.filter(c => {
      const endereco = `${c.rua || ""} ${c.bairro || ""} ${c.cidade || ""}`.toLowerCase();
      if (nomeF && !(c.nome || "").toLowerCase().includes(nomeF)) return false;
      if (endF && !endereco.includes(endF)) return false;
      if (setorF && c.setor !== setorF) return false;
      // FIX: aplica o filtro de contrato (considera "Avulso" como padrão quando não definido)
      if (contratoF && (c.contrato || "Avulso") !== contratoF) return false;
      if (equipF && !(c.elevadores || []).some(e => e.tipo === equipF)) return false;
      return true;
    });

    const tbody = document.getElementById("tabelaClientes");
    tbody.innerHTML = filtrados.map(c => `
      <tr>
        <td>${c.nome || "-"}</td>
        <td>${c.rua || ""}, ${c.numero || ""} - ${c.bairro || ""}</td>
        <td>${c.qtdElevadores || 0}</td>
        <td><span class="setor-tag">${setores[c.setor] || c.setor || "-"}</span></td>
        <td>${c.contrato || "Avulso"}</td>
        <td><span class="badge ${c.status}">${c.status}</span></td>
        <td class="acoes">
          <button class="btn-acao" onclick="editarCliente('${c.id}')">✏️</button>
          <button class="btn-acao" onclick="excluirCliente('${c.id}')">🗑️</button>
        </td>
      </tr>`).join("");
    document.getElementById("mensagemVaziaClientes").style.display = filtrados.length ? "none" : "block";
  }
  ["filtroNome", "filtroEndereco", "filtroSetor", "filtroContrato", "filtroEquipamento"]
    .forEach(id => document.getElementById(id).addEventListener("input", renderizarClientes));

  // ============ RENDER EDIFÍCIOS ============
  function renderizarEdificios() {
    const nomeF = document.getElementById("filtroEdifNome").value.toLowerCase();
    const setorF = document.getElementById("filtroEdifSetor").value;
    const statusF = document.getElementById("filtroEdifStatus").value;

    const filtrados = EDIFICIOS.filter(e => {
      if (nomeF && !(e.nome || "").toLowerCase().includes(nomeF)) return false;
      if (setorF && e.setor !== setorF) return false;
      if (statusF && e.status !== statusF) return false;
      return true;
    });

    const tbody = document.getElementById("tabelaEdificios");
    tbody.innerHTML = filtrados.map(e => `
      <tr>
        <td>${e.clienteId}</td>
        <td>${e.nome || "-"}</td>
        <td>${ZONAS.find(z => z.id === e.zona)?.nome || "-"}</td>
        <td>${setores[e.setor] || "-"}</td>
        <td>${e.endereco || "-"}</td>
        <td>${e.qtdElevadores || 0}</td>
        <td>${e.tipo || "-"}</td>
        <td>${e.contrato || "Avulso"}</td>
        <td><span class="badge ${e.status}">${e.status}</span></td>
        <td class="acoes"><button class="btn-acao" onclick="editarEdificio('${e.id}')">✏️</button></td>
      </tr>`).join("");
    document.getElementById("mensagemVaziaEdificios").style.display = filtrados.length ? "none" : "block";
  }
  ["filtroEdifNome", "filtroEdifSetor", "filtroEdifStatus"]
    .forEach(id => document.getElementById(id).addEventListener("input", renderizarEdificios));

  window.editarEdificio = function (id) {
    const e = EDIFICIOS.find(x => x.id === id);
    if (!e) return;
    document.getElementById("edifId").value = e.id;
    document.getElementById("edifClienteId").value = e.clienteId;
    document.getElementById("edifStatus").value = e.status;
    document.getElementById("edifNome").value = e.nome || "";
    document.getElementById("edifZona").value = e.zona || "";
    document.getElementById("edifSetor").value = e.setor || ""; // FIX: usa o value ("centro"), não o rótulo
    document.getElementById("edifEndereco").value = e.endereco || "";
    document.getElementById("edifQtdElevadores").value = e.qtdElevadores || 0;
    document.getElementById("edifTipo").value = e.tipo || "";
    document.getElementById("edifContrato").value = e.contrato || "Avulso";
    document.getElementById("modalEditarEdificio").classList.add("ativo");
  };
  document.getElementById("edifZona").addEventListener("change", (e) => {
    const zona = ZONAS.find(z => z.id === e.target.value);
    document.getElementById("edifSetor").value = zona ? zona.setor : ""; // FIX: usa o value, não o rótulo
  });
  document.getElementById("btnCancelarModalEdif").addEventListener("click", () =>
    document.getElementById("modalEditarEdificio").classList.remove("ativo"));
  document.getElementById("btnSalvarModalEdif").addEventListener("click", async () => {
    const id = document.getElementById("edifId").value;
    await updateDoc(doc(db, "edificios", id), {
      status: document.getElementById("edifStatus").value,
      nome: document.getElementById("edifNome").value,
      zona: document.getElementById("edifZona").value,
      setor: document.getElementById("edifSetor").value,       // FIX: agora persiste o setor
      endereco: document.getElementById("edifEndereco").value,
      contrato: document.getElementById("edifContrato").value  // FIX: agora persiste o contrato
    });
    document.getElementById("modalEditarEdificio").classList.remove("ativo");
    await carregarTudo();
  });

  // ============ ZONAS ============
  let editandoZonaId = null;
  function popularSelectsZonaUsuario() {
    const selZona = document.getElementById("inputZonaUsuario");
    selZona.innerHTML = `<option value="">Selecione o usuário</option>` +
      USUARIOS.map(u => `<option value="${u.id}">${u.nome}</option>`).join("");

    const selEdifZona = document.getElementById("edifZona");
    selEdifZona.innerHTML = `<option value="">Selecione uma zona</option>` +
      ZONAS.map(z => `<option value="${z.id}">${z.nome}</option>`).join("");

    const selZonaOS = document.getElementById("selZona");
    if (selZonaOS) {
      selZonaOS.innerHTML = `<option value="">Selecione (opcional)</option>` +
        ZONAS.map(z => `<option value="${z.id}">${z.nome}</option>`).join("");
    }
    const selUsuarioOS = document.getElementById("selUsuario");
    if (selUsuarioOS) {
      selUsuarioOS.innerHTML = `<option value="">Selecione (opcional)</option>` +
        USUARIOS.map(u => `<option value="${u.id}">${u.nome}</option>`).join("");
    }
    const fUsuarioSel = document.getElementById("fUsuarioSel");
    if (fUsuarioSel) {
      fUsuarioSel.innerHTML = `<option value="">Todos</option>` +
        USUARIOS.map(u => `<option value="${u.id}">${u.nome}</option>`).join("");
    }
  }

  document.getElementById("btnAdicionarZona").addEventListener("click", async () => {
    const nome = document.getElementById("inputZonaNome").value.trim();
    const setor = document.getElementById("inputZonaSetor").value;
    const usuarioId = document.getElementById("inputZonaUsuario").value;
    if (!nome || !setor) return alert("Preencha nome e setor da zona.");

    const dados = { nome, setor, usuarioId };
    if (editandoZonaId) {
      await updateDoc(doc(db, "zonas", editandoZonaId), dados);
    } else {
      await addDoc(collection(db, "zonas"), dados);
    }
    document.getElementById("inputZonaNome").value = "";
    document.getElementById("inputZonaSetor").value = "";
    document.getElementById("inputZonaUsuario").value = "";
    document.getElementById("btnAdicionarZona").textContent = "+ Adicionar Zona";
    document.getElementById("btnCancelarEdicaoZona").style.display = "none";
    editandoZonaId = null;
    await carregarTudo();
  });

  document.getElementById("btnCancelarEdicaoZona").addEventListener("click", () => {
    document.getElementById("inputZonaNome").value = "";
    document.getElementById("inputZonaSetor").value = "";
    document.getElementById("inputZonaUsuario").value = "";
    document.getElementById("btnAdicionarZona").textContent = "+ Adicionar Zona";
    document.getElementById("btnCancelarEdicaoZona").style.display = "none";
    editandoZonaId = null;
  });

  window.editarZona = function (id) {
    const z = ZONAS.find(x => x.id === id);
    if (!z) return;
    editandoZonaId = id;
    document.getElementById("inputZonaNome").value = z.nome;
    document.getElementById("inputZonaSetor").value = z.setor;
    document.getElementById("inputZonaUsuario").value = z.usuarioId || "";
    document.getElementById("btnAdicionarZona").textContent = "Atualizar Zona";
    document.getElementById("btnCancelarEdicaoZona").style.display = "inline-block";
  };
  window.excluirZona = async function (id) {
    if (!confirm("Excluir esta zona?")) return;
    await deleteDoc(doc(db, "zonas", id));
    await carregarTudo();
  };

  function renderizarZonas() {
    const tbody = document.getElementById("tabelaZonas");
    tbody.innerHTML = ZONAS.map(z => {
      const u = USUARIOS.find(us => us.id === z.usuarioId);
      return `<tr>
        <td>${z.nome}</td>
        <td>${setores[z.setor] || z.setor}</td>
        <td>${u ? u.nome : "-"}</td>
        <td>${u ? `<span class="funcao-tag">${u.funcao}</span>` : "-"}</td>
        <td class="acoes">
          <button class="btn-acao" onclick="editarZona('${z.id}')">✏️</button>
          <button class="btn-acao" onclick="excluirZona('${z.id}')">🗑️</button>
        </td>
      </tr>`;
    }).join("");
    document.getElementById("mensagemVaziaZonas").style.display = ZONAS.length ? "none" : "block";
  }

  // ============ USUÁRIOS ============
  document.getElementById("btnAdicionar").addEventListener("click", async () => {
    const nome = document.getElementById("inputNome").value.trim();
    const login = document.getElementById("inputLogin").value.trim();
    const senha = document.getElementById("inputSenha").value.trim();
    const funcao = document.getElementById("inputFuncao").value;
    if (!nome || !login || !funcao) return alert("Preencha nome, login e função.");

    await addDoc(collection(db, "usuarios"), { nome, login, senha, funcao, status: "ativo" });
    document.getElementById("inputNome").value = "";
    document.getElementById("inputLogin").value = "";
    document.getElementById("inputSenha").value = "";
    document.getElementById("inputFuncao").value = "";
    await carregarTudo();
  });

  function renderizarUsuarios() {
    const tbody = document.getElementById("tabelaUsuarios");
    tbody.innerHTML = USUARIOS.map(u => `
      <tr>
        <td>${u.id.slice(0, 6)}</td>
        <td>${u.nome}</td>
        <td>${u.login}</td>
        <td><span class="funcao-tag">${u.funcao}</span></td>
        <td><span class="badge ${u.status || 'ativo'}">${u.status || "ativo"}</span></td>
        <td class="acoes">
          <button class="btn-acao" onclick="abrirEditarUsuario('${u.id}')">✏️</button>
          <button class="btn-acao" onclick="excluirUsuario('${u.id}')">🗑️</button>
        </td>
      </tr>`).join("");
    document.getElementById("mensagemVaziaUsuarios").style.display = USUARIOS.length ? "none" : "block";
  }

  window.abrirEditarUsuario = function (id) {
    const u = USUARIOS.find(x => x.id === id);
    if (!u) return;
    document.getElementById("editId").value = u.id;
    document.getElementById("editNome").value = u.nome;
    document.getElementById("editLogin").value = u.login;
    document.getElementById("editFuncao").value = u.funcao;
    document.getElementById("editSenha").value = "";
    document.getElementById("modalEditar").classList.add("ativo");
  };
  document.getElementById("btnCancelarModal").addEventListener("click", () =>
    document.getElementById("modalEditar").classList.remove("ativo"));
  document.getElementById("btnSalvarModal").addEventListener("click", async () => {
    const id = document.getElementById("editId").value;
    const dados = {
      nome: document.getElementById("editNome").value,
      login: document.getElementById("editLogin").value,
      funcao: document.getElementById("editFuncao").value
    };
    const novaSenha = document.getElementById("editSenha").value;
    if (novaSenha) dados.senha = novaSenha;
    await updateDoc(doc(db, "usuarios", id), dados);
    document.getElementById("modalEditar").classList.remove("ativo");
    await carregarTudo();
  });
  window.excluirUsuario = async function (id) {
    if (!confirm("Excluir este usuário?")) return;
    await deleteDoc(doc(db, "usuarios", id));
    await carregarTudo();
  };

  // Expõe pra outros arquivos (ordens.js) usarem os mesmos dados
  window.getClientes = () => CLIENTES;
  window.getZonas = () => ZONAS;
  window.getUsuarios = () => USUARIOS;
  window.recarregarCadastros = carregarTudo;

  window.addEventListener("usuarioLogado", carregarTudo);
});
