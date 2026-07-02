import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import { DotField } from "@components/DotField";
import {
  analyzeEvaluations,
  filterOperatorResults,
  formatEvaluationValue,
  getEvaluationFilterOptions,
  rowsToEvaluationRows,
  rowsToUsers,
} from "./lib/evaluationAnalytics.js";
import {
  analyzeReviews,
  filterReviews,
  formatDateTime,
  getFilterOptions,
  rowsToReviews,
} from "./lib/reviewAnalytics.js";

const initialFilters = {
  month: "",
  year: "",
  portal: "",
  operator: "",
  country: "",
  rating: "",
  ratingGroup: "",
  onlyOver24h: false,
};

const dashboardViews = [
  { id: "all", label: "Vše" },
  { id: "summary", label: "Přehled" },
  { id: "charts", label: "Grafy" },
  { id: "operators", label: "Operátoři" },
  { id: "reviews", label: "Recenze" },
  { id: "over24", label: "Nad 24 h" },
  { id: "callChanges", label: "Změny volání" },
];

const numberFormatter = new Intl.NumberFormat("cs-CZ");
const pointsFormatter = new Intl.NumberFormat("cs-CZ", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const pieColors = ["#0f766e", "#5b5fc7", "#38a169", "#b7791f", "#0e7490", "#b42318"];
const evaluationTypes = ["Calls", "CCT", "Chaty", "SOM"];

const appCatalog = [
  {
    id: "reviews",
    name: "Dashboard recenzí",
    audience: "Teamleadeři CC",
    status: "Testování",
    description: "Analýza recenzí z Excelu podle portálů, důvodů selhání, operátorů, bodů a zpracování nad 24 hodin.",
    meta: "Excel import • body • SLA 24 h",
    active: true,
  },
  {
    id: "evaluations",
    name: "Hodnocení operátorů",
    audience: "Teamleadeři CC",
    status: "Vývoj",
    description: "Spojuje hlavní tabulku uživatelů s hodnocením Calls, CCT, Chaty a SOM a počítá průměry po operátorech i TL.",
    meta: "5 Excelů • TL průměry • detail operátora",
    active: true,
  },
  {
    id: "slot-automation",
    name: "Další aplikace",
    audience: "CC Automatizace",
    status: "Připravuje se",
    description: "Místo pro další interní nástroj, který půjde doplnit do společného katalogu.",
    meta: "Rezervovaný slot",
    active: false,
  },
  {
    id: "slot-care",
    name: "Další aplikace",
    audience: "Zákaznická péče",
    status: "Připravuje se",
    description: "Katalog je připravený na rozšíření o další dashboardy, asistenty nebo provozní přehledy.",
    meta: "Rezervovaný slot",
    active: false,
  },
];

export default function App() {
  const inputRef = useRef(null);
  const [activeApp, setActiveApp] = useState("catalog");
  const [reviews, setReviews] = useState([]);
  const [fileName, setFileName] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState("");
  const [isOver24Open, setIsOver24Open] = useState(false);
  const [activeView, setActiveView] = useState("all");

  const filteredReviews = useMemo(() => filterReviews(reviews, filters), [reviews, filters]);
  const filterOptions = useMemo(() => getFilterOptions(reviews), [reviews]);
  const analysis = useMemo(() => analyzeReviews(filteredReviews), [filteredReviews]);
  const allAnalysis = useMemo(() => analyzeReviews(reviews), [reviews]);
  const hasData = reviews.length > 0;

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      const rows = await readWorkbookRows(file);
      const parsedReviews = rowsToReviews(rows);

      if (!parsedReviews.length) {
        setReviews([]);
        setFileName(file.name);
        setError("V souboru se nepodařilo najít žádné recenze. Zkontroluj, že data začínají na prvním listu a sloupce odpovídají zadání.");
        return;
      }

      setReviews(parsedReviews);
      setFileName(file.name);
      setFilters(initialFilters);
      setActiveView("all");
    } catch (readError) {
      setError(`Soubor se nepodařilo načíst: ${readError.message}`);
    } finally {
      event.target.value = "";
    }
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters(initialFilters);
  }

  return (
    <main className="app-shell">
      <BackgroundScene />
      {activeApp === "catalog" && <AppCatalog apps={appCatalog} onOpenApp={setActiveApp} />}
      <div className={activeApp === "reviews" ? "app-view is-visible" : "app-view"}>
      <header className="topbar">
        <div>
          <h1>Dashboard recenzí</h1>
          <p>Analýza portálů, důvodů selhání, zpracování nad 24 hodin a bodů operátorů.</p>
        </div>
        <div className="upload-actions">
          <button className="secondary-button" onClick={() => setActiveApp("catalog")}>
            Katalog aplikací
          </button>
          <input
            ref={inputRef}
            className="file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />
          <button className="primary-button" onClick={() => inputRef.current?.click()}>
            Nahrát Excel
          </button>
          {fileName && <span className="file-name">{fileName}</span>}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {!hasData ? (
        <EmptyState onUpload={() => inputRef.current?.click()} />
      ) : (
        <div className="workspace">
          <aside className="filter-panel">
            <div className="panel-header">
              <h2>Filtry</h2>
              <button className="text-button" onClick={clearFilters}>
                Vyčistit
              </button>
            </div>
            <SelectFilter label="Měsíc" value={filters.month} options={filterOptions.months} onChange={(value) => updateFilter("month", value)} />
            <SelectFilter label="Rok" value={filters.year} options={filterOptions.years} onChange={(value) => updateFilter("year", value)} />
            <SelectFilter label="Portál" value={filters.portal} options={filterOptions.portals} onChange={(value) => updateFilter("portal", value)} />
            <SelectFilter label="Operátor" value={filters.operator} options={filterOptions.operators} onChange={(value) => updateFilter("operator", value)} />
            <SelectFilter label="Země" value={filters.country} options={filterOptions.countries} onChange={(value) => updateFilter("country", value)} />
            <SelectFilter label="Hodnocení" value={filters.rating} options={[1, 2, 3, 4, 5]} onChange={(value) => updateFilter("rating", value)} />
            <SelectFilter
              label="Typ recenze"
              value={filters.ratingGroup}
              options={[
                ["negative", "Negativní 1-3"],
                ["positive", "Pozitivní 4-5"],
              ]}
              onChange={(value) => updateFilter("ratingGroup", value)}
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={filters.onlyOver24h}
                onChange={(event) => updateFilter("onlyOver24h", event.target.checked)}
              />
              Jen zpracování nad 24 hodin
            </label>
          </aside>

          <section className={`dashboard view-${activeView}`}>
            <DashboardNav activeView={activeView} onChange={setActiveView} />
            <div className="kpi-grid">
              <KpiCard label="Recenze ve filtru" value={analysis.kpis.totalReviews} helper={`Celkem v souboru ${numberFormatter.format(reviews.length)}`} />
              <KpiCard label="Negativní recenze" value={analysis.kpis.negativeReviews} helper="Hodnocení 1 až 3" tone="danger" />
              <KpiCard label="Pozitivní recenze" value={analysis.kpis.positiveReviews} helper="Hodnocení 4 až 5" tone="good" />
              <KpiCard label="Průměrné hodnocení" value={analysis.kpis.averageRating || "-"} helper="Po aplikaci filtrů" />
              <KpiCard
                label="Nad 24 hodin"
                value={analysis.kpis.over24hCount}
                helper={`Celkem bez filtru ${numberFormatter.format(allAnalysis.kpis.over24hCount)}`}
                tone="warning"
                action={<button className="small-button" onClick={() => setIsOver24Open(true)}>Otevřít</button>}
              />
              <KpiCard label="Body k doplnění" value={pointsFormatter.format(analysis.kpis.totalPoints)} helper="Součet bodů operátorů" />
            </div>

            <div className="analysis-grid">
              <BarPanel title="Důvody selhání" data={analysis.failureReasons} />
              <BarPanel title="Portály recenzí" data={analysis.portals} />
              <BarPanel title="Země recenzí" data={analysis.countries} />
              <BarPanel title="Dovolání" data={analysis.callOutcomes} />
            </div>

            <div className="pie-grid">
              <PiePanel
                title="Poměr recenzí"
                data={[
                  { label: "Negativní 1-3", count: analysis.kpis.negativeReviews, color: "#b42318" },
                  { label: "Pozitivní 4-5", count: analysis.kpis.positiveReviews, color: "#177245" },
                ]}
              />
              <PiePanel
                title="Podíl portálů"
                data={analysis.portals.slice(0, 6).map((item, index) => ({
                  ...item,
                  color: pieColors[index % pieColors.length],
                }))}
              />
            </div>

            <div className="table-grid">
              <OperatorTable operators={analysis.operatorStats} />
              <ReviewTable reviews={filteredReviews.slice(0, 12)} />
            </div>

            <div className="over24-grid">
              <Over24Panel reviews={analysis.over24h} />
            </div>

            <div className="call-change-grid">
              <CallDecisionChangePanel analysis={analysis} />
            </div>
          </section>
        </div>
      )}

      {isOver24Open && (
        <Over24Dialog reviews={analysis.over24h} onClose={() => setIsOver24Open(false)} />
      )}
      </div>
      <div className={activeApp === "evaluations" ? "app-view is-visible" : "app-view"}>
        <EvaluationDashboard onBack={() => setActiveApp("catalog")} />
      </div>
    </main>
  );
}

async function readWorkbookRows(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
}

function formatRawDateTime(value) {
  if (!value) return "";
  return value instanceof Date ? formatDateTime(value) : String(value);
}

function EvaluationDashboard({ onBack }) {
  const [users, setUsers] = useState([]);
  const [userFileName, setUserFileName] = useState("");
  const [evaluationSets, setEvaluationSets] = useState(evaluationTypes.map((type) => ({ type, ratings: [], fileName: "" })));
  const [filters, setFilters] = useState({ operator: "", manager: "" });
  const [error, setError] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);

  const analysis = useMemo(() => analyzeEvaluations(users, evaluationSets), [users, evaluationSets]);
  const filteredOperators = useMemo(() => filterOperatorResults(analysis.operatorResults, filters), [analysis.operatorResults, filters]);
  const filterOptions = useMemo(() => getEvaluationFilterOptions(analysis.operatorResults), [analysis.operatorResults]);
  const selectedOperator = filters.operator ? analysis.operatorResults.find((operator) => operator.name === filters.operator) : null;
  const hasRatings = evaluationSets.some((set) => set.ratings.length);
  const hasEvaluationData = users.length > 0 && hasRatings;
  const hasCompleteUpload = users.length > 0 && evaluationSets.every((set) => set.fileName);
  const showImport = !hasCompleteUpload || isImportOpen;
  const uploadedSources = [
    { label: "Uživatelé", fileName: userFileName, count: users.length },
    ...evaluationSets.map((set) => ({ label: set.type, fileName: set.fileName, count: set.ratings.length })),
  ];

  async function handleUsersFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      const parsedUsers = rowsToUsers(await readWorkbookRows(file));
      if (!parsedUsers.length) {
        setUsers([]);
        setUserFileName(file.name);
        setError("V hlavním souboru se nepodařilo najít uživatele. Zkontroluj hlavičky Jméno (dle Přijmení), Uživatel, Nástup od, Primární pobočka a Manažer.");
        return;
      }
      setUsers(parsedUsers);
      setUserFileName(file.name);
      setFilters({ operator: "", manager: "" });
      if (evaluationSets.every((set) => set.fileName)) {
        setIsImportOpen(false);
      }
    } catch (readError) {
      setError(`Soubor uživatelů se nepodařilo načíst: ${readError.message}`);
    } finally {
      event.target.value = "";
    }
  }

  async function handleEvaluationFile(type, event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      const ratings = rowsToEvaluationRows(await readWorkbookRows(file), type);
      if (!ratings.length) {
        setError(`V souboru ${type} se nepodařilo najít hodnocení. Zkontroluj hlavičky CallType, RatingTime, AgentName, ActorName a Rating.`);
      }
      setEvaluationSets((currentSets) => {
        const nextSets = currentSets.map((set) => (
          set.type === type ? { ...set, ratings, fileName: file.name } : set
        ));
        if (users.length && nextSets.every((set) => set.fileName)) {
          setIsImportOpen(false);
        }
        return nextSets;
      });
    } catch (readError) {
      setError(`Soubor ${type} se nepodařilo načíst: ${readError.message}`);
    } finally {
      event.target.value = "";
    }
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearEvaluationData() {
    setUsers([]);
    setUserFileName("");
    setEvaluationSets(evaluationTypes.map((type) => ({ type, ratings: [], fileName: "" })));
    setFilters({ operator: "", manager: "" });
    setError("");
    setIsImportOpen(false);
  }

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Hodnocení operátorů</h1>
          <p>Sdružení uživatelů s hodnocením Calls, CCT, Chaty a SOM včetně průměrů po operátorech a TL.</p>
        </div>
        <div className="upload-actions">
          <button className="secondary-button" onClick={onBack}>
            Katalog aplikací
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="evaluation-app">
        {hasEvaluationData && (
          <EvaluationDataBar
            sources={uploadedSources}
            onEdit={() => setIsImportOpen((current) => !current)}
            onClear={clearEvaluationData}
            isImportOpen={isImportOpen}
          />
        )}

        {showImport && (
          <div className="evaluation-import">
            <div className="evaluation-upload-grid">
              <UploadTile
                title="Uživatelé"
                description="Jméno (dle Přijmení), Uživatel, Nástup od, Primární pobočka a Manažer."
                fileName={userFileName}
                count={users.length}
                onChange={handleUsersFile}
              />
              {evaluationSets.map((set) => (
                <UploadTile
                  key={set.type}
                  title={set.type}
                  description="CallType, RatingTime, AgentName, ActorName a Rating."
                  fileName={set.fileName}
                  count={set.ratings.length}
                  onChange={(event) => handleEvaluationFile(set.type, event)}
                />
              ))}
            </div>
          </div>
        )}

        {!hasEvaluationData ? (
          <section className="evaluation-start">
            <h2>Nahraj hlavní Excel uživatelů a alespoň jedno hodnocení</h2>
            <p>Jakmile budou data nahraná, import se sbalí a zůstane jen souvislý přehled s průměry za Calls, CCT, Chaty, SOM, celkovým průměrem a přehledem podle TL.</p>
          </section>
        ) : (
          <div className="evaluation-dashboard">
            <section className="evaluation-content">
              <div className="evaluation-toolbar">
                <div>
                  <h2>Vyhodnocení</h2>
                  <p>Průměry se počítají pouze z typů hodnocení, které má operátor skutečně vyplněné.</p>
                </div>
                <div className="evaluation-toolbar-controls">
                  <SelectFilter label="Operátor" value={filters.operator} options={filterOptions.operators} onChange={(value) => updateFilter("operator", value)} />
                  <SelectFilter label="TL / manažer" value={filters.manager} options={filterOptions.managers} onChange={(value) => updateFilter("manager", value)} />
                  <button className="text-button" onClick={() => setFilters({ operator: "", manager: "" })}>
                    Vyčistit
                  </button>
                </div>
              </div>

              <div className="kpi-grid evaluation-kpis">
                <KpiCard label="Operátoři" value={analysis.kpis.totalOperators} helper="V hlavním souboru" />
                <KpiCard label="Ohodnocení" value={analysis.kpis.ratedOperators} helper="Mají alespoň jedno hodnocení" tone="good" />
                <KpiCard label="Hodnocení celkem" value={analysis.kpis.totalRatings} helper="Napříč Calls, CCT, Chaty a SOM" />
                <KpiCard label="Průměr celkem" value={formatEvaluationValue(analysis.kpis.overallAverage)} helper="Průměr z dostupných typů" />
                <KpiCard label="Nespárované" value={analysis.kpis.unmatchedRatings} helper="Hodnocení bez uživatele v hlavní tabulce" tone="warning" />
              </div>

              <div className="evaluation-grid">
                <TypeAveragePanel typeStats={analysis.typeStats} />
                <ManagerEvaluationTable managers={analysis.managerStats} />
              </div>

              {selectedOperator && <OperatorDetail operator={selectedOperator} />}

              <OperatorEvaluationTable operators={filteredOperators} />

              {hasRatings && <UnmatchedRatingsPanel ratings={analysis.unmatchedRatings} />}
            </section>
          </div>
        )}
      </section>
    </>
  );
}

function EvaluationDataBar({ sources, onEdit, onClear, isImportOpen }) {
  return (
    <section className="evaluation-data-bar">
      <div>
        <span>Data nahrána</span>
        <strong>{sources.filter((source) => source.count > 0).length} / {sources.length} zdrojů</strong>
      </div>
      <div className="evaluation-data-sources">
        {sources.map((source) => (
          <span className={source.count ? "is-loaded" : ""} key={source.label} title={source.fileName || "Soubor není nahraný"}>
            {source.label}: {numberFormatter.format(source.count)}
          </span>
        ))}
      </div>
      <div className="evaluation-data-actions">
        <button className="secondary-button" onClick={onEdit}>
          {isImportOpen ? "Skrýt import" : "Změnit soubory"}
        </button>
        <button className="text-button" onClick={onClear}>
          Vyčistit data
        </button>
      </div>
    </section>
  );
}

function UploadTile({ title, description, fileName, count, onChange }) {
  return (
    <article className="upload-tile">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <label className="upload-tile-control">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onChange} />
        <span>{fileName ? "Změnit soubor" : "Nahrát soubor"}</span>
      </label>
      <div className="upload-tile-meta">
        <span>{fileName || "Soubor není nahraný"}</span>
        <strong>{numberFormatter.format(count)} řádků</strong>
      </div>
    </article>
  );
}

function TypeAveragePanel({ typeStats }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Průměry podle typu</h2>
      </div>
      <div className="type-average-list">
        {typeStats.map((type) => (
          <div className="type-average-row" key={type.type}>
            <span>{type.type}</span>
            <strong>{formatEvaluationValue(type.average)}</strong>
            <small>{numberFormatter.format(type.ratedOperatorCount)} operátorů</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ManagerEvaluationTable({ managers }) {
  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <h2>Průměr pod TL</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>TL / manažer</th>
              <th>Operátorů</th>
              <th>Ohodnoceno</th>
              <th>Průměr</th>
            </tr>
          </thead>
          <tbody>
            {managers.map((manager) => (
              <tr key={manager.manager}>
                <td>{manager.manager}</td>
                <td>{numberFormatter.format(manager.operatorCount)}</td>
                <td>{numberFormatter.format(manager.ratedOperatorCount)}</td>
                <td>{formatEvaluationValue(manager.average)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OperatorDetail({ operator }) {
  return (
    <section className="panel operator-detail-panel">
      <div className="operator-detail-head">
        <div>
          <h2>{operator.name}</h2>
          <p>{operator.user || "Bez useru"} • {operator.manager || "Bez TL"} • {operator.location || "Bez lokality"}</p>
        </div>
        <div className="operator-detail-values">
          {evaluationTypes.map((type) => (
            <div key={type}>
              <span>{type}</span>
              <strong>{formatEvaluationValue(operator.averages[type])}</strong>
            </div>
          ))}
          <div>
            <span>Celkem</span>
            <strong>{formatEvaluationValue(operator.overallAverage)}</strong>
          </div>
        </div>
      </div>
      <div className="operator-rating-detail">
        <h3>Jednotlivá hodnocení</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Typ</th>
                <th>CallType</th>
                <th>Čas hodnocení</th>
                <th>Hodnotitel</th>
                <th>Hodnocení</th>
              </tr>
            </thead>
            <tbody>
              {operator.ratingDetails.map((rating) => (
                <tr key={`${rating.type}-${rating.rowNumber}-${rating.evaluatorName}`}>
                  <td>{rating.type}</td>
                  <td>{rating.callType || rating.type}</td>
                  <td>{formatRawDateTime(rating.ratingTime)}</td>
                  <td>{rating.evaluatorName || "Nevyplněno"}</td>
                  <td>{formatEvaluationValue(rating.rating)}</td>
                </tr>
              ))}
              {!operator.ratingDetails.length && (
                <tr>
                  <td colSpan="5" className="empty-cell">Operátor zatím nemá žádné spárované hodnocení.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function OperatorEvaluationTable({ operators }) {
  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <h2>Operátoři</h2>
        <span className="muted">{numberFormatter.format(operators.length)} ve filtru</span>
      </div>
      <div className="table-wrap">
        <table className="evaluation-table">
          <thead>
            <tr>
              <th>Jméno</th>
              <th>User</th>
              <th>TL</th>
              <th>Odkud je</th>
              {evaluationTypes.map((type) => <th key={type}>{type}</th>)}
              <th>Celkem</th>
            </tr>
          </thead>
          <tbody>
            {operators.map((operator) => (
              <tr key={`${operator.name}-${operator.user}`}>
                <td>{operator.name}</td>
                <td>{operator.user}</td>
                <td>{operator.manager}</td>
                <td>{operator.location}</td>
                {evaluationTypes.map((type) => (
                  <td key={type}>{formatEvaluationValue(operator.averages[type])}</td>
                ))}
                <td><strong>{formatEvaluationValue(operator.overallAverage)}</strong></td>
              </tr>
            ))}
            {!operators.length && (
              <tr>
                <td colSpan="9" className="empty-cell">Pro aktuální filtr nejsou žádní operátoři.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UnmatchedRatingsPanel({ ratings }) {
  return (
    <section className="panel table-panel unmatched-panel">
      <div className="panel-header">
        <h2>Nespárovaná hodnocení</h2>
        <span className="muted">{numberFormatter.format(ratings.length)} řádků</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Typ</th>
              <th>Řádek</th>
              <th>Čas hodnocení</th>
              <th>Hodnotitel</th>
              <th>Hodnocený</th>
              <th>Hodnocení</th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((rating) => (
              <tr key={`${rating.type}-${rating.rowNumber}-${rating.evaluatedName}`}>
                <td>{rating.type}</td>
                <td>{rating.rowNumber}</td>
                <td>{formatRawDateTime(rating.ratingTime)}</td>
                <td>{rating.evaluatorName}</td>
                <td>{rating.evaluatedName}</td>
                <td>{formatEvaluationValue(rating.rating)}</td>
              </tr>
            ))}
            {!ratings.length && (
              <tr>
                <td colSpan="6" className="empty-cell">Všechna hodnocení jsou spárovaná na uživatele.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AppCatalog({ apps, onOpenApp }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const statusOptions = [...new Set(apps.map((app) => app.status))];
  const normalizedSearch = search.trim().toLocaleLowerCase("cs-CZ");
  const visibleApps = apps.filter((app) => {
    const matchesSearch = !normalizedSearch || `${app.name} ${app.description} ${app.audience}`.toLocaleLowerCase("cs-CZ").includes(normalizedSearch);
    const matchesStatus = !status || app.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <section className="catalog-shell">
      <header className="catalog-hero">
        <div>
          <h1>Alza CC Apps</h1>
          <p>Interní katalog nástrojů pro zákaznickou péči, reporting a automatizace.</p>
        </div>
        <div className="catalog-controls" aria-label="Filtrování aplikací">
          <label>
            <span>Hledat</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Název nebo tým" />
          </label>
          <label>
            <span>Stav</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Vše</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="catalog-grid">
        {visibleApps.map((app) => (
          <article className={`app-card ${app.active ? "is-active" : "is-disabled"}`} key={app.id}>
            <div className="app-card-top">
              <span>{app.status}</span>
              <strong>{app.audience}</strong>
            </div>
            <h2>{app.name}</h2>
            <p>{app.description}</p>
            <div className="app-card-footer">
              <span>{app.meta}</span>
              <button
                className={app.active ? "primary-button" : "secondary-button"}
                disabled={!app.active}
                onClick={() => onOpenApp(app.id)}
              >
                {app.active ? "Otevřít" : "Brzy"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BackgroundScene() {
  return (
    <div className="background-scene" aria-hidden="true">
      <DotField
        dotRadius={3.0}
        dotSpacing={21}
        cursorRadius={500}
        cursorForce={0.10}
        bulgeOnly={true}
        bulgeStrength={67}
        glowRadius={160}
        sparkle={false}
        waveAmplitude={0}
      />
      <img className="scene-asset city-asset" src="/assets/buildings@2x.png" alt="" />
      <img className="scene-asset planet-asset" src="/assets/planet-rocket-astronauts.svg" alt="" />
      <img className="scene-asset trees-asset" src="/assets/trees.svg" alt="" />
      <img className="scene-asset astronaut-asset" src="/assets/astronaut.svg" alt="" />
    </div>
  );
}

function DashboardNav({ activeView, onChange }) {
  return (
    <nav className="view-nav" aria-label="Zobrazení dashboardu">
      {dashboardViews.map((view) => (
        <button
          key={view.id}
          type="button"
          className={activeView === view.id ? "active" : ""}
          aria-pressed={activeView === view.id}
          onClick={() => onChange(view.id)}
        >
          {view.label}
        </button>
      ))}
    </nav>
  );
}

function EmptyState({ onUpload }) {
  return (
    <section className="empty-state">
      <h2>Nahraj Excel s recenzemi</h2>
      <p>
        Dashboard očekává data na prvním listu. Po nahrání spočítá důvody selhání, portály,
        výkon operátorů, body a recenze zpracované později než za 24 hodin.
      </p>
      <button className="primary-button" onClick={onUpload}>Vybrat soubor</button>
    </section>
  );
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Vše</option>
        {options.map((option) => {
          const optionValue = Array.isArray(option) ? option[0] : option;
          const optionLabel = Array.isArray(option) ? option[1] : option;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function KpiCard({ label, value, helper, tone = "neutral", action }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{typeof value === "number" ? numberFormatter.format(value) : value}</strong>
        <small>{helper}</small>
      </div>
      {action}
    </article>
  );
}

function BarPanel({ title, data }) {
  const topData = data.slice(0, 8);
  const max = Math.max(...topData.map((item) => item.count), 1);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      {topData.length ? (
        <div className="bar-list">
          {topData.map((item) => (
            <div className="bar-row" key={item.label}>
              <span className="bar-label" title={item.label}>{item.label}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(item.count / max) * 100}%` }} />
              </div>
              <strong>{numberFormatter.format(item.count)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Pro aktuální filtr nejsou data.</p>
      )}
    </section>
  );
}

function PiePanel({ title, data }) {
  const slices = data.filter((item) => item.count > 0);
  const total = slices.reduce((sum, item) => sum + item.count, 0);
  const gradient = total ? buildPieGradient(slices, total) : "#e9eef2";

  return (
    <section className="panel pie-panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      {total ? (
        <div className="pie-content">
          <div className="pie-chart" style={{ background: gradient }} aria-hidden="true">
            <div className="pie-total">
              <strong>{numberFormatter.format(total)}</strong>
              <span>celkem</span>
            </div>
          </div>
          <div className="pie-legend">
            {slices.map((item) => (
              <div className="pie-legend-row" key={item.label}>
                <span className="pie-swatch" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
                <strong>{Math.round((item.count / total) * 100)} %</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="muted">Pro aktuĂˇlnĂ­ filtr nejsou data.</p>
      )}
    </section>
  );
}

function buildPieGradient(slices, total) {
  let current = 0;
  const stops = slices.map((item) => {
    const start = current;
    current += (item.count / total) * 100;
    return `${item.color} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function OperatorTable({ operators }) {
  return (
    <section className="panel table-panel operator-panel">
      <div className="panel-header">
        <h2>Body operátorů</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Operátor</th>
              <th>Zpracováno</th>
              <th>Recenzí</th>
              <th>Negativní</th>
              <th>Pozitivní</th>
              <th>Body</th>
            </tr>
          </thead>
          <tbody>
            {operators.map((operator) => (
              <tr key={operator.operator}>
                <td>{operator.operator}</td>
                <td>{numberFormatter.format(operator.total)}</td>
                <td>{numberFormatter.format(operator.negative)}</td>
                <td>{numberFormatter.format(operator.positive)}</td>
                <td>{pointsFormatter.format(operator.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReviewTable({ reviews }) {
  return (
    <section className="panel table-panel review-panel">
      <div className="panel-header">
        <h2>Ukázka recenzí</h2>
        <span className="muted">Prvních 12 ve filtru</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Řádek</th>
              <th>Hodnocení</th>
              <th>Portál</th>
              <th>Operátor</th>
              <th>Důvod</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={`${review.rowNumber}-${review.orderNumber}-${review.reviewId}`}>
                <td>{review.rowNumber}</td>
                <td>{review.rating || ""}</td>
                <td>{review.portal}</td>
                <td>{review.operator}</td>
                <td>{formatDateTime(review.processedAt)}</td>
                <td>{review.failureType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Over24Panel({ reviews }) {
  return (
    <section className="panel table-panel over24-panel">
      <div className="panel-header">
        <h2>Nad 24 hodin</h2>
        <span className="muted">{numberFormatter.format(reviews.length)} případů ve filtru</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Řádek</th>
              <th>Objednávka</th>
              <th>Portál</th>
              <th>Operátor</th>
              <th>Zadáno</th>
              <th>Zpracováno</th>
              <th>Hodin</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={`${review.rowNumber}-${review.orderNumber}-${review.processingHours}`}>
                <td>{review.rowNumber}</td>
                <td>{review.orderNumber}</td>
                <td>{review.portal}</td>
                <td>{review.operator}</td>
                <td>{formatDateTime(review.createdAt)}</td>
                <td>{formatDateTime(review.processedAt)}</td>
                <td>{review.processingHours}</td>
              </tr>
            ))}
            {!reviews.length && (
              <tr>
                <td colSpan="7" className="empty-cell">V aktuálním filtru není žádná recenze nad 24 hodin.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CallDecisionChangePanel({ analysis }) {
  const reviews = analysis.callDecisionOverrides;

  return (
    <section className="panel table-panel call-change-panel">
      <div className="panel-header">
        <h2>Změny volání</h2>
        <span className="muted">{numberFormatter.format(reviews.length)} případů ve filtru</span>
      </div>
      <div className="call-change-summary">
        <MiniCountList title="Podle operátora" data={analysis.callDecisionOverrideOperators} />
        <MiniCountList title="Podle portálu" data={analysis.callDecisionOverridePortals} />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Řádek</th>
              <th>Objednávka</th>
              <th>Portál</th>
              <th>Operátor</th>
              <th>Zpracováno</th>
              <th>Hodnocení</th>
              <th>Důvod</th>
              <th>Původně volat</th>
              <th>Změna</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={`${review.rowNumber}-${review.orderNumber}-${review.callDecisionChange}`}>
                <td>{review.rowNumber}</td>
                <td>{review.orderNumber}</td>
                <td>{review.portal}</td>
                <td>{review.operator}</td>
                <td>{formatDateTime(review.processedAt)}</td>
                <td>{review.rating || ""}</td>
                <td>{review.failureType || review.subject}</td>
                <td>{review.shouldCall}</td>
                <td>{review.callDecisionChange}</td>
              </tr>
            ))}
            {!reviews.length && (
              <tr>
                <td colSpan="9" className="empty-cell">V aktuálním filtru není žádný případ, kdy se mělo volat a nevolalo se po změně rozhodnutí operátorem.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MiniCountList({ title, data }) {
  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className="mini-count-list">
      <h3>{title}</h3>
      {data.length ? (
        data.slice(0, 5).map((item) => (
          <div className="mini-count-row" key={item.label}>
            <span title={item.label}>{item.label}</span>
            <div>
              <i style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
            <strong>{numberFormatter.format(item.count)}</strong>
          </div>
        ))
      ) : (
        <p className="muted">Bez dat</p>
      )}
    </div>
  );
}

function Over24Dialog({ reviews, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="Recenze nad 24 hodin" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Nad 24 hodin</h2>
            <p>Recenze, kde je rozdíl mezi zadáním a zpracováním větší než 24 hodin.</p>
          </div>
          <button className="secondary-button" onClick={onClose}>Zavřít</button>
        </div>
        <div className="table-wrap modal-table">
          <table>
            <thead>
              <tr>
                <th>Řádek</th>
                <th>Objednávka</th>
                <th>Portál</th>
                <th>Operátor</th>
                <th>Zadáno</th>
                <th>Zpracováno</th>
                <th>Hodin</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={`${review.rowNumber}-${review.orderNumber}-${review.processingHours}`}>
                  <td>{review.rowNumber}</td>
                  <td>{review.orderNumber}</td>
                  <td>{review.portal}</td>
                  <td>{review.operator}</td>
                  <td>{formatDateTime(review.createdAt)}</td>
                  <td>{formatDateTime(review.processedAt)}</td>
                  <td>{review.processingHours}</td>
                </tr>
              ))}
              {!reviews.length && (
                <tr>
                  <td colSpan="7" className="empty-cell">V aktuálním filtru není žádná recenze nad 24 hodin.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
