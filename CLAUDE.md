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
  config.js            config web do Firebase, e-mail da conta compartilhada e chaves públicas do EmailJS
  lib/firebase.js      app, auth e db (cache offline; VITE_EMULADOR=1 usa os emuladores)
  lib/dados.svelte.js  estado compartilhado sincronizado ao vivo (onSnapshot)
  lib/aviso.svelte.js  aviso rápido (toast)
  lib/                 lógica de negócio em funções puras + testes *.test.js
  App.svelte           sessão e rotas por hash (#/estoque, #/semana/{AAAA-MM-DD}, #/receita/{id}, #/editar-receita/{id|nova}, #/importar ...)
  lib/receitas.js      cobertura pelo estoque ("Dá pra fazer agora") e validação de importação
  lib/semana.js        datas da semana, slots e planejar() (desconto e compras, função pura)
  lib/planejamento.js  transações: escolher refeição, finalizar e reabrir
  lib/compras.js       lista de compras, texto do e-mail e backup (funções puras)
  lib/email.js         envio pelo EmailJS (fetch na API REST, sem biblioteca)
  telas/               uma tela por aba + Login, Ajustes, Ingrediente(s), Receita, ReceitaEditar, Importar
  componentes/         peças reutilizáveis (Abas, Vazio, EscolherRefeicao...)
  estilo.css           variáveis de cor, .card, .botao, .chip
public/                ícones do PWA (icone.svg, PNGs)
firestore.rules        só o UID da conta compartilhada lê e grava; estoque inteiro ≥ 0
testes/                testes no emulador: regras e finalizar/reabrir (npm run test:regras)
seed/seed.json         dados iniciais (ingredientes e receitas)
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
- `config/planejamento`: `{ ultimaFinalizada: 'AAAA-MM-DD' | null }`, a única semana que pode ser reaberta.
- `config/app`: `{ emails: [a, b] }`, editável em Ajustes.

Detalhes e exemplos em `docs/arquitetura.md`.

## Regras de negócio

- **Estoque + e −:** sempre `increment(±1)` atômico, nunca ler-e-gravar. O − fica desabilitado em 0 e as regras recusam `estoque < 0`.
- **Finalizar** (transação): exige `status == 'rascunho'`. Percorre seg-almoço, seg-janta, ter-almoço ... sex-janta; pula vazio/sobras/fora; para cada ingrediente não básico `usa = min(estoque, qtd)`, desconta, e `qtd - usa` soma em `compras`. Grava estoque, `descontado`, `detalhe`, `compras`, `status: 'finalizada'` e `config/planejamento.ultimaFinalizada`. Depois envia o e-mail (falha no e-mail não desfaz nada).
- **Reabrir** (transação): só a semana finalizada mais recente (`ultimaFinalizada`); exige `status == 'finalizada'`; devolve `descontado` com soma (não sobrescreve ajustes manuais); apaga `descontado`, `detalhe`, `compras`, `emailEnviadoEm`; volta a `rascunho` e zera `ultimaFinalizada`.
- **Escolher refeição** (transação): recusada se a semana estiver finalizada.
- **Lista de compras:** a aba Compras mostra a semana finalizada mais recente. Checkbox (`compras.<id>.comprado`) é só visual, não mexe no estoque.
- **E-mail:** sai pelo EmailJS logo depois da transação de finalizar, para os `emails` de `config/app`, e grava `emailEnviadoEm`. Falha ou falta de configuração só gera um aviso; "Reenviar e-mail" fica na aba Compras. O modelo do EmailJS usa `{{para}}`, `{{assunto}}` e `{{{mensagem_html}}}` (README, passo 8).
- **Backup:** Ajustes exporta um JSON com todas as coleções; `ingredientes` e `receitas` ficam no formato do seed.
- **Semana padrão:** sábado/domingo abrem a próxima semana; segunda a sexta, a atual.
- **Dá pra fazer agora:** receitas ordenadas por quantos itens faltam (0 primeiro), depois unidades faltando, depois nome. Básicos sempre contam como cobertos; ingrediente fora do catálogo conta como faltando.
- **Importar receitas:** valida que todo `ingredienteId` existe (receita com id inexistente não entra e o id é listado); id repetido é pulado e avisado; `id` ausente vem do nome.
- **Apagar ingrediente:** bloqueado enquanto estiver em alguma receita.
- **Seed:** atualiza nome/emoji/unidade/básico; nunca sobrescreve `estoque` de ingrediente existente. Receita existente é pulada.

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
