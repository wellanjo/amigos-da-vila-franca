// =============================================================
//  Amigos da Vila Franca – lógica do aplicativo
//  Cadastro comunitário de cães, gatos e aves de rua
// =============================================================
(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const COL = "animais"; // coleção do banco de dados

  const ESPECIES = {
    cao:  { nome: "Cão",  plural: "Cães",  icone: "dog",  img: "img/cat-cao.png",  tom: "t-amarelo", um: "um cão",   o: "o cão",   este: "este cão",  fem: false },
    gato: { nome: "Gato", plural: "Gatos", icone: "cat",  img: "img/cat-gato.png", tom: "t-rosa",    um: "um gato",  o: "o gato",  este: "este gato", fem: false },
    ave:  { nome: "Ave",  plural: "Aves",  icone: "bird", img: "img/cat-ave.png",  tom: "t-verde",   um: "uma ave",  o: "a ave",   este: "esta ave",  fem: true }
  };
  const esp = a => ESPECIES[a && a.especie] || ESPECIES.cao;
  const espId = a => (a && ESPECIES[a.especie]) ? a.especie : "cao";

  const STATUS = {
    rua:     { txt: "Na rua",             cor: "#1f6fe0" },
    resgate: { txt: "Precisa de resgate", cor: "#d93a2b" },
    adocao:  { txt: "Para adoção",        cor: "#e46f05" },
    adotado: { txt: "Adotado",            cor: "#23934c" }
  };

  const TITULOS = {
    inicio: "Amigos da Vila Franca", cadastrar: "Cadastrar animal", mapa: "Mapa dos animais",
    lista: "Animais do bairro", ficha: "Ficha do animal", contatos: "Ajuda e telefones",
    dicas: "Cuidados e adoção", avaliar: "Avaliar o app", admin: "Painel do administrador",
    perdidos: "Animais perdidos", mural: "Mural do bairro",
    perfil: "Meu cadastro",
    jogos: "Jogos e medalhas", quiz: "Quiz Tutor Responsável", viralata: "Monte seu vira-lata", medalhas: "Minhas medalhas", sudoku: "Sudoku de Animais", gatinhos: "Bichos da Vila", ranking: "Ranking dos jogos"
  };

  // ---------- preferências locais (tolerante a bloqueio do navegador) ----------
  const store = {
    get(k, def) { try { const v = localStorage.getItem("amigos_pref_" + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem("amigos_pref_" + k, JSON.stringify(v)); } catch (e) {} }
  };

  let usuario = store.get("usuario", null);
  let animais = [];
  let contatos = [];
  let perdidos = [];
  let mural = [];
  let filtroMural = "";
  let fotoMural = null;
  let filtroPerd = "perdido";
  let pontoPerd = null;
  let fotoPerd = null;
  let mapa = null, camadaMapa = null;
  let miniMapa = null, miniMarker = null;
  let pontoForm = null;   // ponto marcado no mapa: { lat, lng }
  let fotoForm = null;    // foto escolhida, guardada como texto (imagem codificada em base64)
  let filtroLista = "";
  let filtroEsp = "";     // espécie filtrada na lista: "" (todas), "cao", "gato" ou "ave"
  let filtroEspMapa = "";
  let adminAberto = false;

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function agora() { return new Date().toISOString(); }
  function dataBR(iso) { return new Date(iso).toLocaleDateString("pt-BR"); }
  function horaBR(iso) { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function dispositivo() {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad/i.test(ua)) return "iOS";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Mac/i.test(ua)) return "Mac";
    if (/Linux/i.test(ua)) return "Linux";
    return "Outro";
  }

  const ic = id => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const silhueta = a => `<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${esp(a).icone}"/></svg>`;
  const semFoto = (a, cls = "") => `<div class="sem-foto sf-${espId(a)} ${cls}" aria-hidden="true">${silhueta(a)}</div>`;
  const statusTag = st => `<span class="status s-${st}">${(STATUS[st] || STATUS.rua).txt}</span>`;
  const nomeDe = a => a.nome || "Sem nome";

  function iconeMapa(a) {
    const cor = (STATUS[a.status] || STATUS.rua).cor;
    return L.divIcon({
      className: "pin",
      html: `<span style="background:${cor}">${silhueta(a)}</span>`,
      iconSize: [36, 36], iconAnchor: [18, 34], popupAnchor: [0, -30]
    });
  }

  // ---------- acessibilidade ----------
  function aplicarPrefs() {
    document.documentElement.style.setProperty("--escala", store.get("escala", 1));
    document.body.classList.toggle("contraste", !!store.get("contraste", false));
  }
  $("#btn-acess").addEventListener("click", () => {
    const m = $("#acess-menu"); m.hidden = !m.hidden;
    $("#btn-acess").setAttribute("aria-expanded", String(!m.hidden));
  });
  $$("[data-fonte]").forEach(b => b.addEventListener("click", () => {
    let e = store.get("escala", 1) + Number(b.dataset.fonte) * 0.1;
    e = Math.min(1.6, Math.max(0.9, Math.round(e * 10) / 10));
    store.set("escala", e); aplicarPrefs();
  }));
  $("#btn-contraste").addEventListener("click", () => {
    store.set("contraste", !store.get("contraste", false)); aplicarPrefs();
  });

  // ---------- convite de amigos (indicação) ----------
  // Se o app foi aberto por um link com ?convite=Nome, guarda quem convidou.
  (function lerConvite() {
    try {
      const ref = new URLSearchParams(location.search).get("convite");
      if (ref && !store.get("indicadoPor", null)) store.set("indicadoPor", ref.slice(0, 60));
    } catch (e) {}
  })();
  // ---------- quem sou eu? ----------
  // Com login Google cada registro guarda o "dono" (criadoPorUid). Sem Firebase
  // (modo demonstração) não há conta, então comparamos pelo nome digitado.
  const mesmoNome = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
  function ehMeu(reg, campoNome = "criadoPor") {
    if (!usuario || !reg) return false;
    if (usuario.uid && reg.criadoPorUid) return reg.criadoPorUid === usuario.uid;
    return mesmoNome(reg[campoNome], usuario.nome);
  }
  // Pode editar ou dar baixa: o dono do registro ou o administrador (no modo demonstração, todos).
  const podeEditar = reg => DB.modo === "local" || adminAberto || (!!usuario && !!usuario.uid && reg.criadoPorUid === usuario.uid);
  // Chave de "uma pessoa" no ranking: a conta, ou o nome nos registros antigos.
  const chavePessoa = x => x.criadoPorUid || (x.nome || "").trim().toLowerCase();

  // Nome curto para mostrar a outras pessoas: "Maria da Silva" vira "Maria S."
  function nomeCurto(n) { const p = String(n || "").trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0].toUpperCase()}.` : p[0]; }
  let convites = []; // quem entrou pelo link de convite de alguém (para o "Indique para 5 amigos")

  // ---------- entrada e registro de acesso ----------
  // Cada entrada no app grava nome, perfil, data/hora e tipo de aparelho (evidência para o relatório).
  async function registrarAcesso() {
    try {
      const ref = store.get("indicadoPor", null);
      const doc = { nome: usuario.nome, perfil: usuario.perfil, quando: agora(), dispositivo: dispositivo() };
      if (ref && !mesmoNome(ref, usuario.nome) && ref !== usuario.uid) doc.indicadoPor = ref;
      await DB.add("acessos", doc);
      // O registro de acessos é só do administrador. Para o convite funcionar para todos,
      // grava à parte só o necessário: quem convidou e o nome curto de quem entrou ("Maria S.").
      // Com conta Google, o convite é gravado com o id da conta: cada pessoa conta uma vez só.
      if (doc.indicadoPor && !store.get("conviteGravado", false)) {
        const conv = { indicadoPor: doc.indicadoPor, amigo: nomeCurto(usuario.nome), quando: doc.quando };
        if (usuario.uid) await DB.set("convites", usuario.uid, conv).catch(() => {}); // já gravado antes: o servidor recusa e tudo bem
        else await DB.add("convites", conv);
        store.set("conviteGravado", true);
      }
    } catch (e) { console.warn("Falha ao registrar acesso", e); }
  }

  $("#login-form").addEventListener("submit", async ev => {
    ev.preventDefault();
    const nome = $("#login-nome").value.trim();
    if (nome.length < 2) { $("#login-nome").focus(); toast("Digite seu nome para entrar."); return; }
    usuario = { nome, perfil: $("#login-perfil").value };
    store.set("usuario", usuario);
    await registrarAcesso();
    abrirApp();
  });

  // Sair: no modo comunidade sai da conta Google (a tela de entrada aparece sozinha).
  async function sairDaConta() {
    if (DB.modo === "firebase") { await DB.sairGoogle().catch(() => {}); return; }
    store.set("usuario", null); usuario = null; adminAberto = false;
    location.hash = "";
    $("#app").hidden = true; $("#login").hidden = false;
  }
  $("#btn-sair").addEventListener("click", sairDaConta);

  // ---------- entrar com Google e completar o cadastro ----------
  // O cadastro fica na coleção "usuarios", com o id da conta Google. Só a própria
  // pessoa e o administrador conseguem ler (regras do servidor).
  function mostrarEntrada(tela) { // tela: "google" ou "perfil"
    $("#app").hidden = true; $("#login").hidden = false;
    $("#login-form").hidden = true;
    $("#login-google").hidden = tela !== "google";
    $("#form-perfil").hidden = tela !== "perfil";
    window.scrollTo(0, 0);
  }
  $("#btn-login-google").addEventListener("click", async () => {
    const erro = $("#login-google-erro"); erro.textContent = "";
    try { await DB.entrarGoogle(); }
    catch (e) {
      const c = (e && (e.code || e.message)) || "";
      if (/popup-closed|cancel/i.test(c)) return; // a pessoa fechou a janela do Google
      erro.textContent = /unauthorized-domain/.test(c)
        ? "Este endereço ainda não está autorizado no Firebase (veja o README)."
        : "Não foi possível entrar com o Google. Verifique a internet e tente de novo.";
    }
  });
  function preencherPerfil(prefixo, dados) {
    $(`#${prefixo}-nome`).value = dados.nome || "";
    $(`#${prefixo}-tipo`).value = dados.perfil || "Morador(a)";
    $(`#${prefixo}-whats`).value = dados.whatsapp || "";
  }
  const lerPerfil = prefixo => ({
    nome: $(`#${prefixo}-nome`).value.trim().replace(/\s+/g, " "),
    perfil: $(`#${prefixo}-tipo`).value,
    whatsapp: $(`#${prefixo}-whats`).value.trim()
  });
  $("#form-perfil").addEventListener("submit", async ev => {
    ev.preventDefault();
    const conta = DB.conta, d = lerPerfil("perfil"), erro = $("#perfil-erro");
    erro.textContent = "";
    if (!conta) return mostrarEntrada("google");
    if (d.nome.length < 2) { erro.textContent = "Digite seu nome."; $("#perfil-nome").focus(); return; }
    if (!$("#perfil-aceite").checked) { erro.textContent = "Para continuar, aceite a política de privacidade."; return; }
    const doc = Object.assign(d, { email: conta.email, aceitouPrivacidade: true, aceitouEm: agora(), criadoEm: agora() });
    try { await DB.set("usuarios", conta.uid, doc); }
    catch (e) { erro.textContent = "Não foi possível salvar. Verifique a internet e tente de novo."; return; }
    await entrarComPerfil(conta, doc, true);
  });
  $("#perfil-outra-conta").addEventListener("click", () => DB.sairGoogle());

  async function entrarComPerfil(conta, perfil, novo) {
    usuario = { uid: conta.uid, email: conta.email, nome: perfil.nome, perfil: perfil.perfil, whatsapp: perfil.whatsapp || "" };
    store.set("usuario", usuario);
    await registrarAcesso();
    await abrirApp();
    if (novo) toast(`Bem-vindo(a), ${usuario.nome.split(" ")[0]}!`);
  }

  // Chamado sempre que a conta Google muda (entrou, saiu ou já estava conectada ao abrir o app).
  async function aoMudarConta(conta) {
    adminEmail = conta ? conta.email : null;
    adminAberto = ehEmailAdmin(adminEmail);
    if (!conta) { usuario = null; appAberto = false; store.set("usuario", null); mostrarEntrada("google"); return; }
    if (usuario && usuario.uid === conta.uid && appAberto) { // mesma pessoa, app já aberto
      rotear(); // atualiza botões que dependem de ser administrador
      return;
    }
    let perfil = null;
    try { perfil = await DB.get("usuarios", conta.uid); } catch (e) { /* sem internet: usa a cópia do aparelho */ }
    if (!perfil && usuario && usuario.uid === conta.uid) perfil = usuario;
    if (perfil && perfil.nome) return entrarComPerfil(conta, perfil, false);
    // primeiro acesso: completar o cadastro com o nome que veio do Google
    preencherPerfil("perfil", { nome: conta.nome });
    $("#perfil-aceite").checked = false;
    $("#perfil-conta").textContent = `Conta Google: ${conta.email}`;
    mostrarEntrada("perfil");
  }

  // ---------- tela "Meu cadastro" ----------
  function renderMeuPerfil() {
    preencherPerfil("meu", usuario);
    $("#meu-erro").textContent = "";
    $("#meu-perfil-conta").textContent = usuario.email ? `Conta Google: ${usuario.email}` : "Modo demonstração: seus dados ficam só neste aparelho.";
    $("#meu-excluir").hidden = DB.modo !== "firebase";
  }
  $("#form-meu-perfil").addEventListener("submit", async ev => {
    ev.preventDefault();
    const d = lerPerfil("meu");
    if (d.nome.length < 2) { $("#meu-erro").textContent = "Digite seu nome."; return; }
    try { if (usuario.uid) await DB.set("usuarios", usuario.uid, d); }
    catch (e) { $("#meu-erro").textContent = "Não foi possível salvar. Verifique a internet."; return; }
    Object.assign(usuario, d); store.set("usuario", usuario);
    $("#ola-nome").textContent = usuario.nome.split(" ")[0];
    toast("Cadastro atualizado!");
  });
  $("#meu-sair").addEventListener("click", sairDaConta);
  $("#meu-excluir").addEventListener("click", async () => {
    if (!confirm("Excluir seu cadastro? Seu nome, e-mail e WhatsApp serão apagados e você sairá da conta.")) return;
    try { await DB.remove("usuarios", usuario.uid); }
    catch (e) { toast("Não foi possível excluir agora. Tente de novo."); return; }
    toast("Cadastro excluído."); await sairDaConta();
  });

  let appAberto = false; // já entrou no app nesta sessão?
  async function abrirApp() {
    appAberto = true;
    $("#login").hidden = true; $("#app").hidden = false;
    $("#ola-nome").textContent = usuario.nome.split(" ")[0];
    const b = $("#modo-banner");
    if (DB.modo === "local") { b.hidden = false; b.textContent = "Modo demonstração: dados salvos só neste aparelho."; }
    else b.hidden = true;
    await recarregar();
    rotear();
  }

  async function recarregar() {
    try {
      [animais, contatos, perdidos, mural, quizResultados, convites] = await Promise.all([DB.list(COL), DB.list("contatos"), DB.list("perdidos"), DB.list("mural"), DB.list("quiz"), DB.list("convites")]);
    } catch (e) { toast("Não foi possível carregar os dados. Verifique a internet."); }
    animais.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
    perdidos.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
    mural.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
    renderInicio();
  }

  // ---------- roteamento (troca de telas) ----------
  // A tela aberta vem do endereço depois do "#", por exemplo #mapa ou #ficha/ID.
  function rotear() {
    if (!usuario) return;
    const [tela, id] = (location.hash.replace("#", "") || "inicio").split("/");
    const nome = TITULOS[tela] ? tela : (tela === "editar" ? "cadastrar" : "inicio");
    $$("[data-tela]").forEach(s => s.hidden = s.dataset.tela !== nome);
    $("#titulo").textContent = tela === "editar" ? "Editar cadastro" : TITULOS[nome];
    $("#btn-voltar").hidden = nome === "inicio";
    const navAlvo = { quiz: "jogos", viralata: "jogos", medalhas: "jogos", sudoku: "jogos", gatinhos: "jogos", ranking: "jogos", ficha: "lista", admin: "inicio" }[nome] || nome;
    $$("[data-nav]").forEach(a => {
      const on = a.dataset.nav === navAlvo;
      a.classList.toggle("ativo", on);
      if (on) { a.setAttribute("aria-current", "page"); a.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }
      else a.removeAttribute("aria-current");
    });
    $("#acess-menu").hidden = true;
    window.scrollTo(0, 0);

    if (nome === "inicio") renderInicio();
    if (tela === "editar") {
      const alvo = animais.find(a => a.id === id);
      if (alvo && !podeEditar(alvo)) { toast("Só quem cadastrou pode editar."); location.replace("#ficha/" + id); return; }
    }
    if (nome === "cadastrar") prepararForm(tela === "editar" ? animais.find(a => a.id === id) : null, tela === "cadastrar" ? id : null);
    if (nome === "mapa") renderMapa();
    if (nome === "lista") { if (id !== undefined) filtroEsp = ESPECIES[id] ? id : ""; marcarAbas(); renderLista(); }
    if (nome === "ficha") renderFicha(id);
    if (nome === "contatos") renderContatos();
    if (nome === "perdidos") renderPerdidos();
    if (nome === "mural") renderMural();
    Som.entrarTela(nome);
    if (nome === "jogos") renderJogos();
    if (nome === "quiz") iniciarQuiz();
    if (nome === "viralata") renderVira();
    if (nome === "sudoku") renderSudoku(); else clearInterval(sdkTimer);
    if (nome === "gatinhos") renderGatinhos(); else clearInterval(gtnTimer);
    if (nome === "ranking") { if (id) rkJogo = id; renderRanking(); }
    if (nome === "medalhas") renderMedalhas();
    if (nome === "admin") renderTelaAdmin();
    if (nome === "perfil") renderMeuPerfil();
    $("#main").focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", rotear);
  $("#btn-voltar").addEventListener("click", () => history.length > 1 ? history.back() : (location.hash = "inicio"));

  // ---------- início ----------
  function renderInicio() {
    checarMedalhas();
    renderConvite();
    const ult = mural[0], box = $("#mural-home");
    if (box) box.innerHTML = ult ? `<a class="mural-home tm-${ult.tipo}" href="#mural">
        <span class="mh-tag">${ic(TIPOS_MURAL[ult.tipo].icone)}${TIPOS_MURAL[ult.tipo].nome}</span>
        <strong>${esc(ult.titulo)}</strong>
        <small>${ult.dataEvento ? dataEventoBR(ult.dataEvento) + (ult.local ? " · " : "") : ""}${esc(ult.local || "")}</small>
        <span class="mh-ver">Ver mural${ic("chev")}</span></a>` : `<a class="mural-home tm-aviso" href="#mural"><span class="mh-tag">${ic("megaphone")}Mural do bairro</span><strong>Campanhas, feiras de adoção e alertas aparecem aqui.</strong><span class="mh-ver">Ver mural${ic("chev")}</span></a>`;
    const conta = e => animais.filter(a => espId(a) === e).length;
    $$("[data-conta]").forEach(el => { el.textContent = conta(el.dataset.conta); });
    const castrados = animais.filter(a => a.castrado === "Sim").length;
    const resgate = animais.filter(a => a.status === "resgate").length;
    const adocao = animais.filter(a => a.status === "adocao").length;
    const adotados = animais.filter(a => a.status === "adotado").length;
    $("#stats").innerHTML = `
      <div><b>${animais.length}</b><span>animais</span></div>
      <div><b>${castrados}</b><span>castrados</span></div>
      <div class="n-resgate"><b>${resgate}</b><span>resgate</span></div>
      <div class="n-adocao"><b>${adocao}</b><span>adoção</span></div>
      <div class="n-adotado"><b>${adotados}</b><span>adotados</span></div>`;
    const nPerd = perdidos.filter(p => p.situacao !== "encontrado" && (p.tipo || "perdido") === "perdido").length;
    const nAch = perdidos.filter(p => p.situacao !== "encontrado" && p.tipo === "achado").length;
    $("#conta-perdidos").textContent = (nPerd || nAch) ? `${nPerd} ${nPerd === 1 ? "sumido" : "sumidos"} · ${nAch} ${nAch === 1 ? "achado esperando" : "achados esperando"} o dono` : "Perdeu ou achou um animal?";
    const el = $("#urgentes");
    const urg = animais.filter(a => a.status === "resgate");
    el.className = "urgentes";
    el.innerHTML = urg.length ? `<h2>${ic("alert")}Precisam de ajuda agora</h2><ul>${urg.map(a => `<li><a class="urg" href="#ficha/${a.id}">
      ${a.foto ? `<img src="${a.foto}" alt="">` : semFoto(a)}
      <span><strong>${esc(nomeDe(a))}</strong>${esc(esp(a).nome)} · ${esc(a.saude)}</span></a></li>`).join("")}</ul>` : "";
  }

  // ---------- formulário de cadastro ----------
  function ajustarFormEspecie() {
    const e = ($("input[name=especie]:checked") || {}).value || "cao";
    const ave = e === "ave";
    $("#fs-castrado").hidden = ave;
    $("#lbl-onde").textContent = `Onde ${ESPECIES[e].o} costuma ficar?`;
    $("#f-nome").placeholder = { cao: "Ex.: Pretinha, Caramelo da padaria", gato: "Ex.: Mingau, Frajola do muro", ave: "Ex.: pombo da praça, calopsita fujona" }[e];
    $("#f-cor").placeholder = { cao: "Ex.: caramelo com mancha branca no peito", gato: "Ex.: cinza rajado, olhos verdes", ave: "Ex.: amarela com bochecha laranja" }[e];
  }
  $$("input[name=especie]").forEach(r => r.addEventListener("change", ajustarFormEspecie));

  function prepararForm(a, especieInicial) {
    const f = $("#form-cao");
    f.reset(); $("#form-erro").textContent = "";
    f.id.value = a ? a.id : "";
    fotoForm = a ? a.foto || null : null;
    pontoForm = a && a.lat ? { lat: a.lat, lng: a.lng } : null;
    const e = a ? espId(a) : (ESPECIES[especieInicial] ? especieInicial : "cao");
    $(`input[name=especie][value=${e}]`).checked = true;
    if (a) {
      ["nome", "cor", "referencia", "obs", "status"].forEach(k => { if (f[k]) f[k].value = a[k] || (k === "status" ? "rua" : ""); });
      ["sexo", "porte", "saude", "castrado"].forEach(k => {
        const r = $$(`input[name=${k}]`, f).find(i => i.value === a[k]); if (r) r.checked = true;
      });
    }
    ajustarFormEspecie();
    const img = $("#foto-preview");
    if (fotoForm) { img.src = fotoForm; img.hidden = false; } else { img.hidden = true; img.removeAttribute("src"); }

    if (!miniMapa) {
      miniMapa = L.map("mini-mapa", { zoomControl: true }).setView(MAP_CENTER, MAP_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(miniMapa);
      miniMapa.on("click", ev => marcarPonto(ev.latlng.lat, ev.latlng.lng));
    }
    setTimeout(() => {
      miniMapa.invalidateSize();
      if (miniMarker) { miniMapa.removeLayer(miniMarker); miniMarker = null; }
      if (pontoForm) marcarPonto(pontoForm.lat, pontoForm.lng);
      else { miniMapa.setView(MAP_CENTER, MAP_ZOOM); $("#coord-txt").textContent = "Nenhum ponto marcado."; }
    }, 50);
  }

  function marcarPonto(lat, lng) {
    pontoForm = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    if (miniMarker) miniMarker.setLatLng([lat, lng]);
    else miniMarker = L.marker([lat, lng], { draggable: true }).addTo(miniMapa)
      .on("dragend", ev => { const p = ev.target.getLatLng(); marcarPonto(p.lat, p.lng); });
    miniMapa.setView([lat, lng], Math.max(miniMapa.getZoom(), 16));
    $("#coord-txt").textContent = `Ponto marcado (${pontoForm.lat}, ${pontoForm.lng}). Arraste o marcador para ajustar.`;
  }

  $("#btn-gps").addEventListener("click", () => {
    if (!navigator.geolocation) { toast("Seu aparelho não permite localização."); return; }
    toast("Buscando sua localização…");
    navigator.geolocation.getCurrentPosition(
      p => { marcarPonto(p.coords.latitude, p.coords.longitude); toast("Localização marcada!"); },
      () => toast("Não deu para pegar o GPS. Toque no mapa para marcar."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });

  // Foto: câmera ou galeria. Reduz para 640 px para economizar dados móveis.
  function lerFoto(file, pronto) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast("Escolha um arquivo de imagem."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 640, k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        pronto(cv.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = () => toast("Não deu para abrir essa imagem. Tente outra.");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  $$('input[data-foto="cadastro"]').forEach(inp => inp.addEventListener("change", ev => {
    lerFoto(ev.target.files[0], url => {
      fotoForm = url;
      const pv = $("#foto-preview"); pv.src = url; pv.hidden = false; pv.alt = "Foto do animal escolhida";
      toast("Foto adicionada!");
    });
    ev.target.value = "";
  }));

  $("#form-cao").addEventListener("submit", async ev => {
    ev.preventDefault();
    const f = ev.target, val = n => { const r = $(`input[name=${n}]:checked`, f); return r ? r.value : ""; };
    const especie = val("especie") || "cao", E = ESPECIES[especie];
    if (!pontoForm) { $("#form-erro").textContent = `Marque onde ${E.o} fica: use o GPS ou toque no mapa.`; return; }
    if (!fotoForm && !f.cor.value.trim()) { $("#form-erro").textContent = `Adicione uma foto ou descreva a cor para reconhecer ${E.o}.`; return; }
    const dados = {
      especie, nome: f.nome.value.trim(), sexo: val("sexo"), porte: val("porte"), cor: f.cor.value.trim(),
      saude: val("saude"), castrado: especie === "ave" ? "Não se aplica" : val("castrado"), status: f.status.value,
      lat: pontoForm.lat, lng: pontoForm.lng, referencia: f.referencia.value.trim(), obs: f.obs.value.trim(),
      foto: fotoForm || "", atualizadoEm: agora(), atualizadoPor: usuario.nome
    };
    const btn = $("button[type=submit]", f); btn.disabled = true;
    try {
      if (f.id.value) { await DB.update(COL, f.id.value, dados); toast("Cadastro atualizado!"); }
      else {
        dados.criadoEm = agora(); dados.criadoPor = usuario.nome;
        await DB.add(COL, dados); toast(`${E.nome} cadastrad${E.fem ? "a" : "o"}. Obrigado por ajudar!`);
      }
      await recarregar(); location.hash = "mapa";
    } catch (e) {
      $("#form-erro").textContent = "Não foi possível salvar. A foto pode estar grande demais ou sem internet.";
    } finally { btn.disabled = false; }
  });

  // ---------- mapa ----------
  function renderMapa() {
    if (!mapa) {
      mapa = L.map("mapa").setView(MAP_CENTER, MAP_ZOOM);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(mapa);
      camadaMapa = L.layerGroup().addTo(mapa);
    }
    setTimeout(() => {
      mapa.invalidateSize();
      camadaMapa.clearLayers();
      const pts = [];
      animais.filter(a => !filtroEspMapa || espId(a) === filtroEspMapa).forEach(a => {
        if (a.lat == null) return;
        pts.push([a.lat, a.lng]);
        L.marker([a.lat, a.lng], { icon: iconeMapa(a), title: `${esp(a).nome}: ${nomeDe(a)}` })
          .bindPopup(`<strong>${esc(nomeDe(a))}</strong> (${esc(esp(a).nome)})<br>${esc((STATUS[a.status] || STATUS.rua).txt)}<br><a class="pop-link" href="#ficha/${a.id}">Ver ficha</a>`)
          .addTo(camadaMapa);
      });
      if (pts.length) mapa.fitBounds(pts, { padding: [40, 40], maxZoom: 17 });
    }, 50);
  }
  $$("[data-esp-mapa]").forEach(b => b.addEventListener("click", () => {
    $$("[data-esp-mapa]").forEach(x => x.classList.toggle("ativo", x === b));
    filtroEspMapa = b.dataset.espMapa; renderMapa();
  }));

  // ---------- lista ----------
  const TINTS = ["t-azul", "t-rosa", "t-amarelo", "t-verde"];
  function cardAnimal(a, i = 0) {
    const foto = a.foto ? `<img src="${a.foto}" alt="Foto de ${esc(nomeDe(a))}" loading="lazy">` : semFoto(a);
    return `<li><a class="card ${TINTS[i % 4]}" href="#ficha/${a.id}">
      ${foto}
      <div class="card-txt"><span class="card-nome">${esc(nomeDe(a))}<small class="tag-esp">${esp(a).nome}</small>${a.exemplo ? '<small class="tag-ex">exemplo</small>' : ""}</span>
      ${statusTag(a.status)}
      <small>${esc([a.sexo, a.porte, a.cor].filter(Boolean).join(" · "))}</small>
      <small>${esc(a.referencia || "Local marcado no mapa")}</small></div>${ic("chev").replace('class="ic"', 'class="ic chev"')}</a></li>`;
  }

  function marcarAbas() {
    $$("[data-esp]").forEach(x => { const on = x.dataset.esp === filtroEsp; x.classList.toggle("ativo", on); x.setAttribute("aria-pressed", String(on)); });
  }

  function renderLista() {
    const q = $("#busca").value.trim().toLowerCase();
    let arr = animais.filter(a => !filtroEsp || espId(a) === filtroEsp).filter(a => {
      if (filtroLista === "naocastrado") return a.castrado !== "Sim" && espId(a) !== "ave";
      return !filtroLista || a.status === filtroLista;
    });
    if (q) arr = arr.filter(a => [a.nome, a.cor, a.referencia, a.obs].join(" ").toLowerCase().includes(q));
    const E = ESPECIES[filtroEsp];
    $("#lista-caes").innerHTML = arr.length ? arr.map(cardAnimal).join("") :
      `<li class="vazio">Nenhum animal encontrado. <a href="#cadastrar${filtroEsp ? "/" + filtroEsp : ""}">Cadastrar ${E ? E.um : "um animal"}</a></li>`;
  }
  $("#busca").addEventListener("input", renderLista);
  $$("[data-esp]").forEach(b => b.addEventListener("click", () => { filtroEsp = b.dataset.esp; marcarAbas(); renderLista(); }));
  $$("[data-filtro]").forEach(b => b.addEventListener("click", () => {
    $$("[data-filtro]").forEach(x => x.classList.remove("ativo")); b.classList.add("ativo");
    filtroLista = b.dataset.filtro; renderLista();
  }));

  // ---------- ficha ----------
  function renderFicha(id) {
    const a = animais.find(x => x.id === id);
    const el = $("#ficha");
    if (!a) { el.innerHTML = `<p>Animal não encontrado.</p><a class="btn" href="#lista">Voltar à lista</a>`; return; }
    const E = esp(a), ave = espId(a) === "ave";
    const st = STATUS[a.status] || STATUS.rua;
    const linkMapa = `https://www.google.com/maps?q=${a.lat},${a.lng}`;
    const texto = `Amigos da Vila Franca – ${E.nome}: ${nomeDe(a)} (${st.txt})\n${[a.sexo, a.porte, a.cor].filter(Boolean).join(", ")}\nSaúde: ${a.saude}${ave ? "" : " | Castrado: " + a.castrado}\nOnde: ${a.referencia || ""} ${linkMapa}`;
    const tile = (cls, icone, rot, val) => `<div class="tile ${cls}"><span class="tile-ic">${ic(icone)}</span><span><strong>${rot}</strong><small>${esc(val || "—")}</small></span></div>`;
    const descr = a.obs || `${E.nome} de porte ${a.porte ? a.porte.toLowerCase() : "não informado"}${a.cor ? ", " + a.cor : ""}, vist${E.fem ? "a" : "o"} no bairro Vila Franca.`;
    el.innerHTML = `
      <div class="ficha-topo">
        ${a.foto ? `<img class="ficha-foto" src="${a.foto}" alt="Foto de ${esc(nomeDe(a))}">` : semFoto(a, "ficha-foto")}
        <h2 class="nome-bolha">${esc(nomeDe(a))}</h2>
        <p class="ficha-pill">${statusTag(a.status)}<span class="sep"></span>${ic("pin")}${esc(a.referencia || "Vila Franca")}</p>
        ${a.exemplo ? '<small class="tag-ex">exemplo</small>' : ""}
      </div>
      <div class="ficha-card">
        <h3>${ic("heart")}Sobre ${a.nome ? esc(a.nome) : E.este}</h3>
        <p>${esc(descr)}</p>
        <div class="tiles">
          ${tile("t-rosa", E.icone === "bird" ? "feather" : "paw", "Espécie", E.nome)}
          ${tile("t-verde", "heart", "Saúde", a.saude)}
          ${ave ? tile("t-amarelo", "ruler", "Porte", a.porte) : tile("t-azul", "shield", "Castrado", a.castrado)}
          ${ave ? tile("t-lilas", "check", "Sexo", a.sexo) : tile("t-amarelo", "ruler", "Porte", a.porte)}
        </div>
        <dl class="ficha-dados">
          ${ave ? "" : `<dt>Sexo</dt><dd>${esc(a.sexo || "—")}</dd>`}
          <dt>Cor</dt><dd>${esc(a.cor || "—")}</dd>
          <dt>Onde fica</dt><dd>${esc(a.referencia || "—")}<br><a href="${linkMapa}" target="_blank" rel="noopener">Abrir no Google Maps</a></dd>
          <dt>Cadastro</dt><dd>${esc(a.criadoPor || "—")}, ${a.criadoEm ? dataBR(a.criadoEm) : "—"}</dd>
        </dl>
        <div class="acoes">
          <a class="btn btn-laranja" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(texto)}">${ic("chat")}Compartilhar no WhatsApp</a>
          ${!ave && a.castrado !== "Sim" ? `<button class="btn" data-acao="castrado">${ic("scissors")}Foi castrad${E.fem ? "a" : "o"}</button>` : ""}
          ${a.status !== "adotado" ? `<button class="btn" data-acao="adotado">${ic("check")}Foi adotad${E.fem ? "a" : "o"}</button>` : ""}
          ${a.status !== "resgate" ? `<button class="btn btn-alerta" data-acao="resgate">${ic("alert")}Precisa de resgate</button>` : ""}
          ${!ehMeu(a) && !a.exemplo ? `<button class="btn btn-sm btn-denunciar" data-denunciar="animais|${a.id}">${ic("alert")}Denunciar</button>` : ""}
          ${podeEditar(a) ? `<a class="btn btn-outline" href="#editar/${a.id}">${ic("edit")}Editar</a>
          <button class="btn btn-danger" data-apagar-animal="${a.id}">${ic("alert")}Apagar</button>` : ""}
        </div>
      </div>`;
    // Apagar: só aparece para quem cadastrou e para o administrador (o servidor confere de novo).
    $$("[data-apagar-animal]", el).forEach(b => b.addEventListener("click", async () => {
      if (!confirm(`Tem certeza que quer apagar ${nomeDe(a)}? Isso não pode ser desfeito.`)) return;
      try { await DB.remove(COL, a.id); } catch (e) { toast("Não foi possível apagar. Verifique a internet."); return; }
      await recarregar(); location.hash = "lista"; toast("Cadastro apagado.");
    }));
    $$("[data-acao]", el).forEach(b => b.addEventListener("click", async () => {
      const patch = { atualizadoEm: agora(), atualizadoPor: usuario.nome };
      if (b.dataset.acao === "castrado") patch.castrado = "Sim"; else patch.status = b.dataset.acao;
      await DB.update(COL, a.id, patch); await recarregar(); renderFicha(a.id); toast("Atualizado!");
    }));
  }


  // ---------- animais perdidos ----------
  const telLimpo = t => (t || "").replace(/\D/g, "");
  function cardPerdido(p) {
    const E = esp(p), achado = p.situacao === "encontrado", tipo = p.tipo || "perdido", o = E.fem ? "a" : "o";
    const tel = telLimpo(p.telefone);
    const msg = tipo === "perdido"
      ? `Olá! Vi no app Amigos da Vila Franca o anúncio de ${E.um} perdid${o}${p.nome ? " (" + p.nome + ")" : ""}. Acho que vi por aqui: `
      : `Olá! Vi no app Amigos da Vila Franca que você encontrou ${E.um}${p.cor ? " (" + p.cor + ")" : ""}. Acho que é meu / conheço o dono.`;
    const selo = achado ? `De volta pra casa!` : (tipo === "perdido" ? `Perdid${o}` : `Achad${o} na rua`);
    const quando = p.dataSumiu ? new Date(p.dataSumiu + "T12:00").toLocaleDateString("pt-BR") : "—";
    return `<li class="perd perd-${achado ? "volta" : tipo}">
      <div class="perd-topo">
        ${p.foto ? `<img src="${p.foto}" alt="Foto de ${esc(p.nome || E.nome)}">` : semFoto(p)}
        <span class="perd-selo">${selo}</span>
      </div>
      <div class="perd-corpo">
        <h3>${esc(p.nome || (tipo === "achado" ? E.nome + " encontrad" + o : E.nome + " sem nome"))} <small class="tag-esp">${E.nome}</small>${p.exemplo ? '<small class="tag-ex">exemplo</small>' : ""}</h3>
        <p class="perd-info">${ic("pin")}<span>${tipo === "perdido" ? "Visto por último" : "Encontrad" + o + " em"}: <strong>${esc(p.ultimoLocal || "—")}</strong></span></p>
        <p class="perd-info">${ic("clock")}<span>${tipo === "perdido" ? "Sumiu em" : "Achad" + o + " em"} ${quando}</span></p>
        ${p.cor ? `<p class="perd-desc">${esc(p.cor)}</p>` : ""}
        ${p.obs ? `<p class="perd-desc">${esc(p.obs)}</p>` : ""}
        ${achado ? "" : `<div class="acoes">
          ${tel ? `<a class="btn btn-laranja" href="https://wa.me/55${tel}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ic("chat")}${tipo === "perdido" ? "Vi este animal" : "É meu! / Conheço o dono"}</a>` : ""}
          ${p.lat != null ? `<a class="btn" href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank" rel="noopener">${ic("map")}Ver no mapa</a>` : ""}
          ${podeEditar(p) ? `<button class="btn btn-outline" data-achado="${p.id}">${ic("check")}Voltou pra casa</button>
          <button class="btn" data-editar-perd="${p.id}">${ic("edit")}Editar</button>` : ""}
        </div>`}
        ${podeEditar(p) ? `<div class="acoes acoes-dono"><button class="btn btn-sm btn-danger" data-apagar-perd="${p.id}">${ic("alert")}Apagar anúncio</button></div>` : ""}
        ${!ehMeu(p) && !p.exemplo ? `<button class="btn btn-sm btn-denunciar" data-denunciar="perdidos|${p.id}">${ic("alert")}Denunciar</button>` : ""}
        <small class="perd-autor">Publicado por ${esc(p.criadoPor || "—")}</small>
      </div></li>`;
  }

  function renderPerdidos() {
    const aberto = p => p.situacao !== "encontrado";
    const grupo = { perdido: p => aberto(p) && (p.tipo || "perdido") === "perdido", achado: p => aberto(p) && p.tipo === "achado", encontrado: p => !aberto(p) };
    Object.keys(grupo).forEach(k => { $("#n-" + k).textContent = perdidos.filter(grupo[k]).length; });
    $("#perd-intro").textContent = {
      perdido: "Moradores que perderam seu animal. Se você viu algum, toque em “Vi este animal” e avise a família pelo WhatsApp.",
      achado: "Animais que algum morador encontrou na rua e que estão esperando o dono. Reconheceu? Toque em “É meu! / Conheço o dono”.",
      encontrado: "Animais que já voltaram pra casa com a ajuda da comunidade."
    }[filtroPerd];
    if (!$("#p-tel").value && usuario && usuario.whatsapp) $("#p-tel").value = usuario.whatsapp;
    if (!$("#p-data").value) $("#p-data").value = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const arr = perdidos.filter(grupo[filtroPerd]);
    $("#lista-perdidos").innerHTML = arr.length ? arr.map(cardPerdido).join("") :
      `<li class="vazio">${{ perdido: "Nenhum animal perdido no momento. Que bom!", achado: "Nenhum animal achado esperando o dono agora.", encontrado: "Ainda não há reencontros registrados." }[filtroPerd]}</li>`;
    $$("[data-editar-perd]").forEach(b => b.addEventListener("click", () => editarPerdido(b.dataset.editarPerd)));
    $$("[data-apagar-perd]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Tem certeza que quer apagar este anúncio? Isso não pode ser desfeito.")) return;
      try { await DB.remove("perdidos", b.dataset.apagarPerd); } catch (e) { toast("Não foi possível apagar. Verifique a internet."); return; }
      if (perdEditando === b.dataset.apagarPerd) cancelarEdicaoPerdido();
      await recarregar(); renderPerdidos(); toast("Anúncio apagado.");
    }));
    $$("[data-achado]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Confirmar que o animal voltou para casa?")) return;
      await DB.update("perdidos", b.dataset.achado, { situacao: "encontrado", encontradoEm: agora(), encontradoPor: usuario.nome });
      await recarregar(); renderPerdidos(); toast("Que notícia boa! Ele voltou pra casa.");
    }));
  }
  function ajustarFormPerdido() {
    const achado = ($("input[name=tipo]:checked") || {}).value === "achado";
    $("#lbl-p-nome").textContent = achado ? "Nome na coleira (se tiver)" : "Nome do animal";
    $("#lbl-p-data").textContent = achado ? "Quando você encontrou?" : "Quando sumiu?";
    $("#lbl-p-local").textContent = achado ? "Onde você encontrou?" : "Onde foi visto pela última vez?";
    $("#hint-p-tel").textContent = achado ? "Seu número aparece no anúncio para o dono poder falar com você." : "Seu número aparece no anúncio para quem encontrar o animal poder avisar você.";
    $("#form-perdido button[type=submit]").textContent = perdEditando ? "Salvar alterações" : (achado ? "Publicar animal achado" : "Publicar anúncio");
  }

  // Editar anúncio: o mesmo formulário de publicar, já preenchido.
  let perdEditando = null; // id do anúncio sendo editado (ou null)
  function editarPerdido(id) {
    const p = perdidos.find(x => x.id === id); if (!p || !podeEditar(p)) return;
    const f = $("#form-perdido");
    perdEditando = id;
    $(`input[name=tipo][value=${p.tipo || "perdido"}]`).checked = true;
    const r = $(`input[name=perd-especie][value=${espId(p)}]`); if (r) r.checked = true;
    f.nome.value = p.nome || ""; f.cor.value = p.cor || ""; f.dataSumiu.value = p.dataSumiu || "";
    f.ultimoLocal.value = p.ultimoLocal || ""; f.telefone.value = p.telefone || ""; f.obs.value = p.obs || "";
    fotoPerd = p.foto || null;
    const pv = $("#perd-preview"); pv.hidden = !p.foto; if (p.foto) pv.src = p.foto;
    pontoPerd = p.lat != null ? { lat: p.lat, lng: p.lng } : null;
    $("#perd-gps-txt").textContent = pontoPerd ? "Local marcado no mapa." : "";
    $("#perd-erro").textContent = "";
    $("#perd-summary").textContent = "Editar anúncio";
    $("#perd-cancelar").hidden = false;
    ajustarFormPerdido();
    const d = $("#perd-novo"); d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function cancelarEdicaoPerdido() {
    perdEditando = null;
    const f = $("#form-perdido"); f.reset(); fotoPerd = null; pontoPerd = null;
    $("#perd-preview").hidden = true; $("#perd-gps-txt").textContent = ""; $("#perd-erro").textContent = "";
    $("#perd-cancelar").hidden = true; $("#perd-novo").open = false;
    $("#perd-summary").textContent = filtroPerd === "achado" ? "Encontrei um animal" : "Perdi meu animal";
    ajustarFormPerdido(); renderPerdidos();
  }
  $("#perd-cancelar").addEventListener("click", cancelarEdicaoPerdido);
  $$("input[name=tipo]").forEach(r => r.addEventListener("change", ajustarFormPerdido));
  $$("[data-perd]").forEach(b => b.addEventListener("click", () => {
    $$("[data-perd]").forEach(x => x.classList.toggle("ativo", x === b));
    filtroPerd = b.dataset.perd;
    if (filtroPerd !== "encontrado") {
      $(`input[name=tipo][value=${filtroPerd}]`).checked = true; ajustarFormPerdido();
      $("#perd-summary").textContent = filtroPerd === "achado" ? "Encontrei um animal" : "Perdi meu animal";
    }
    renderPerdidos();
  }));

  $$('input[data-foto="perdido"]').forEach(inp => inp.addEventListener("change", ev => {
    lerFoto(ev.target.files[0], url => {
      fotoPerd = url;
      const pv = $("#perd-preview"); pv.src = url; pv.hidden = false; pv.alt = "Foto do animal escolhida";
      toast("Foto adicionada!");
    });
    ev.target.value = "";
  }));
  $("#perd-gps").addEventListener("click", () => {
    if (!navigator.geolocation) { toast("Seu aparelho não permite localização."); return; }
    navigator.geolocation.getCurrentPosition(
      p => { pontoPerd = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }; $("#perd-gps-txt").textContent = "Local marcado pelo GPS."; },
      () => toast("Não deu para pegar o GPS. Escreva a rua ou referência."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });
  $("#form-perdido").addEventListener("submit", async ev => {
    ev.preventDefault();
    const f = ev.target;
    const erro = $("#perd-erro");
    const tipo = ($("input[name=tipo]:checked") || {}).value || "perdido";
    if (!f.ultimoLocal.value.trim()) { erro.textContent = tipo === "achado" ? "Diga onde você encontrou o animal." : "Diga onde o animal foi visto pela última vez."; f.ultimoLocal.focus(); return; }
    if (telLimpo(f.telefone.value).length < 10) { erro.textContent = "Informe um WhatsApp com DDD para as pessoas avisarem você."; f.telefone.focus(); return; }
    if (!fotoPerd && !f.cor.value.trim()) { erro.textContent = "Adicione uma foto ou descreva o animal."; return; }
    erro.textContent = "";
    const dados = {
      tipo, especie: ($("input[name=perd-especie]:checked") || {}).value || "cao",
      nome: f.nome.value.trim(), cor: f.cor.value.trim(), dataSumiu: f.dataSumiu.value, ultimoLocal: f.ultimoLocal.value.trim(),
      telefone: f.telefone.value.trim(), obs: f.obs.value.trim(), foto: fotoPerd || "",
      lat: pontoPerd ? pontoPerd.lat : null, lng: pontoPerd ? pontoPerd.lng : null
    };
    const editando = perdEditando;
    try {
      if (editando) await DB.update("perdidos", editando, Object.assign(dados, { atualizadoEm: agora() }));
      else await DB.add("perdidos", Object.assign(dados, { situacao: "aberto", criadoEm: agora(), criadoPor: usuario.nome }));
    } catch (e) { erro.textContent = "Não foi possível salvar. Verifique a internet e tente de novo."; return; }
    perdEditando = null; $("#perd-cancelar").hidden = true;
    $("#perd-summary").textContent = tipo === "achado" ? "Encontrei um animal" : "Perdi meu animal";
    f.reset(); fotoPerd = null; pontoPerd = null;
    $("#perd-preview").hidden = true; $("#perd-gps-txt").textContent = "";
    f.closest("details").open = false;
    ajustarFormPerdido(); filtroPerd = tipo;
    $$("[data-perd]").forEach(x => x.classList.toggle("ativo", x.dataset.perd === tipo));
    await recarregar(); renderPerdidos();
    toast(editando ? "Anúncio atualizado!" : tipo === "achado" ? "Publicado. Tomara que o dono apareça logo!" : "Anúncio publicado. Torcemos para ele voltar logo!");
  });


  // ---------- mural do bairro (publicação só pelo administrador) ----------
  const TIPOS_MURAL = {
    campanha: { nome: "Campanha",        icone: "scissors" },
    adocao:   { nome: "Feira de adoção", icone: "heart" },
    alerta:   { nome: "Alerta",          icone: "alert" },
    aviso:    { nome: "Aviso",           icone: "megaphone" }
  };
  function dataEventoBR(d) {
    const dt = new Date(d + (d.length === 10 ? "T12:00" : ""));
    return dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }) + (d.length > 10 ? " às " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "");
  }
  function cardMural(m) {
    const T = TIPOS_MURAL[m.tipo] || TIPOS_MURAL.aviso;
    const texto = `Amigos da Vila Franca – ${T.nome}: ${m.titulo}\n${m.texto || ""}${m.dataEvento ? "\nQuando: " + dataEventoBR(m.dataEvento) : ""}${m.local ? "\nOnde: " + m.local : ""}`;
    return `<li class="mural-card tm-${m.tipo}">
      ${m.foto ? `<img src="${m.foto}" alt="">` : ""}
      <div class="mural-corpo">
        <span class="mh-tag">${ic(T.icone)}${T.nome}</span>${m.exemplo ? ' <small class="tag-ex">exemplo</small>' : ""}
        <h3>${esc(m.titulo)}</h3>
        ${m.texto ? `<p>${esc(m.texto).replace(/\n/g, "<br>")}</p>` : ""}
        ${m.dataEvento ? `<p class="perd-info">${ic("clock")}<span>${dataEventoBR(m.dataEvento)}</span></p>` : ""}
        ${m.local ? `<p class="perd-info">${ic("pin")}<span>${esc(m.local)}</span></p>` : ""}
        <div class="mural-acoes">
          <a class="btn btn-sm btn-laranja" href="https://wa.me/?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener">${ic("chat")}Compartilhar</a>
          ${adminAberto ? `<button class="btn btn-sm btn-alerta" data-apagar-mural="${m.id}">Apagar</button>` : ""}
        </div>
        <small class="perd-autor">Publicado em ${m.criadoEm ? dataBR(m.criadoEm) : "—"}</small>
      </div></li>`;
  }
  function renderMural() {
    $("#mural-admin").hidden = !adminAberto;
    $("#mural-so-admin").hidden = adminAberto;
    const arr = mural.filter(m => !filtroMural || m.tipo === filtroMural);
    $("#lista-mural").innerHTML = arr.length ? arr.map(cardMural).join("") : `<li class="vazio">Nenhuma publicação ${filtroMural ? "deste tipo " : ""}ainda.</li>`;
    $$("[data-apagar-mural]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Apagar esta publicação do mural?")) return;
      await DB.remove("mural", b.dataset.apagarMural); await recarregar(); renderMural(); toast("Publicação apagada.");
    }));
  }
  $$("[data-mural]").forEach(b => b.addEventListener("click", () => {
    $$("[data-mural]").forEach(x => x.classList.toggle("ativo", x === b));
    filtroMural = b.dataset.mural; renderMural();
  }));
  $$('input[data-foto="mural"]').forEach(inp => inp.addEventListener("change", ev => {
    lerFoto(ev.target.files[0], url => { fotoMural = url; const pv = $("#mural-preview"); pv.src = url; pv.hidden = false; toast("Foto adicionada!"); });
    ev.target.value = "";
  }));
  $("#form-mural").addEventListener("submit", async ev => {
    ev.preventDefault();
    if (!adminAberto) { toast("Só o administrador pode publicar."); return; }
    const f = ev.target;
    if (!f.titulo.value.trim()) { $("#mural-erro").textContent = "Escreva um título."; f.titulo.focus(); return; }
    $("#mural-erro").textContent = "";
    await DB.add("mural", { tipo: f.tipo.value, titulo: f.titulo.value.trim(), texto: f.texto.value.trim(), dataEvento: f.dataEvento.value || "",
      local: f.local.value.trim(), foto: fotoMural || "", criadoEm: agora(), criadoPor: usuario.nome });
    f.reset(); fotoMural = null; $("#mural-preview").hidden = true; f.closest("details").open = false;
    await recarregar(); renderMural(); toast("Publicado no mural!");
  });


  // =============================================================
  //  JOGOS: quiz, monte seu vira-lata, sudoku, bichos da vila,
  //  ranking e medalhas de protetor
  // =============================================================
  let quizResultados = [];

  // ---------- Quiz Tutor Responsável ----------
  // Banco de perguntas em quiz-perguntas.js; cada partida sorteia QTD_QUIZ delas
  const QUIZ = window.QUIZ_PERGUNTAS || [];
  const QTD_QUIZ = Math.min(10, QUIZ.length);
  let quizEstado = null;
  const NIVEIS = [
    { min: 8, nome: "Protetor da Vila", txt: "Você manda muito bem! Já pode ensinar os vizinhos." },
    { min: 5, nome: "Amigo dos Animais", txt: "Bom resultado! Releia as explicações e tente chegar ao topo." },
    { min: 0, nome: "Aprendiz", txt: "Todo protetor começa assim. Leia as explicações e jogue de novo!" }
  ];
  const nivelQuiz = n => NIVEIS.find(x => n >= x.min);
  // Pontuação do quiz: 100 por acerto + 25 a mais para cada acerto seguido (2º seguido = +25, 3º = +50...)
  const QZ_PTS_ACERTO = 100, QZ_PTS_SEQ = 25;
  const pontosQuiz = q => q.pontos != null ? q.pontos : (q.acertos || 0) * QZ_PTS_ACERTO;

  function iniciarQuiz() {
    // embaralha o banco de forma justa (método de Fisher-Yates: troca cada item
    // com outro de posição sorteada) e pega as primeiras QTD_QUIZ perguntas
    const idx = QUIZ.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const ordem = idx.slice(0, QTD_QUIZ);
    const embaralha = n => [...Array(n).keys()].sort(() => Math.random() - .5);
    quizEstado = { ordem, perms: ordem.map(qi => embaralha(QUIZ[qi].o.length)), i: 0, acertos: 0, respondeu: false, pontos: 0, seq: 0, melhorSeq: 0 };
    renderQuiz();
  }
  function renderQuiz() {
    const box = $("#quiz-box"), st = quizEstado;
    if (!st) return iniciarQuiz();
    if (st.i >= st.ordem.length) {
      const nv = nivelQuiz(st.acertos);
      const txt = `Fiz o Quiz Tutor Responsável no app Amigos da Vila Franca e acertei ${st.acertos} de ${QTD_QUIZ}: sou ${nv.nome}! Você consegue mais?`;
      box.innerHTML = `<div class="quiz-fim">
        <span class="quiz-medalha">${ic("medal")}</span>
        <p class="quiz-placar">${st.acertos} <small>de ${QTD_QUIZ}</small></p>
        <p class="pts-total">${st.pontos} pontos</p>
        <p class="pts-detalhe">${st.acertos} × ${QZ_PTS_ACERTO} pelos acertos + ${st.pontos - st.acertos * QZ_PTS_ACERTO} de bônus de sequência (melhor sequência: ${st.melhorSeq})</p>
        <h2 class="nome-bolha quiz-nivel">${nv.nome}</h2>
        <p>${nv.txt}</p>
        <a class="btn btn-laranja btn-big" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">${ic("chat")}Desafiar no WhatsApp</a>
        <button class="btn btn-outline btn-big" id="quiz-de-novo">Jogar de novo</button>
        <a class="btn btn-big" href="#ranking/quiz">${ic("medal")}Ver ranking</a>
        <a class="btn btn-big" href="#jogos">Voltar aos jogos</a></div>`;
      $("#quiz-de-novo").addEventListener("click", iniciarQuiz);
      return;
    }
    const q = QUIZ[st.ordem[st.i]];
    box.innerHTML = `
      <div class="quiz-progresso"><span style="width:${(st.i / QTD_QUIZ) * 100}%"></span></div>
      <p class="quiz-tema">${esc(q.t || "")}</p>
      <p class="quiz-conta">Pergunta ${st.i + 1} de ${QTD_QUIZ} · ${st.acertos} ${st.acertos === 1 ? "acerto" : "acertos"} <span class="pts-chip">${st.pontos} pts</span>${st.seq >= 2 ? ` <span class="seq-chip">${st.seq} seguidas!</span>` : ""}</p>
      <h2 class="quiz-pergunta">${esc(q.p)}</h2>
      <div class="quiz-opcoes">${st.perms[st.i].map(k => `<button class="quiz-op" data-op="${k}">${esc(q.o[k])}</button>`).join("")}</div>
      <div id="quiz-exp"></div>`;
    $$(".quiz-op", box).forEach(b => b.addEventListener("click", () => responder(+b.dataset.op)));
  }
  function responder(k) {
    const st = quizEstado; if (st.respondeu) return;
    st.respondeu = true;
    const q = QUIZ[st.ordem[st.i]], certo = k === q.c;
    if (certo) { st.acertos++; st.seq++; st.melhorSeq = Math.max(st.melhorSeq, st.seq); st.ganho = QZ_PTS_ACERTO + QZ_PTS_SEQ * (st.seq - 1); st.pontos += st.ganho; }
    else { st.seq = 0; st.ganho = 0; }
    Som.efeito(certo ? "acerto" : "erro");
    $$(".quiz-op").forEach(b => { const i = +b.dataset.op; b.disabled = true; if (i === q.c) b.classList.add("certa"); else if (i === k) b.classList.add("errada"); });
    $("#quiz-exp").innerHTML = `<div class="quiz-exp ${certo ? "ok" : "nao"}"><strong>${certo ? `Isso mesmo! +${st.ganho} pts` : "Não é bem assim."}</strong> ${esc(q.e)}</div>
      <button class="btn btn-primary btn-big" id="quiz-prox">${st.i + 1 < QTD_QUIZ ? "Próxima pergunta" : "Ver meu resultado"}</button>`;
    $("#quiz-prox").addEventListener("click", async () => {
      st.i++; st.respondeu = false;
      if (st.i >= st.ordem.length) {
        try { await DB.add("quiz", { nome: usuario.nome, acertos: st.acertos, total: QTD_QUIZ, pontos: st.pontos, melhorSeq: st.melhorSeq, quando: agora() }); quizResultados = await DB.list("quiz"); } catch (e) {}
        checarMedalhas();
      }
      renderQuiz(); window.scrollTo(0, 0);
    });
  }

  // ---------- Monte seu vira-lata ----------
  const VIRA_OPCOES = {
    pelo:     { rot: "Cor do pelo", ops: { caramelo: ["#e3a557", "#c98a3d"], preto: ["#3b3b42", "#26262b"], branco: ["#f5f1ea", "#ddd5c8"], cinza: ["#a4adb8", "#828b96"], marrom: ["#8e5b3c", "#6e432a"] } },
    orelha:   { rot: "Orelhas", ops: { caidas: "Caídas", empe: "Em pé", mista: "Uma de cada" } },
    mancha:   { rot: "Mancha", ops: { nenhuma: "Nenhuma", olho: "No olho", testa: "Na testa" } },
    coleira:  { rot: "Coleira", ops: { azul: "#1f6fe0", vermelha: "#d93a2b", verde: "#23934c", rosa: "#e0457b" } },
    extra:    { rot: "Acessório", ops: { nada: "Nada", laco: "Laço", bandana: "Bandana", chapeu: "Chapéu de festa" } },
    cara:     { rot: "Carinha", ops: { feliz: "Feliz", fofo: "Fofo", sapeca: "Sapeca" } }
  };
  const NOMES_COR = { caramelo: "Caramelo", preto: "Preto", branco: "Branco", cinza: "Cinza", marrom: "Marrom", azul: "Azul", vermelha: "Vermelha", verde: "Verde", rosa: "Rosa" };
  let vira = { pelo: "caramelo", orelha: "caidas", mancha: "olho", coleira: "azul", extra: "nada", cara: "feliz" };

  function desenharVira(v) {
    const [cor, escura] = VIRA_OPCOES.pelo.ops[v.pelo];
    const clara = v.pelo === "branco" ? "#ffffff" : "#fff3e0";
    const col = VIRA_OPCOES.coleira.ops[v.coleira];
    const orelhaCaida = (lado) => lado < 0
      ? `<path d="M58 62 C30 66 22 110 34 138 C44 150 60 138 64 118 C68 98 70 76 58 62Z" fill="${escura}"/>`
      : `<path d="M142 62 C170 66 178 110 166 138 C156 150 140 138 136 118 C132 98 130 76 142 62Z" fill="${escura}"/>`;
    const orelhaEmPe = (lado) => lado < 0
      ? `<path d="M48 92 L52 30 L92 62Z" fill="${escura}"/><path d="M57 78 L59 44 L82 63Z" fill="#f2b6c0"/>`
      : `<path d="M152 92 L148 30 L108 62Z" fill="${escura}"/><path d="M143 78 L141 44 L118 63Z" fill="#f2b6c0"/>`;
    const orelhas = v.orelha === "caidas" ? orelhaCaida(-1) + orelhaCaida(1) : v.orelha === "empe" ? orelhaEmPe(-1) + orelhaEmPe(1) : orelhaEmPe(-1) + orelhaCaida(1);
    const mancha = v.mancha === "olho" ? `<ellipse cx="78" cy="100" rx="21" ry="19" fill="${escura}"/>` : v.mancha === "testa" ? `<path d="M100 58 C88 70 90 88 100 96 C110 88 112 70 100 58Z" fill="${v.pelo === "branco" ? escura : clara}"/>` : "";
    const olhos = v.cara === "fofo"
      ? `<circle cx="80" cy="101" r="11" fill="#1b2a4a"/><circle cx="120" cy="101" r="11" fill="#1b2a4a"/><circle cx="84" cy="96" r="4" fill="#fff"/><circle cx="124" cy="96" r="4" fill="#fff"/><circle cx="77" cy="105" r="2" fill="#fff"/><circle cx="117" cy="105" r="2" fill="#fff"/>`
      : v.cara === "sapeca"
      ? `<circle cx="80" cy="101" r="8" fill="#1b2a4a"/><circle cx="83" cy="98" r="2.6" fill="#fff"/><path d="M110 102 q10 -9 20 0" stroke="#1b2a4a" stroke-width="5" fill="none" stroke-linecap="round"/>`
      : `<circle cx="80" cy="101" r="8" fill="#1b2a4a"/><circle cx="120" cy="101" r="8" fill="#1b2a4a"/><circle cx="83" cy="98" r="2.6" fill="#fff"/><circle cx="123" cy="98" r="2.6" fill="#fff"/>`;
    const boca = v.cara === "sapeca"
      ? `<path d="M100 134 q-10 10 -20 3 M100 134 q10 10 20 3" stroke="#3a2716" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M106 140 q4 14 -6 14 q-6 0 -4 -10z" fill="#f07a8f"/>`
      : `<path d="M100 134 q-10 10 -20 3 M100 134 q10 10 20 3" stroke="#3a2716" stroke-width="3.5" fill="none" stroke-linecap="round"/>${v.cara === "feliz" ? `<ellipse cx="100" cy="148" rx="9" ry="11" fill="#f07a8f"/><path d="M100 140 v14" stroke="#d65a70" stroke-width="2"/>` : ""}`;
    const bochechas = v.cara === "fofo" ? `<ellipse cx="66" cy="124" rx="9" ry="6" fill="#f7a1b0" opacity=".7"/><ellipse cx="134" cy="124" rx="9" ry="6" fill="#f7a1b0" opacity=".7"/>` : "";
    const extra = v.extra === "laco"
      ? `<g transform="translate(128 52) rotate(18)"><path d="M0 0 L-22 -12 L-22 12Z M0 0 L22 -12 L22 12Z" fill="#ff6fa3"/><circle r="6" fill="#e0457b"/></g>`
      : v.extra === "chapeu"
      ? `<g transform="translate(100 48)"><path d="M-22 6 L0 -46 L22 6Z" fill="#ffcc2e"/><path d="M-15 -10 L15 -10 M-9 -26 L9 -26" stroke="#1f6fe0" stroke-width="5"/><circle cy="-48" r="7" fill="#ff8a1d"/></g>`
      : "";
    const bandana = v.extra === "bandana" ? `<path d="M56 160 L144 160 L100 196Z" fill="${col}"/><circle cx="88" cy="172" r="3" fill="#fff"/><circle cx="108" cy="176" r="3" fill="#fff"/><circle cx="100" cy="186" r="2.5" fill="#fff"/>` : "";
    return `<svg viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vira-lata montado">
      <circle cx="100" cy="108" r="98" fill="#d3ecff"/>
      ${orelhas}
      <ellipse cx="100" cy="106" rx="62" ry="58" fill="${cor}"/>
      ${mancha}
      <ellipse cx="100" cy="134" rx="34" ry="25" fill="${clara}"/>
      ${bochechas}${olhos}
      <ellipse cx="100" cy="124" rx="12" ry="8.5" fill="#2a1a12"/><ellipse cx="96" cy="121" rx="3.5" ry="2" fill="#fff" opacity=".5"/>
      ${boca}
      <rect x="58" y="156" width="84" height="13" rx="6.5" fill="${col}"/>
      ${bandana}
      ${v.extra === "bandana" ? "" : `<circle cx="100" cy="176" r="8" fill="#ffcc2e" stroke="#e0a800" stroke-width="2"/>`}
      ${extra}
    </svg>`;
  }
  function renderVira() {
    $("#vira-svg").innerHTML = desenharVira(vira);
    const nome = $("#vira-nome").value.trim() || "Sem nome";
    $("#vira-nome-txt").textContent = nome;
    $("#vira-escolhas").innerHTML = Object.keys(VIRA_OPCOES).map(k => {
      const g = VIRA_OPCOES[k];
      return `<fieldset class="vira-grupo"><legend>${g.rot}</legend><div class="vira-ops">${Object.keys(g.ops).map(o => {
        const amostra = k === "pelo" ? `<i style="background:${g.ops[o][0]}"></i>` : k === "coleira" ? `<i style="background:${g.ops[o]}"></i>` : "";
        const rot = (k === "pelo" || k === "coleira") ? NOMES_COR[o] : g.ops[o];
        return `<button type="button" class="vira-op ${vira[k] === o ? "ativo" : ""}" data-k="${k}" data-o="${o}" aria-pressed="${vira[k] === o}">${amostra}${rot}</button>`;
      }).join("")}</div></fieldset>`;
    }).join("");
    $$(".vira-op").forEach(b => b.addEventListener("click", () => { vira[b.dataset.k] = b.dataset.o; Som.efeito("clique"); renderVira(); }));
    const txt = `Montei o ${nome}, meu vira-lata no app Amigos da Vila Franca! Monte o seu também e ajude os cães, gatos e aves do bairro.`;
    $("#vira-share").href = `https://wa.me/?text=${encodeURIComponent(txt)}`;
  }
  $("#vira-nome").addEventListener("input", () => { $("#vira-nome-txt").textContent = $("#vira-nome").value.trim() || "Sem nome"; renderVira(); });
  $("#vira-sortear").addEventListener("click", () => {
    Object.keys(VIRA_OPCOES).forEach(k => { const ks = Object.keys(VIRA_OPCOES[k].ops); vira[k] = ks[Math.floor(Math.random() * ks.length)]; });
    renderVira(); marcarArtista(); Som.efeito("latido");
  });
  function marcarArtista() { if (!store.get("artista", false)) { store.set("artista", true); checarMedalhas(); } }
  $("#vira-salvar").addEventListener("click", () => {
    marcarArtista();
    const nome = $("#vira-nome").value.trim() || "Sem nome";
    const svg = desenharVira(vira).replace("<svg ", '<svg width="600" height="630" ');
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas"); cv.width = 600; cv.height = 760;
      const g = cv.getContext("2d");
      g.fillStyle = "#eef7ff"; g.fillRect(0, 0, 600, 760);
      g.drawImage(img, 0, 0, 600, 630);
      g.font = "700 64px Fredoka, sans-serif"; g.textAlign = "center"; g.lineJoin = "round";
      g.lineWidth = 14; g.strokeStyle = "#1f6fe0"; g.strokeText(nome, 300, 700);
      g.fillStyle = "#ffcc2e"; g.fillText(nome, 300, 700);
      g.font = "700 22px Nunito, sans-serif"; g.fillStyle = "#123c8c"; g.fillText("Amigos da Vila Franca", 300, 745);
      const a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = `vira-lata-${nome.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      toast("Imagem salva!");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });


  // ---------- Indique para 5 amigos ----------
  const META_CONVITE = 5;
  function amigosIndicados() {
    if (!usuario) return [];
    const amigos = new Map(); // id do convite -> nome curto do amigo
    convites.forEach(c => {
      const paraMim = (usuario.uid && c.indicadoPor === usuario.uid) || mesmoNome(c.indicadoPor, usuario.nome);
      if (paraMim && (c.amigo || "").trim()) amigos.set(c.id || c.amigo, c.amigo.trim());
    });
    return [...amigos.values()];
  }
  function linkConvite() {
    let base = window.APP_URL || "";
    if (!base && /^https?:/.test(location.protocol) && !/localhost|127\.0\.0\.1/.test(location.hostname)) base = location.origin + location.pathname;
    if (!base) base = location.origin + location.pathname;
    return base + (base.includes("?") ? "&" : "?") + "convite=" + encodeURIComponent(usuario.uid || usuario.nome.trim());
  }
  function renderConvite() {
    const box = $("#convite-home"); if (!box || !usuario) return;
    const amigos = amigosIndicados(), n = Math.min(amigos.length, META_CONVITE);
    const txt = `Oi! Estou usando o app Amigos da Vila Franca para ajudar os cães, gatos e aves do nosso bairro: cadastro de animais de rua, animais perdidos, mural e jogos. Entra também pelo meu convite: ${linkConvite()}`;
    box.innerHTML = `<div class="convite">
      <div class="convite-topo"><span class="convite-ic">${ic("megaphone")}</span>
        <span><strong>Indique para ${META_CONVITE} amigos</strong><small>${n >= META_CONVITE ? "Meta batida! Você é Embaixador da Vila." : `${n} de ${META_CONVITE} amigos já entraram pelo seu convite`}</small></span></div>
      <div class="convite-pontos">${Array.from({ length: META_CONVITE }, (_, i) => `<span class="${i < n ? "on" : ""}" title="${i < n ? esc(amigos[i]) : "Convite pendente"}">${i < n ? esc(amigos[i].slice(0, 1).toUpperCase()) : i + 1}</span>`).join("")}</div>
      <a class="btn btn-laranja btn-big" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${ic("chat")}Convidar pelo WhatsApp</a>
      <button class="link convite-copiar" type="button">Copiar meu link de convite</button>
    </div>`;
    box.querySelector(".convite-copiar").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(linkConvite()); toast("Link copiado!"); }
      catch (e) { prompt("Copie seu link de convite:", linkConvite()); }
    });
  }


  // =============================================================
  //  SUDOKU DE ANIMAIS
  //  Fácil: 4x4 (quadrados 2x2) · Médio e Difícil: 6x6 (quadrados 2x3)
  //  Cada jogo é gerado na hora e tem solução única.
  // =============================================================
  const SDK_ANIMAIS = [
    { id: "dog",    nome: "Cão",       cor: "#c9741f", fundo: "#fff1df" },
    { id: "cat",    nome: "Gato",      cor: "#5f6c82", fundo: "#eceff5" },
    { id: "bird",   nome: "Ave",       cor: "#d39a00", fundo: "#fff6d2" },
    { id: "rabbit", nome: "Coelho",    cor: "#d63a73", fundo: "#ffe6ee" },
    { id: "fish",   nome: "Peixe",     cor: "#1f6fe0", fundo: "#e4f2ff" },
    { id: "turtle", nome: "Tartaruga", cor: "#1f8a47", fundo: "#e3f6e3" }
  ];
  const SDK_NIVEIS = {
    facil:   { nome: "Fácil",   n: 4, br: 2, bc: 2, pistas: 8 },
    medio:   { nome: "Médio",   n: 6, br: 2, bc: 3, pistas: 18 },
    dificil: { nome: "Difícil", n: 6, br: 2, bc: 3, pistas: 13 }
  };
  // Pontuação: base do nível + bônus de tempo (quanto mais rápido, mais pontos) − descontos
  const PTS = {
    sudoku: { facil: { base: 500, alvo: 180, mult: 1 }, medio: { base: 1000, alvo: 600, mult: 2 }, dificil: { base: 1500, alvo: 900, mult: 3 } },
    bichos: { facil: { base: 500, alvo: 150, mult: 1 }, medio: { base: 1000, alvo: 300, mult: 2 }, dificil: { base: 1500, alvo: 480, mult: 3 } }
  };
  function calcPontos(jogo, nivel, ms, extra) {
    const P = PTS[jogo][nivel], seg = Math.round(ms / 1000);
    const tempo = Math.max(0, P.alvo - seg) * 2 * P.mult;
    const partes = [["Nível " + ({ facil: "Fácil", medio: "Médio", dificil: "Difícil" })[nivel], P.base], ["Bônus de tempo", tempo]];
    if (jogo === "sudoku") { partes.push(["Dicas usadas", -(extra.dicas || 0) * 100 * P.mult]); partes.push(["Animais repetidos", -(extra.erros || 0) * 20 * P.mult]); }
    if (jogo === "bichos") partes.push(["Vidas que sobraram", (extra.vidas || 0) * 150 * P.mult]);
    const total = Math.max(50, partes.reduce((a, p) => a + p[1], 0));
    return { total, partes };
  }
  const htmlPontos = r => `<p class="pts-total">${r.total} pontos</p><ul class="pts-lista">${r.partes.filter(p => p[1]).map(p => `<li><span>${p[0]}</span><b class="${p[1] < 0 ? "neg" : ""}">${p[1] > 0 ? "+" : ""}${p[1]}</b></li>`).join("")}</ul>`;
  let sdk = null, sdkNivel = store.get("sdkNivel", "facil"), sdkTimer = null;

  // embaralha uma lista (método de Fisher-Yates)
  const sdkEmbaralha = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // verifica se o animal v pode ficar na linha r, coluna c (sem repetir na linha, coluna e quadrado)
  function sdkPode(g, N, br, bc, r, c, v) {
    for (let k = 0; k < N; k++) if (g[r * N + k] === v || g[k * N + c] === v) return false;
    const r0 = r - r % br, c0 = c - c % bc;
    for (let i = 0; i < br; i++) for (let j = 0; j < bc; j++) if (g[(r0 + i) * N + c0 + j] === v) return false;
    return true;
  }
  // preenche o tabuleiro inteiro com uma solução válida (tentativa e erro com volta atrás)
  function sdkPreenche(g, N, br, bc) {
    const i = g.indexOf(0); if (i < 0) return true;
    const r = Math.floor(i / N), c = i % N;
    for (const v of sdkEmbaralha([...Array(N)].map((_, k) => k + 1))) {
      if (sdkPode(g, N, br, bc, r, c, v)) { g[i] = v; if (sdkPreenche(g, N, br, bc)) return true; g[i] = 0; }
    }
    return false;
  }
  // conta quantas soluções o tabuleiro tem (para no limite "lim"); usado para garantir solução única
  function sdkConta(g, N, br, bc, lim) {
    const i = g.indexOf(0); if (i < 0) return 1;
    const r = Math.floor(i / N), c = i % N; let tot = 0;
    for (let v = 1; v <= N && tot < lim; v++) if (sdkPode(g, N, br, bc, r, c, v)) { g[i] = v; tot += sdkConta(g, N, br, bc, lim - tot); g[i] = 0; }
    return tot;
  }
  // gera uma fase: cria a solução e vai tirando casas enquanto a solução continuar única
  function sdkGerar(nivel) {
    const L = SDK_NIVEIS[nivel], N = L.n;
    const sol = Array(N * N).fill(0); sdkPreenche(sol, N, L.br, L.bc);
    const p = sol.slice(); let pistas = N * N;
    for (const i of sdkEmbaralha([...Array(N * N).keys()])) {
      if (pistas <= L.pistas) break;
      const v = p[i]; p[i] = 0;
      if (sdkConta(p.slice(), N, L.br, L.bc, 2) !== 1) p[i] = v; else pistas--;
    }
    // os animais trocam de lugar a cada jogo (o desenho muda, a lógica é a mesma)
    const mapa = sdkEmbaralha(SDK_ANIMAIS.slice(0, N).map((_, k) => k));
    return { nivel, N, br: L.br, bc: L.bc, sol, fixo: p.map(v => v > 0), g: p.slice(), sel: -1, jogadas: 0, dicas: 0, erros: 0, inicio: Date.now(), fim: 0, mapa };
  }
  const sdkAnimal = v => SDK_ANIMAIS[v - 1];
  const sdkPeca = (v, cls = "") => { const a = sdkAnimal(v); return `<span class="sdk-peca ${cls}" style="--pc:${a.cor};--pf:${a.fundo}"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#i-${a.id}"/></svg></span>`; };
  // devolve as casas com animal repetido (para pintar a borda de vermelho)
  function sdkConflitos(s) {
    const { N, br, bc, g } = s, ruins = new Set();
    for (let i = 0; i < N * N; i++) {
      if (!g[i]) continue; const r = Math.floor(i / N), c = i % N;
      for (let j = 0; j < N * N; j++) {
        if (j === i || g[j] !== g[i]) continue; const r2 = Math.floor(j / N), c2 = j % N;
        if (r === r2 || c === c2 || (Math.floor(r / br) === Math.floor(r2 / br) && Math.floor(c / bc) === Math.floor(c2 / bc))) { ruins.add(i); ruins.add(j); }
      }
    }
    return ruins;
  }
  const sdkTempo = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  // desenha o tabuleiro, a paleta de animais e a tela de vitória
  function renderSudoku(novo) {
    if (novo || !sdk || sdk.nivel !== sdkNivel) sdk = sdkGerar(sdkNivel);
    const s = sdk, N = s.N, ruins = sdkConflitos(s);
    const completo = !s.g.includes(0) && ruins.size === 0;
    if (completo && !s.fim) {
      s.fim = Date.now();
      const vit = store.get("sdkVitorias", {}); vit[s.nivel] = (vit[s.nivel] || 0) + 1; store.set("sdkVitorias", vit);
      s.res = calcPontos("sudoku", s.nivel, s.fim - s.inicio, { dicas: s.dicas, erros: s.erros });
      salvarPlacar("sudoku", s.nivel, s.fim - s.inicio, { dicas: s.dicas, erros: s.erros, pontos: s.res.total });
      Som.efeito("medalha"); checarMedalhas();
    }
    $$("[data-sdk-nivel]").forEach(b => { const on = b.dataset.sdkNivel === sdkNivel; b.classList.toggle("ativo", on); b.setAttribute("aria-pressed", String(on)); });
    const selR = s.sel >= 0 ? Math.floor(s.sel / N) : -1, selC = s.sel >= 0 ? s.sel % N : -1;
    const cel = [];
    for (let i = 0; i < N * N; i++) {
      const r = Math.floor(i / N), c = i % N, v = s.g[i];
      const mesmaArea = s.sel >= 0 && (r === selR || c === selC || (Math.floor(r / s.br) === Math.floor(selR / s.br) && Math.floor(c / s.bc) === Math.floor(selC / s.bc)));
      const cls = ["sdk-cel", s.fixo[i] ? "fixa" : "", i === s.sel ? "sel" : "", mesmaArea ? "area" : "", ruins.has(i) ? "conflito" : "",
        c % s.bc === s.bc - 1 && c < N - 1 ? "bd" : "", r % s.br === s.br - 1 && r < N - 1 ? "bb" : "", r === N - 1 ? "ul" : "", c === N - 1 ? "uc" : ""].join(" ");
      const rot = `Linha ${r + 1}, coluna ${c + 1}: ${v ? sdkAnimal(v).nome : "vazia"}${s.fixo[i] ? " (fixa)" : ""}${ruins.has(i) ? ", repetido" : ""}`;
      cel.push(`<button class="${cls}" data-cel="${i}" aria-label="${rot}" ${completo ? "disabled" : ""}>${v ? sdkPeca(v) : ""}</button>`);
    }
    const tab = $("#sdk-tab");
    tab.style.setProperty("--n", N); tab.innerHTML = cel.join("");
    $("#sdk-paleta").innerHTML = SDK_ANIMAIS.slice(0, N).map((a, k) =>
      `<button class="sdk-op" data-val="${k + 1}" ${completo ? "disabled" : ""} aria-label="Colocar ${a.nome}">${sdkPeca(k + 1)}<span>${a.nome}</span></button>`).join("");
    $("#sdk-info").textContent = `${SDK_NIVEIS[s.nivel].nome} · ${s.jogadas} jogadas${s.dicas ? ` · ${s.dicas} ${s.dicas === 1 ? "dica" : "dicas"}` : ""}`;
    $("#sdk-dica-txt").textContent = s.sel >= 0 && !s.fixo[s.sel] ? "Toque num animal abaixo para colocar na casa escolhida." : "Toque numa casa vazia e depois escolha o animal.";
    const fim = $("#sdk-fim");
    fim.hidden = !completo;
    if (completo) {
      const res = s.res || calcPontos("sudoku", s.nivel, s.fim - s.inicio, { dicas: s.dicas, erros: s.erros });
      const txt = `Fiz ${res.total} pontos no Sudoku de Animais (${SDK_NIVEIS[s.nivel].nome}) do app Amigos da Vila Franca! Consegue mais?`;
      fim.innerHTML = `<p class="nome-bolha sdk-parabens">Parabéns!</p><p>Nível <strong>${SDK_NIVEIS[s.nivel].nome}</strong> em <strong>${sdkTempo(s.fim - s.inicio)}</strong>, com ${s.jogadas} jogadas.</p>${htmlPontos(res)}
        <a class="btn btn-laranja btn-big" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">${ic("chat")}Desafiar no WhatsApp</a>
        <button class="btn btn-outline btn-big" id="sdk-de-novo" type="button">Jogar outro</button>`;
      $("#sdk-de-novo").addEventListener("click", () => renderSudoku(true));
      fim.insertAdjacentHTML("beforeend", `<a class="btn btn-big" href="#ranking/sudoku">${ic("medal")}Ver ranking</a>`);
    }
    $$("[data-cel]", tab).forEach(b => b.addEventListener("click", () => { s.sel = +b.dataset.cel; Som.efeito("clique"); renderSudoku(); }));
    $$("[data-val]").forEach(b => b.addEventListener("click", () => sdkColocar(+b.dataset.val)));
    clearInterval(sdkTimer);
    if (!completo) sdkTimer = setInterval(() => { if (location.hash !== "#sudoku") return clearInterval(sdkTimer); $("#sdk-tempo").textContent = sdkTempo(Date.now() - s.inicio); }, 1000);
    $("#sdk-tempo").textContent = sdkTempo((s.fim || Date.now()) - s.inicio);
  }
  // coloca (ou tira, se tocar no mesmo) o animal v na casa selecionada
  function sdkColocar(v) {
    const s = sdk; if (!s || s.sel < 0 || s.fixo[s.sel] || s.fim) { toast("Escolha primeiro uma casa vazia."); return; }
    s.g[s.sel] = s.g[s.sel] === v ? 0 : v; s.jogadas++;
    const ruim = sdkConflitos(s).has(s.sel);
    if (ruim) s.erros++;
    Som.efeito(ruim ? "erro" : "clique");
    renderSudoku();
  }
  $$("[data-sdk-nivel]").forEach(b => b.addEventListener("click", () => { sdkNivel = b.dataset.sdkNivel; store.set("sdkNivel", sdkNivel); renderSudoku(true); }));
  $("#sdk-apagar").addEventListener("click", () => { const s = sdk; if (s && s.sel >= 0 && !s.fixo[s.sel] && !s.fim) { s.g[s.sel] = 0; renderSudoku(); } });
  $("#sdk-novo").addEventListener("click", () => { if (sdk && sdk.jogadas && !sdk.fim && !confirm("Começar outro jogo? O atual será perdido.")) return; renderSudoku(true); });
  $("#sdk-ajuda").addEventListener("click", () => {
    const s = sdk; if (!s || s.fim) return;
    let i = s.sel >= 0 && !s.fixo[s.sel] && s.g[s.sel] !== s.sol[s.sel] ? s.sel : -1;
    if (i < 0) { const vazias = s.g.map((v, k) => (!s.fixo[k] && v !== s.sol[k]) ? k : -1).filter(k => k >= 0); i = vazias[Math.floor(Math.random() * vazias.length)]; }
    if (i === undefined || i < 0) return;
    s.g[i] = s.sol[i]; s.sel = i; s.dicas++; s.jogadas++; Som.efeito("acerto"); renderSudoku();
  });


  // =============================================================
  //  BICHOS DA VILA (no estilo Meowdoku)
  //  Um bichinho em cada linha, cada coluna e cada região colorida;
  //  eles não podem se encostar, nem na diagonal. 3 vidas.
  //  O jogador escolhe a peça: gato, cachorro, papagaio, coelho ou calopsita.
  // =============================================================
  const GTN = (function () {
    // embaralha uma lista (método de Fisher-Yates)
    function emb(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
    // procura soluções linha por linha (uma peça por linha, sem repetir coluna nem região
    // e sem encostar na peça da linha de cima); para ao encontrar "lim" soluções
    function solucoes(N, reg, lim){ let cnt=0; const sols=[]; const col=Array(N).fill(false), rg=Array(N).fill(false), pos=[];
      (function rec(r){ if(cnt>=lim) return; if(r===N){cnt++; sols.push(pos.slice()); return;}
        for(let c=0;c<N;c++){ if(col[c]||rg[reg[r*N+c]]) continue; if(r>0&&Math.abs(pos[r-1]-c)<=1) continue;
          col[c]=rg[reg[r*N+c]]=true; pos[r]=c; rec(r+1); col[c]=rg[reg[r*N+c]]=false; } })(0);
      return {cnt, sols}; }
    // confere se a região k continua "inteira" (todas as casas ligadas entre si)
    function conexa(N, reg, k){ const cel=[]; for(let i=0;i<N*N;i++) if(reg[i]===k) cel.push(i); if(!cel.length) return false;
      const vis=new Set([cel[0]]), q=[cel[0]]; while(q.length){ const i=q.pop(), r=Math.floor(i/N), c=i%N;
        for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){ const rr=r+dr, cc=c+dc, j=rr*N+cc; if(rr>=0&&rr<N&&cc>=0&&cc<N&&reg[j]===k&&!vis.has(j)){vis.add(j);q.push(j);} } }
      return vis.size===cel.length; }
    // gera uma fase com solução única:
    // 1) sorteia onde ficam as peças; 2) faz as regiões crescerem a partir de cada peça;
    // 3) se houver mais de uma solução, ajusta as regiões até sobrar só uma
    function gerar(N){
      for(let t=1;t<400;t++){
        let p; for(;;){ p=emb([...Array(N).keys()]); if(p.every((c,r)=>r===0||Math.abs(p[r-1]-c)>1)) break; }
        const reg=Array(N*N).fill(-1); p.forEach((c,r)=>{ reg[r*N+c]=r; });
        let livres=N*N-N;
        while(livres>0){ const k=Math.floor(Math.random()*N); const cand=[];
          for(let i=0;i<N*N;i++) if(reg[i]===k){ const r=Math.floor(i/N),c=i%N; [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{const rr=r+dr,cc=c+dc; if(rr>=0&&rr<N&&cc>=0&&cc<N&&reg[rr*N+cc]<0) cand.push(rr*N+cc);}); }
          if(!cand.length) continue; reg[cand[Math.floor(Math.random()*cand.length)]]=k; livres--; }
        const gato=new Set(p.map((c,r)=>r*N+c));
        for(let passo=0;passo<300;passo++){
          const s=solucoes(N,reg,2);
          if(s.cnt===1) return {N, reg, sol:p, tentativas:t};
          const alt=s.sols.find(x=>x.some((c,r)=>c!==p[r]));
          const difs=emb(alt.map((c,r)=>r*N+c).filter(i=>!gato.has(i)));
          let mudou=false;
          for(const i of difs){ const r=Math.floor(i/N), c=i%N, velho=reg[i];
            const viz=emb([[1,0],[-1,0],[0,1],[0,-1]].map(([dr,dc])=>[r+dr,c+dc]).filter(([rr,cc])=>rr>=0&&rr<N&&cc>=0&&cc<N).map(([rr,cc])=>reg[rr*N+cc]).filter(k=>k!==velho));
            for(const k of viz){ reg[i]=k; if(conexa(N,reg,velho)){ mudou=true; break; } reg[i]=velho; }
            if(mudou) break; }
          if(!mudou) break;
        }
      }
      return null;
    }
    return { gerar };
  })();
  const GTN_NIVEIS = { facil: { nome: "Fácil", n: 5 }, medio: { nome: "Médio", n: 6 }, dificil: { nome: "Difícil", n: 7 } };
  const GTN_CORES = ["#ffd6a5", "#caffbf", "#9bf6ff", "#bdb2ff", "#ffc6ff", "#fdffb6", "#a0c4ff", "#ffadad"];
  const GTN_BORDAS = ["#e08a2b", "#3fa34d", "#1d9bb0", "#6b5bd6", "#c04fc0", "#b5a600", "#2f6fd6", "#d9534f"];
  const GTN_PECAS = {
    gato:      { nome: "Gato",      plural: "gatos",      icone: "cat",       cor: "#4a5468" },
    cachorro:  { nome: "Cachorro",  plural: "cachorros",  icone: "dog",       cor: "#b8651b" },
    papagaio:  { nome: "Papagaio",  plural: "papagaios",  icone: "papagaio",  cor: "#1f9d4a" },
    coelho:    { nome: "Coelho",    plural: "coelhos",    icone: "rabbit",    cor: "#d63a73" },
    calopsita: { nome: "Calopsita", plural: "calopsitas", icone: "calopsita", cor: "#d39a00" }
  };
  let gtnPeca = store.get("gtnPeca", "gato");
  const pecaSvg = (cls = "") => { const P = GTN_PECAS[gtnPeca]; return `<svg class="${cls}" viewBox="0 0 64 64" style="color:${P.cor}" aria-hidden="true"><use href="#i-${P.icone}"/></svg>`; };
  let gtn = null, gtnNivel = store.get("gtnNivel", "facil"), gtnModo = "gato", gtnAuto = store.get("gtnAuto", true), gtnTimer = null;

  function gtnNovo() {
    const L = GTN_NIVEIS[gtnNivel], fase = GTN.gerar(L.n);
    gtn = { nivel: gtnNivel, N: L.n, reg: fase.reg, sol: fase.sol, est: Array(L.n * L.n).fill(0), vidas: 3, erroEm: -1, inicio: Date.now(), fim: 0, perdeu: false };
  }
  // estado de cada casa (est): 0 = vazia, 1 = marcada com X, 2 = com o bichinho
  // depois de um acerto, marca com X as casas onde não pode mais ter bichinho
  function gtnMarcarProibidas(i) {
    const { N, reg, est } = gtn, r = Math.floor(i / N), c = i % N;
    for (let j = 0; j < N * N; j++) {
      if (est[j]) continue; const r2 = Math.floor(j / N), c2 = j % N;
      if (r2 === r || c2 === c || reg[j] === reg[i] || (Math.abs(r2 - r) <= 1 && Math.abs(c2 - c) <= 1)) est[j] = 1;
    }
  }
  // toque numa casa: marca X ou tenta colocar o bichinho (errar custa uma vida)
  function gtnTocar(i) {
    const s = gtn; if (!s || s.fim || s.perdeu || s.est[i] === 2) return;
    if (gtnModo === "x") { s.est[i] = s.est[i] === 1 ? 0 : 1; Som.efeito("clique"); return renderGatinhos(); }
    const r = Math.floor(i / s.N), c = i % s.N;
    if (s.sol[r] === c) {
      s.est[i] = 2; Som.efeito("acerto");
      if (gtnAuto) gtnMarcarProibidas(i);
      if (s.est.filter(v => v === 2).length === s.N) {
        s.fim = Date.now();
        const vit = store.get("gtnVitorias", {}); vit[s.nivel] = (vit[s.nivel] || 0) + 1; store.set("gtnVitorias", vit);
        s.res = calcPontos("bichos", s.nivel, s.fim - s.inicio, { vidas: s.vidas });
        salvarPlacar("bichos", s.nivel, s.fim - s.inicio, { vidas: s.vidas, pontos: s.res.total });
        setTimeout(() => Som.efeito("medalha"), 250); checarMedalhas();
      }
    } else {
      s.vidas--; s.erroEm = i; s.est[i] = 1; Som.efeito("erro");
      if (s.vidas <= 0) s.perdeu = true;
      setTimeout(() => { if (gtn === s) { s.erroEm = -1; renderGatinhos(); } }, 700);
    }
    renderGatinhos();
  }
  // desenha o tabuleiro, a escolha da peça, as vidas e a tela de fim de jogo
  function renderGatinhos(novo) {
    if (novo || !gtn || gtn.nivel !== gtnNivel) gtnNovo();
    const s = gtn, N = s.N;
    $$("[data-gtn-nivel]").forEach(b => { const on = b.dataset.gtnNivel === gtnNivel; b.classList.toggle("ativo", on); b.setAttribute("aria-pressed", String(on)); });
    $$("[data-gtn-modo]").forEach(b => { const on = b.dataset.gtnModo === gtnModo; b.classList.toggle("ativo", on); b.setAttribute("aria-pressed", String(on)); });
    $("#gtn-auto").checked = gtnAuto;
    $("#gtn-vidas").innerHTML = [0, 1, 2].map(k => `<svg class="ic ${k < s.vidas ? "vida-on" : "vida-off"}" aria-hidden="true"><use href="#i-heart"/></svg>`).join("") + `<span class="sr-only">${s.vidas} vidas</span>`;
    const colocados = s.est.filter(v => v === 2).length;
    $("#gtn-info").textContent = `${GTN_NIVEIS[s.nivel].nome} · ${colocados}/${N} ${GTN_PECAS[gtnPeca].plural}`;
    $("#gtn-pecas").innerHTML = Object.keys(GTN_PECAS).map(k => { const P = GTN_PECAS[k];
      return `<button type="button" class="gtn-peca-op ${k === gtnPeca ? "ativo" : ""}" data-peca="${k}" aria-pressed="${k === gtnPeca}" style="--pc:${P.cor}"><svg viewBox="0 0 64 64" aria-hidden="true" style="color:${P.cor}"><use href="#i-${P.icone}"/></svg><span>${P.nome}</span></button>`; }).join("");
    $$("[data-peca]").forEach(b => b.addEventListener("click", () => { gtnPeca = b.dataset.peca; store.set("gtnPeca", gtnPeca); Som.efeito("clique"); renderGatinhos(); }));
    $("#gtn-modo-gato").innerHTML = `${pecaSvg()}Colocar`; $("#gtn-modo-gato").setAttribute("aria-label", `Colocar ${GTN_PECAS[gtnPeca].nome.toLowerCase()}`);
    const acabou = !!s.fim || s.perdeu;
    const cel = [];
    for (let i = 0; i < N * N; i++) {
      const r = Math.floor(i / N), c = i % N, k = s.reg[i];
      const mostrarSol = s.perdeu && s.sol[r] === c && s.est[i] !== 2;
      const b = (rr, cc) => (rr < 0 || rr >= N || cc < 0 || cc >= N) ? false : s.reg[rr * N + cc] !== k;
      const cls = ["gtn-cel", b(r - 1, c) ? "bt" : "", b(r + 1, c) ? "bb" : "", b(r, c - 1) ? "bl" : "", b(r, c + 1) ? "br" : "", s.erroEm === i ? "erro" : "", mostrarSol ? "sol" : ""].join(" ");
      const conteudo = s.est[i] === 2 || mostrarSol ? pecaSvg("gtn-gato") : s.est[i] === 1 ? `<span class="gtn-x" aria-hidden="true">✕</span>` : "";
      const nome = s.est[i] === 2 ? GTN_PECAS[gtnPeca].nome.toLowerCase() : s.est[i] === 1 ? "marcada com X" : "vazia";
      cel.push(`<button class="${cls}" style="--rc:${GTN_CORES[k]};--rb:${GTN_BORDAS[k]}" data-gtn="${i}" aria-label="Linha ${r + 1}, coluna ${c + 1}, região ${k + 1}: ${nome}" ${acabou ? "disabled" : ""}>${conteudo}</button>`);
    }
    const tab = $("#gtn-tab"); tab.style.setProperty("--n", N); tab.innerHTML = cel.join("");
    $$("[data-gtn]", tab).forEach(b => b.addEventListener("click", () => gtnTocar(+b.dataset.gtn)));
    const fim = $("#gtn-fim"); fim.hidden = !acabou;
    if (s.fim) {
      const res = s.res || calcPontos("bichos", s.nivel, s.fim - s.inicio, { vidas: s.vidas });
      const txt = `Fiz ${res.total} pontos no Bichos da Vila (${GTN_NIVEIS[s.nivel].nome}) do app Amigos da Vila Franca! Consegue mais?`;
      fim.innerHTML = `<p class="nome-bolha sdk-parabens">Conseguiu!</p><p>Nível <strong>${GTN_NIVEIS[s.nivel].nome}</strong> em <strong>${sdkTempo(s.fim - s.inicio)}</strong>, com ${s.vidas} ${s.vidas === 1 ? "vida" : "vidas"} sobrando.</p>${htmlPontos(res)}
        <a class="btn btn-laranja btn-big" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">${ic("chat")}Desafiar no WhatsApp</a>
        <button class="btn btn-outline btn-big" type="button" data-gtn-outro>Jogar outro</button>`;
    } else if (s.perdeu) {
      fim.innerHTML = `<p class="gtn-perdeu">Acabaram as vidas!</p><p>Os bichinhos em cinza mostram onde eles ficavam. Que tal tentar de novo?</p>
        <button class="btn btn-laranja btn-big" type="button" data-gtn-outro>Tentar outro</button>`;
    }
    $$("[data-gtn-outro]").forEach(b => b.addEventListener("click", () => renderGatinhos(true)));
    if (s.fim) fim.insertAdjacentHTML("beforeend", `<a class="btn btn-big" href="#ranking/bichos">${ic("medal")}Ver ranking</a>`);
    clearInterval(gtnTimer);
    $("#gtn-tempo").textContent = sdkTempo((s.fim || Date.now()) - s.inicio);
    if (!acabou) gtnTimer = setInterval(() => { if (location.hash !== "#gatinhos") return clearInterval(gtnTimer); $("#gtn-tempo").textContent = sdkTempo(Date.now() - s.inicio); }, 1000);
  }
  $$("[data-gtn-nivel]").forEach(b => b.addEventListener("click", () => { gtnNivel = b.dataset.gtnNivel; store.set("gtnNivel", gtnNivel); renderGatinhos(true); }));
  $$("[data-gtn-modo]").forEach(b => b.addEventListener("click", () => { gtnModo = b.dataset.gtnModo; renderGatinhos(); }));
  $("#gtn-auto").addEventListener("change", e => { gtnAuto = e.target.checked; store.set("gtnAuto", gtnAuto); });
  $("#gtn-limpar").addEventListener("click", () => { if (!gtn || gtn.fim || gtn.perdeu) return; gtn.est = gtn.est.map(v => v === 1 ? 0 : v); renderGatinhos(); });
  $("#gtn-novo").addEventListener("click", () => { if (gtn && !gtn.fim && !gtn.perdeu && gtn.est.some(v => v) && !confirm("Começar outro jogo? O atual será perdido.")) return; renderGatinhos(true); });


  // =============================================================
  //  RANKING DOS JOGOS (entre todos os usuários)
  //  Ordenado por PONTOS. Mostra o melhor resultado de cada pessoa;
  //  a aba "Geral" soma o melhor de cada jogo. Nome exibido como "Maria S."
  // =============================================================
  let placar = [], rkJogo = "geral", rkNivel = "facil";
  async function salvarPlacar(jogo, nivel, ms, extra = {}) {
    try { await DB.add("placar", Object.assign({ jogo, nivel, ms, nome: usuario.nome, quando: agora() }, extra)); } catch (e) {}
  }
  const RK_JOGOS = { quiz: "Quiz", sudoku: "Sudoku de Animais", bichos: "Bichos da Vila" };
  const RK_NIVEIS = { sudoku: SDK_NIVEIS, bichos: GTN_NIVEIS };
  const NIVEL_NOME = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };
  const ptsPlacar = x => x.pontos != null ? x.pontos : calcPontos(x.jogo, x.nivel, x.ms, x).total;
  function melhoresPorPessoa(jogo) {
    const m = new Map();
    const itens = jogo === "quiz" ? quizResultados.map(q => ({ nome: q.nome, criadoPorUid: q.criadoPorUid, pts: pontosQuiz(q), det: `${q.acertos}/${q.total || 10} acertos`, quando: q.quando }))
      : placar.filter(x => x.jogo === jogo).map(x => ({ nome: x.nome, criadoPorUid: x.criadoPorUid, pts: ptsPlacar(x), det: `${NIVEL_NOME[x.nivel] || x.nivel} · ${sdkTempo(x.ms)}`, quando: x.quando }));
    itens.forEach(x => { const k = chavePessoa(x), a = m.get(k); if (!a || x.pts > a.pts || (x.pts === a.pts && x.quando < a.quando)) m.set(k, x); });
    return m;
  }
  async function renderRanking() {
    try { [placar, quizResultados] = await Promise.all([DB.list("placar"), DB.list("quiz")]); } catch (e) {}
    $$("[data-rk-jogo]").forEach(b => { const on = b.dataset.rkJogo === rkJogo; b.classList.toggle("ativo", on); b.setAttribute("aria-pressed", String(on)); });
    let lista;
    if (rkJogo === "geral") {
      const tot = new Map();
      ["quiz", "sudoku", "bichos"].forEach(j => melhoresPorPessoa(j).forEach((x, k) => {
        const a = tot.get(k) || { nome: x.nome, criadoPorUid: x.criadoPorUid, pts: 0, jogos: [], quando: x.quando };
        a.pts += x.pts; a.jogos.push(RK_JOGOS[j]); if (x.quando < a.quando) a.quando = x.quando; tot.set(k, a);
      }));
      lista = [...tot.values()].map(a => Object.assign(a, { det: a.jogos.join(" + ") }));
    } else lista = [...melhoresPorPessoa(rkJogo).values()];
    lista = lista.sort((a, b) => b.pts - a.pts || a.quando.localeCompare(b.quando)).slice(0, 20);
    $("#rk-titulo").textContent = rkJogo === "geral" ? "Geral (soma do melhor de cada jogo)" : RK_JOGOS[rkJogo];
    $("#rk-lista").innerHTML = lista.length ? lista.map((x, i) => {
      const meu = ehMeu(x, "nome");
      return `<li class="rk-item ${meu ? "eu" : ""} ${i < 3 ? "top" + (i + 1) : ""}"><span class="rk-pos">${i + 1}</span>
        <span class="rk-nome">${esc(nomeCurto(x.nome))}${meu ? " <small>(você)</small>" : ""}<em>${esc(x.det)}</em></span>
        <span class="rk-valor">${x.pts}<small> pts</small></span></li>`;
    }).join("") : `<li class="vazio">Ninguém jogou ainda. Seja o primeiro!</li>`;
    $("#rk-jogar").hidden = rkJogo === "geral";
    $("#rk-jogar").href = { quiz: "#quiz", sudoku: "#sudoku", bichos: "#gatinhos" }[rkJogo] || "#jogos";
  }
  $$("[data-rk-jogo]").forEach(b => b.addEventListener("click", () => { rkJogo = b.dataset.rkJogo; rkNivel = "facil"; renderRanking(); }));

  // ---------- Medalhas de protetor ----------
  const MEDALHAS = [
    { id: "bemvindo",  nome: "Bem-vindo à Vila",    cor: "#1f6fe0", icone: "home",     como: "Entrar no app pela primeira vez." },
    { id: "olhovivo",  nome: "Olho vivo",           cor: "#ff8a1d", icone: "camera",   como: "Cadastrar o seu primeiro animal." },
    { id: "guardiao",  nome: "Guardião da rua",     cor: "#d93a2b", icone: "shield",   como: "Cadastrar 5 animais." },
    { id: "gatos",     nome: "Amigo dos gatos",     cor: "#e0457b", icone: "heart",    como: "Cadastrar um gato." },
    { id: "aves",      nome: "Amigo das aves",      cor: "#23934c", icone: "feather",  como: "Cadastrar uma ave." },
    { id: "reencontro",nome: "Herói do reencontro", cor: "#7653d6", icone: "search",   como: "Ajudar um animal perdido a voltar pra casa." },
    { id: "sabetudo",  nome: "Sabe-tudo",           cor: "#0f8aa8", icone: "quiz",     como: "Acertar 8 ou mais no Quiz Tutor Responsável." },
    { id: "artista",   nome: "Artista da Vila",     cor: "#e0a800", icone: "brush",    como: "Montar e salvar ou sortear um vira-lata." },
    { id: "voz",       nome: "Voz do bairro",       cor: "#1c8a4a", icone: "chat",     como: "Compartilhar algo do app no WhatsApp." },
    { id: "embaixador",nome: "Embaixador da Vila",  cor: "#ff8a1d", icone: "megaphone", como: "Convidar 5 amigos que entraram no app." },
    { id: "sudoku",    nome: "Mestre do Sudoku",    cor: "#0f9d8a", icone: "grid",     como: "Completar um Sudoku de Animais no nível Médio ou Difícil." },
    { id: "gatinhos",  nome: "Mestre dos Bichos",   cor: "#c04fc0", icone: "cat",      como: "Vencer o Bichos da Vila no nível Médio ou Difícil." }
  ];
  function medalhasGanhas() {
    if (!usuario) return new Set();
    const meus = animais.filter(a => ehMeu(a) && !a.exemplo);
    const melhorQuiz = Math.max(0, ...quizResultados.filter(q => ehMeu(q, "nome")).map(q => q.acertos));
    const g = new Set(["bemvindo"]);
    if (meus.length >= 1) g.add("olhovivo");
    if (meus.length >= 5) g.add("guardiao");
    if (meus.some(a => espId(a) === "gato")) g.add("gatos");
    if (meus.some(a => espId(a) === "ave")) g.add("aves");
    if (perdidos.some(p => mesmoNome(p.encontradoPor, usuario.nome) || (ehMeu(p) && p.situacao === "encontrado" && !p.exemplo))) g.add("reencontro");
    if (melhorQuiz >= 8) g.add("sabetudo");
    if (store.get("artista", false)) g.add("artista");
    if (store.get("compartilhou", false)) g.add("voz");
    if (amigosIndicados().length >= 5) g.add("embaixador");
    { const v = store.get("sdkVitorias", {}); if ((v.medio || 0) + (v.dificil || 0) > 0) g.add("sudoku"); }
    { const v = store.get("gtnVitorias", {}); if ((v.medio || 0) + (v.dificil || 0) > 0) g.add("gatinhos"); }
    return g;
  }
  function checarMedalhas() {
    if (!usuario) return;
    const g = medalhasGanhas(), chave = "medalhas_" + (usuario.uid || usuario.nome.trim().toLowerCase());
    const vistas = new Set(store.get(chave, []));
    const novas = MEDALHAS.filter(m => g.has(m.id) && !vistas.has(m.id));
    store.set(chave, [...g]);
    if (novas.length && vistas.size) setTimeout(() => { toast(`Nova medalha: ${novas.map(m => m.nome).join(", ")}!`); Som.efeito("medalha"); }, 900);
    const n = g.size;
    if ($("#med-resumo")) { $("#med-resumo").textContent = `${n} de ${MEDALHAS.length} medalhas`; $("#med-barra").style.width = `${(n / MEDALHAS.length) * 100}%`; }
    if ($("#hero-medalhas")) $("#hero-medalhas").textContent = `${n}/${MEDALHAS.length}`;
  }
  function renderMedalhas() {
    const g = medalhasGanhas();
    $("#med-intro").textContent = g.size === MEDALHAS.length ? "Você conquistou todas! Você é um verdadeiro protetor da Vila Franca." : `Você tem ${g.size} de ${MEDALHAS.length} medalhas. Veja como ganhar as outras:`;
    $("#lista-medalhas").innerHTML = MEDALHAS.map(m => {
      const ok = g.has(m.id);
      return `<li class="medalha ${ok ? "ganha" : "falta"}" style="--mc:${m.cor}">
        <span class="med-disco">${ic(m.icone)}</span>
        <strong>${m.nome}</strong><small>${ok ? "Conquistada!" : m.como}</small></li>`;
    }).join("");
  }
  function renderJogos() {
    checarMedalhas();
    const meus = quizResultados.filter(q => ehMeu(q, "nome"));
    $("#quiz-recorde").textContent = meus.length ? `Seu recorde: ${Math.max(...meus.map(q => q.acertos))} de ${QTD_QUIZ}` : "Você ainda não jogou";
  }
  // conta compartilhamentos no WhatsApp (para a medalha "Voz do bairro")
  document.addEventListener("click", ev => {
    const a = ev.target.closest && ev.target.closest('a[href*="wa.me"]');
    if (a && !store.get("compartilhou", false)) { store.set("compartilhou", true); checarMedalhas(); }
  });


  // =============================================================
  //  SOM DOS JOGOS: os sons são gerados pelo próprio navegador (Web Audio),
  //  sem arquivos de música. Melodia original composta para o app
  //  e efeitos. Começa DESLIGADO e só toca nas telas de jogos.
  // =============================================================
  const TELAS_SOM = ["jogos", "quiz", "viralata", "medalhas", "sudoku", "gatinhos", "ranking"];
  const Som = {
    on: store.get("som", false), ctx: null, timer: null, passo: 0, proxima: 0, telaJogo: false,
    garantir() {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    },
    hz: m => 440 * Math.pow(2, (m - 69) / 12),
    nota(m, t, dur, tipo = "triangle", vol = .06) {
      const c = this.ctx; if (!c || !m) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = tipo; o.frequency.setValueAtTime(this.hz(m), t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02);
    },
    // Melodia alegre em Dó maior (16 tempos, colcheias) + baixo — composição original
    MEL: [72,76,79,76, 81,79,76,74, 72,74,76,79, 77,76,74,0, 74,77,81,77, 79,77,76,72, 74,76,77,79, 76,74,72,0],
    BAIXO: [48,48,45,45,41,41,43,43],
    tocarMusica() {
      if (!this.on || this.timer || !this.garantir()) return;
      const passoDur = .24; // duração de cada nota: cerca de 125 batidas por minuto
      this.passo = 0; this.proxima = this.ctx.currentTime + .1;
      this.timer = setInterval(() => {
        while (this.proxima < this.ctx.currentTime + .35) {
          const i = this.passo % this.MEL.length;
          this.nota(this.MEL[i], this.proxima, passoDur * .9, "triangle", .045);
          if (i % 4 === 0) this.nota(this.BAIXO[i / 4], this.proxima, passoDur * 3.6, "sine", .05);
          if (i % 2 === 1) this.nota(96, this.proxima, .03, "square", .006); // chimbal suave
          this.proxima += passoDur; this.passo++;
        }
      }, 90);
    },
    pararMusica() { clearInterval(this.timer); this.timer = null; },
    efeito(nome) {
      if (!this.on || !this.garantir()) return;
      const t = this.ctx.currentTime + .01, n = (m, d, dur, tipo, vol) => this.nota(m, t + d, dur, tipo, vol);
      if (nome === "acerto") { n(76, 0, .12, "square", .05); n(84, .1, .25, "square", .05); }
      if (nome === "erro") { n(55, 0, .18, "sawtooth", .04); n(50, .16, .3, "sawtooth", .04); }
      if (nome === "medalha") [72, 76, 79, 84, 79, 84].forEach((m, k) => n(m, k * .11, k === 5 ? .5 : .14, "square", .045));
      if (nome === "clique") n(88, 0, .05, "triangle", .04);
      if (nome === "latido") {
        [0, .2].forEach(d => {
          const c = this.ctx, o = c.createOscillator(), g = c.createGain();
          o.type = "sawtooth"; o.frequency.setValueAtTime(520, t + d); o.frequency.exponentialRampToValueAtTime(180, t + d + .12);
          g.gain.setValueAtTime(.0001, t + d); g.gain.exponentialRampToValueAtTime(.08, t + d + .02); g.gain.exponentialRampToValueAtTime(.0001, t + d + .15);
          o.connect(g).connect(c.destination); o.start(t + d); o.stop(t + d + .17);
        });
      }
    },
    atualizarBotao() {
      const b = $("#btn-som"); if (!b) return;
      b.hidden = !this.telaJogo;
      b.setAttribute("aria-pressed", String(this.on));
      b.setAttribute("aria-label", this.on ? "Desligar som dos jogos" : "Ligar som dos jogos");
      b.innerHTML = `<svg class="ic"><use href="#i-${this.on ? "som" : "mudo"}"/></svg>`;
    },
    entrarTela(nome) {
      this.telaJogo = TELAS_SOM.includes(nome);
      this.atualizarBotao();
      if (this.telaJogo && this.on) this.tocarMusica(); else this.pararMusica();
    }
  };
  $("#btn-som").addEventListener("click", () => {
    Som.on = !Som.on; store.set("som", Som.on);
    if (Som.on) { Som.garantir(); Som.tocarMusica(); Som.efeito("clique"); toast("Som ligado"); } else { Som.pararMusica(); toast("Som desligado"); }
    Som.atualizarBotao();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) Som.pararMusica(); else if (Som.telaJogo && Som.on) Som.tocarMusica(); });

  // ---------- denunciar publicação ----------
  // Qualquer morador pode avisar o administrador de uma publicação com problema.
  // A denúncia vai para a coleção "denuncias", que só o administrador lê.
  let denunciaAlvo = null; // { col, id, titulo }
  const tituloDe = (col, reg) => col === "animais" ? `${esp(reg).nome}: ${nomeDe(reg)}` : `Anúncio de ${esp(reg).nome.toLowerCase()}${reg.nome ? " " + reg.nome : ""} (${reg.ultimoLocal || "sem local"})`;
  document.addEventListener("click", ev => {
    const b = ev.target.closest && ev.target.closest("[data-denunciar]"); if (!b) return;
    const [col, id] = b.dataset.denunciar.split("|");
    const reg = (col === "animais" ? animais : perdidos).find(x => x.id === id); if (!reg) return;
    if (store.get("denunciados", []).includes(col + "/" + id)) { toast("Você já denunciou esta publicação. O administrador vai verificar."); return; }
    denunciaAlvo = { col, id, titulo: tituloDe(col, reg) };
    const f = $("#form-denuncia"); f.reset(); $("#den-erro").textContent = "";
    $("#den-alvo").textContent = denunciaAlvo.titulo;
    $("#dlg-denuncia").showModal();
  });
  $("#den-cancelar").addEventListener("click", () => $("#dlg-denuncia").close());
  $("#form-denuncia").addEventListener("submit", async ev => {
    ev.preventDefault();
    const m = $("input[name=motivo]:checked", ev.target);
    if (!m) { $("#den-erro").textContent = "Escolha o motivo."; return; }
    const a = denunciaAlvo; if (!a) return;
    try {
      await DB.add("denuncias", { colecao: a.col, alvoId: a.id, alvoTitulo: a.titulo, motivo: m.value,
        detalhe: $("#den-detalhe").value.trim(), nome: usuario.nome, quando: agora() });
    } catch (e) { $("#den-erro").textContent = "Não foi possível enviar. Verifique a internet."; return; }
    store.set("denunciados", [...store.get("denunciados", []), a.col + "/" + a.id]);
    $("#dlg-denuncia").close(); toast("Denúncia enviada. Obrigado por cuidar do app!");
  });

  // Lista de denúncias no painel do administrador (agrupadas por publicação).
  async function renderDenuncias() {
    const el = $("#lista-denuncias"); let den = [];
    try { den = await DB.list("denuncias"); } catch (e) {}
    const grupos = new Map();
    den.forEach(d => { const k = d.colecao + "/" + d.alvoId; (grupos.get(k) || grupos.set(k, []).get(k)).push(d); });
    dadosAdmin.denuncias = den;
    el.innerHTML = grupos.size ? [...grupos.entries()].map(([k, ds]) => {
      const [col, id] = k.split("/"), existe = (col === "animais" ? animais : perdidos).some(x => x.id === id);
      const link = col === "animais" ? `#ficha/${id}` : "#perdidos";
      return `<li class="box denuncia">
        <strong>${esc(ds[0].alvoTitulo || k)}</strong> <small class="den-n">${ds.length} ${ds.length === 1 ? "denúncia" : "denúncias"}</small>
        <ul>${ds.map(d => `<li>${esc(d.motivo)}${d.detalhe ? ": " + esc(d.detalhe) : ""} <small>(${esc(d.nome || "—")}, ${dataBR(d.quando)})</small></li>`).join("")}</ul>
        ${existe ? "" : `<p class="hint">Esta publicação já foi apagada.</p>`}
        <div class="acoes">
          ${existe ? `<a class="btn btn-sm" href="${link}">Ver publicação</a>
          <button class="btn btn-sm btn-danger" data-den-apagar="${k}">Apagar publicação</button>` : ""}
          <button class="btn btn-sm btn-outline" data-den-ignorar="${k}">${existe ? "Ignorar denúncia" : "Remover da lista"}</button>
        </div></li>`;
    }).join("") : `<li class="vazio">Nenhuma denúncia. Tudo certo!</li>`;
    const limpar = async k => { for (const d of grupos.get(k) || []) await DB.remove("denuncias", d.id); };
    $$("[data-den-ignorar]", el).forEach(b => b.addEventListener("click", async () => {
      try { await limpar(b.dataset.denIgnorar); } catch (e) { toast("Não foi possível. Verifique a internet."); return; }
      renderDenuncias(); toast("Denúncia removida.");
    }));
    $$("[data-den-apagar]", el).forEach(b => b.addEventListener("click", async () => {
      const k = b.dataset.denApagar, [col, id] = k.split("/");
      if (!confirm("Tem certeza que quer apagar esta publicação? Isso não pode ser desfeito.")) return;
      try { await DB.remove(col, id); await limpar(k); } catch (e) { toast("Não foi possível apagar. Verifique a internet."); return; }
      await recarregar(); renderAdmin(); toast("Publicação apagada.");
    }));
    return den.length;
  }

  // ---------- contatos de ONGs e protetores ----------
  // Só o administrador adiciona, edita e apaga: é o telefone de outra pessoa ou entidade,
  // e precisa da autorização dela (política de privacidade).
  let contatoEditando = null;
  function renderContatos() {
    const el = $("#lista-contatos"), adm = adminAberto;
    $("#contato-admin").hidden = !adm;
    $("#contato-so-admin").hidden = adm;
    el.innerHTML = contatos.length ? contatos.map(c => {
      const tel = (c.telefone || "").replace(/\D/g, "");
      const wa = tel ? `https://wa.me/55${tel}?text=${encodeURIComponent("Olá! Vi seu contato no app Amigos da Vila Franca (Vila Franca, Piraquara).")}` : "";
      return `<li class="card contato">
        <div class="card-txt"><span class="card-nome">${esc(c.nome)}${c.exemplo ? '<small class="tag-ex">exemplo</small>' : ""}</span><small>${esc(c.tipo)}${c.ajuda ? " · " + esc(c.ajuda) : ""}</small></div>
        ${wa ? `<a class="btn btn-whats" href="${wa}" target="_blank" rel="noopener" aria-label="Chamar ${esc(c.nome)} no WhatsApp">${ic("chat")}WhatsApp</a>` : ""}
        ${adm ? `<div class="contato-adm"><button class="btn btn-sm" data-editar-contato="${c.id}">${ic("edit")}Editar</button>
          <button class="btn btn-sm btn-danger" data-apagar-contato="${c.id}">${ic("alert")}Apagar</button></div>` : ""}
      </li>`;
    }).join("") : `<li class="vazio">Ainda não há contatos cadastrados.</li>`;
    $$("[data-editar-contato]", el).forEach(b => b.addEventListener("click", () => {
      const c = contatos.find(x => x.id === b.dataset.editarContato); if (!c) return;
      const f = $("#form-contato"); contatoEditando = c.id;
      f.nome.value = c.nome || ""; f.tipo.value = c.tipo || "ONG"; f.telefone.value = c.telefone || ""; f.ajuda.value = c.ajuda || "";
      $("#contato-summary").textContent = "Editar contato"; $("#contato-salvar").textContent = "Salvar alterações";
      $("#contato-cancelar").hidden = false;
      const d = $("#contato-admin"); d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    $$("[data-apagar-contato]", el).forEach(b => b.addEventListener("click", async () => {
      const c = contatos.find(x => x.id === b.dataset.apagarContato);
      if (!c || !confirm(`Tem certeza que quer apagar o contato "${c.nome}"?`)) return;
      try { await DB.remove("contatos", c.id); } catch (e) { toast("Não foi possível apagar. Verifique a internet."); return; }
      if (contatoEditando === c.id) fecharFormContato();
      await recarregar(); renderContatos(); toast("Contato apagado.");
    }));
  }
  function fecharFormContato() {
    contatoEditando = null; $("#form-contato").reset(); $("#contato-admin").open = false;
    $("#contato-summary").textContent = "Adicionar contato"; $("#contato-salvar").textContent = "Salvar contato";
    $("#contato-cancelar").hidden = true;
  }
  $("#contato-cancelar").addEventListener("click", fecharFormContato);
  $("#form-contato").addEventListener("submit", async ev => {
    ev.preventDefault();
    const f = ev.target;
    if (!adminAberto) { toast("Só o administrador pode cadastrar contatos."); return; }
    if (!f.nome.value.trim()) { f.nome.focus(); return; }
    const dados = { nome: f.nome.value.trim(), tipo: f.tipo.value, telefone: f.telefone.value.trim(), ajuda: f.ajuda.value.trim() };
    const editando = contatoEditando;
    try {
      if (editando) await DB.update("contatos", editando, Object.assign(dados, { atualizadoEm: agora() }));
      else await DB.add("contatos", Object.assign(dados, { criadoPor: usuario.nome, criadoEm: agora() }));
    } catch (e) { toast("Não foi possível salvar. Verifique a internet."); return; }
    fecharFormContato();
    await recarregar(); renderContatos(); toast(editando ? "Contato atualizado!" : "Contato salvo!");
  });

  // ---------- avaliação ----------
  $("#form-feedback").addEventListener("submit", async ev => {
    ev.preventDefault();
    const f = ev.target, val = n => { const r = $(`input[name=${n}]:checked`, f); return r ? r.value : ""; };
    if (!val("nota")) { $("#fb-erro").textContent = "Escolha uma nota de 1 a 5."; return; }
    $("#fb-erro").textContent = "";
    await DB.add("feedback", { nome: usuario.nome, perfil: usuario.perfil, nota: Number(val("nota")), facil: val("facil"), usaria: val("usaria"), comentario: f.comentario.value.trim(), quando: agora() });
    f.reset(); toast("Avaliação enviada. Obrigado!"); location.hash = "inicio";
  });

  // ---------- painel do administrador ----------
  // O painel não aparece no menu: abre tocando 5 vezes no logo do alto da tela, ou pelo endereço #admin.
  // Modo comunidade (Firebase): abre para quem entrou com uma conta Google de ADMIN_EMAILS (config.js).
  //   Quem protege os dados de verdade são as regras do servidor (firestore.rules).
  // Modo demonstração: PIN de config.js, porque os dados ficam só no próprio aparelho.
  let adminEmail = null; // e-mail da conta Google conectada (ou null)
  const ehEmailAdmin = e => !!e && (window.ADMIN_EMAILS || []).map(x => String(x).trim().toLowerCase()).includes(e);

  (function toqueSecretoNoLogo() {
    const logo = $(".topbar-logo"); if (!logo) return;
    let toques = 0, timer = null;
    logo.addEventListener("click", () => {
      toques++; clearTimeout(timer);
      timer = setTimeout(() => { toques = 0; }, 2500); // os 5 toques precisam ser seguidos
      if (toques >= 5) { toques = 0; location.hash = "admin"; }
    });
  })();

  function renderTelaAdmin() {
    const nuvem = DB.modo === "firebase";
    $("#form-pin").hidden = nuvem || adminAberto;
    $("#admin-google").hidden = !nuvem || adminAberto;
    $("#painel").hidden = !adminAberto;
    if (nuvem && !adminAberto) $("#admin-google-txt").textContent = `A conta ${adminEmail || ""} não tem permissão de administrador.`;
    if (adminAberto) {
      $("#admin-quem").textContent = nuvem ? `Conectado como ${adminEmail}` : "Painel aberto com PIN (modo demonstração)";
      renderAdmin();
    }
  }
  $("#btn-google-trocar").addEventListener("click", () => DB.sairGoogle());
  // Fecha o painel neste aparelho. No modo comunidade, a pessoa continua no app;
  // o painel volta a abrir na próxima vez que ela entrar com a conta de administrador.
  $("#btn-sair-painel").addEventListener("click", () => {
    adminAberto = false; location.hash = "inicio"; rotear(); toast("Você saiu do painel.");
  });

  $("#form-pin").addEventListener("submit", ev => {
    ev.preventDefault();
    if (DB.modo !== "local") return; // com Firebase o PIN não vale: só o login Google
    if ($("#pin").value === String(window.ADMIN_PIN)) { adminAberto = true; $("#pin").value = ""; $("#pin-erro").textContent = ""; rotear(); }
    else $("#pin-erro").textContent = "PIN incorreto.";
  });

  function tabela(el, cols, rows) {
    el.innerHTML = `<thead><tr><th>#</th>${cols.map(c => `<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${
      rows.length ? rows.map((r, i) => `<tr><td>${i + 1}</td>${cols.map(c => `<td>${esc(c[1](r))}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${cols.length + 1}">Sem registros ainda.</td></tr>`}</tbody>`;
  }

  const COLS = {
    usuarios: [["Nome", r => r.nome], ["Perfil", r => r.perfil], ["E-mail", r => r.email || "—"], ["WhatsApp", r => r.whatsapp || "—"], ["Cadastro", r => r.criadoEm ? dataBR(r.criadoEm) : "—"]],
    acessos: [["Nome", r => r.nome], ["Data", r => dataBR(r.quando)], ["Horário", r => horaBR(r.quando)], ["Perfil", r => r.perfil], ["Indicado por", r => r.indicadoPor || "—"], ["Aparelho", r => r.dispositivo]],
    placar: [["Jogo", r => RK_JOGOS[r.jogo] || r.jogo], ["Nível", r => r.nivel], ["Nome", r => r.nome], ["Pontos", r => ptsPlacar(r)], ["Tempo", r => sdkTempo(r.ms)], ["Data", r => dataBR(r.quando) + " " + horaBR(r.quando)]],
    quiz: [["Nome", r => r.nome], ["Pontos", r => pontosQuiz(r)], ["Acertos", r => `${r.acertos} de ${r.total}`], ["Nível", r => nivelQuiz(r.acertos).nome], ["Data", r => dataBR(r.quando) + " " + horaBR(r.quando)]],
    perdidos: [["Tipo", r => r.tipo === "achado" ? "Achado na rua" : "Perdido pelo dono"], ["Espécie", r => esp(r).nome], ["Nome", r => r.nome || "—"], ["Local", r => r.ultimoLocal], ["Data", r => r.dataSumiu ? new Date(r.dataSumiu + "T12:00").toLocaleDateString("pt-BR") : ""], ["Situação", r => r.situacao === "encontrado" ? "Voltou pra casa" : "Em aberto"], ["Publicado por", r => r.criadoPor]],
    feedback: [["Nome", r => r.nome], ["Nota", r => "★".repeat(r.nota)], ["Fácil?", r => r.facil], ["Usaria?", r => r.usaria], ["Comentário", r => r.comentario], ["Data", r => dataBR(r.quando) + " " + horaBR(r.quando)]],
    animais: [["Espécie", r => esp(r).nome], ["Nome", r => nomeDe(r)], ["Sexo", r => r.sexo], ["Porte", r => r.porte], ["Saúde", r => r.saude], ["Castrado", r => r.castrado], ["Situação", r => (STATUS[r.status] || STATUS.rua).txt], ["Referência", r => r.referencia], ["Cadastrado por", r => r.criadoPor], ["Data", r => r.criadoEm ? dataBR(r.criadoEm) : ""]]
  };
  let dadosAdmin = { denuncias: [], usuarios: [], acessos: [], feedback: [], animais: [], perdidos: [], quiz: [] };

  async function renderAdmin() {
    const [acessos, feedback] = await Promise.all([DB.list("acessos"), DB.list("feedback")]);
    acessos.sort((a, b) => b.quando.localeCompare(a.quando));
    feedback.sort((a, b) => b.quando.localeCompare(a.quando));
    const quizOrd = [...quizResultados].sort((a, b) => b.quando.localeCompare(a.quando));
    let usuarios = [];
    if (DB.modo === "firebase") { try { usuarios = await DB.list("usuarios"); } catch (e) {} }
    usuarios.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
    dadosAdmin = { usuarios, acessos, feedback, animais, perdidos, quiz: quizOrd };
    $("#admin-usuarios-hint").textContent = DB.modo === "firebase"
      ? `${usuarios.length} ${usuarios.length === 1 ? "pessoa cadastrada" : "pessoas cadastradas"} com conta Google.`
      : "No modo demonstração não há cadastro com conta Google.";
    tabela($("#tb-usuarios"), COLS.usuarios, usuarios);
    const pessoas = DB.modo === "firebase" ? usuarios.length : new Set(acessos.map(a => a.nome.trim().toLowerCase())).size;
    const media = feedback.length ? (feedback.reduce((s, f) => s + f.nota, 0) / feedback.length).toFixed(1) : "–";
    $("#admin-stats").innerHTML = `
      <div><b>${pessoas}</b><span>pessoas</span></div>
      <div><b>${acessos.length}</b><span>acessos</span></div>
      <div><b>${new Set(acessos.filter(a => a.indicadoPor).map(a => a.nome.trim().toLowerCase())).size}</b><span>vieram por convite</span></div>
      <div><b>${animais.length}</b><span>animais</span></div>
      <div><b>${feedback.length}</b><span>avaliações</span></div>
      <div><b id="admin-n-den">…</b><span>denúncias</span></div>
      <div class="n-adotado"><b>${media}</b><span>nota média</span></div>`;
    renderDenuncias().then(n => { const b = $("#admin-n-den"); if (b) b.textContent = n; });
    $("#admin-especies").textContent = Object.keys(ESPECIES).map(e => `${ESPECIES[e].plural}: ${animais.filter(a => espId(a) === e).length}`).join("   |   ");
    tabela($("#tb-acessos"), COLS.acessos, acessos);
    tabela($("#tb-feedback"), COLS.feedback, feedback);
    tabela($("#tb-caes"), COLS.animais, animais);
    tabela($("#tb-perdidos"), COLS.perdidos, perdidos);
    tabela($("#tb-quiz"), COLS.quiz, quizOrd);
    try { placar = await DB.list("placar"); } catch (e) {}
    const plOrd = [...placar].sort((a, b) => b.quando.localeCompare(a.quando));
    dadosAdmin.placar = plOrd; tabela($("#tb-placar"), COLS.placar, plOrd);
    const pessoasQuiz = new Set(quizOrd.map(q => q.nome.trim().toLowerCase())).size;
    const mediaQuiz = quizOrd.length ? (quizOrd.reduce((s, q) => s + q.acertos, 0) / quizOrd.length).toFixed(1) : "–";
    $("#quiz-resumo-admin").textContent = `${quizOrd.length} ${quizOrd.length === 1 ? "partida" : "partidas"} · ${pessoasQuiz} ${pessoasQuiz === 1 ? "pessoa" : "pessoas"} · média de ${mediaQuiz} acertos em 10`;
  }

  $$("[data-export]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.export, cols = COLS[k], rows = dadosAdmin[k];
    const q = v => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const csv = "﻿" + [cols.map(c => q(c[0])).join(";"), ...rows.map(r => cols.map(c => q(c[1](r))).join(";"))].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `amigos-da-vila-franca-${k}.csv`; link.click();
  }));

  // ---------- dados de demonstração (marcados como exemplo) ----------
  const DEMO = [
    ["cao", "Caramelo", "Macho", "Médio", "caramelo, orelha caída", "Saudável", "Não", "rua", "Av. Jacob Valenga, em frente ao mercado", 0.0012, 0.0010],
    ["cao", "Pretinha", "Fêmea", "Pequeno", "preta com patas brancas", "Prenha / com filhotes", "Não", "resgate", "Rua Maria Valenga, terreno baldio", -0.0015, 0.0018],
    ["cao", "Totó", "Macho", "Grande", "marrom rajado", "Machucado", "Não sei", "resgate", "Rua Joaquim Artigas, ponto de ônibus", 0.0020, -0.0016],
    ["cao", "Mel", "Fêmea", "Médio", "amarelo claro, muito dócil", "Saudável", "Sim", "adocao", "Rua Alcy Dombroski, perto da escola", -0.0008, -0.0022],
    ["cao", "Bidu", "Macho", "Pequeno", "branco com mancha preta no olho", "Saudável", "Sim", "adotado", "Rua Bronislau Schved", 0.0005, 0.0030],
    ["gato", "Mingau", "Macho", "Pequeno", "branco de olhos azuis", "Saudável", "Não", "adocao", "Rua Elpídio Scheved, muro da padaria", 0.0028, 0.0022],
    ["gato", "Frajola", "Fêmea", "Pequeno", "preto e branco", "Prenha / com filhotes", "Não", "resgate", "Rua José da Luz Cavalcanti, praça", -0.0025, -0.0005],
    ["gato", "Tigrão", "Macho", "Médio", "laranja rajado", "Saudável", "Sim", "rua", "Rua Antônio Vaz de Siqueira", 0.0015, -0.0030],
    ["ave", "Pombo da praça", "Não sei", "Pequeno", "cinza, asa machucada", "Machucado", "", "resgate", "Rua José da Luz Cavalcanti, praça", -0.0020, 0.0006],
    ["ave", "Calopsita fujona", "Não sei", "Pequeno", "amarela com bochecha laranja", "Saudável", "", "rua", "Rua Sandro Pereira da Silva", 0.0002, -0.0012]
  ];
  $("#btn-demo").addEventListener("click", async () => {
    if (animais.some(a => a.exemplo)) { toast("Os exemplos já estão carregados."); return; }
    for (const d of DEMO) {
      await DB.add(COL, {
        especie: d[0], nome: d[1], sexo: d[2], porte: d[3], cor: d[4], saude: d[5], castrado: d[0] === "ave" ? "Não se aplica" : d[6], status: d[7],
        referencia: d[8], lat: +(MAP_CENTER[0] + d[9]).toFixed(6), lng: +(MAP_CENTER[1] + d[10]).toFixed(6),
        obs: "", foto: "", exemplo: true, criadoEm: agora(), criadoPor: "Exemplo"
      });
    }
    const hoje = new Date(), d = n => new Date(hoje - n * 864e5).toISOString().slice(0, 10);
    await DB.add("perdidos", { especie: "cao", nome: "Thor", cor: "vira-lata preto, coleira vermelha, atende pelo nome", dataSumiu: d(2), ultimoLocal: "Av. Jacob Valenga, perto do posto", telefone: "", obs: "Tem medo de fogos.", foto: "", lat: null, lng: null, situacao: "aberto", exemplo: true, criadoEm: agora(), criadoPor: "Exemplo" });
    await DB.add("perdidos", { especie: "gato", nome: "Nina", cor: "siamesa, olhos azuis", dataSumiu: d(5), ultimoLocal: "Rua Maria Valenga", telefone: "", obs: "", foto: "", lat: null, lng: null, situacao: "aberto", exemplo: true, criadoEm: agora(), criadoPor: "Exemplo" });
    await DB.add("perdidos", { tipo: "achado", especie: "cao", nome: "", cor: "filhote branco com manchas marrons, coleira azul sem plaquinha", dataSumiu: d(1), ultimoLocal: "Rua Bronislau Schved, em frente à escola", telefone: "", obs: "Está comigo em casa, bem cuidado.", foto: "", lat: null, lng: null, situacao: "aberto", exemplo: true, criadoEm: agora(), criadoPor: "Exemplo" });
    await DB.add("perdidos", { especie: "ave", nome: "Piu", cor: "calopsita cinza com crista amarela", dataSumiu: d(12), ultimoLocal: "Rua Alcy Dombroski", telefone: "", obs: "", foto: "", lat: null, lng: null, situacao: "encontrado", exemplo: true, criadoEm: agora(), criadoPor: "Exemplo" });
    const em = n => { const x = new Date(Date.now() + n * 864e5); return x.toISOString().slice(0, 10); };
    await DB.add("mural", { tipo: "alerta", titulo: "Atenção: suspeita de envenenamento na Rua Maria Valenga", texto: "Moradores relataram dois cães passando mal perto do terreno baldio. Não deixe seu animal solto na região e avise a Polícia Ambiental se vir iscas.", dataEvento: "", local: "Rua Maria Valenga", foto: "", exemplo: true, criadoEm: new Date(Date.now() - 2000).toISOString(), criadoPor: "Exemplo" });
    await DB.add("mural", { tipo: "adocao", titulo: "Feira de adoção no sábado", texto: "Cães e gatos castrados e vacinados esperando uma família. Leve documento com foto.", dataEvento: em(7) + "T09:00", local: "Praça da Rua José da Luz Cavalcanti", foto: "", exemplo: true, criadoEm: new Date(Date.now() - 1000).toISOString(), criadoPor: "Exemplo" });
    await DB.add("mural", { tipo: "campanha", titulo: "Mutirão de castração (exemplo)", texto: "Exemplo de aviso de campanha. Troque pelas datas reais divulgadas pela prefeitura ou ONG.", dataEvento: em(14), local: "A confirmar", foto: "", exemplo: true, criadoEm: agora(), criadoPor: "Exemplo" });
    await DB.add("contatos", { nome: "ONG de exemplo (troque pelo contato real)", tipo: "ONG", telefone: "", ajuda: "castração e adoção", exemplo: true });
    await recarregar(); renderAdmin(); toast("Exemplos carregados.");
  });
  $("#btn-limpa-demo").addEventListener("click", async () => {
    for (const a of animais.filter(x => x.exemplo)) await DB.remove(COL, a.id);
    for (const c of contatos.filter(x => x.exemplo)) await DB.remove("contatos", c.id);
    for (const p of perdidos.filter(x => x.exemplo)) await DB.remove("perdidos", p.id);
    for (const m of mural.filter(x => x.exemplo)) await DB.remove("mural", m.id);
    await recarregar(); renderAdmin(); toast("Exemplos apagados.");
  });

  // ---------- início do app ----------
  async function iniciar() {
    aplicarPrefs();
    const inicio = Date.now();
    await DB.init();
    if (DB.modo === "firebase") {
      // Modo comunidade: espera o Firebase dizer se já tem alguém conectado neste aparelho.
      await new Promise(pronto => {
        let primeira = true;
        DB.aoMudarLogin(async conta => {
          try { await aoMudarConta(conta); } finally { if (primeira) { primeira = false; pronto(); } }
        });
      });
    } else if (usuario) { await registrarAcesso(); await abrirApp(); }
    else $("#login").hidden = false;
    // tela de carregamento: fica pelo menos 1,2 s e some suavemente
    const car = $("#carregando");
    if (car) setTimeout(() => { car.classList.add("saindo"); setTimeout(() => car.remove(), 450); }, Math.max(0, 1200 - (Date.now() - inicio)));
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }
  iniciar();
})();
