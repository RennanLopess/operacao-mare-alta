const fs = require("fs");
const OUT = "/tmp/out/";
fs.mkdirSync(OUT, { recursive: true });

const pipeline = [
  { $match: { classe: "Refrigerado", ts: { $gte: ISODate("2026-04-01T00:00:00Z") } } },
  { $group: { _id: "$terminal", total_mov: { $sum: 1 }, peso_total: { $sum: "$peso_kg" },
              peso_medio: { $avg: "$peso_kg" }, maior_peso: { $max: "$peso_kg" } } },
  { $sort: { peso_total: -1 } },
  { $limit: 3 },
  { $project: { _id: 0, terminal: "$_id", total_mov: 1, peso_total: 1, peso_medio: 1, maior_peso: 1 } }
];

function resumo(nome, ex) {
  fs.writeFileSync(OUT + "b1_" + nome + "_explain.json", EJSON.stringify(ex, null, 2, { relaxed: true }));
  const cur = ex.stages ? ex.stages[0].$cursor : ex;
  const es = cur.executionStats;
  const plano = cur.queryPlanner.winningPlan.queryPlan || cur.queryPlanner.winningPlan;
  const nomes = [];
  (function anda(s) { if (!s) return; nomes.push(s.stage); anda(s.inputStage); (s.inputStages || []).forEach(anda); })(plano);
  let entraramNoGroup = es.nReturned;
  const arvore = [];
  (function acha(s, n) { if (!s) return; arvore.push("  ".repeat(n) + s.stage + " nReturned=" + s.nReturned);
    if (s.stage.toLowerCase() === "group") entraramNoGroup = (s.inputStage || {}).nReturned;
    acha(s.inputStage, n + 1); })(es.executionStages, 0);
  print("executionStages:\n" + arvore.join("\n"));
  const r = { cenario: nome, engine: (ex.explainVersion || cur.explainVersion) === "2" ? "SBE" : "classico",
    planoLeitura: nomes.join(" > "),
    indice: JSON.stringify(plano).match(/"indexName":"([^"]+)"/)?.[1] || "-",
    totalKeysExamined: es.totalKeysExamined, totalDocsExamined: es.totalDocsExamined,
    docsQueEntraramNoGroup: entraramNoGroup, executionTimeMillis: es.executionTimeMillis,
    tempos3execucoes: [1, 2, 3].map(() => db.movimentacoes.explain("executionStats").aggregate(pipeline))
      .map(e => (e.stages ? e.stages[0].$cursor : e).executionStats.executionTimeMillis) };
  printjson(r);
  return r;
}

db.movimentacoes.getIndexes().filter(i => i.name === "idx_classe_ts").forEach(i => db.movimentacoes.dropIndex(i.name));

print("=== 1) sem idx_classe_ts ===");
const r1 = resumo("1_antes", db.movimentacoes.explain("executionStats").aggregate(pipeline));

print("\n=== 2) com idx_classe_ts ===");
print(db.movimentacoes.createIndex({ classe: 1, ts: 1 }, { name: "idx_classe_ts" }));
const r2 = resumo("2_depois", db.movimentacoes.explain("executionStats").aggregate(pipeline));

print("\n=== 3) aggregate ===");
const res = db.movimentacoes.aggregate(pipeline).toArray();
res.forEach(d => print(JSON.stringify(d)));
print("countDocuments $match: " + db.movimentacoes.countDocuments(pipeline[0].$match));
fs.writeFileSync(OUT + "b1_resultado.json", JSON.stringify({ metricas: [r1, r2], resultado: res }, null, 2));
