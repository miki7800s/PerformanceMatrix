import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeReviews,
  buildReviewRecord,
  filterReviews,
  getProcessingHours,
  parseReviewDate,
  rowsToReviews,
} from "./reviewAnalytics.js";

test("buildReviewRecord maps the requested Excel columns", () => {
  const row = [];
  row[1] = "leden";
  row[2] = 2026;
  row[3] = 2;
  row[4] = "2026-01-10 08:00";
  row[5] = "2026-01-10 12:30";
  row[6] = "CZ";
  row[7] = "ORD-1";
  row[8] = "Výměna zboží";
  row[9] = "HEU-1";
  row[10] = "Doprava";
  row[14] = "poškozené zboží";
  row[15] = "Heureka";
  row[16] = "Jana";
  row[17] = "ANO";
  row[18] = 15;
  row[20] = "ANO";
  row[21] = "NE";
  row[22] = "nedo 2x";

  const record = buildReviewRecord(row, 4);

  assert.equal(record.rowNumber, 4);
  assert.equal(record.month, "leden");
  assert.equal(record.year, 2026);
  assert.equal(record.rating, 2);
  assert.equal(record.country, "CZ");
  assert.equal(record.orderNumber, "ORD-1");
  assert.equal(record.cct, "Výměna zboží");
  assert.equal(record.reviewId, "HEU-1");
  assert.equal(record.subject, "Doprava");
  assert.equal(record.failureType, "poškozené zboží");
  assert.equal(record.portal, "Heureka");
  assert.equal(record.operator, "Jana");
  assert.equal(record.isComplex, "ANO");
  assert.equal(record.minutesSpent, 15);
  assert.equal(record.shouldCall, "ANO");
  assert.equal(record.callDecisionChange, "NE");
  assert.equal(record.callOutcome, "nedo 2x");
});

test("getProcessingHours detects reviews processed over 24 hours", () => {
  const createdAt = parseReviewDate("2026-03-01 10:00");
  const processedAt = parseReviewDate("2026-03-02 11:30");

  assert.equal(getProcessingHours(createdAt, processedAt), 25.5);
});

test("rowsToReviews handles sheets whose used range starts at Excel column B", () => {
  const rows = [
    ["Mesic", "Rok", "Hodnoceni", "Zadano", "Zpracovano", "Zeme", "Objednavka"],
    ["leden", 2026, 1, "2026-01-10 08:00", "2026-01-11 10:30", "CZ", "ORD-1001"],
  ];

  const reviews = rowsToReviews(rows);

  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].month, "leden");
  assert.equal(reviews[0].year, 2026);
  assert.equal(reviews[0].rating, 1);
  assert.equal(reviews[0].country, "CZ");
  assert.equal(reviews[0].orderNumber, "ORD-1001");
});

test("analyzeReviews calculates KPIs, operator points and over-limit records", () => {
  const reviews = [
    {
      rating: 1,
      createdAt: parseReviewDate("2026-03-01 08:00"),
      processedAt: parseReviewDate("2026-03-02 09:00"),
      failureType: "Doprava",
      portal: "Heureka",
      operator: "Jana",
      country: "CZ",
    },
    {
      rating: 5,
      createdAt: parseReviewDate("2026-03-02 08:00"),
      processedAt: parseReviewDate("2026-03-02 10:00"),
      failureType: "Cena",
      portal: "Google",
      operator: "Jana",
      country: "SK",
    },
    {
      rating: 3,
      createdAt: parseReviewDate("2026-03-03 08:00"),
      processedAt: parseReviewDate("2026-03-03 18:00"),
      failureType: "Doprava",
      portal: "Heureka",
      operator: "Petr",
      country: "CZ",
    },
  ];

  const analysis = analyzeReviews(reviews);

  assert.equal(analysis.kpis.totalReviews, 3);
  assert.equal(analysis.kpis.negativeReviews, 2);
  assert.equal(analysis.kpis.positiveReviews, 1);
  assert.equal(analysis.kpis.over24hCount, 1);
  assert.equal(analysis.operatorStats[0].operator, "Jana");
  assert.equal(analysis.operatorStats[0].total, 2);
  assert.equal(analysis.operatorStats[0].points, 1479.2);
  assert.equal(analysis.operatorStats[1].operator, "Petr");
  assert.equal(analysis.operatorStats[1].points, 1166.7);
  assert.deepEqual(analysis.failureReasons[0], { label: "Doprava", count: 2 });
  assert.deepEqual(analysis.portals[0], { label: "Heureka", count: 2 });
});

test("analyzeReviews reports reviews where calling was cancelled by operator decision change", () => {
  const reviews = [
    {
      rowNumber: 2,
      rating: 2,
      portal: "Heureka",
      operator: "Jana",
      orderNumber: "ORD-1",
      subject: "Doprava",
      failureType: "Doprava",
      shouldCall: "ANO",
      callDecisionChange: "NE",
      callOutcome: "",
    },
    {
      rowNumber: 3,
      rating: 1,
      portal: "Google",
      operator: "Petr",
      orderNumber: "ORD-2",
      subject: "Cena",
      failureType: "Cena",
      shouldCall: "ANO",
      callDecisionChange: "",
      callOutcome: "",
    },
    {
      rowNumber: 4,
      rating: 5,
      portal: "Heureka",
      operator: "Jana",
      orderNumber: "ORD-3",
      subject: "Pochvala",
      failureType: "Nevyplneno",
      shouldCall: "ANO",
      callDecisionChange: "NE",
      callOutcome: "dovo",
    },
  ];

  const analysis = analyzeReviews(reviews);

  assert.equal(analysis.callDecisionOverrides.length, 1);
  assert.equal(analysis.callDecisionOverrides[0].orderNumber, "ORD-1");
  assert.deepEqual(analysis.callDecisionOverrideOperators[0], { label: "Jana", count: 1 });
  assert.deepEqual(analysis.callDecisionOverridePortals[0], { label: "Heureka", count: 1 });
});

test("filterReviews applies month, year, portal, operator and rating filters", () => {
  const reviews = [
    { month: "leden", year: 2026, portal: "Heureka", operator: "Jana", rating: 1 },
    { month: "únor", year: 2026, portal: "Google", operator: "Petr", rating: 5 },
    { month: "leden", year: 2025, portal: "Heureka", operator: "Jana", rating: 4 },
  ];

  const filtered = filterReviews(reviews, {
    month: "leden",
    year: "2026",
    portal: "Heureka",
    operator: "Jana",
    ratingGroup: "negative",
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].rating, 1);
});
