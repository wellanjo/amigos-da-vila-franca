// =============================================================
//  Camada de dados
//  - Modo "comunidade": Firebase Firestore, banco de dados na nuvem (dados compartilhados
//    entre todos os celulares). Ativado quando FIREBASE_CONFIG existe.
//  - Modo "demonstração": armazenamento do próprio navegador (dados só neste aparelho).
//  Coleções: usuarios, animais, perdidos, contatos, mural, denuncias, acessos, convites, feedback, quiz e placar
// =============================================================
(function () {
  const FB_VER = "10.12.2";
  const PREFIX = "patas_";

  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------- armazenamento local (localStorage do navegador) ----------
  const memoria = {}; // reserva caso o navegador bloqueie o localStorage
  const Local = {
    modo: "local",
    _get(col) {
      try { return JSON.parse(localStorage.getItem(PREFIX + col) || "[]"); }
      catch (e) { return memoria[col] || []; }
    },
    _set(col, arr) {
      memoria[col] = arr;
      try { localStorage.setItem(PREFIX + col, JSON.stringify(arr)); }
      catch (e) { /* cota cheia ou bloqueado: mantém em memória */ }
    },
    async list(col) { return this._get(col); },
    async add(col, obj) {
      const arr = this._get(col);
      const doc = Object.assign({ id: uid() }, obj);
      arr.push(doc); this._set(col, arr); return doc;
    },
    async update(col, id, patch) {
      const arr = this._get(col).map(d => d.id === id ? Object.assign({}, d, patch) : d);
      this._set(col, arr);
    },
    async remove(col, id) {
      this._set(col, this._get(col).filter(d => d.id !== id));
    },
    // lê um documento pelo id (ou null)
    async get(col, id) { return this._get(col).find(d => d.id === id) || null; },
    // grava um documento com id escolhido (cria ou substitui)
    async set(col, id, obj) {
      const arr = this._get(col).filter(d => d.id !== id);
      arr.push(Object.assign({}, obj, { id })); this._set(col, arr);
    }
  };

  // ---------- Firebase Firestore (banco de dados na nuvem) ----------
  const Cloud = {
    modo: "firebase",
    fs: null,
    async init(cfg) {
      await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-auth-compat.js`);
      firebase.initializeApp(cfg);
      this.fs = firebase.firestore();
      try { await this.fs.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* guardar cópia para usar sem internet é opcional */ }
    },
    async list(col) {
      const snap = await this.fs.collection(col).get();
      return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    },
    async add(col, obj) {
      const ref = await this.fs.collection(col).add(obj);
      return Object.assign({ id: ref.id }, obj);
    },
    async update(col, id, patch) { await this.fs.collection(col).doc(id).update(patch); },
    async remove(col, id) { await this.fs.collection(col).doc(id).delete(); },
    async get(col, id) {
      const d = await this.fs.collection(col).doc(id).get();
      return d.exists ? Object.assign({ id: d.id }, d.data()) : null;
    },
    async set(col, id, obj) { await this.fs.collection(col).doc(id).set(obj, { merge: true }); }
  };

  // No app Android instalado, o Google não deixa entrar por uma janela do site.
  // Por isso o login usa o plugin nativo (@capacitor-firebase/authentication), que
  // devolve um "token" do Google; com ele o Firebase do app faz o login normalmente.
  function pluginNativo() {
    const C = window.Capacitor;
    if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
    return (C.Plugins && C.Plugins.FirebaseAuthentication) || (C.registerPlugin ? C.registerPlugin("FirebaseAuthentication") : null);
  }

  window.DB = {
    impl: Local,
    get modo() { return this.impl.modo; },
    async init() {
      if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId) {
        try { await Cloud.init(window.FIREBASE_CONFIG); this.impl = Cloud; }
        catch (e) { console.warn("Firebase indisponível, usando modo local.", e); this.impl = Local; }
      }
    },
    // conta Google conectada (só no modo comunidade): { uid, email, nome } ou null
    conta: null,
    list(c) { return this.impl.list(c); },
    // Todo registro novo leva o "dono" (criadoPorUid). As regras do servidor usam isso
    // para deixar só o dono (ou o administrador) editar ou apagar.
    add(c, o) {
      if (this.conta && o.criadoPorUid == null) o = Object.assign({}, o, { criadoPorUid: this.conta.uid });
      return this.impl.add(c, o);
    },
    update(c, i, p) { return this.impl.update(c, i, p); },
    remove(c, i) { return this.impl.remove(c, i); },
    get(c, i) { return this.impl.get(c, i); },
    set(c, i, o) { return this.impl.set(c, i, o); },

    // ---------- login com conta Google (só no modo comunidade) ----------
    // Abre a escolha de conta do Google: no navegador, numa janelinha;
    // no app Android, pela tela nativa do Google.
    async entrarGoogle() {
      const nativo = pluginNativo();
      if (nativo) {
        const r = await nativo.signInWithGoogle();
        const token = r && r.credential && r.credential.idToken;
        if (!token) throw Object.assign(new Error("sem token"), { code: "auth/sem-token" });
        return firebase.auth().signInWithCredential(firebase.auth.GoogleAuthProvider.credential(token));
      }
      const prov = new firebase.auth.GoogleAuthProvider();
      prov.setCustomParameters({ prompt: "select_account" });
      return firebase.auth().signInWithPopup(prov);
    },
    async sairGoogle() {
      if (this.modo !== "firebase") return;
      const nativo = pluginNativo();
      if (nativo) { try { await nativo.signOut(); } catch (e) { /* já estava fora */ } }
      await firebase.auth().signOut();
    },
    // Avisa sempre que alguém entra ou sai da conta Google.
    aoMudarLogin(cb) {
      if (this.modo !== "firebase") return;
      firebase.auth().onAuthStateChanged(u => {
        this.conta = u ? { uid: u.uid, email: (u.email || "").toLowerCase(), nome: u.displayName || "" } : null;
        cb(this.conta);
      });
    }
  };
})();
