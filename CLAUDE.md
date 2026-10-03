# Tuna Matata 🐟

PWA pessoal de dois irmãos (iPhone, Tela de Início) para estoque, receitas, cardápio semanal e lista de compras. Interface em português do Brasil. Prioridade: simplicidade de uso e de código.

- Especificação completa (fonte da verdade): `docs/especificacao.md`
- Arquitetura e decisões aprovadas: `docs/arquitetura.md`

## Restrições que nunca mudam

- Custo zero: Firebase **Spark** apenas. Nada de Blaze, Cloud Functions, servidor próprio ou API/IA paga.
- Firebase Hosting + Firestore (`europe-southwest1`, Madrid). Projeto: `tuna-matata`.
- Chaves de conta de serviço nunca entram no repositório (só no secret `FIREBASE_SERVICE_ACCOUNT` do GitHub). A config web do Firebase em `src/config.js` é pública e pode ficar no código.
- Todas as quantidades são inteiros ≥ 0.

## Stack

Svelte 5 (runes: `$state`, `$derived`, `$props`) + Vite, JavaScript puro, CSS próprio com variáveis (claro/escuro automático), `vite-plugin-pwa`, Firebase JS SDK (Auth + Firestore com cache local persistente), Vitest para a lógica de negócio, EmailJS para e-mail.

## Estrutura

```
src/
  config.js            config web do Firebase e e-mail da conta compartilhada
  lib/firebase.js      app, auth e db (cache offline; VITE_EMULADOR=1 usa os emuladores)
  lib/dados.svelte.js  estado compartilhado sincronizado ao vivo (onSnapshot)
  lib/aviso.svelte.js  aviso rápido (toast)
  lib/                 lógica de negócio em funções puras + testes *.test.js
  App.svelte           sessão, rotas por hash (#/estoque, #/receitas, #/semana, #/compras, #/ajustes)
  telas/               uma tela por aba + Login + Ajustes
  componentes/         peças reutilizáveis (Abas, Vazio...)
  estilo.css           variáveis de cor, .card, .botao, .chip
public/                ícones do PWA (icone.svg, PNGs)
firestore.rules        só o UID da conta compartilhada lê e grava; estoque inteiro ≥ 0
testes/                testes das regras no emulador (npm run test:regras)
seed/seed.json         dados iniciais (ingredientes; receitas na etapa 3)
scripts/seed.mjs       carrega o seed com firebase-admin
.github/workflows/     deploy.yml (main), preview.yml (PRs), seed.yml (manual)
docs/                  especificação e arquitetura
```

Nomes de arquivos, variáveis e funções em português, como o resto do código.

## Acesso

Uma conta única no Firebase Auth (e-mail/senha). O e-mail fica em `src/config.js`; o app mostra só o campo de senha. `firestore.rules` libera tudo apenas para o UID `m3MXk6CYKpbwbGQLj7MHX6sIpPA3`.

## Modelo de dados (Firestore)

- `ingredientes/{slug}`: `{ nome, emoji, unidade, basico, estoque }`. `basico: true` = despensa (aparece nas receitas, sem estoque, nunca vai para compras).
- `receitas/{slug}`: `{ nome, emoji, tempoMin, ingredientes: [{ ingredienteId, quantidade }] }`. Nunca texto livre.
- `semanas/{AAAA-MM-DD da segunda}`: `{ status: 'rascunho'|'finalizada', refeicoes: { 'seg-almoco': {tipo:'receita', receitaId} | {tipo:'sobras'} | {tipo:'fora'} | null, ... }, finalizadaEm, descontado: {ingId: qtd}, detalhe: [...], compras: {ingId: {quantidade, comprado}}, emailEnviadoEm }`.
- `config/app`: `{ emails: [a, b] }`.

Detalhes e exemplos em `docs/arquitetura.md`.

## Regras de negócio

- **Estoque + e −:** sempre `increment(±1)` atômico, nunca ler-e-gravar. O − fica desabilitado em 0 e as regras recusam `estoque < 0`.
- **Finalizar** (transação): exige `status == 'rascunho'`. Percorre seg-almoço, seg-janta, ter-almoço ... sex-janta; pula vazio/sobras/fora; para cada ingrediente não básico `usa = min(estoque, qtd)`, desconta, e `qtd - usa` soma em `compras`. Grava estoque, `descontado`, `detalhe`, `compras` e `status: 'finalizada'`. Depois envia o e-mail (falha no e-mail não desfaz nada).
- **Reabrir** (transação): só a semana finalizada mais recente; exige `status == 'finalizada'`; devolve `descontado` com soma (não sobrescreve ajustes manuais); apaga `descontado`, `detalhe`, `compras`, `emailEnviadoEm`; volta a `rascunho`.
- **Lista de compras:** checkbox é só visual, não mexe no estoque.
- **Semana padrão:** sábado/domingo abrem a próxima semana; segunda a sexta, a atual.
- **Importar receitas:** valida que todo `ingredienteId` existe; id repetido é pulado e avisado.
- **Seed:** atualiza nome/emoji/unidade/básico; nunca sobrescreve `estoque` de ingrediente existente.

## Rodar e publicar

```bash
npm install
npm run dev      # http://localhost:5173
npm test              # Vitest (src/)
npm run test:regras   # firestore.rules no emulador (Java)
npm run build         # gera dist/
```

Testar o app inteiro no computador sem tocar no banco de verdade: rodar os emuladores (`npx firebase-tools@15 emulators:start --only auth,firestore --project tuna-matata`), criar no emulador de Auth um usuário com o UID das regras e o e-mail de `src/config.js`, carregar o seed com `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/seed.mjs` e abrir `VITE_EMULADOR=1 npm run dev`.

- Cada PR roda `preview.yml`: testes, build e um link de prévia do Hosting comentado no PR (expira em 7 dias, usa o banco de verdade).
- Push na `main` roda `deploy.yml`: testes, build e `firebase deploy --only hosting,firestore:rules`.
- Seed: Actions → "Carregar seed" → Run workflow (`seed.yml`, usa o mesmo secret).

## Como trabalhamos

Uma etapa por vez, um PR por etapa, esperar o ok dos irmãos antes da próxima. Etapas: (1) projeto, deploy e acesso; (2) ingredientes e estoque; (3) receitas e importação; (4) planejamento semanal; (5) lista de compras, e-mail e backup.
