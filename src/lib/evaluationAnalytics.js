const userColumnAliases = {
  name: ["jmeno dle prijmeni", "jmeno prijmeni", "cele jmeno", "name", "operator", "zamestnanec"],
  firstName: ["jmeno"],
  surname: ["prijemni", "prijmeni", "prijmeni"],
  user: ["user", "uzivatel", "login", "username", "osobni cislo"],
  position: ["pracovni pozice", "pozice", "position"],
  department: ["oddeleni", "department"],
  subdepartment: ["pododdeleni", "subdepartment", "tym", "team"],
  userType: ["typ uzivatele", "user type"],
  startDate: ["nastup od", "datum nastupu", "nastup", "start date", "datum"],
  location: ["primarni pobocka", "odkud je", "odkud", "lokalita", "zeme", "location", "pobocka"],
  managerName: ["manazer zadavatel jmeno", "manager zadavatel jmeno", "manazer jmeno", "manager name", "tl jmeno"],
  managerUser: ["manazer zadavatel opener", "manager zadavatel opener", "manazer opener", "manager opener"],
  manager: ["manazer", "manager", "tl", "teamleader", "team leader", "vedouci", "nadrazeny"],
};

const ratingColumnAliases = {
  callType: ["calltype", "call type", "typ hovoru", "typ hodnoceni", "co se hodnotilo"],
  ratingTime: ["ratingtime", "rating time", "cas hodnoceni", "datum hodnoceni", "hodnoceno"],
  evaluatorName: ["actorname", "actor name", "jmeno hodnotitele", "hodnotitel", "evaluator", "hodnotil"],
  evaluatedName: ["agentname", "agent name", "jmeno hodnoceneho", "hodnoceny", "hodnoceny operator", "operator", "jmeno"],
  rating: ["hodnoceni", "rating", "znamka", "score", "vysledek"],
};

export function rowsToUsers(rows) {
  const { headerIndex, columns } = getColumnMap(rows, userColumnAliases);
  if (headerIndex < 0 || columns.name == null) return [];

  const users = rows.slice(headerIndex + 1).map((row, index) => {
    const firstName = cleanCell(row[columns.firstName]);
    const surname = cleanCell(row[columns.surname]);
    const managerName = cleanCell(row[columns.managerName]);
    const managerUser = cleanCell(row[columns.managerUser]) || cleanCell(row[columns.manager]);
    const manager = managerName || managerUser;
    return {
      rowNumber: headerIndex + index + 2,
      name: cleanCell(row[columns.name]) || [firstName, surname].filter(Boolean).join(" "),
      user: cleanCell(row[columns.user]),
      firstName,
      surname,
      position: cleanCell(row[columns.position]),
      department: cleanCell(row[columns.department]),
      subdepartment: cleanCell(row[columns.subdepartment]),
      userType: cleanCell(row[columns.userType]),
      startDate: row[columns.startDate] ?? "",
      location: cleanCell(row[columns.location]),
      manager,
      managerUser,
    };
  }).filter((user) => user.name).map((user) => ({
    ...user,
    matchKey: createPersonKey(user.name, user.user),
  }));

  return resolveManagerNames(users);
}

export function rowsToEvaluationRows(rows, type) {
  const { headerIndex, columns } = getColumnMap(rows, ratingColumnAliases);
  if (headerIndex < 0 || columns.evaluatedName == null || columns.rating == null) return [];

  return rows.slice(headerIndex + 1).map((row, index) => ({
    rowNumber: headerIndex + index + 2,
    type,
    callType: cleanCell(row[columns.callType]),
    ratingTime: row[columns.ratingTime] ?? "",
    evaluatorName: cleanCell(row[columns.evaluatorName]),
    evaluatedName: cleanCell(row[columns.evaluatedName]),
    rating: parseRating(row[columns.rating]),
  })).filter((rating) => rating.evaluatedName && rating.rating != null);
}

export function analyzeEvaluations(users, evaluationSets) {
  const userByName = buildUserLookup(users);
  const ratingsByUser = new Map(users.map((user) => [user.matchKey, {}]));
  const unmatchedRatings = [];
  const types = evaluationSets.map((set) => set.type);

  evaluationSets.forEach((set) => {
    set.ratings.forEach((rating) => {
      const userKey = findUserKey(userByName, rating.evaluatedName);
      if (!userByName.has(userKey)) {
        unmatchedRatings.push(rating);
        return;
      }

      const userRatings = ratingsByUser.get(userKey);
      userRatings[set.type] = userRatings[set.type] || [];
      userRatings[set.type].push(rating);
    });
  });

  const operatorResults = users.map((user) => {
    const userRatings = ratingsByUser.get(user.matchKey) || {};
    const averages = {};
    const counts = {};

    types.forEach((type) => {
      const ratings = userRatings[type] || [];
      counts[type] = ratings.length;
      averages[type] = ratings.length ? roundAverage(ratings.map((rating) => rating.rating)) : null;
    });

    const availableAverages = Object.values(averages).filter((average) => average != null);
    const ratingDetails = types.flatMap((type) => (
      (userRatings[type] || []).map((rating) => ({ ...rating, type }))
    ));

    return {
      ...user,
      averages,
      counts,
      ratingDetails,
      totalRatingCount: Object.values(counts).reduce((sum, count) => sum + count, 0),
      overallAverage: availableAverages.length ? roundAverage(availableAverages) : null,
    };
  });

  const managerStats = buildManagerStats(operatorResults);
  const typeStats = buildTypeStats(operatorResults, types);

  return {
    kpis: {
      totalOperators: users.length,
      ratedOperators: operatorResults.filter((operator) => operator.overallAverage != null).length,
      totalRatings: operatorResults.reduce((sum, operator) => sum + operator.totalRatingCount, 0),
      unmatchedRatings: unmatchedRatings.length,
      overallAverage: roundAverage(operatorResults.map((operator) => operator.overallAverage).filter((average) => average != null)),
    },
    operatorResults,
    managerStats,
    typeStats,
    unmatchedRatings,
  };
}

export function filterOperatorResults(operators, filters) {
  return operators.filter((operator) => {
    if (filters.operator && !matchesPerson(operator.name, filters.operator, operator.user)) return false;
    if (filters.manager && !matchesText(operator.manager, filters.manager)) return false;
    return true;
  });
}

export function getEvaluationFilterOptions(operatorResults) {
  return {
    operators: uniqueSorted(operatorResults.map((operator) => operator.name)),
    managers: uniqueSorted(operatorResults.map((operator) => operator.manager)),
  };
}

export function formatEvaluationValue(value) {
  return value == null ? "-" : value.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getColumnMap(rows, aliases) {
  for (let index = 0; index < Math.min(rows.length, 10); index += 1) {
    const row = rows[index] || [];
    const normalizedHeaders = row.map((cell) => normalizeKey(cell));
    const columns = Object.fromEntries(Object.keys(aliases).map((key) => [key, findColumn(normalizedHeaders, aliases[key])]));
    const matchedCount = Object.values(columns).filter((column) => column != null).length;

    if (matchedCount >= 2) {
      return { headerIndex: index, columns };
    }
  }

  return { headerIndex: -1, columns: {} };
}

function findColumn(headers, aliases) {
  const normalizedAliases = aliases.map((alias) => normalizeKey(alias));
  return headers.findIndex((header) => normalizedAliases.some((alias) => (
    header === alias || (canUseLooseHeaderMatch(alias) && (header.startsWith(`${alias} `) || header.includes(` ${alias} `)))
  )));
}

function canUseLooseHeaderMatch(alias) {
  return !["jmeno", "name", "user", "operator"].includes(alias);
}

function buildManagerStats(operatorResults) {
  const byManager = new Map();

  operatorResults.forEach((operator) => {
    const manager = operator.manager || "Nevyplněno";
    if (!byManager.has(manager)) {
      byManager.set(manager, []);
    }
    byManager.get(manager).push(operator);
  });

  return [...byManager.entries()].map(([manager, operators]) => {
    const ratedAverages = operators.map((operator) => operator.overallAverage).filter((average) => average != null);
    return {
      manager,
      operatorCount: operators.length,
      ratedOperatorCount: ratedAverages.length,
      average: ratedAverages.length ? roundAverage(ratedAverages) : null,
    };
  }).sort((left, right) => (right.average ?? -1) - (left.average ?? -1));
}

function buildTypeStats(operatorResults, types) {
  return types.map((type) => {
    const averages = operatorResults.map((operator) => operator.averages[type]).filter((average) => average != null);
    return {
      type,
      ratedOperatorCount: averages.length,
      average: averages.length ? roundAverage(averages) : null,
    };
  });
}

function buildUserLookup(users) {
  const lookup = new Map();

  users.forEach((user) => {
    const keys = [
      user.matchKey,
      normalizeKey(user.name),
      createPersonKey(user.name),
      ...createPersonKeyVariants(user.name),
      normalizeKey(user.user),
    ].filter(Boolean);

    keys.forEach((key) => lookup.set(key, user));
  });

  return lookup;
}

function resolveManagerNames(users) {
  const byUser = new Map();

  users.forEach((user) => {
    getUserReferenceKeys(user.user).forEach((key) => byUser.set(key, user));
  });

  return users.map((user) => {
    const manager = getUserReferenceKeys(user.managerUser)
      .map((key) => byUser.get(key))
      .find(Boolean);

    if (!manager || !looksLikeUserReference(user.manager)) return user;

    return {
      ...user,
      manager: manager.name,
      managerUser: manager.user,
    };
  });
}

function getUserReferenceKeys(value) {
  return [
    normalizeKey(value),
    normalizeKey(extractUserId(value)),
    normalizeKey(extractLogin(value)),
  ].filter(Boolean);
}

function looksLikeUserReference(value) {
  const text = cleanCell(value);
  return Boolean(extractUserId(text) || extractLogin(text));
}

function findUserKey(userLookup, rawName) {
  const keys = [
    createPersonKey(rawName),
    ...createPersonKeyVariants(rawName),
    normalizeKey(rawName),
    normalizeKey(extractLogin(rawName)),
  ].filter(Boolean);

  const matchedKey = keys.find((key) => userLookup.has(key));
  return matchedKey ? userLookup.get(matchedKey).matchKey : createPersonKey(rawName);
}

function matchesPerson(value, filter, user = "") {
  const valueKeys = new Set([createPersonKey(value, user), ...createPersonKeyVariants(value)]);
  const filterKeys = [createPersonKey(filter), ...createPersonKeyVariants(filter)];
  return filterKeys.some((key) => valueKeys.has(key)) || matchesText(value, filter) || matchesText(user, filter);
}

function matchesText(value, filter) {
  return normalizeKey(value) === normalizeKey(filter);
}

function parseRating(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function roundAverage(values) {
  if (!values.length) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(average * 100) / 100;
}

function cleanCell(value) {
  return repairWindows1250Controls(String(value ?? "")).trim();
}

function repairWindows1250Controls(value) {
  const replacements = {
    "\u008A": "Š",
    "\u009A": "š",
    "\u008C": "Ś",
    "\u009C": "ś",
    "\u008D": "Ť",
    "\u009D": "ť",
    "\u008E": "Ž",
    "\u009E": "ž",
    "\u008F": "Ź",
    "\u009F": "ź",
  };

  return value.replace(/[\u008A\u009A\u008C\u009C\u008D\u009D\u008E\u009E\u008F\u009F]/g, (character) => replacements[character] || character);
}

function normalizeKey(value) {
  return cleanCell(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("cs-CZ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function createPersonKey(name, user = "") {
  const tokens = normalizeKey(name)
    .split(" ")
    .filter((token) => token && token !== normalizeKey(user));

  if (!tokens.length) return normalizeKey(user);
  return [...new Set(tokens)].sort((left, right) => left.localeCompare(right, "cs-CZ")).join(" ");
}

function createPersonKeyVariants(name) {
  const tokens = normalizeKey(name).split(" ").filter(Boolean);
  if (tokens.length < 2) return [];

  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  return [
    createPersonKey(`${first} ${last}`),
    createPersonKey(`${last} ${first}`),
  ];
}

function extractLogin(value) {
  const match = cleanCell(value).match(/\(([^)]+)\)|\\([^\\]+)$/);
  return match?.[1] || "";
}

function extractUserId(value) {
  return cleanCell(value).match(/\bUSER[-\w]*\b/i)?.[0] || "";
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, "cs-CZ"));
}
