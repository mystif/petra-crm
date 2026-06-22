# Petra CRM

Moderní CRM pro realitní makléřku Petru Zábranskou. Leady chodí z formulářů na webu do Supabace a v CRM se zpracovávají přes pipeline.

## Spuštění (vývoj)

```bash
npm install
npm run dev      # → http://localhost:5173
```

## Sekce

- **Dashboard** — přehled, KPI (hodnota pipeline, uzavřeno, nové poptávky, kontakty), funnel podle fází, nejnovější poptávky.
- **Pipeline** — kanban s drag-drop. Přesun karty mění fázi leadu (`crm_status`) přímo v Supabase. Každý sloupec ukazuje hodnotu fáze v Kč.
- **Poptávky** — leady z webových formulářů a žádosti o odhad. Filtr (vše / poptávky / odhady), zdrojové štítky, fáze, rozpočet/odhad.
- **Kontakty** — řádková tabulka odvozená z leadů (sloučeno podle e-mailu): jméno, telefon, e-mail, role, hodnota, aktivita.

## Databáze (Supabase)

- Projekt: **Petra Reality Web** (`rhdxopvennrbkhkqeqvb`).
- Tabulka **`leadyCRM`** — leady z formulářů + CRM pole (`crm_status`, `crm_note`, `meeting_at`, `follow_up_at`…).
- Připojení je v [src/lib/supabase.ts](src/lib/supabase.ts); lze přepsat přes `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=...
```

> **Pozor – ochrana dat:** tabulka `leadyCRM` má zatím otevřené RLS politiky (čtení/zápis anonymním klíčem), aby CRM fungovalo bez přihlášení. Než se napojí reálné formuláře s osobními údaji, je nutné přístup zúžit (přihlášení přes Supabase Auth nebo privátní repo). Viz poznámka níže.

## Build & nasazení

```bash
npm run build    # výstup do dist/
```

Push do `main` automaticky sestaví a nasadí na GitHub Pages (workflow `.github/workflows/deploy.yml`). V repu je potřeba mít **Settings → Pages → Source: GitHub Actions**.

## Stack

Vite · React + TypeScript · Tailwind CSS · @supabase/supabase-js · lucide-react.
