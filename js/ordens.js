window.addEventListener("firebaseReady", () => {
  const { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, serverTimestamp } = window.fs;
  const db = window.db;

  let ORDENS = [];
  let filtroStatusAtual = "todas";
  let filtrosAvancados = {};
  let clienteSelecionado = null;

  async function carregarOS() {
    const snap = await getDocs(collection(db, "ordens"));
    ORDENS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    atualizarContadores();
    renderizarTabela();
  }
  window.renderizarTabela = renderizarTabela; // usado pelo botão "Atualizar"

  function fmtData(ts) {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function atualizarContadores() {
    document.getElementById("qtdTodas").textContent = ORDENS.length;
    ["preparacao", "pendente", "campo", "retornada", "cancelada"].forEach(s => {
      document.getElementById(`qtd${s.charAt(0).toUpperCase() + s.slice(1)}`).textContent =
        ORDENS.filter(o => o.situacao === s).length;
    });
  }

  document.querySelectorAll(".status-item").forEach(item => {
    item.addEventListener("click", () => {
      document.querySelectorAll(".status-item").forEach(i => i.classList.remove("ativo"));
      item.classList.add("ativo");
      filtroStatusAtual = item.dataset.status;
      renderizarTabela();
    });
  });

  document.getElementById("buscaTabela").addEventListener("input", renderizarTabela);

  function renderizarTabela() {
    const busca = document.getElementById("buscaTabela").value.toLowerCase();
    let lista = ORDENS.filter(o => {
      if (filtroStatusAtual !== "todas" && o.situacao !== filtroStatusAtual) return false;
      if (busca && !(`${o.clienteNome} ${o.id} ${o.usuarioNome}`.toLowerCase().includes(busca))) return false;

      const f = filtrosAvancados;
      if (f.status && o.situacao !== f.status) return false;
      if (f.tipoOS && o.tipo !== f.tipoOS) return false;
      if (f.id && !o.id.includes(f.id)) return false;
      if (f.equipe && o.equipe !== f.equipe) return false;
      if (f.usuarioId && o.usuarioId !== f.usuarioId) return false;
      if (f.cliente && !(o.clienteNome || "").toLowerCase().includes(f.cliente.toLowerCase())) return false;
      if (f.equipamentoTxt && !(o.equipamentoNome || "").toLowerCase().includes(f.equipamentoTxt.toLowerCase())) return false;
      if (f.dataInicial && (!o.dataInclusao || o.dataInclusao.toDate() < new Date(f.dataInicial))) return false;
      if (f.dataFinal && (!o.dataInclusao || o.dataInclusao.toDate() > new Date(f.dataFinal + "T23:59:59"))) return false;
      return true;
    });

    lista.sort((a, b) => (b.dataInclusao?.toMillis?.() || 0) - (a.dataInclusao?.toMillis?.() || 0));

    const tbody = document.getElementById("tabelaOS");
    tbody.innerHTML = lista.map(o => `
      <tr>
        <td>${o.id.slice(0, 6)}</td>
        <td>${fmtData(o.dataInclusao)}</td>
        <td>${fmtData(o.dataAceite)}</td>
        <td>${fmtData(o.dataChegada)}</td>
        <td>${fmtData(o.dataExecucao)}</td>
        <td><span class="tag-tipo ${o.tipo}">${o.tipo}</span></td>
        <td>${o.equipe || "-"}</td>
        <td>${o.usuarioNome || "-"}</td>
        <td>${o.clienteNome || "-"}</td>
        <td>${o.equipamentoNome || "-"}</td>
        <td>${window.getZonas ? (window.getZonas().find(z => z.id === o.zona)?.nome || "-") : "-"}</td>
        <td><span class="tag-situacao ${o.situacao}">${o.situacao}</span></td>
        <td>${o.avaliacao ? "⭐".repeat(parseInt(o.avaliacao)) : "-"}</td>
        <td class="acoes">
          <button class="btn-acao" onclick="editarOS('${o.id}')">✏️</button>
          <button class="btn-acao" onclick="excluirOS('${o.id}')">🗑️</button>
        </td>
      </tr>`).join("");

    document.getElementById("contadorResultados").textContent = `${lista.length} registro(s)`;
    document.getElementById("vazioOS").classList.toggle("hidden", lista.length > 0);
  }

  window.excluirOS = async function (id) {
    if (!confirm("Excluir esta Ordem de Serviço?")) return;
    await deleteDoc(doc(db, "ordens", id));
    await carregarOS();
  };

  // ===== MODAL EDITAR OS =====
  window.editarOS = function (id) {
    const o = ORDENS.find(x => x.id === id);
    if (!o) return;
    document.getElementById("editOSId").value = o.id;
    document.getElementById("editOSCliente").value = o.clienteNome || "";
    document.getElementById("editOSEquipamento").value = o.equipamentoNome || "";
    document.getElementById("editOSZona").value = window.getZonas().find(z => z.id === o.zona)?.nome || "";
    document.getElementById("editOSTipo").value = o.tipo;
    document.getElementById("editOSSituacao").value = o.situacao;
    document.getElementById("editOSEquipe").value = o.equipe || "";
    document.getElementById("editOSUsuario").value = o.usuarioNome || "";
    document.getElementById("editOSObs").value = o.observacoes || "";
    document.getElementById("editOSAvaliacao").value = o.avaliacao || "";
    document.getElementById("modalEditarOS").classList.add("ativo");
  };
  document.getElementById("btnCancelarModalOS").addEventListener("click", () =>
    document.getElementById("modalEditarOS").classList.remove("ativo"));
  document.getElementById("btnSalvarModalOS").addEventListener("click", async () => {
    const id = document.getElementById("editOSId").value;
    await updateDoc(doc(db, "ordens", id), {
      situacao: document.getElementById("editOSSituacao").value,
      equipe: document.getElementById("editOSEquipe").value,
      observacoes: document.getElementById("editOSObs").value,
      avaliacao: document.getElementById("editOSAvaliacao").value
    });
    document.getElementById("modalEditarOS").classList.remove("ativo");
    await carregarOS();
  });

  // ===== FILTROS AVANÇADOS =====
  document.getElementById("btnAbrirFiltro").addEventListener("click", () =>
    document.getElementById("modalFiltro").classList.add("ativo"));
  document.getElementById("fecharModalFiltro").addEventListener("click", () =>
    document.getElementById("modalFiltro").classList.remove("ativo"));
  document.getElementById("btnLimparFiltro").addEventListener("click", () => {
    filtrosAvancados = {};
    document.querySelectorAll("#modalFiltro input, #modalFiltro select").forEach(el => el.value = "");
    document.getElementById("btnAbrirFiltro").classList.remove("tem-filtro");
    renderizarTabela();
  });
  document.getElementById("btnAplicarFiltro").addEventListener("click", () => {
    filtrosAvancados = {
      dataInicial: document.getElementById("fDataIncInicial").value,
      dataFinal: document.getElementById("fDataIncFinal").value,
      status: document.getElementById("fStatus").value,
      tipoOS: document.getElementById("fTipoOS").value,
      id: document.getElementById("fId").value,
      equipe: document.getElementById("fEquipe").value,
      usuarioId: document.getElementById("fUsuarioSel").value,
      cliente: document.getElementById("fCliente").value,
      equipamentoTxt: document.getElementById("fEquipamentoTxt").value
    };
    const temFiltro = Object.values(filtrosAvancados).some(v => v);
    document.getElementById("btnAbrirFiltro").classList.toggle("tem-filtro", temFiltro);
    document.getElementById("modalFiltro").classList.remove("ativo");
    renderizarTabela();
  });

  // ===== TELA GERAR NOVA OS =====
  document.getElementById("btnNovaOS").addEventListener("click", () => {
    document.querySelector('[data-view="gerarOS"]').click();
    prepararTelaGerarOS();
  });
  document.getElementById("btnVoltarListagem").addEventListener("click", () =>
    document.querySelector('[data-view="listagemOS"]').click());

  function prepararTelaGerarOS() {
    document.getElementById("previewDataHora2").value = new Date().toLocaleString("pt-BR");
    document.getElementById("selTipoOS").value = "";
    document.getElementById("buscaCliente").value = "";
    document.getElementById("clienteSelecionadoId").value = "";
    document.getElementById("selEquipamento").innerHTML = `<option value="">Selecione o cliente primeiro</option>`;
    document.getElementById("selEquipamento").disabled = true;
    document.getElementById("dicaEquipamento").textContent = "Selecione um cliente para listar os equipamentos.";
    document.getElementById("alertaBloqueado").classList.add("hidden");
    document.getElementById("alertaChamado").classList.add("hidden");
    document.getElementById("blocoMapaAuto").style.display = "none";
    document.getElementById("txtObservacoes").value = "";
    clienteSelecionado = null;
  }

  // Autocomplete de cliente
  const buscaCliente = document.getElementById("buscaCliente");
  const listaAutocomplete = document.getElementById("listaAutocompleteCliente");
  buscaCliente.addEventListener("input", () => {
    const termo = buscaCliente.value.toLowerCase();
    const clientes = (window.getClientes ? window.getClientes() : []);
    if (!termo) { listaAutocomplete.classList.add("hidden"); return; }
    const resultados = clientes.filter(c => (c.nome || "").toLowerCase().includes(termo)).slice(0, 8);
    listaAutocomplete.innerHTML = resultados.map(c => `
      <div class="autocomplete-item" data-id="${c.id}">
        ${c.nome} <span style="color:var(--texto-sec);font-size:11px;">${c.status === 'bloqueado' ? '🔒 Bloqueado' : ''}</span>
      </div>`).join("");
    listaAutocomplete.classList.toggle("hidden", resultados.length === 0);
  });

  listaAutocomplete.addEventListener("click", (e) => {
    const item = e.target.closest(".autocomplete-item");
    if (!item) return;
    const id = item.dataset.id;
    const c = window.getClientes().find(x => x.id === id);
    if (!c) return;
    clienteSelecionado = c;
    buscaCliente.value = c.nome;
    document.getElementById("clienteSelecionadoId").value = c.id;
    listaAutocomplete.classList.add("hidden");

    const selEquip = document.getElementById("selEquipamento");
    const elevadores = c.elevadores || [];
    if (elevadores.length) {
      selEquip.innerHTML = elevadores.map((el, i) =>
        `<option value="${i}">${el.nome || `Equipamento ${i + 1}`} (${el.tipo})</option>`).join("");
      selEquip.disabled = false;
      document.getElementById("dicaEquipamento").textContent = `${elevadores.length} equipamento(s) encontrados.`;
    } else {
      selEquip.innerHTML = `<option value="">Nenhum equipamento cadastrado</option>`;
      selEquip.disabled = true;
      document.getElementById("dicaEquipamento").textContent = "Este cliente não possui equipamentos cadastrados.";
    }

    document.getElementById("alertaBloqueado").classList.toggle("hidden", c.status !== "bloqueado");
    document.getElementById("btnSalvarOS").disabled = c.status === "bloqueado";
  });

  document.getElementById("selTipoOS").addEventListener("change", (e) => {
    const chamado = e.target.value === "chamado";
    document.getElementById("alertaChamado").classList.toggle("hidden", !chamado);
    document.getElementById("blocoMapaAuto").style.display = chamado ? "block" : "none";
  });

  // Salvar OS
  document.getElementById("btnSalvarOS").addEventListener("click", async () => {
    const tipo = document.getElementById("selTipoOS").value;
    const clienteId = document.getElementById("clienteSelecionadoId").value;
    const equipIdx = document.getElementById("selEquipamento").value;

    if (!tipo) return alert("Selecione o tipo de OS.");
    if (!clienteId) return alert("Selecione um cliente.");
    if (!clienteSelecionado) return alert("Cliente inválido.");
    if (clienteSelecionado.status === "bloqueado") return alert("Cliente bloqueado — não é possível gerar OS.");

    const equipamento = (clienteSelecionado.elevadores || [])[equipIdx];
    const usuarioSel = document.getElementById("selUsuario");
    const usuarioNome = usuarioSel.selectedOptions[0]?.text !== "Selecione (opcional)" ? usuarioSel.selectedOptions[0]?.text : "";

    const dados = {
      tipo,
      situacao: document.getElementById("selSituacao").value,
      zona: document.getElementById("selZona").value,
      equipe: document.getElementById("selEquipe").value,
      usuarioId: usuarioSel.value,
      usuarioNome,
      clienteId,
      clienteNome: clienteSelecionado.nome,
      equipamentoNome: equipamento ? (equipamento.nome || `Equipamento ${parseInt(equipIdx) + 1}`) : "-",
      observacoes: document.getElementById("txtObservacoes").value,
      dataInclusao: serverTimestamp(),
      avaliacao: ""
    };

    try {
      await addDoc(collection(db, "ordens"), dados);
      alert("Ordem de Serviço gerada com sucesso!");
      document.querySelector('[data-view="listagemOS"]').click();
      await carregarOS();
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar OS. Veja o console.");
    }
  });

  window.addEventListener("usuarioLogado", carregarOS);
});
