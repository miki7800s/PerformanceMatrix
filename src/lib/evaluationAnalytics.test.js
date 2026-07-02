import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeEvaluations,
  filterOperatorResults,
  rowsToEvaluationRows,
  rowsToUsers,
} from "./evaluationAnalytics.js";

test("rowsToUsers maps user workbook headers", () => {
  const users = rowsToUsers([
    ["Jméno", "User", "Datum nástupu", "Odkud je", "Manažer"],
    ["Jana Nováková", "jnovakova", "2026-01-10", "Praha", "Petr TL"],
  ]);

  assert.equal(users.length, 1);
  assert.equal(users[0].name, "Jana Nováková");
  assert.equal(users[0].user, "jnovakova");
  assert.equal(users[0].startDate, "2026-01-10");
  assert.equal(users[0].location, "Praha");
  assert.equal(users[0].manager, "Petr TL");
});

test("rowsToUsers maps Alza user export headers", () => {
  const users = rowsToUsers([
    [
      "Jméno (dle Přijmení)",
      "Uživatel",
      "Přijemní",
      "Jméno",
      "Pracovní pozice",
      "Oddělení",
      "Pododdělení",
      "Typ uživatele",
      "Nástup od",
      "Primární pobočka",
      "Manažer",
    ],
    [
      "Nováková Jana",
      "USER12345",
      "Nováková",
      "Jana",
      "Operátor CC",
      "Customer Care",
      "Calls",
      "Interní",
      "2026-01-10",
      "Praha",
      "Petr TL",
    ],
  ]);

  assert.equal(users.length, 1);
  assert.equal(users[0].name, "Nováková Jana");
  assert.equal(users[0].user, "USER12345");
  assert.equal(users[0].firstName, "Jana");
  assert.equal(users[0].surname, "Nováková");
  assert.equal(users[0].position, "Operátor CC");
  assert.equal(users[0].department, "Customer Care");
  assert.equal(users[0].subdepartment, "Calls");
  assert.equal(users[0].userType, "Interní");
  assert.equal(users[0].startDate, "2026-01-10");
  assert.equal(users[0].location, "Praha");
  assert.equal(users[0].manager, "Petr TL");
});

test("rowsToUsers maps manager when export header contains a description", () => {
  const users = rowsToUsers([
    [
      "Jméno (dle Přijmení)",
      "Uživatel: USER12345 (identifikační číslo)",
      "Nástup od:",
      "Primární pobočka: odkud je daný uživatel",
      "Manažer: TL daného uživatele",
    ],
    ["Nováková Jana", "USER12345", "2026-01-10", "Praha", "Petr TL"],
  ]);

  assert.equal(users.length, 1);
  assert.equal(users[0].name, "Nováková Jana");
  assert.equal(users[0].user, "USER12345");
  assert.equal(users[0].location, "Praha");
  assert.equal(users[0].manager, "Petr TL");
});

test("rowsToUsers displays manager user id as manager name", () => {
  const users = rowsToUsers([
    ["Jméno (dle Přijmení)", "Uživatel", "Manažer"],
    ["Říha Jiří", "USER-TL-1", ""],
    ["Nováková Jana", "USER-OP-1", "USER-TL-1"],
  ]);

  const operator = users.find((user) => user.user === "USER-OP-1");

  assert.equal(operator.manager, "Říha Jiří");
  assert.equal(operator.managerUser, "USER-TL-1");
});

test("rowsToUsers connects manager to user when user cell contains extra text", () => {
  const users = rowsToUsers([
    ["Jméno (dle Přijmení)", "Uživatel", "Manažer"],
    ["Říha Jiří", "USER-TL-1 - Říha Jiří", ""],
    ["Nováková Jana", "USER-OP-1 - Nováková Jana", "USER-TL-1"],
  ]);

  const operator = users.find((user) => user.name === "Nováková Jana");

  assert.equal(operator.manager, "Říha Jiří");
  assert.equal(operator.managerUser, "USER-TL-1 - Říha Jiří");
});

test("rowsToUsers displays manager name column instead of manager opener", () => {
  const users = rowsToUsers([
    [
      "Jméno (dle Přijmení)",
      "Uživatel",
      "Manažer (zadavatel) (opener)",
      "Manažer (zadavatel) (jméno)",
    ],
    ["Nováková Jana", "USER-OP-1", "USER-TL-1", "Říha Jiří"],
  ]);

  assert.equal(users[0].manager, "Říha Jiří");
  assert.equal(users[0].managerUser, "USER-TL-1");
});

test("rowsToEvaluationRows maps evaluator, evaluated operator and rating", () => {
  const ratings = rowsToEvaluationRows(
    [
      ["CallType", "RatingTime", "AgentName", "ActorName", "Rating"],
      ["Calls", "2026-06-08 10:15", "Jana Nováková", "Petr TL", "4,5"],
    ],
    "Calls",
  );

  assert.equal(ratings.length, 1);
  assert.equal(ratings[0].type, "Calls");
  assert.equal(ratings[0].callType, "Calls");
  assert.equal(ratings[0].ratingTime, "2026-06-08 10:15");
  assert.equal(ratings[0].evaluatorName, "Petr TL");
  assert.equal(ratings[0].evaluatedName, "Jana Nováková");
  assert.equal(ratings[0].rating, 4.5);
});

test("rowsToEvaluationRows repairs Windows-1250 control characters in names", () => {
  const ratings = rowsToEvaluationRows(
    [
      ["CallType", "RatingTime", "AgentName", "ActorName", "Rating"],
      ["Calls", "2026-06-08 10:15", "Nela \u008Ačarková", "Luká\u009A Ficek", 5],
      ["Calls", "2026-06-08 10:20", "Radomír Valo\u009Aek", "Dominik \u008Aedo", 4],
    ],
    "Calls",
  );

  assert.equal(ratings[0].evaluatedName, "Nela Ščarková");
  assert.equal(ratings[0].evaluatorName, "Lukáš Ficek");
  assert.equal(ratings[1].evaluatedName, "Radomír Valošek");
  assert.equal(ratings[1].evaluatorName, "Dominik Šedo");
});

test("analyzeEvaluations matches agent names written in different formats", () => {
  const users = rowsToUsers([
    ["Jméno", "User", "Datum nástupu", "Odkud je", "Manažer"],
    ["Jana Nováková", "jnovakova", "2026-01-10", "Praha", "Petr TL"],
  ]);
  const calls = rowsToEvaluationRows([
    ["CallType", "RatingTime", "AgentName", "ActorName", "Rating"],
    ["Calls", "2026-06-08 10:15", "Nováková Jana", "Petr TL", 5],
  ], "Calls");

  const analysis = analyzeEvaluations(users, [{ type: "Calls", ratings: calls }]);

  assert.equal(analysis.operatorResults[0].averages.Calls, 5);
  assert.equal(analysis.unmatchedRatings.length, 0);
});

test("analyzeEvaluations matches dotted agent names", () => {
  const users = rowsToUsers([
    ["Jméno", "User", "Datum nástupu", "Odkud je", "Manažer"],
    ["Jana Nováková", "jnovakova", "2026-01-10", "Praha", "Petr TL"],
  ]);
  const calls = rowsToEvaluationRows([
    ["CallType", "RatingTime", "AgentName", "ActorName", "Rating"],
    ["Calls", "2026-06-08 10:15", "Jana.Novakova", "Petr TL", 4],
  ], "Calls");

  const analysis = analyzeEvaluations(users, [{ type: "Calls", ratings: calls }]);

  assert.equal(analysis.operatorResults[0].averages.Calls, 4);
  assert.equal(analysis.unmatchedRatings.length, 0);
});

test("analyzeEvaluations matches names with extra middle names", () => {
  const users = rowsToUsers([
    ["Jméno", "User", "Datum nástupu", "Odkud je", "Manažer"],
    ["Jana Nováková", "jnovakova", "2026-01-10", "Praha", "Petr TL"],
  ]);
  const calls = rowsToEvaluationRows([
    ["CallType", "RatingTime", "AgentName", "ActorName", "Rating"],
    ["Calls", "2026-06-08 10:15", "Jana Klára Nováková", "Petr TL", 5],
  ], "Calls");

  const analysis = analyzeEvaluations(users, [{ type: "Calls", ratings: calls }]);

  assert.equal(analysis.operatorResults[0].averages.Calls, 5);
  assert.equal(analysis.unmatchedRatings.length, 0);
});

test("analyzeEvaluations matches users with extra middle names to shorter rating names", () => {
  const users = rowsToUsers([
    ["Jmeno", "User", "Datum nastupu", "Odkud je", "Manazer"],
    ["Jana Klara Novakova", "jnovakova", "2026-01-10", "Praha", "Petr TL"],
  ]);
  const calls = rowsToEvaluationRows([
    ["CallType", "RatingTime", "AgentName", "ActorName", "Rating"],
    ["Calls", "2026-06-08 10:15", "Jana Novakova", "Petr TL", 4],
  ], "Calls");

  const analysis = analyzeEvaluations(users, [{ type: "Calls", ratings: calls }]);

  assert.equal(analysis.operatorResults[0].averages.Calls, 4);
  assert.equal(analysis.unmatchedRatings.length, 0);
});

test("analyzeEvaluations matches ratings to users and calculates operator and TL averages", () => {
  const users = rowsToUsers([
    ["Jméno", "User", "Datum nástupu", "Odkud je", "Manažer"],
    ["Jana Nováková", "jnovakova", "2026-01-10", "Praha", "Petr TL"],
    ["Eva Dvořáková", "edvorakova", "2025-11-02", "Brno", "Petr TL"],
    ["Adam Svoboda", "asvoboda", "2025-10-01", "Ostrava", "Lucie TL"],
  ]);

  const calls = rowsToEvaluationRows([
    ["Jméno hodnotitele", "Jméno hodnoceného", "Hodnocení"],
    ["Petr TL", "Jana Nováková", 4],
    ["Petr TL", "Jana Nováková", 5],
    ["Petr TL", "Eva Dvořáková", 3],
  ], "Calls");
  const cct = rowsToEvaluationRows([
    ["Jméno hodnotitele", "Jméno hodnoceného", "Hodnocení"],
    ["Petr TL", "Jana Nováková", 2],
    ["Lucie TL", "Adam Svoboda", 5],
  ], "CCT");
  const chaty = rowsToEvaluationRows([
    ["Jméno hodnotitele", "Jméno hodnoceného", "Hodnocení"],
    ["Petr TL", "Neznámý Operátor", 1],
  ], "Chaty");

  const analysis = analyzeEvaluations(users, [
    { type: "Calls", ratings: calls },
    { type: "CCT", ratings: cct },
    { type: "Chaty", ratings: chaty },
    { type: "SOM", ratings: [] },
  ]);

  const jana = analysis.operatorResults.find((operator) => operator.name === "Jana Nováková");
  const eva = analysis.operatorResults.find((operator) => operator.name === "Eva Dvořáková");
  const adam = analysis.operatorResults.find((operator) => operator.name === "Adam Svoboda");

  assert.equal(jana.averages.Calls, 4.5);
  assert.equal(jana.averages.CCT, 2);
  assert.equal(jana.averages.Chaty, null);
  assert.equal(jana.overallAverage, 3.25);
  assert.equal(jana.ratingDetails.length, 3);
  assert.equal(jana.ratingDetails[0].evaluatorName, "Petr TL");
  assert.equal(jana.ratingDetails[0].type, "Calls");
  assert.equal(eva.overallAverage, 3);
  assert.equal(adam.overallAverage, 5);
  assert.deepEqual(analysis.managerStats.find((manager) => manager.manager === "Petr TL"), {
    manager: "Petr TL",
    operatorCount: 2,
    ratedOperatorCount: 2,
    average: 3.13,
  });
  assert.equal(analysis.unmatchedRatings.length, 1);
  assert.equal(analysis.kpis.ratedOperators, 3);
});

test("filterOperatorResults filters by operator and manager", () => {
  const operators = [
    { name: "Jana Nováková", manager: "Petr TL" },
    { name: "Adam Svoboda", manager: "Lucie TL" },
  ];

  assert.equal(filterOperatorResults(operators, { operator: "Jana Nováková" }).length, 1);
  assert.equal(filterOperatorResults(operators, { manager: "Petr TL" }).length, 1);
});

test("filterOperatorResults ignores Czech diacritics in filters", () => {
  const operators = [
    { name: "Šárka Černá", manager: "Jiří Říha" },
    { name: "Adam Svoboda", manager: "Lucie TL" },
  ];

  assert.equal(filterOperatorResults(operators, { operator: "Sarka Cerna" }).length, 1);
  assert.equal(filterOperatorResults(operators, { manager: "Jiri Riha" }).length, 1);
});
