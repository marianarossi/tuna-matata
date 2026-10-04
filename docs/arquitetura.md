# Tuna Matata 🐟 · Arquitetura

Proposta técnica aprovada em 2026-10-03, já com os ajustes pedidos (região Madrid, prévia por PR, `increment()` no estoque).

## 1. Stack

| Peça | Escolha |
|---|---|
| Frontend | **Svelte 5 + Vite**, JavaScript puro (sem TypeScript) |
| Estilo | CSS próprio com variáveis (claro/escuro via `prefers-color-scheme`), sem biblioteca de UI |
| PWA | `vite-plugin-pwa` (manifest, ícones, service worker para abrir rápido) |
| Dados e login | Firebase JS SDK v11 (Auth e-mail/senha + Firestore com cache offline) |
| Navegação | 4 abas embaixo + telas internas, roteamento simples por hash, sem biblioteca |
| Testes | Vitest só na lógica de negócio (finalizar/reabrir, "dá pra fazer agora") |
| Hospedagem | Firebase Hosting (Spark) |
| Deploy | GitHub Actions: push na `main` → build → `firebase deploy` (site + regras do Firestore). Cada PR ganha um link de prévia (canal de preview do Hosting, expira em 7 dias) |
| E-mail | EmailJS (grátis, 200 e-mails/mês), chamado direto do navegador |

**Por que Svelte:** é o framework com menos código para o mesmo resultado. Um componente é praticamente HTML + um pouco de JS, a reatividade é nativa (sem hooks nem estado global complicado) e o bundle final é pequeno, o que deixa o PWA rápido no iPhone. Vite dá build e servidor local sem configuração. Não uso SvelteKit nem servidor: é um site estático.

A lógica de negócio (desconto, lista, cobertura de receitas) fica em funções puras em `src/lib/regras.js`, separadas das telas e testadas com Vitest. A tela só chama essas funções.

## 2. Modelo de dados (Firestore)

Todas as quantidades são inteiros ≥ 0.

### `ingredientes/{id}`  (id = slug, ex. `cebola-roxa`)
```js
{
  nome: "Cebola roxa",
  emoji: "🧅",
  unidade: "unidade",     // unidade, pacote, lata...
  basico: false,          // true = despensa: aparece nas receitas, não tem estoque nem vai para compras
  estoque: 6              // ignorado quando basico = true
}
```
O estoque fica no próprio documento do ingrediente: uma coleção a menos, uma leitura a menos, e a transação de finalizar lê e grava os mesmos documentos.

Os botões + e − do estoque usam `increment(1)` / `increment(-1)` do Firestore (atômico: se os dois tocarem ao mesmo tempo, as duas mudanças contam). Para nunca ficar negativo, o − fica desabilitado em 0 e as regras do Firestore recusam qualquer gravação com `estoque < 0`, então um −1 simultâneo que levaria a −1 é rejeitado pelo servidor.

### `receitas/{id}`  (id = slug do nome, ex. `massa-com-atum`)
```js
{
  nome: "Massa com atum",
  emoji: "🍝",
  tempoMin: 20,
  ingredientes: [ { ingredienteId: "atum", quantidade: 1 },
                  { ingredienteId: "pimentao", quantidade: 1 },
                  { ingredienteId: "massa", quantidade: 1 } ]
}
```

### `semanas/{segunda}`  (id = data da segunda-feira, ex. `2026-10-05`)
```js
{
  status: "rascunho" | "finalizada",
  refeicoes: {                         // 10 chaves fixas: seg-almoco, seg-janta ... sex-janta
    "seg-almoco": { tipo: "receita", receitaId: "massa-com-atum" },
    "seg-janta":  { tipo: "sobras" },
    "ter-almoco": { tipo: "fora" },
    "ter-janta":  null,                 // vazio
    ...
  },
  // preenchidos só ao finalizar:
  finalizadaEm: Timestamp,
  descontado: { atum: 1, pimentao: 2 },             // registro exato do que saiu do estoque
  detalhe: [ { slot: "seg-almoco", receitaId: "massa-com-atum", nome: "Massa com atum", emoji: "🍝",
               descontado: { atum: 1 }, falta: {} }, ... ],   // para o resumo e o histórico
  compras: { atum: { quantidade: 1, comprado: false }, ... }, // a lista de compras
  emailEnviadoEm: Timestamp | null
}
```
A lista de compras mora dentro da semana finalizada (um mapa por ingrediente), assim marcar um checkbox é uma atualização de um único campo (`compras.atum.comprado`) e os dois celulares não sobrescrevem um ao outro. A aba Compras mostra a semana finalizada mais recente. Semanas antigas ficam como histórico só leitura.

Escolher o que vai num slot também é uma transação: se a semana já estiver finalizada, a mudança é recusada (assim uma edição atrasada no outro celular não desfaz a finalização).

### `config/planejamento`
```js
{ ultimaFinalizada: "2026-10-05" | null }   // a semana finalizada mais recente
```
Finalizar grava aqui a semana (se for mais nova que a anterior); reabrir volta para `null`. É isso que garante que só a semana finalizada mais recente pode ser reaberta, mesmo com os dois celulares mexendo juntos.

### `config/app`
```js
{ emails: ["irmao1@...", "irmao2@..."] }   // editável numa tela de Ajustes
```
As chaves públicas do EmailJS e a config web do Firebase ficam em `src/config.js` (são públicas por natureza).

### Regras de segurança
```
match /{documento=**} {
  allow read, write: if request.auth != null && request.auth.uid == "<UID_DA_CONTA_COMPARTILHADA>";
}
```
Qualquer outra pessoa com o link vê só a tela de senha e não lê nem grava nada.

### Acesso
O e-mail da conta compartilhada fica em `src/config.js`; a tela mostra só o campo "senha" e chama `signInWithEmailAndPassword`. A sessão fica salva no aparelho (persistência local do Firebase) e não pede de novo. PWAs na Tela de Início do iPhone não sofrem a limpeza automática de 7 dias do Safari.

## 3. Finalizar e reabrir

### Finalizar planejamento (uma transação do Firestore)
1. Lê a semana. Se `status != "rascunho"`, aborta com "Essa semana já foi finalizada" (é isso que impede aplicar duas vezes se vocês dois tocarem juntos: a segunda transação lê o status já finalizado e para).
2. Lê as receitas usadas e todos os ingredientes não básicos envolvidos (o Firestore exige todas as leituras antes das gravações).
3. Calcula, em memória, percorrendo os slots na ordem seg-almoço, seg-janta, ter-almoço ... sex-janta:
   - pula slots vazios, "Sobras" e "Comer fora";
   - para cada ingrediente não básico da receita: `usa = min(estoque, qtd)`, `estoque -= usa`, `descontado[id] += usa`, `compras[id] += qtd - usa`.
   - O estoque nunca fica negativo.
4. Grava o novo estoque de cada ingrediente afetado, a semana com `status: "finalizada"`, `descontado`, `detalhe`, `compras`, e `config/planejamento.ultimaFinalizada`.
5. Se um documento lido mudou no meio (ex.: o outro mexeu no estoque), o Firestore repete a transação sozinho com os dados novos.

Depois da transação: mostra o resumo (o que saiu do estoque + lista de compras) e envia o e-mail. Se o e-mail falhar, a finalização continua valendo e o botão "Reenviar e-mail" resolve.

Exemplo da especificação: massa com atum na segunda e na quinta, 1 atum em estoque. Segunda: usa 1, estoque 0. Quinta: usa 0, compras.atum = 1. ✅

### Reabrir planejamento (uma transação do Firestore)
1. Lê a semana e `config/planejamento`. Se `status != "finalizada"` ou se ela não for a `ultimaFinalizada`, aborta.
2. Para cada item de `descontado`, soma de volta ao estoque (`estoque += qtd`). Soma, não sobrescreve: ajustes manuais feitos depois continuam valendo.
3. Grava a semana com `status: "rascunho"` e apaga `descontado`, `detalhe`, `compras`, `emailEnviadoEm`. As refeições escolhidas continuam lá para editar. `ultimaFinalizada` volta para `null`.

A lógica do passo 3 de finalizar é uma função pura (`planejar(refeicoes, receitas, ingredientes)` em `src/lib/semana.js`) com testes cobrindo o exemplo acima, básicos, slots sem receita e receita repetida. As transações ficam em `src/lib/planejamento.js` e são testadas no emulador (`testes/planejamento.test.js`), incluindo duas finalizações e duas reaberturas ao mesmo tempo (só uma passa) e reabrir depois de um ajuste manual no estoque.

## 4. Fluxo de trabalho no GitHub

Cada etapa vai num Pull Request. O PR ganha um link de prévia (comentário automático do GitHub Actions) para testar no iPhone. Depois do ok, o merge na `main` publica o site e as regras do Firestore.

## 5. Decisões tomadas

- Firestore em `europe-southwest1` (Madrid).
- Aba Semana: sábado e domingo abrem a semana seguinte; de segunda a sexta, a semana atual.
- Reabrir: só a semana finalizada mais recente.
- Seed: botão manual no GitHub Actions; atualiza nome/emoji/unidade/básico, nunca sobrescreve o estoque de ingredientes que já existem.
- Importar receitas: id repetido é pulado e avisado.
- E-mail: EmailJS direto do navegador.
