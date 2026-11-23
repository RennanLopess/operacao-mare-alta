const fs = require("fs");
const OUT = "/tmp/out/";
fs.mkdirSync(OUT, { recursive: true });
const CLASSE_ALVO = "Refrigerado";

function resumo(nome, pipeline) {
  const ex = db.movimentacoes.explain("executionStats").aggregate(pipeline);
  fs.writeFileSync(OUT + "b2_" + nome + "_explain.json", EJSON.stringify(ex, null, 2, { relaxed: true }));
  const cur = ex.stages ? ex.stages[0].$cursor : ex;
  const es = cur.executionStats;
  const plano = cur.queryPlanner.winningPlan.queryPlan || cur.queryPlanner.winningPlan;
  const arvore = [];
  (function anda(s, n) { if (!s) return; arvore.push("  ".repeat(n) + s.stage + " nReturned=" + s.nReturned);
    anda(s.inputStage, n + 1); })(es.executionStages, 0);
  const r = { cenario: nome,
    planoLeitura: (function f(s) { return s ? [s.stage].concat(f(s.inputStage)) : []; })(plano).join(" > "),
    indice: JSON.stringify(plano).match(/"indexName":"([^"]+)"/)?.[1] || "-",
    estagiosForaDoCursor: ex.stages ? ex.stages.slice(1).map(s => Object.keys(s)[0] + "(nReturned=" + s.nReturned + ")").join(" > ") : "-",
    totalKeysExamined: es.totalKeysExamined, totalDocsExamined: es.totalDocsExamined,
    executionTimeMillis: es.executionTimeMillis };
  print("executionStages ($cursor):\n" + arvore.join("\n"));
  printjson(r);
  return r;
}

const original = [
  { $project: { terminal: 1, classe: 1 } },
  { $group: { _id: { terminal: "$terminal", classe: "$classe" }, kg_total: { $sum: "peso_kg" }, mov: { $sum: 1 } } },
  { $limit: 3 },
  { $sort: { kg_total: -1 } },
  { $match: { "_id.classe": CLASSE_ALVO } }
];
print("=== a) pipeline original x3 ===");
for (let i = 1; i <= 3; i++) print("execucao " + i + ": " + JSON.stringify(db.movimentacoes.aggregate(original).toArray()));
print("\nestagios 1-4 ($project, $group, $limit, $sort):");
db.movimentacoes.aggregate(original.slice(0, 4)).forEach(d => print("  " + JSON.stringify(d)));
const rA = resumo("a_original", original);

print("\n=== b) testes ===");
print("[{$group:{_id:null, com_literal:{$sum:\"peso_kg\"}, com_cifrao:{$sum:\"$peso_kg\"}}}]:");
db.movimentacoes.aggregate([{ $group: { _id: null, com_literal: { $sum: "peso_kg" }, com_cifrao: { $sum: "$peso_kg" } } }])
  .forEach(d => print("  " + JSON.stringify({ com_literal: Number(d.com_literal), com_cifrao: Number(d.com_cifrao) })));
print("[{$project:{terminal:1,classe:1}}, {$group:{_id:null, kg:{$sum:\"$peso_kg\"}}}]:");
db.movimentacoes.aggregate([{ $project: { terminal: 1, classe: 1 } }, { $group: { _id: null, kg: { $sum: "$peso_kg" } } }])
  .forEach(d => print("  " + JSON.stringify({ kg: Number(d.kg) })));
print("grupos apos $group original: " + db.movimentacoes.aggregate([original[0], original[1]]).toArray().length);

const corrigido = [
  { $match: { classe: CLASSE_ALVO } },
  { $group: { _id: "$terminal", kg_total: { $sum: "$peso_kg" }, mov: { $sum: 1 } } },
  { $sort: { kg_total: -1 } },
  { $limit: 3 },
  { $project: { _id: 0, terminal: "$_id", kg_total: 1, mov: 1 } }
];
print("\n=== c) pipeline corrigido ===");
const res = db.movimentacoes.aggregate(corrigido).toArray();
res.forEach(d => print("  " + JSON.stringify(d)));
const rC = resumo("c_corrigido", corrigido);

print("\nfind({classe:\"" + CLASSE_ALVO + "\"}) + soma no shell:");
const manual = {};
db.movimentacoes.find({ classe: CLASSE_ALVO }, { _id: 0, terminal: 1, peso_kg: 1 }).forEach(d => {
  manual[d.terminal] = manual[d.terminal] || { kg: 0, mov: 0 };
  manual[d.terminal].kg += d.peso_kg; manual[d.terminal].mov++;
});
Object.entries(manual).sort((a, b) => b[1].kg - a[1].kg).forEach(([t, v]) => print("  " + t + " kg=" + v.kg + " mov=" + v.mov));

fs.writeFileSync(OUT + "b2_resultado.json", JSON.stringify({ metricas: [rA, rC], corrigido: res, manual }, null, 2));
print("\nindices: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.name)));
