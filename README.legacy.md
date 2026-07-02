# DashboardRecenze – legacy aplikace

Interni webova aplikace pro Alza CC, ktera sdruzuje vice provoznich dashboardu nad Excel daty. Aktualne obsahuje katalog aplikaci, dashboard recenzi a dashboard hodnoceni operatoru.

## Aplikace v katalogu

### Dashboard recenzi

Dashboard pro analyzu recenzi importovanych z Excelu. Pomaha rychle zjistit nejcastejsi duvody selhani, rozlozeni recenzi podle portalu, vykon operatoru, body za zpracovani a recenze zpracovane po limitu 24 hodin.

Hlavni funkce:

- import jednoho Excel souboru s recenzemi,
- filtrovani podle mesice, roku, portalu, operatora, hodnoceni a typu recenze,
- prehled nejcastejsich duvodu selhani,
- prehled portalu a zemi recenzi,
- kolacove grafy pro pomer negativnich/pozitivnich recenzi a podil portalu,
- vypocet bodu operatoru:
  - hodnoceni 1, 2 nebo 3 = negativni recenze = 1166,7 bodu,
  - hodnoceni 4 nebo 5 = pozitivni recenze = 312,5 bodu,
- samostatne okno pro recenze zpracovane nad 24 hodin,
- prehled pripadu, kdy se melo volat, ale operator rozhodnuti zmenil.

Ocekavane sloupce v Excelu s recenzemi:

| Sloupec | Vyznam |
| --- | --- |
| B | Mesic zadani |
| C | Rok zadani |
| D | Hodnoceni recenze 1-5 |
| E | Datum a cas zadani recenze |
| F | Datum a cas zpracovani recenze |
| G | Zeme recenze |
| H | Cislo objednavky |
| I | Zadany CCT / zakaznicky pozadavek |
| J | ID recenze z Heureky |
| K | Predmet recenze |
| O | Typ selhani |
| P | Portal recenze |
| Q | Operator, ktery recenzi zpracoval |
| R | Zda byla recenze slozita |
| S | Pocet minut u slozite recenze |
| U | Zda mel byt zakaznik navolany |
| V | Zmena rozhodnuti ve sloupci U |
| W | Vysledek dovolani |

### Hodnoceni operatoru

Dashboard pro spojeni hlavni tabulky uzivatelu s hodnocenim z oblasti Calls, CCT, Chaty a SOM. Vysledkem jsou prumery po operatorech, prumery pod jednotlivymi TL a detail konkretniho operatora vcetne jednotlivych hodnoceni.

Hlavni funkce:

- import hlavniho Excelu s uzivateli,
- import az ctyr Excelu s hodnocenim: Calls, CCT, Chaty, SOM,
- automaticke parovani hodnoceni na uzivatele,
- prumery za kazdy typ hodnoceni zvlast,
- celkovy prumer operatora pouze z typu, kde byl skutecne hodnoceny,
- prumery operatoru pod jednotlivymi TL,
- detail vybraneho operatora,
- seznam nesparovanych hodnoceni,
- filtrovani podle operatora a TL.

Podporovane varianty jmen:

- jmena s diakritikou i bez diakritiky,
- teckovy format, napr. `Jana.Novakova`,
- obracene poradi jmena, napr. `Novakova Jana`,
- prostredni jmena, napr. `Jana Klara Novakova` se sparuje s `Jana Novakova` i obracene.

Ocekavane sloupce v hlavnim Excelu uzivatelu:

| Sloupec | Vyznam |
| --- | --- |
| Jmeno (dle Prijmeni) | Cele jmeno uzivatele |
| Uzivatel | Identifikator / user |
| Prijemni / Prijmeni | Prijmeni |
| Jmeno | Krestni jmeno |
| Pracovni pozice | Pracovni pozice |
| Oddeleni | Oddeleni |
| Pododdeleni | Tym / pododdeleni |
| Typ uzivatele | Typ uzivatele |
| Nastup od | Datum nastupu |
| Primarni pobocka | Lokalita uzivatele |
| Manazer | TL daneho uzivatele |
| Manazer (zadavatel) (opener) | User/opener managera |
| Manazer (zadavatel) (jmeno) | Jmeno managera, ktere se zobrazuje v dashboardu |

Ocekavane sloupce v Excelech s hodnocenim:

| Sloupec | Vyznam |
| --- | --- |
| CallType | Co se hodnotilo |
| RatingTime | Cas hodnoceni |
| AgentName | Jmeno hodnoceneho operatora |
| ActorName | Jmeno hodnotitele |
| Rating | Hodnoceni |

## Spusteni lokalne

Pozadavky:

- Node.js,
- npm.

Instalace zavislosti:

```bash
npm install
```

Spusteni vyvojove verze:

```bash
npm run dev
```

Aplikace se spusti na lokalni adrese:

```text
http://127.0.0.1:5173/
```

Produkci build:

```bash
npm run build
```

Nahled produkcniho buildu:

```bash
npm run preview
```

## Testy

Automaticke testy analyticke logiky:

```bash
npm test
```

Testy pokryvaji hlavne:

- parsovani Excel sloupcu,
- vypocet bodu a SLA 24 hodin u recenzi,
- zmeny rozhodnuti volani,
- parovani hodnoceni na uzivatele,
- diakritiku, teckovy format jmen, obracene poradi a prostredni jmena.

## Technologie

- React
- Vite
- SheetJS / xlsx
- Node test runner

## Stav

Aplikace je ve fazi interniho vyvoje/testovani.
