# NinjaCuts — Provisionsystem

Webbapp för att hantera försäljning och provision för frisörer på NinjaCuts. Byggd med Next.js 14 App Router och Supabase REST API.

## Funktioner

- Personalvy: frisörer loggar in med PIN, registrerar försäljning och ser provision.
- Adminvy: översikt, ranking, logg, hantering av frisörer och PIN-koder.
- Periodfilter: månad eller vecka.
- Felhantering: appen fastnar inte längre på `Laddar…` om Supabase inte svarar.

## Filstruktur

```txt
app/
  layout.js
  page.js
supabase/
  schema.sql
package.json
README.md
.gitignore
.env.local.example
```

## Starta lokalt

```bash
npm install
npm run dev
```

Öppna sedan:

```txt
http://localhost:3000
```

Admin-PIN är:

```txt
0000
```

## Supabase-setup

1. Öppna ditt Supabase-projekt.
2. Gå till **SQL Editor**.
3. Kör innehållet i:

```txt
supabase/schema.sql
```

Det skapar tabellerna `employees` och `entries`, aktiverar Row Level Security och lägger till policies för anon-nyckeln.

## Miljövariabler

Appen har fallback-värden i `app/page.js`, men för produktion rekommenderas `.env.local`.

Skapa en fil lokalt som heter:

```txt
.env.local
```

Lägg in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lpftxjperpbppplareiu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din-supabase-anon-key-här
```

På Vercel lägger du in samma variabler under **Project Settings → Environment Variables**.

## GitHub

```bash
git init
git add .
git commit -m "Initial NinjaCuts app"
git branch -M main
git remote add origin DIN_GITHUB_REPO_URL
git push -u origin main
```

## Deploy till Vercel

1. Koppla GitHub-repot till Vercel.
2. Lägg in miljövariablerna om du vill använda `.env` istället för fallback-värden.
3. Deploy.

## Vanliga fel

### Sidan står bara och laddar

Detta berodde oftast på att Supabase-anropet hängde eller att tabellerna saknades. Den här versionen har timeout och visar ett tydligt felkort i stället.

### `employees` eller `entries` saknas

Kör `supabase/schema.sql` i Supabase SQL Editor.

### Tom inloggningssida utan frisörer

Logga in som admin med PIN `0000` och lägg till frisörer under Team.
