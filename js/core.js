window.addEventListener("firebaseReady", () => {

  // ===== LOGIN =====
  const loginForm = document.getElementById("loginForm");
  const telaLogin = document.getElementById("tela-login");
  const appDiv = document.getElementById("app");
  const errorMsg = document.getElementById("errorMsg");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usuario = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value.trim();
    errorMsg.style.display = "none";
    const email = usuario.includes("@") ? usuario : `${usuario}@elevacon.app`;
    try {
      await window.fbSignIn(window.auth, email, senha);
    } catch (err) {
      errorMsg.textContent = "Usuário ou senha inválidos.";
      errorMsg.style.display = "block";
    }
  });

  window.fbOnAuthChange(window.auth, (user) => {
    if (user) {
      telaLogin.style.display = "none";
      appDiv.style.display = "flex";
      const nome = user.email.split("@")[0];
      document.getElementById("nomeUsuarioLogado").textContent = nome;
      document.getElementById("avatarUsuario").textContent = nome.slice(0, 2).toUpperCase();
      document.getElementById("tituloBoasVindas").textContent = `Bem-vindo, ${nome} 👋`;
      window.dispatchEvent(new Event("usuarioLogado"));
    } else {
      telaLogin.style.display = "flex";
      appDiv.style.display = "none";
    }
  });

  document.getElementById("btnSair").addEventListener("click", async () => {
    await window.fbSignOut(window.auth);
  });

  // ===== TEMA =====
  const temaAtual = localStorage.getItem("tema") || "light";
  aplicarTema(temaAtual);
  function aplicarTema(tema) {
    if (tema === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      document.getElementById("iconeTema").textContent = "☀️";
      document.getElementById("labelTema").textContent = "Modo claro";
    } else {
      document.documentElement.removeAttribute("data-theme");
      document.getElementById("iconeTema").textContent = "🌙";
      document.getElementById("labelTema").textContent = "Modo escuro";
    }
    localStorage.setItem("tema", tema);
  }
  window.alternarTema = function () {
    const atual = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    aplicarTema(atual === "dark" ? "light" : "dark");
  };

  // ===== NAVEGAÇÃO =====
  document.querySelectorAll(".nav-item[data-view]").forEach(item => {
    item.addEventListener("click", () => {
      const viewId = item.getAttribute("data-view");
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      item.classList.add("active");
      document.querySelectorAll(".view").forEach(v => v.classList.remove("ativa"));
      const target = document.getElementById(`view-${viewId}`);
      if (target) target.classList.add("ativa");
      document.getElementById("tituloTopo").textContent = item.textContent.trim();
      document.querySelector(".sidebar").classList.remove("active");
      document.getElementById("overlayMobile").classList.remove("active");
      window.dispatchEvent(new CustomEvent("viewMudou", { detail: viewId }));
    });
  });

  function configurarSubmenu(menuId, submenuId) {
    const menu = document.getElementById(menuId);
    const submenu = document.getElementById(submenuId);
    menu.addEventListener("click", () => {
      menu.classList.toggle("aberto");
      submenu.classList.toggle("aberto");
    });
  }
  configurarSubmenu("menuCadastro", "submenuCadastro");
  configurarSubmenu("menuOS", "submenuOS");

  // ===== MOBILE =====
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("overlayMobile");
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
  });
});
