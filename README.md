# DashboardRecenze

Interní webové nástroje pro Alza Customer Care nad Excel daty. Repozitář obsahuje:

1. **AI Performance Dashboard pro Customer Care** (nový, `apps/` + `packages/`) – analýza výkonnosti operátorů z Power BI exportů. Dokumentace níže.
2. **Legacy aplikaci** (kořen repozitáře, `src/`) – katalog aplikací, dashboard recenzí a hodnocení operátorů. Dokumentace v [`README.legacy.md`](README.legacy.md).

---

# AI Performance Dashboard pro Customer Care

Interní nástroj pro Team Leadery k analýze výkonnosti operátorů zákaznického centra na základě exportů z Power BI.

**Aplikace funguje kompletně lokálně – žádná data neopouštějí počítač.** Všechny importované reporty se ukládají pouze do IndexedDB v prohlížeči. Backend zatím neobsahuje žádnou AI logiku, pouze připravené endpointy pro druhou část projektu (AI Coach).

## Technologie

| Frontend | Backend | Sdílené |
| --- | --- | --- |
| React 18 + TypeScript | Node.js + Express + TypeScript | TypeScript typy a konstanty |
| Vite | tsx (dev runtime) | |
| Tailwind CSS + shadcn/ui styl komponent | | |
| Lucide React, Recharts, TanStack Table, React Hook Form | | |
| SheetJS (xlsx), IndexedDB (idb) | | |

## Struktura projektu

```text
apps/
  frontend/            # React aplikace (localhost:5173)
    src/
      components/      #   UI primitivy (shadcn/ui styl), grafy, layout
      pages/           #   Dashboard, Operátoři, Manažeři, Import, Historie
      hooks/           #   useTheme (dark mode), useReportData (datový kontext)
      services/        #   excelParser (xlsx), db (IndexedDB), api (backend klient)
      types/           #   typy aplikace (re-export sdílených)
      utils/           #   analytika, formátování, cn
  backend/             # Express API (localhost:3001)
    src/
      routes/          #   /api/health, /api/ai/recommendations
      controllers/
      services/        #   ai.service = placeholder pro AI Coach (část 2)
      middleware/      #   error handling
      config/
      types/
packages/
  shared/              # Sdílené typy (OperatorRecord, …) a mapování sloupců
```

## Spuštění

Požadavky: Node.js 20+ a npm.

```bash
# 1) Instalace závislostí (každá aplikace je samostatná)
cd apps/backend  && npm install
cd ../frontend   && npm install

# 2) Backend – http://localhost:3001
cd apps/backend
npm run dev

# 3) Frontend – http://localhost:5173 (v druhém terminálu)
cd apps/frontend
npm run dev
```

Frontend proxuje `/api` na backend (port 3001), takže není potřeba žádná další konfigurace. Frontend je plně funkční i bez běžícího backendu – veškerá data a analytika jsou na klientovi.

Další příkazy:

```bash
npm run build      # frontend: typecheck + produkční build do dist/
npm run typecheck  # frontend i backend: kontrola typů
npm run preview    # frontend: náhled produkčního buildu
```

## Import Power BI reportu

Na stránce **Import** nahrajte Excel export (`.xlsx` / `.xls`). První list musí obsahovat sloupce:

`Month / Name`, `Manager`, `FullName2`, `Attendance`, `Productivity`, `Productivity Performance`, `CSAT Call Count`, `CSAT Call Average`, `CSAT Call Performance`, `CSAT CCT Count`, `CSAT CCT Average`, `CSAT CCT Performance`, `CSAT Chat Count`, `CSAT Chat Average`, `CSAT Chat Performance`, `Internal Rating`, `Total Performance`

- `Month / Name` = období, `Manager` = přímý nadřízený, `FullName2` = operátor.
- Pokud některý povinný sloupec chybí, import se zastaví se srozumitelnou chybou.
- Prázdné hodnoty, `NaN`, `null` a neplatná čísla se bezpečně převedou na „bez hodnoty“ (v UI zobrazeno jako `–`), řádky bez období/jména se přeskočí s upozorněním.
- Procentní sloupce exportované jako zlomky (např. `1,03`) se automaticky normalizují na `103 %` – detekce probíhá po sloupcích (pokud jsou všechny hodnoty sloupce ≤ 5, jde o zlomky).
- Soubor může obsahovat i více období najednou – každé se uloží zvlášť.

### Historie reportů

Každé importované období se ukládá zvlášť do IndexedDB. Stránka **Historie** zobrazuje všechna období s datem importu, zdrojovým souborem, počtem operátorů a počtem manažerů a umožňuje:

- **nastavit aktivní období** (přepínač je i v sidebaru),
- **odstranit období** (s potvrzovacím dialogem),
- **přepsat období** novým Excel souborem (ikona ↻ – soubor musí dané období obsahovat),
- **exportovat období zpět do Excelu** (ikona ⬇ – soubor má stejné sloupce jako Power BI export).

Pokud se při běžném importu narazí na již existující období, aplikace nabídne **přepsání / ponechání stávajících dat / zrušení importu**.

### Porovnání období

Jakmile existují alespoň dvě období, stránka **Porovnání** zobrazí změny mezi dvěma vybranými obdobími: počet operátorů a manažerů, Ø Productivity, Ø Internal Rating, Ø Total Performance a Ø CSAT Call/Chat/CCT – jako delta karty se šipkami a skupinové sloupcové grafy.

## Co aplikace umí

- **Mission Control (Dashboard)** – místo tabulky s KPI velké interaktivní karty s odpověďmi: operátoři nad/pod cílem (proklik na filtrovanou tabulku), nejlepší tým, největší zlepšení a propad vs. minulé období, největší rezerva. Pod nimi kompaktní pás průměrů, TOP/Bottom 5 a rozložení výkonu.
- **Performance Matrix** – XY mapa (produktivita × CSAT): každý bod je operátor, barva = Total Performance, velikost = počet hodnocených kontaktů. Kvadranty okamžitě ukážou hvězdy i kandidáty na coaching; filtr podle managera a období, volitelné popisky, klik otevře boční panel.
- **Heatmapa týmů** – celá firma na jedné obrazovce: řádek = tým, buňka = operátor, barva = výkon; nejslabší týmy nahoře. Klik na tým rozbalí členy, klik na buňku otevře operátora.
- **Měsíční souhrn (Story Mode)** – automaticky generovaný manažerský přehled v přirozeném jazyce: kolik lidí pracovalo, jak se pohnula výkonnost vs. minulé období, který tým se nejvíc zlepšil/propadl, kde jsou největší rezervy a zda firma splnila cíl. Doplněno skokany období a poklesy.
- **Drill-down bez nových oken** – klik na operátora kdekoli (matrix, heatmapa, žebříčky) otevře boční panel s Performance DNA (animované KPI prstence), CSAT kanály, trendem a deltou vs. minulé období; odtud proklik na celý profil.
- **Rychlé vyhledávání (Ctrl/⌘ + K)** – paleta příkazů ve stylu Linear/Raycast: hledání operátorů (bez ohledu na diakritiku), manažerů a stránek; operátor se otevře rovnou v bočním panelu. Spustí se i tlačítkem „Hledat…“ v sidebaru.
- **Coaching watchlist** – hvězdičkou (v bočním panelu, detailu operátora nebo pravým klikem v tabulce) si Team Leader připne operátory, které zrovna coachuje; sledovaní se zobrazují ve vlastní sekci na Mission Control i přednostně ve vyhledávání. Ukládá se lokálně.
- **Export matrixu** – tlačítka PNG (obrázek grafu ve 2× rozlišení, vhodný do prezentací) a Excel (data všech bodů včetně zařazení do kvadrantu Hvězdy / Kvalita bez tempa / Tempo bez kvality / Prioritní coaching); export respektuje aktivní filtr managera.
- **Smart hover** – najetí na operátora zobrazí kartu s KPI, trendem oproti minulému období a mini grafem.
- **Dashboard** – počty operátorů a manažerů, průměrné KPI (Total Performance, Productivity, Internal Rating, CSAT Call/Chat/CCT), TOP 5 a Bottom 5 operátorů, nejlepší a nejslabší tým, histogramy rozložení, průměrné CSAT podle kanálu, porovnání manažerů a export do PDF.
- **Operátoři** – tabulka se všemi KPI, vyhledávání, řazení, stránkování, kombinovatelné filtry (manager, období, min./max. Total Performance, min. Attendance, min. Internal Rating), barevné zvýraznění hodnot, kontextové menu (pravý klik), export výběru do Excelu/CSV a proklik na detail.
- **Detail operátora** – záložky **Přehled** (KPI karty, progress bary, radar vs. tým, CSAT) a **Trend** (čárové grafy vývoje Total Performance, Productivity, Internal Rating a CSAT Call/Chat/CCT napříč obdobími; bez historie se zobrazí informace). Kliknutím na kteroukoli KPI kartu se otevře **detail KPI** s hodnotou, průměrem firmy, průměrem týmu, pořadím a percentilem. Export detailu do PDF.
- **Manažeři** – karty týmů a detail s KPI, nejlepším/nejslabším operátorem, radarem, statistikami výkonu (medián, minimum, maximum, směrodatná odchylka, rozptyl), rozložením výkonu, **trendem týmu** (výkon, produktivita, CSAT, počet členů) a tabulkou členů. Export do PDF.
- **Ranking** – TOP a BOTTOM operátoři podle Total Performance, Productivity, Internal Rating a CSAT Call/Chat/CCT s volitelným počtem výsledků (3/5/10/20).
- **UX** – dark/light mode, sidebar, breadcrumb navigace, klávesové zkratky (nápověda pod `?`), tooltipy, kontextové menu, animace, toast notifikace, skeleton loading a potvrzovací dialogy, responzivní layout.

### Barevná logika

Barvy nesou informaci (5 úrovní): **zelená** = výrazně nad cílem, **modrá** = splněný cíl, **žlutá** = mírně pod cílem, **oranžová** = vyžaduje pozornost, **červená** = kritický stav. Hranice vychází z nastavitelného cíle (100 % není maximum). Legenda je přímo u matrixu a heatmapy.

### Vizuální identita

Aplikace používá firemní paletu **#5ED312 (zelená, hlavní barva)**, #5C2483 (fialová), #344661 (slate), #164194 (navy) a #0094E7 (azurová):

- sidebar má gradient slate→navy se zelenými aktivními položkami,
- na pozadí běží **animovaná scéna z SVG podkladů** (planeta s raketou, plovoucí astronaut, stromy) doplněná měkkými barevnými zářemi; scéna je čistě dekorativní – netiskne se, nereaguje na myš a respektuje `prefers-reduced-motion`,
- grafy používají tytéž odstíny **snapnuté na validované kroky** (kontrast ≥ 3:1 vůči podkladu, bezpečné rozestupy pro barvoslepost v light i dark režimu).

### Klávesové zkratky

`Ctrl/⌘ K` vyhledávání · `g d` Mission Control · `g s` Souhrn · `g x` Matrix · `g e` Heatmapa · `g o` Operátoři · `g m` Manažeři · `g r` Ranking · `g p` Porovnání · `g h` Historie · `g i` Import · `g n` Nastavení · `t` přepnutí režimu · `/` fokus vyhledávání · `?` nápověda

## Export dat

- **Seznam operátorů** (respektuje aktivní filtry) → Excel nebo CSV (UTF-8 s BOM, oddělovač `;`) – tlačítka na stránce Operátoři.
- **Uložené období** → Excel se stejnými sloupci jako vstup – ikona na stránce Historie.
- **Dashboard, detail operátora, detail manažera** → PDF přes tiskový dialog prohlížeče („Uložit jako PDF“); navigace a ovládací prvky se netisknou.

Všechny exporty se generují lokálně v prohlížeči.

## Nastavení aplikace

Stránka **Nastavení** ukládá předvolby do `localStorage`:

- **výchozí období** – aktivní období po startu aplikace,
- **výchozí manager** – předvyplněný filtr v tabulce operátorů,
- **světlý/tmavý režim**,
- **počet řádků v tabulkách**,
- **barevné hranice KPI** – od kolika procent je hodnota zelená / neutrální / oranžová (pod poslední hranicí červená).

## Výkon

Aplikace je stavěná na **5 000+ operátorů na období**: stránky se načítají lazy (code-splitting), grafy a karty jsou memoizované a tabulka operátorů se při volbě „Vše“ **virtualizuje** (vykresluje se jen viditelný výřez). Import 15 000 řádků (3 období × 5 000 operátorů) proběhne v jednotkách sekund.

## Poznámka ke KPI

**100 % není maximální hodnota.** Operátoři běžně dosahují 103 %, 112 % i 125 % – takové hodnoty nejsou chyba a grafy i progress bary automaticky přizpůsobují měřítko datům. **Total Performance je hlavní KPI**; ostatní metriky výsledný výkon pouze vysvětlují. Aplikace nevytváří žádné vlastní skóre.

## Připravenost na AI (část 2)

- Backend má hotový service/controller/route skelet: `POST /api/ai/recommendations` přijímá `{ period, records }` a zatím vrací `available: false`. Reálná AI logika se doplní pouze v `apps/backend/src/services/ai.service.ts`.
- Sdílené typy `AiRecommendationRequest` / `AiRecommendationResponse` v `packages/shared` používá frontend i backend.
- Frontend má připraveného API klienta (`apps/frontend/src/services/api.ts`).
