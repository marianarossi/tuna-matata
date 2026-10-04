# Tuna Matata 🐟

Nossa solução muito séria para a pergunta "o que tem pra janta?". Estoque da despensa, receitas, cardápio da semana e lista de compras, num app que fica na Tela de Início do iPhone.

- Especificação: [`docs/especificacao.md`](docs/especificacao.md)
- Arquitetura e modelo de dados: [`docs/arquitetura.md`](docs/arquitetura.md)

Custo: zero. Firebase no plano gratuito (Spark), GitHub Actions para publicar.

---

## Passo a passo (primeira vez)

### 1. Projeto no Firebase ✅ (já feito)

- Projeto `tuna-matata` no [console do Firebase](https://console.firebase.google.com/), plano Spark.
- Firestore criado em `europe-southwest1` (Madrid), modo produção.
- Authentication → Método de login → **E-mail/senha** ativado.

### 2. Conta e senha compartilhadas ✅ (já feito)

- Authentication → Usuários → **Adicionar usuário** com um e-mail e a senha que vocês dois vão usar.
- O e-mail dessa conta fica em `src/config.js` (`EMAIL_DA_CONTA`). O app só pede a senha.
- O UID dessa conta (coluna "UID do usuário") fica em `firestore.rules`. Se um dia trocarem de conta, troquem o UID lá.

Para mudar a senha: Authentication → Usuários → menu ⋮ da conta → **Redefinir senha**.

### 3. Ativar o Hosting

No console do Firebase: **Hosting** (menu Criação/Build) → **Vamos começar**. Pode pular todos os passos de instalação clicando em "Próximo" até o fim. Isso só cria o site `tuna-matata.web.app`.

### 4. Chave para o GitHub publicar (secret)

O GitHub Actions precisa de uma "conta de serviço" para publicar no Firebase.

1. Abra o [Google Cloud Console → Contas de serviço](https://console.cloud.google.com/iam-admin/serviceaccounts?project=tuna-matata) (é o mesmo projeto `tuna-matata`).
2. **Criar conta de serviço** → nome `github-deploy` → **Criar e continuar**.
3. Em "Papel", adicione estes três (use "Adicionar outro papel"):
   - **Administrador do Firebase** (Firebase Admin)
   - **Consumidor do Service Usage** (Service Usage Consumer)
   - **Usuário do Cloud Datastore** (Cloud Datastore User), para o seed
4. **Concluir**. Clique na conta criada → aba **Chaves** → **Adicionar chave** → **Criar nova chave** → **JSON**. Um arquivo `.json` é baixado.
5. No GitHub: repositório → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: cole **o conteúdo inteiro** do arquivo `.json`.
6. Apague o arquivo `.json` do computador (ou guarde num lugar seguro). **Nunca** coloque esse arquivo no repositório.

### 5. Publicar

- Todo push (ou merge de PR) na `main` publica o site e as regras do Firestore automaticamente (aba **Actions** do GitHub, workflow "Publicar").
- Cada Pull Request ganha um **link de prévia** num comentário do PR, para testar no iPhone antes do merge. A prévia expira em 7 dias e usa o mesmo banco de dados de verdade.
- Para publicar de novo sem mudar nada: Actions → "Publicar" → **Run workflow**.

### 6. Adicionar à Tela de Início do iPhone

1. Abra **https://tuna-matata.web.app** no **Safari**.
2. Digite a senha uma vez.
3. Toque em **Compartilhar** (quadrado com a seta) → **Adicionar à Tela de Início** → **Adicionar**.

O peixinho aparece na Tela de Início como "Tuna Matata" e abre em tela cheia, sem barra do Safari. A senha não é pedida de novo.

### 7. Carregar os dados iniciais (seed)

Os ingredientes e receitas iniciais ficam em [`seed/seed.json`](seed/seed.json). O arquivo atual é só um exemplo: troquem pela lista de vocês.

1. No GitHub, abram `seed/seed.json`, toquem no lápis ✏️, editem e façam **Commit changes** (pode ser direto na `main`).
2. Vão em **Actions** → **Carregar seed** → **Run workflow** → **Run workflow**.
3. Em menos de um minuto os ingredientes aparecem no app.

Cada ingrediente tem esta forma:

```json
{ "id": "cebola-roxa", "nome": "Cebola roxa", "emoji": "🧅", "unidade": "unidade", "estoque": 6 }
```

- `id`: minúsculo, sem acento, com hífens. É o que as receitas usam, então não mudem depois.
- `estoque`: só vale para ingrediente **novo**. Se o ingrediente já existe no app, o seed atualiza nome, emoji, unidade e básico, mas **nunca** mexe no estoque.
- `"basico": true` para sal, azeite, alho e outros da despensa (sem estoque, fora da lista de compras).
- Rodar o seed de novo é seguro: nada é apagado e nada é duplicado.

Cada receita lista os ingredientes pelo `id`, com quantidade inteira:

```json
{ "id": "massa-com-atum", "nome": "Massa com atum", "emoji": "🍝", "tempoMin": 20,
  "ingredientes": [ { "ingredienteId": "atum", "quantidade": 1 }, { "ingredienteId": "massa", "quantidade": 1 } ] }
```

Receita que já existe no app é pulada (o seed não desfaz edições feitas no app). Se alguma receita usar um `ingredienteId` que não existe, o seed para e avisa qual.

Pelo app também dá para:
- adicionar e editar ingredientes: ⚙️ → **Ingredientes**;
- criar e editar receitas: aba **Receitas** → **＋ Nova**;
- importar várias receitas de uma vez: aba **Receitas** → **📥 Importar** → colar o JSON. O botão "Copiar instruções para outro chat de IA" copia um texto com o formato e a lista dos nossos ingredientes, para pedir receitas prontas em outro chat.

### 8. Configurar o e-mail (EmailJS)

_Chega na etapa 5._

---

## Para quem vai mexer no código

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm test         # testes da lógica
npm run test:regras   # testa as regras e o finalizar/reabrir no emulador (precisa de Java)
npm run build    # gera a pasta dist/
```

Stack: Svelte 5 + Vite, Firebase (Auth + Firestore), PWA. Mais detalhes em [`CLAUDE.md`](CLAUDE.md).
