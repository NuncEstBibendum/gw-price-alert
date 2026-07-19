# GW Price Alerts

App Next.js (TypeScript) qui interroge périodiquement l'historique de prix
[gwtoolbox](https://kamadan.gwtoolbox.com) pour un set de matériaux Guild
Wars, stocke l'historique dans Supabase, et envoie des alertes Telegram quand
un prix d'achat/vente franchit un seuil configuré (avec cooldown pour éviter
le spam).

## Architecture

- **Next.js (App Router)** hébergé sur **Vercel** : page unique avec
  graphiques de prix et gestion des alertes, plus la route API `/api/ingest`.
- **Supabase (Postgres)** : stockage de l'historique de prix et des règles
  d'alerte.
- **GitHub Actions** (cron toutes les 5 min) : appelle `/api/ingest` (protégé
  par un secret) pour déclencher le polling. Vercel Hobby ne permet pas de
  cron plus fréquent qu'une fois par jour, d'où ce choix.
- **Telegram Bot API** : envoi des alertes.

> **Rotation par lots** : gwtoolbox rate-limite après ~5-6 requêtes
> séquentielles, peu importe l'espacement entre elles. `/api/ingest` ne
> traite donc qu'un sous-ensemble d'au plus 4 matériaux par run (voir
> `MAX_ITEMS_PER_RUN` dans [route.ts](src/app/api/ingest/route.ts)), le lot
> étant déterminé par l'horodatage courant (pas d'état à persister). Avec 5
> min entre chaque run, chaque matériau est donc rafraîchi toutes les
> `5 × nombre_de_lots` minutes. Le lookback de 3 jours côté gwtoolbox comble
> automatiquement les runs manqués.

```
GitHub Actions (cron 5min)
        │  GET /api/ingest?secret=... (ou header x-cron-secret)
        ▼
  Vercel (Next.js)
        │  fetch gwtoolbox pricing_history pour chaque item
        │  upsert dans Supabase.prices
        │  évalue Supabase.alert_rules vs derniers prix
        │  si seuil franchi + cooldown écoulé → Telegram sendMessage
        ▼
     Supabase (Postgres)
```

## Mise en place

### 1. Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans le SQL Editor, exécute le contenu de
   [`supabase/migrations/20260718000000_init.sql`](supabase/migrations/20260718000000_init.sql).
   Tu peux aussi l'appliquer avec la Supabase CLI (voir section CLI plus bas).
   Cela crée les tables `items`, `prices`, `alert_rules`, `alert_log`, la vue
   `latest_prices`, et seed les 3 matériaux (Ecto, Monstrous Claw, Monstrous
   Fang).
3. Récupère dans *Project Settings > API* :
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role secret — **jamais** exposée
     côté client, uniquement utilisée côté serveur dans cette app)

#### Appliquer la migration avec la Supabase CLI (alternative au SQL Editor)

```bash
npx supabase login
npx supabase link --project-ref <project-ref>   # ex: dutuwwdbtdnqjwqezrnx (dans l'URL https://<ref>.supabase.co)
npx supabase db push                              # applique les migrations de supabase/migrations/
```

`link` demande le mot de passe de la base (celui généré à la création du
projet, dispo dans *Project Settings > Database* si tu l'as perdu).

### 2. Bot Telegram

1. Crée un bot via [@BotFather](https://t.me/BotFather) → `/newbot` → récupère
   le token (`TELEGRAM_BOT_TOKEN`).
2. Envoie un message à ton bot, puis récupère ton `chat_id` via
   `https://api.telegram.org/bot<token>/getUpdates` (champ
   `message.chat.id`), ou utilise [@userinfobot](https://t.me/userinfobot)
   pour ton propre id si le chat est privé.

### 3. Variables d'environnement

Copie `.env.example` vers `.env.local` et remplis :

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
CRON_SECRET=   # chaîne aléatoire longue, ex: openssl rand -hex 32
```

### 4. Dev local

```bash
npm install
npm run dev
```

App sur http://localhost:3000 (page unique : graphiques + gestion des alertes).

Pour tester l'ingestion manuellement :

```bash
curl -H "x-cron-secret: <CRON_SECRET>" http://localhost:3000/api/ingest
```

### 5. Déploiement Vercel

1. Push ce repo sur GitHub.
2. Importe le repo dans Vercel.
3. Ajoute les mêmes variables d'environnement que `.env.local` dans
   *Project Settings > Environment Variables*.
4. Déploie. Note l'URL de production, ex. `https://gw-price-alerts.vercel.app`.

### 6. GitHub Actions (polling toutes les 5 min)

Dans les *Settings > Secrets and variables > Actions* du repo GitHub, ajoute :

- `CRON_SECRET` — la même valeur que sur Vercel.
- `INGEST_URL` — `https://<ton-app>.vercel.app/api/ingest`.

Le workflow [`.github/workflows/poll.yml`](.github/workflows/poll.yml) tourne
toutes les 5 minutes et appelle cette URL. Tu peux aussi le déclencher
manuellement depuis l'onglet Actions (`workflow_dispatch`).

> Note : GitHub peut retarder légèrement les cron schedules en cas de forte
> charge sur la plateforme ; ce n'est pas garanti à la seconde près, mais
> largement suffisant pour du suivi de marché.

## Utilisation

Page unique (`/`) : une carte par matériau avec son prix d'achat/vente actuel,
son graphique d'historique (filtrable semaine/mois/année/tout), et ses
alertes. Une alerte d'achat se déclenche quand le prix descend sous un seuil,
une alerte de vente quand il monte au-dessus — pas de sélecteur de condition
séparé, le sens est implicite au type de règle. Ajoute un seuil + un cooldown
directement dans la carte du matériau concerné ; active/désactive ou supprime
une règle existante en un clic.

## Ajouter un matériau

Les matériaux sont dans la table `items` (id = code gwtoolbox visible dans
l'URL `pricing_history/<code>/...`, name = libellé affiché). Ajoute une ligne
via le SQL Editor ou le Table Editor de Supabase :

```sql
insert into items (id, name) values ('<code>', 'Nom du matériau');
```

Il sera automatiquement inclus au prochain ingest.
