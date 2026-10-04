# Tuna Matata 🐟

Our very serious answer to the question "what's for dinner?".

Tuna Matata is a personal PWA for two siblings who live together. It keeps track of what is in the pantry, stores our recipes, plans the week's meals and works out the shopping list. It lives on the iPhone Home Screen, syncs between our two phones and costs nothing to run.

> The app's interface, the code identifiers and the documents under [`docs/`](docs/) are in Brazilian Portuguese. The app sits behind a shared password, so there is no public demo.

## Screenshots

<!-- Save the images in docs/screenshots/ and uncomment each line below. -->

| Pantry | Recipes | Week | Shopping |
|---|---|---|---|
| <!-- ![Pantry](docs/screenshots/estoque.png) --> | <!-- ![Recipes](docs/screenshots/receitas.png) --> | <!-- ![Week](docs/screenshots/semana.png) --> | <!-- ![Shopping](docs/screenshots/compras.png) --> |

## Features

**🥫 Pantry (Estoque)**

- A grid of cards, one per ingredient, with emoji, name and quantity.
- `+` and `−` buttons for a quick manual count before planning the week.
- Staples such as salt, olive oil and garlic can be marked as basic: they appear in recipes but are never counted or added to the shopping list.

**📖 Recipes (Receitas)**

- Ingredients are structured references to the ingredient catalog, never free text.
- On a recipe, each ingredient chip is green when the current stock covers it and red when it does not.
- "Dá pra fazer agora" ("can make it now") ranks recipes by how many ingredients are still missing.
- Recipes are created and edited by tapping ingredient chips and adjusting quantities, with no typing of ingredient lists.
- Bulk import: paste a JSON list of recipes and it is validated against the catalog. One button copies the format and our ingredient ids, ready to ask an AI chat for new recipes.

**📅 Week (Semana)**

- Monday to Friday, lunch and dinner: ten slots. Each one takes a recipe, "leftovers", "eating out" or stays empty.
- The recipe picker lists what can be cooked right now first.
- **Finalize** goes through the meals in chronological order, takes what is available out of the pantry and puts whatever is missing on the shopping list, summed per ingredient.
- **Reopen** returns exactly what that finalization took and deletes the list, so the week can be edited and finalized again without deducting twice.
- Earlier weeks can still be browsed.

**🛒 Shopping (Compras)**

- The list from the most recently finalized week, with checkboxes to tick at the shop.
- The list is emailed to two addresses when the week is finalized. It can be resent, or copied as plain text.

**⚙️ Settings (Ajustes)**

- Ingredient catalog, recipient emails and a JSON backup export.

**Across the app**

- Installable PWA: opens full screen from the Home Screen, with automatic dark mode.
- Live sync between phones. Browsing and ticking items keep working offline; finalizing a week needs a connection.
- One shared password, typed once per phone.

## How it's built

| Piece | Choice |
|---|---|
| Frontend | Svelte 5 (runes) + Vite, plain JavaScript |
| Styling | Hand-written CSS with custom properties, light/dark through `prefers-color-scheme`, no UI library |
| PWA | `vite-plugin-pwa` (manifest, icons, auto-updating service worker) |
| Data and auth | Firebase JS SDK: Auth (email/password) and Firestore with a persistent local cache |
| Navigation | Four bottom tabs plus inner screens, hash routing written by hand |
| Email | EmailJS REST API, called straight from the browser with `fetch` |
| Tests | Vitest for the business logic; the Firestore emulator for the security rules and the finalize/reopen transactions |
| Hosting and CI | Firebase Hosting on the free Spark plan, deployed by GitHub Actions |

There is no backend of our own: no server, no Cloud Functions, no paid API. The app is a static site that talks to Firestore, and everything that must not go wrong is enforced by Firestore transactions and security rules.

- **Stock changes are atomic.** `+` and `−` use Firestore's `increment(±1)`, so taps from both phones at the same moment both count. The security rules reject any write that would leave stock negative or non-integer.
- **Finalize and reopen are transactions** that check the week's status first, so neither can be applied twice even if we both tap at once. The deduction itself is a pure function (`planejar()` in [`src/lib/semana.js`](src/lib/semana.js)) covered by unit tests.
- **A finalized week records exactly what it took** from the pantry, and reopening adds that back instead of overwriting, so manual adjustments made in between survive.
- **The shopping list lives inside the week document** as a map keyed by ingredient. Ticking a checkbox updates a single field, so two phones never overwrite each other.
- **Access is a single shared Firebase Auth account.** The app only asks for the password, and the rules allow reads and writes for that account's UID alone.
- **Email goes out after the transaction commits.** A failed email never undoes a finalized week; it can be resent from the Shopping tab.

Svelte was chosen because it needs the least code for the same result: a component is close to plain HTML with a little JavaScript, reactivity is built in and the bundle stays small, which keeps the PWA quick on the phone.

### Data model (Firestore)

| Path | Document |
|---|---|
| `ingredientes/{slug}` | `{ nome, emoji, unidade, basico, estoque }` |
| `receitas/{slug}` | `{ nome, emoji, tempoMin, ingredientes: [{ ingredienteId, quantidade }] }` |
| `semanas/{Monday, YYYY-MM-DD}` | `{ status, refeicoes, finalizadaEm, descontado, detalhe, compras, emailEnviadoEm }` |
| `config/planejamento` | `{ ultimaFinalizada }`, the only week that can be reopened |
| `config/app` | `{ emails }`, who receives the shopping list |

All quantities are integers ≥ 0.

### Project structure

```
src/
  config.js          Firebase web config, shared account email, EmailJS public keys
  App.svelte         session handling and hash routes
  telas/             one screen per tab, plus login, settings, ingredient and recipe screens
  componentes/       reusable pieces (tab bar, chips, meal picker...)
  lib/               business logic as pure functions, with *.test.js next to them
    semana.js          week dates, slots and planejar() (deduction and shopping list)
    planejamento.js    transactions: pick a meal, finalize, reopen
    receitas.js        stock coverage ("can make it now") and import validation
    compras.js         shopping list, email text and backup
    email.js           EmailJS call
    dados.svelte.js    shared state kept live with onSnapshot
  estilo.css         colour variables and shared classes
testes/              emulator tests: security rules, finalize/reopen
firestore.rules      only the shared account reads and writes; stock is an integer ≥ 0
seed/seed.json       starter ingredients and recipes
scripts/seed.mjs     loads the seed with firebase-admin
.github/workflows/   deploy (main), preview (pull requests), seed (manual)
docs/                specification, architecture and setup guide
```

### How it was made

The project started from a written specification, followed by an architecture proposal, and was then built in five stages: project, deploy and access; ingredients and pantry; recipes and import; weekly planning; shopping list, email and backup. Each stage was a pull request, tested on the phone through its preview link before merging.

## Running it locally

```bash
npm install
npm run dev           # http://localhost:5173
npm test              # unit tests (Vitest)
npm run test:regras   # security rules and finalize/reopen on the Firestore emulator (needs Java)
npm run build         # outputs dist/
```

`npm run dev` talks to the real Firebase project configured in [`src/config.js`](src/config.js). To try the whole app without touching real data, run it against the emulators:

1. Start them: `npx firebase-tools@15 emulators:start --only auth,firestore --project tuna-matata`
2. In the Auth emulator, create a user with the UID from `firestore.rules` and the email from `src/config.js`.
3. Load the seed: `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/seed.mjs`
4. Start the app: `VITE_EMULADOR=1 npm run dev`

## Deployment

- Every push to `main` runs the tests, builds, and deploys the site and the Firestore rules to Firebase Hosting.
- Every pull request gets a preview link posted as a comment. It expires after 7 days and uses the real database.
- The seed is loaded by a manual workflow (Actions → "Carregar seed").

Setting up a copy from scratch (Firebase project, shared account, GitHub secret, EmailJS, Home Screen install) is described step by step in [`docs/configuracao.md`](docs/configuracao.md).

## Documentation

All in Portuguese:

- [`docs/especificacao.md`](docs/especificacao.md): the original specification
- [`docs/arquitetura.md`](docs/arquitetura.md): architecture, data model and the finalize/reopen logic in detail
- [`docs/configuracao.md`](docs/configuracao.md): first-time setup, step by step
