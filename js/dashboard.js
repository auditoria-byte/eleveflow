window.onFirebaseReady(() => {
  const { collection, getDocs } = window.fs;
  const db = window.db;

  window.addEventListener("usuarioLogado", carregarDashboard);

  async function carregarDashboard() {
    try {
      const snap = await getDocs(collection(db, "ordens"));
      const chamados = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // ===== TOTAL DE CHAMADOS =====
      document.getElementById("cardTotalChamados").textContent = chamados.length;

      // ===== PREVENTIVAS CONCLUÍDAS (%) =====
      const preventivas = chamados.filter(c => c.tipo === "preventiva");
      const concluidas = preventivas.filter(c => c.situacao === "retornada");
      const perc = preventivas.length ? Math.round((concluidas.length / preventivas.length) * 100) : 0;
      document.getElementById("cardPreventivasOk").textContent = `${perc}%`;
      document.getElementById("cardPreventivasSub").textContent = `${concluidas.length} de ${preventivas.length} concluídas`;

      // ===== CLIENTES CRÍTICOS (2+ equipamentos com chamado nos últimos 5 dias) =====
      const cincoDias = new Date();
      cincoDias.setDate(cincoDias.getDate() - 5);
      const recentes = chamados.filter(c => c.dataInclusao?.toDate && c.dataInclusao.toDate() >= cincoDias);

      const porCliente = {};
      recentes.forEach(c => {
        if (!porCliente[c.clienteId]) porCliente[c.clienteId] = new Set();
        porCliente[c.clienteId].add(c.equipamentoNome);
      });
      const criticosArr = Object.entries(porCliente).filter(([_, s]) => s.size >= 2);
      document.getElementById("cardClientesCriticos").textContent = criticosArr.length;

      // ===== REINCIDÊNCIAS (3+ chamados no mesmo equipamento em 15 dias) =====
      // Correção: chave agora usa clienteId (não clienteNome) para evitar
      // agrupar clientes diferentes que tenham o mesmo nome.
      const quinzeDias = new Date();
      quinzeDias.setDate(quinzeDias.getDate() - 15);
      const ultimos = chamados.filter(c => c.dataInclusao?.toDate && c.dataInclusao.toDate() >= quinzeDias);

      const contagem = {};
      ultimos.forEach(c => {
        const chave = `${c.clienteId}|${c.equipamentoNome}`;
        contagem[chave] = (contagem[chave] || 0) + 1;
      });
      const reincidencias = Object.entries(contagem).filter(([_, q]) => q >= 3);
      document.getElementById("cardReincidencias").textContent = reincidencias.length;

      // ===== RENDER: LISTA DE REINCIDÊNCIAS =====
      document.getElementById("listaReincidencias").innerHTML = reincidencias.length
        ? reincidencias.map(([chave, qtd]) => {
            const [clienteId, equip] = chave.split("|");
            const nomeCliente = chamados.find(c => c.clienteId === clienteId)?.clienteNome || clienteId;
            return `<div class="alerta-item"><span>${nomeCliente} — ${equip}</span><span class="tag-qtd">${qtd}x</span></div>`;
          }).join("")
        : `<div class="vazio-alerta">Nenhuma reincidência nos últimos 15 dias 🎉</div>`;

      // ===== RENDER: LISTA DE CLIENTES CRÍTICOS =====
      document.getElementById("listaClientesCriticos").innerHTML = criticosArr.length
        ? criticosArr.map(([cliId, equips]) => {
            const nome = chamados.find(c => c.clienteId === cliId)?.clienteNome || cliId;
            return `<div class="alerta-item amarelo"><span>${nome}</span><span class="tag-qtd amarelo">${equips.size} equip.</span></div>`;
          }).join("")
        : `<div class="vazio-alerta">Nenhum cliente crítico no momento ✅</div>`;

    } catch (err) {
      console.error("Erro dashboard:", err);
    }
  }
});
