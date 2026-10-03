# Projeto: Tuna Matata 🐟
App pessoal de estoque, receitas, cardápio semanal e lista de compras.

## Contexto
Somos dois irmãos que moram juntos. Queremos um web app (PWA) chamado **Tuna Matata**, só para nós dois, usado principalmente no iPhone (adicionado à Tela de Início pelo Safari). Não vai para a App Store. Interface em português do Brasil. Prioridade máxima: simplicidade de uso e de código.

O repositório é este da pasta do projeto (github.com/marianarossi/tuna-matata), já clonado e com o GitHub conectado.

Restrições obrigatórias:
- Custo zero. Firebase apenas no plano gratuito (Spark), sem Blaze e sem Cloud Functions.
- Nenhum servidor ou computador nosso ligado. Tudo roda em serviços gratuitos na nuvem.
- Hospedagem no Firebase Hosting. Código em repositório privado no GitHub (temos GitHub Pro), com deploy automático via GitHub Actions a cada push na main.
- Banco de dados: Firestore, sincronizado entre os dois celulares.
- A linguagem e o framework do frontend ficam a seu critério. Queremos algo simples, moderno e fácil de manter. Justifique a escolha em poucas linhas.
- Sem IA/API paga dentro do app.

## Identidade e design
- Nome: Tuna Matata. Tema leve e bem-humorado de atum 🐟, sem exagero.
- Ícone do PWA (Tela de Início do iPhone) e favicon com um peixinho/lata de atum simples, criado por você em SVG/PNG. Nome curto na Tela de Início: "Tuna Matata".
- Mobile-first, limpo e moderno, com cara de app nativo: cards, cantos arredondados, chips/botões, emojis, navegação por abas embaixo (Estoque, Receitas, Semana, Compras). Nada de telas cheias de texto. Modo escuro automático.
- Pequenos toques de humor nos estados vazios (ex.: lista de compras vazia: "Hakuna matata, não falta nada 🐟").

## Acesso
Sem perfis e sem cadastro. Uma única senha compartilhada que só nós dois sabemos, digitada uma vez em cada celular. A sessão fica salva e não pede de novo. Implementação sugerida: uma única conta no Firebase Auth (e-mail/senha, criada por nós no console). O app mostra só um campo "senha" e as regras do Firestore liberam leitura e escrita apenas para o UID dessa conta. Estranhos com o link não podem ler nem apagar nada.

## 1. Catálogo de ingredientes (tabela própria)
- Coleção `ingredientes`. Cada um tem: id estável (slug, ex.: `cebola-roxa`), nome, emoji (ex.: 🧅, 🐟, 🫑) e unidade de exibição (unidade, pacote, lata...).
- Todas as quantidades no app são números inteiros.
- Ingredientes de despensa (sal, azeite, óleo, alho, temperos) podem ser marcados `basico: true`. Aparecem nas receitas mas não são controlados no estoque nem entram na lista de compras.
- Os dados iniciais vêm de um arquivo seed (JSON) fácil de editar, mais um script para carregá-lo no Firestore. Vamos fornecer a lista.
- Uma tela simples para adicionar/editar ingredientes no app é desejável, mas secundária.

## 2. Estoque
- Grade de cards com emoji, nome e quantidade de cada ingrediente (ex.: cebola roxa 6, atum 1, pimentão 2).
- Botões + e − em cada card para ajustar à mão. Usamos isso no domingo para conferir o estoque real antes de planejar.

## 3. Receitas
- Coleção `receitas`. Cada receita tem: nome, tempo de preparo (minutos), emoji, e ingredientes como lista estruturada que referencia a tabela de ingredientes: `[{ ingredienteId, quantidade }]`. Nunca texto livre.
- Exemplo: Massa com atum = 1 atum, 1 pimentão, 1 pacote de massa.
- Na tela da receita, os ingredientes aparecem como chips com emoji, nome e quantidade. Cada chip indica se o estoque atual cobre (verde) ou não (vermelho).
- Criar/editar receita: escolher ingredientes tocando em chips do catálogo e ajustar a quantidade com + e −. Sem digitar lista de ingredientes.
- Seção "Dá pra fazer agora": ordena as receitas pelo quanto o estoque atual cobre (100% primeiro, depois "falta 1 item" etc.). É lógica simples, sem IA.
- Tela "Importar receitas": colar um JSON no formato do seed para adicionar várias receitas de uma vez. Vamos gerar receitas em outro chat de IA usando os ids dos nossos ingredientes. Validar se todos os ingredienteId existem e avisar quais não existem.

## 4. Planejamento semanal (funcionalidade principal)
- Planejamos no sábado ou domingo para a semana seguinte: segunda a sexta, almoço e janta (10 refeições). Fim de semana fica fora do app.
- Visual bonito: os 5 dias com as datas, cada um com dois slots (almoço e janta). Tocar no slot abre a escolha de receita, com as sugestões do "Dá pra fazer agora" no topo.
- Um slot também pode ser "Sobras" (sempre cozinhamos a mais), "Comer fora" ou ficar vazio. Esses não consomem ingredientes.
- Ao tocar em "Finalizar planejamento":
  1. Percorre as refeições em ordem cronológica (seg-almoço, seg-janta, ter-almoço...).
  2. Para cada refeição, desconta do estoque os ingredientes disponíveis. O estoque nunca fica negativo.
  3. O que faltar vai para a lista de compras, somado por ingrediente. Ex.: massa com atum na segunda e na quinta, com 1 atum em estoque. O atum de segunda sai do estoque e a lista recebe 1 atum para quinta.
  4. Mostra um resumo: o que foi descontado e a lista de compras final.
  5. Envia a lista por e-mail (seção 6).
- A baixa no estoque é definitiva ao finalizar. Não existe "marcar refeição como feita". Se algo não for cozinhado, ajustamos o estoque à mão no domingo seguinte.
- Botão "Reabrir planejamento": devolve ao estoque exatamente o que aquela finalização descontou, apaga a lista gerada e permite editar e finalizar de novo. Isso evita desconto em dobro. Guardar na semana finalizada o registro do que foi descontado.
- "Finalizar" e "Reabrir" devem usar transação do Firestore e checar o status da semana (rascunho/finalizada), para que nunca sejam aplicados duas vezes, mesmo se nós dois tocarmos ao mesmo tempo.
- Histórico das semanas anteriores (só leitura) é desejável, mas opcional.

## 5. Lista de compras
- Gerada pelo planejamento. Cada item é um chip com emoji, nome e quantidade, com checkbox para usar no mercado.
- Marcar o checkbox é só um controle visual de compra. Não altera o estoque, porque esses itens já estão destinados às refeições planejadas.

## 6. Envio por e-mail
- Ao finalizar, a lista é enviada para dois e-mails diferentes, configurados num arquivo de config ou numa tela de ajustes simples.
- Texto simples: "🐟 Tuna Matata – Lista de compras da semana de DD/MM", e uma linha por item com emoji, nome e quantidade.
- Implementação preferida: EmailJS (plano grátis) chamado direto do navegador ao finalizar, com envio imediato e restrição de domínio no painel do EmailJS. Alternativa aceitável se você achar melhor: GitHub Actions agendado que lê uma flag "envio pendente" no Firestore e envia via Gmail SMTP com credenciais em GitHub Secrets.
- Botão "Reenviar e-mail" na tela de compras.
- WhatsApp fica para depois. Por enquanto, só deixe o texto da lista fácil de copiar (botão "Copiar lista").

## 7. Backup
Botão "Exportar backup" que baixa um JSON com ingredientes, estoque, receitas e planejamentos. O plano gratuito não tem backup automático.

## 8. Entregáveis
- Esta especificação completa salva no repositório como `docs/especificacao.md`.
- `CLAUDE.md` na raiz descrevendo stack, modelo de dados, regras de negócio (desconto, reabrir, lista) e como rodar e publicar, com referência a `docs/especificacao.md`, para orientar sessões futuras.
- Código completo e organizado no repositório.
- Modelo de dados do Firestore documentado.
- Arquivo seed de exemplo com ~15 ingredientes e ~5 receitas simples (vamos substituir pelos nossos).
- Regras de segurança do Firestore.
- Workflow do GitHub Actions para deploy.
- Chaves de conta de serviço do Firebase nunca vão para o repositório: usar .gitignore e GitHub Secrets. (A config web do Firebase pode ficar no código, ela é pública por natureza.)
- README em português com o nome Tuna Matata e passo a passo para iniciantes: criar o projeto no Firebase, criar a conta/senha compartilhada, configurar o EmailJS, colocar os secrets no GitHub, rodar o seed, publicar e adicionar à Tela de Início do iPhone.

## Como trabalhar
- Trabalhe uma etapa por vez, em sequência, sem abrir várias frentes em paralelo. Cada etapa depende da anterior.
- Primeiro passo: salve esta especificação em `docs/especificacao.md`.
- Antes de escrever código, apresente: a stack escolhida, o modelo de dados e a lógica de finalizar/reabrir planejamento, e as dúvidas que tiver. Espere nossa aprovação.
- Depois implemente por etapas: (1) projeto, deploy e acesso; (2) ingredientes e estoque; (3) receitas e importação; (4) planejamento semanal; (5) lista de compras, e-mail e backup. Ao fim de cada etapa, faça commit, diga como testar e espere nosso ok antes da próxima.
