// =============================================================
//  CONFIGURAÇÃO DO APP "AMIGOS DA VILA FRANCA"
// =============================================================
//  1) Sem Firebase (modo demonstração): deixe FIREBASE_CONFIG = null.
//     Os dados ficam salvos apenas no próprio celular/navegador.
//
//  2) Com Firebase (modo comunidade, dados compartilhados):
//     cole aqui o objeto de configuração do seu projeto Firebase
//     (Console do Firebase > Configurações do projeto > Seus apps > Web).
//     Veja o passo a passo no README.md.
// =============================================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDf7X9GFnPDrutniwepjtRM4cZsqch5hTc",
  authDomain: "amigos-da-vila-franca.firebaseapp.com",
  projectId: "amigos-da-vila-franca",
  storageBucket: "amigos-da-vila-franca.firebasestorage.app",
  messagingSenderId: "709418759300",
  appId: "1:709418759300:web:7e395c41ad4da41e77fed1"
};
/* Exemplo:
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "amigos-da-vila-franca.firebaseapp.com",
  projectId: "amigos-da-vila-franca",
  storageBucket: "amigos-da-vila-franca.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxx"
};
*/

// QUEM PODE ABRIR O PAINEL DO ADMINISTRADOR
// O painel não aparece no menu. Para abrir, toque 5 vezes seguidas no logo
// (no alto da tela) ou acesse o endereço do app terminando em #admin.
//
// a) Modo comunidade (com Firebase): todos os moradores entram com a conta
//    Google, e o painel só abre para as contas desta lista. Escreva o(s) e-mail(s) em letras minúsculas
//    e coloque os MESMOS e-mails no arquivo firestore.rules (é ele que protege
//    os dados de verdade, lá no servidor).
window.ADMIN_EMAILS = [
"wellanjo900@gmail.com"
  // "seu-email@gmail.com"
];
// b) Modo demonstração (sem Firebase): o painel abre com este PIN.
//    Os dados ficam só no próprio aparelho. Troque por um número difícil.
window.ADMIN_PIN = "2026";

// Endereço público do app, usado nos convites "Indique para amigos".
// Depois de publicar no GitHub Pages, coloque aqui o link, por exemplo:
// window.APP_URL = "https://SEU-USUARIO.github.io/amigos-da-vila-franca/";
// Se ficar vazio, a versão web usa o próprio endereço aberto no navegador.
window.APP_URL = "https://wellanjo.github.io/amigos-da-vila-franca/";

// Centro inicial do mapa (bairro Vila Franca, Piraquara/PR - aproximado).
// Ajuste se quiser: abra o Google Maps, clique no bairro e copie latitude/longitude.
window.MAP_CENTER = [-25.4420, -49.0630];
window.MAP_ZOOM = 15;
