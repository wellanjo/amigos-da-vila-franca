# 🐾 Amigos da Vila Franca

Aplicativo comunitário para **mapear e acompanhar cães, gatos e aves de rua do bairro Vila Franca, em Piraquara/PR**, e ajudar a encontrar animais perdidos. Ele aproxima moradores, protetores independentes e ONGs, e ajuda a organizar castrações, resgates e adoções responsáveis.

Projeto da **Atividade Extensionista II – Tecnologia Aplicada à Inclusão Digital (Projeto)**, curso CST em Análise e Desenvolvimento de Sistemas, Centro Universitário Internacional UNINTER.
**ODS 15 – Vida Terrestre.**

Autor: Wellington de Jesus Moraes (RU 5270500)

---

## Funcionalidades

| Tela | O que faz |
|---|---|
| Entrada e cadastro | **Entrar com Google** (sem senha nova). No primeiro acesso a pessoa completa o cadastro: nome, perfil (morador, protetor, ONG...), WhatsApp opcional e aceite da política de privacidade. Na tela **Meu cadastro** ela edita os dados, sai da conta ou exclui o cadastro. Cada animal, anúncio e resultado de jogo fica ligado à conta de quem cadastrou: só o dono (ou o administrador) edita e dá baixa. Cada acesso fica registrado com **nome, data, horário e aparelho**. No modo demonstração (sem Firebase) a entrada continua só com o nome. |
| Início | Atalhos por espécie, aviso de animais perdidos e resumo: total de animais, castrados, em resgate, para adoção e adotados. |
| Cadastrar animal | **Cão, gato ou ave**: foto (câmera do celular), nome/apelido, sexo, porte, cor, estado de saúde, castração (cães e gatos), situação e **localização por GPS** ou toque no mapa. |
| Mapa | Todos os animais no mapa do bairro, com cor por situação e filtro por espécie. |
| Animais perdidos | Três abas: **Donos procurando** (o tutor publica foto, onde o animal foi visto e o WhatsApp; quem vir toca em *Vi este animal*), **Achados na rua** (o morador que encontrou um animal procura o dono; quem reconhecer toca em *É meu! / Conheço o dono*) e **Reencontrados**. Quem publicou pode **editar**, marcar *Voltou pra casa* ou **apagar** o anúncio. |
| Editar, apagar e denunciar | O dono de cada publicação (animal ou anúncio) edita e apaga a sua, sempre com a pergunta "Tem certeza?". Os outros moradores veem o botão **Denunciar** (motivo + explicação opcional); a denúncia vai para o painel do administrador, que decide se apaga a publicação ou ignora a denúncia. O administrador também pode editar e apagar qualquer publicação. |
| Lista | Abas por espécie (cães, gatos, aves), busca e filtros (resgate, adoção, não castrados, adotados). |
| Ficha | Dados do animal, **compartilhar no WhatsApp**, marcar como castrado, adotado ou resgate. |
| Mural do bairro | Campanhas de castração e vacinação, feiras de adoção, alertas e avisos, com data, local, foto e botão de compartilhar no WhatsApp. **Só o administrador publica** (login Google); o post mais recente aparece na tela inicial. |
| Jogos e medalhas | **Quiz Tutor Responsável** (banco com 106 perguntas educativas sobre alimentação, saúde, castração, leis, aves, gatos, cães e resgate; 10 sorteadas por partida, com explicação e nível final), **Monte seu vira-lata** (personaliza e salva a imagem), **Sudoku de Animais** (4×4 e 6×6, fases geradas com solução única), **Bichos da Vila** (lógica no estilo Meowdoku: um bichinho por linha, coluna e região, sem se encostar; peça à escolha entre gato, cachorro, papagaio, coelho e calopsita; 5×5 a 7×7, 3 vidas), **Ranking dos jogos por pontos** entre todos os usuários: Quiz (100 por acerto + bônus de sequência), Sudoku e Bichos (base do nível 500/1.000/1.500 + bônus de tempo − dicas/erros, + vidas restantes) e ranking Geral que soma o melhor de cada jogo; nome exibido como “Maria S.”. Todos os jogos têm “Como jogar” e **Medalhas de protetor** (12 conquistas por cadastrar, ajudar reencontros, acertar o quiz e compartilhar). Resultados do quiz aparecem no painel. |
| Indique para 5 amigos | Cada pessoa tem um link de convite com o código da sua conta (`?convite=...`); cada amigo conta uma vez só. Quando o amigo entra por ele, o acesso registra "indicado por", a tela inicial mostra o progresso (0 a 5) e, com 5 amigos, a pessoa ganha a medalha **Embaixador da Vila**. Configure `window.APP_URL` no `config.js` com o link público do app. |
| Som dos jogos | Melodia original e efeitos (acerto, erro, medalha, latido) gerados pelo próprio app (Web Audio, sem arquivos de música). Só toca nas telas de jogos e **começa desligado**; botão de som no topo. |
| Ajuda e telefones | Telefones úteis (SAMU 192, Bombeiros/SIATE 193, PM 190, Prefeitura de Piraquara, UBS Tia Tiana, CMEI Felipe Zellner da Silva, Defesa Civil) e contatos de ONGs/protetores com WhatsApp. **Só o administrador** cadastra, edita e apaga esses contatos (é o telefone de outra pessoa ou entidade, que precisa autorizar). |
| Cuidados e adoção | Conscientização sobre castração, gatos de rua, aves domésticas e maus-tratos. |
| Avaliar o app | Formulário de feedback (nota, facilidade, comentário). |
| Painel do administrador | Escondido do menu (abre com 5 toques no logo ou pelo endereço `#admin`) e protegido por login com a conta Google do administrador (no modo demonstração, por PIN): lista de **denúncias** (ver, apagar a publicação ou ignorar), tabelas de **acessos**, **avaliações**, **animais** e **perdidos**, com exportação em CSV (abre no Excel). |

**Acessibilidade (Desenho Universal):** botões grandes, textos simples, aumento de letra, alto contraste, navegação por teclado, rótulos para leitores de tela e funcionamento offline (PWA).

## Tecnologias

- HTML5, CSS3 e JavaScript puro (sem framework), PWA instalável no Android
- [Leaflet](https://leafletjs.com/) + OpenStreetMap para os mapas
- Firebase Cloud Firestore como banco de dados (opcional; sem ele o app funciona em modo demonstração com `localStorage`)
- Hospedagem gratuita no GitHub Pages

## Estrutura

```
index.html        telas do app
style.css         visual e acessibilidade
app.js            lógica (telas, mapa, cadastro, perdidos, jogos, painel)
quiz-perguntas.js banco com as 106 perguntas do quiz
db.js             camada de dados (Firestore ou localStorage)
config.js         configurações (Firebase, e-mail do administrador, PIN do modo demonstração, centro do mapa)
sw.js             service worker (offline)
manifest.json     dados do app instalável
firestore.rules   regras de segurança do banco
vendor/leaflet/   biblioteca de mapas
icons/            ícones
```

---

## Como colocar no ar (passo a passo)

### 1. Publicar no GitHub Pages
1. Crie uma conta em <https://github.com> (se ainda não tiver).
2. Clique em **New repository** e dê o nome `amigos-da-vila-franca`. Marque **Public**.
3. Clique em **uploading an existing file** e arraste **todos os arquivos e pastas** deste projeto. Depois clique em **Commit changes**.
4. Vá em **Settings → Pages**. Em *Branch*, escolha `main` e a pasta `/ (root)`, e clique em **Save**.
5. Em 1 ou 2 minutos o app estará em `https://SEU-USUARIO.github.io/amigos-da-vila-franca/`.

### 2. Ligar o banco de dados (Firebase) – para os dados serem compartilhados
1. Acesse <https://console.firebase.google.com> com sua conta Google e clique em **Criar projeto** (`amigos-da-vila-franca`). Pode desativar o Google Analytics.
2. No menu, vá em **Criação → Firestore Database → Criar banco de dados**. Escolha a região `southamerica-east1 (São Paulo)` e o **modo de produção**.
3. Na aba **Regras**, apague tudo e cole o conteúdo do arquivo `firestore.rules`. **Troque `seu-email@gmail.com` pelo seu Gmail** (em minúsculas) e clique em **Publicar**.
4. Vá em **Configurações do projeto (engrenagem) → Seus apps → ícone `</>` (Web)**. Registre o app e copie o objeto `firebaseConfig`.
5. No GitHub, abra o arquivo `config.js`, clique no lápis ✏️, troque `window.FIREBASE_CONFIG = null;` pelo objeto copiado e salve (**Commit changes**).
6. Ainda no `config.js`, coloque o mesmo Gmail em `window.ADMIN_EMAILS`, por exemplo `window.ADMIN_EMAILS = ["seu-email@gmail.com"];`.
7. Ligue o login Google (todos os moradores entram por ele): no Firebase, vá em **Criação → Authentication → Começar → Método de login → Google → Ativar**, escolha o e-mail de suporte e salve.
8. Ainda em **Authentication → Configurações → Domínios autorizados**, clique em **Adicionar domínio** e coloque `SEU-USUARIO.github.io`.
9. Teste: abra o app, toque em **Entrar com Google**, complete o cadastro e depois toque 5 vezes no logo para abrir o painel. Uma conta que não esteja na lista não consegue abrir o painel.

No app Android, o login usa a tela nativa do Google e precisa do arquivo `google-services.json`: veja o `LEIA-ME-ANDROID-STUDIO.md` do projeto Android.

Pronto: tudo o que for cadastrado em um celular aparece para todos.

### 3. Instalar no celular
Abra o link no Chrome do Android, toque nos **⋮** e depois em **Adicionar à tela inicial** (ou **Instalar app**).

---

## Limitações conhecidas
- Qualquer morador logado pode marcar na ficha de qualquer animal "foi castrado", "foi adotado" ou "precisa de resgate" (ajuda da comunidade); editar, apagar e dar baixa só o dono ou o administrador.
- No modo demonstração (sem Firebase) não há servidor: o PIN só esconde o painel, e os dados ficam no próprio aparelho.
- Não há backup automático: exporte as tabelas do painel periodicamente.

## Privacidade
O login é feito pelo Google: o app recebe só o nome e o e-mail da conta, nunca a senha. O cadastro (nome, perfil e WhatsApp opcional) só pode ser lido pela própria pessoa e pelo administrador, e pode ser excluído na tela **Meu cadastro**. Os contatos de ONGs/protetores só devem ser cadastrados com autorização deles.

## Direitos autorais
© 2026 Wellington de Jesus Moraes. Todos os direitos reservados.
 O código está público para consulta e avaliação acadêmica, mas não pode ser copiado, modificado ou reutilizado sem autorização do autor.

 Componentes de terceiros, que seguem as próprias licenças: Leaflet © Vladimir Agafonkin (BSD-2), fontes Fredoka e Nunito (SIL Open Font License) e mapas © colaboradores do OpenStreetMap.
