export const COLUMN_INDEX = {
  month: 1,
  year: 2,
  rating: 3,
  createdAt: 4,
  processedAt: 5,
  country: 6,
  orderNumber: 7,
  cct: 8,
  reviewId: 9,
  subject: 10,
  failureType: 14,
  portal: 15,
  operator: 16,
  isComplex: 17,
  minutesSpent: 18,
  shouldCall: 20,
  callDecisionChange: 21,
  callOutcome: 22,
};

export const NEGATIVE_POINTS = 1166.7;
export const POSITIVE_POINTS = 312.5;

const emptyLabel = "Nevyplněno";

export function buildReviewRecord(row, rowNumber, columnShift = 0) {
  return {
    rowNumber,
    month: normalizeText(getCell(row, "month", columnShift)),
    year: normalizeYear(getCell(row, "year", columnShift)),
    rating: normalizeNumber(getCell(row, "rating", columnShift)),
    createdAt: parseReviewDate(getCell(row, "createdAt", columnShift)),
    processedAt: parseReviewDate(getCell(row, "processedAt", columnShift)),
    country: normalizeText(getCell(row, "country", columnShift)),
    orderNumber: normalizeText(getCell(row, "orderNumber", columnShift)),
    cct: normalizeText(getCell(row, "cct", columnShift)),
    reviewId: normalizeText(getCell(row, "reviewId", columnShift)),
    subject: normalizeText(getCell(row, "subject", columnShift)),
    failureType: normalizeText(getCell(row, "failureType", columnShift)),
    portal: normalizeText(getCell(row, "portal", columnShift)),
    operator: normalizeText(getCell(row, "operator", columnShift)),
    isComplex: normalizeText(getCell(row, "isComplex", columnShift)),
    minutesSpent: normalizeNumber(getCell(row, "minutesSpent", columnShift)),
    shouldCall: normalizeText(getCell(row, "shouldCall", columnShift)),
    callDecisionChange: normalizeText(getCell(row, "callDecisionChange", columnShift)),
    callOutcome: normalizeText(getCell(row, "callOutcome", columnShift)),
  };
}

export function rowsToReviews(rows) {
  const columnShift = detectColumnShift(rows);
  return rows
    .slice(1)
    .map((row, index) => buildReviewRecord(row, index + 2, columnShift))
    .filter((review) => hasReviewData(review));
}

export function analyzeReviews(reviews) {
  const negativeReviews = reviews.filter((review) => isNegativeRating(review.rating));
  const positiveReviews = reviews.filter((review) => isPositiveRating(review.rating));
  const callDecisionOverrides = reviews.filter(isCallCancelledByDecisionChange);
  const over24h = reviews
    .map((review) => ({
      ...review,
      processingHours: getProcessingHours(review.createdAt, review.processedAt),
    }))
    .filter((review) => review.processingHours > 24)
    .sort((a, b) => b.processingHours - a.processingHours);

  const operatorStats = groupBy(reviews, (review) => review.operator || emptyLabel)
    .map(([operator, items]) => {
      const negative = items.filter((item) => isNegativeRating(item.rating)).length;
      const positive = items.filter((item) => isPositiveRating(item.rating)).length;
      return {
        operator,
        total: items.length,
        negative,
        positive,
        points: roundPoints(negative * NEGATIVE_POINTS + positive * POSITIVE_POINTS),
      };
    })
    .sort((a, b) => b.points - a.points || b.total - a.total);

  return {
    kpis: {
      totalReviews: reviews.length,
      negativeReviews: negativeReviews.length,
      positiveReviews: positiveReviews.length,
      averageRating: average(reviews.map((review) => review.rating).filter(Boolean)),
      over24hCount: over24h.length,
      totalPoints: roundPoints(operatorStats.reduce((sum, operator) => sum + operator.points, 0)),
    },
    failureReasons: countBy(reviews, (review) => review.failureType || emptyLabel),
    portals: countBy(reviews, (review) => review.portal || emptyLabel),
    countries: countBy(reviews, (review) => review.country || emptyLabel),
    callOutcomes: countBy(reviews, (review) => review.callOutcome || emptyLabel),
    callDecisionOverrides,
    callDecisionOverrideOperators: countBy(callDecisionOverrides, (review) => review.operator || emptyLabel),
    callDecisionOverridePortals: countBy(callDecisionOverrides, (review) => review.portal || emptyLabel),
    operatorStats,
    over24h,
  };
}

export function filterReviews(reviews, filters) {
  return reviews.filter((review) => {
    if (filters.month && review.month !== filters.month) return false;
    if (filters.year && String(review.year) !== String(filters.year)) return false;
    if (filters.portal && review.portal !== filters.portal) return false;
    if (filters.operator && review.operator !== filters.operator) return false;
    if (filters.country && review.country !== filters.country) return false;
    if (filters.rating && String(review.rating) !== String(filters.rating)) return false;
    if (filters.ratingGroup === "negative" && !isNegativeRating(review.rating)) return false;
    if (filters.ratingGroup === "positive" && !isPositiveRating(review.rating)) return false;
    if (filters.onlyOver24h && getProcessingHours(review.createdAt, review.processedAt) <= 24) {
      return false;
    }
    return true;
  });
}

export function getFilterOptions(reviews) {
  return {
    months: uniqueSorted(reviews.map((review) => review.month).filter(Boolean)),
    years: uniqueSorted(reviews.map((review) => review.year).filter(Boolean)),
    portals: uniqueSorted(reviews.map((review) => review.portal).filter(Boolean)),
    operators: uniqueSorted(reviews.map((review) => review.operator).filter(Boolean)),
    countries: uniqueSorted(reviews.map((review) => review.country).filter(Boolean)),
  };
}

export function parseReviewDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) return excelSerialToDate(value);
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/\u00a0/g, " ")
    .replace(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/, (_, day, month, year, hour = "0", minute = "0", second = "0") => {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}`;
    })
    .replace(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+/, (_, year, month, day) => {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T`;
    });

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getProcessingHours(createdAt, processedAt) {
  if (!createdAt || !processedAt) return null;
  const diffMs = processedAt.getTime() - createdAt.getTime();
  if (!Number.isFinite(diffMs)) return null;
  return Math.round((diffMs / 3_600_000) * 100) / 100;
}

export function isNegativeRating(rating) {
  return rating >= 1 && rating <= 3;
}

export function isPositiveRating(rating) {
  return rating >= 4 && rating <= 5;
}

export function isCallCancelledByDecisionChange(review) {
  return isYesValue(review.shouldCall) && Boolean(normalizeText(review.callDecisionChange)) && !normalizeText(review.callOutcome);
}

export function formatDateTime(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isYesValue(value) {
  const normalized = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return ["ano", "yes", "y", "1", "true"].includes(normalized);
}

function getCell(row, key, columnShift) {
  return row[COLUMN_INDEX[key] - columnShift];
}

function detectColumnShift(rows) {
  for (const row of rows.slice(0, 6)) {
    const first = normalizeHeader(row[0]);
    const second = normalizeHeader(row[1]);
    if (first.includes("mesic") && second.includes("rok")) return 1;
    if (first && normalizeYear(row[1]) && normalizeNumber(row[2])) return 1;
  }
  return 0;
}

function normalizeHeader(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeYear(value) {
  const year = normalizeNumber(value);
  return year ? Math.trunc(year) : "";
}

function hasReviewData(review) {
  return Boolean(
    review.rating ||
      review.createdAt ||
      review.processedAt ||
      review.portal ||
      review.operator ||
      review.failureType ||
      review.orderNumber,
  );
}

function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const fractionalDay = serial - Math.floor(serial);
  return new Date((utcValue + Math.round(fractionalDay * 86400)) * 1000);
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item) || emptyLabel;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "cs"));
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item) || emptyLabel;
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.entries()];
}

function average(numbers) {
  if (!numbers.length) return 0;
  return Math.round((numbers.reduce((sum, number) => sum + number, 0) / numbers.length) * 100) / 100;
}

function roundPoints(value) {
  return Math.round(value * 10) / 10;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), "cs", { numeric: true }));
}
