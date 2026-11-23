// B2 — rodar com: docker exec mongo-lab mongosh logiporto --quiet --file /tmp/b2.js
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
  print("arvore de execucao (dentro do $cursor):\n" + arvore.join("\n"));
  printjson(r);
  return r;
}

// a) pipeline original, exatamente como no enunciado (só troquei CLASSE_ALVO pelo valor)
const original = [
  { $project: { terminal: 1, classe: 1 } },
  { $group: { _id: { terminal: "$terminal", classe: "$classe" }, kg_total: { $sum: "peso_kg" }, mov: { $sum: 1 } } },
  { $limit: 3 },
  { $sort: { kg_total: -1 } },
  { $match: { "_id.classe": CLASSE_ALVO } }
];
print("=== a) original: 3 execuções seguidas ===");
for (let i = 1; i <= 3; i++) print("execução " + i + ": " + JSON.stringify(db.movimentacoes.aggregate(original).toArray()));
print("\no que o $limit 3 pegou (pipeline até o $sort, sem o $match):");
db.movimentacoes.aggregate(original.slice(0, 4)).forEach(d => print("  " + JSON.stringify(d)));
const rA = resumo("a_original", original);

// prova de cada defeito isolado
print("\n=== b) provas dos defeitos ===");
print("$sum de string literal \"peso_kg\" (sem $), todos os grupos:");
db.movimentacoes.aggregate([{ $group: { _id: null, com_literal: { $sum: "peso_kg" }, com_cifrao: { $sum: "$peso_kg" } } }])
  .forEach(d => print("  " + JSON.stringify(d)));
print("depois do $project {terminal,classe}, o peso_kg some (mesmo usando $peso_kg):");
db.movimentacoes.aggregate([{ $project: { terminal: 1, classe: 1 } }, { $group: { _id: null, kg: { $sum: "$peso_kg" } } }])
  .forEach(d => print("  " + JSON.stringify(d)));
print("quantos grupos o $group original gera (o $limit 3 corta isso): " +
  db.movimentacoes.aggregate([original[0], original[1]]).toArray().length);

// c) pipeline corrigido
const corrigido = [
  { $match: { classe: CLASSE_ALVO } },
  { $group: { _id: "$terminal", kg_total: { $sum: "$peso_kg" }, mov: { $sum: 1 } } },
  { $sort: { kg_total: -1 } },
  { $limit: 3 },
  { $project: { _id: 0, terminal: "$_id", kg_total: 1, mov: 1 } }
];
print("\n=== c) corrigido ===");
const res = db.movimentacoes.aggregate(corrigido).toArray();
res.forEach(d => print("  " + JSON.stringify(d)));
const rC = resumo("c_corrigido", corrigido);

// prova independente: soma "na mão" com find por terminal, sem aggregate
print("\nconferência sem aggregate (find + soma no shell), todos os terminais:");
const manual = {};
db.movimentacoes.find({ classe: CLASSE_ALVO }, { _id: 0, terminal: 1, peso_kg: 1 }).forEach(d => {
  manual[d.terminal] = manual[d.terminal] || { kg: 0, mov: 0 };
  manual[d.terminal].kg += d.peso_kg; manual[d.terminal].mov++;
});
Object.entries(manual).sort((a, b) => b[1].kg - a[1].kg).forEach(([t, v]) => print("  " + t + " kg=" + v.kg + " mov=" + v.mov));

fs.writeFileSync(OUT + "b2_resultado.json", JSON.stringify({ metricas: [rA, rC], corrigido: res, manual }, null, 2));
print("\nindices: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.name)));
