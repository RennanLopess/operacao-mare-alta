// A4 — rodar com: docker exec mongo-lab mongosh logiporto --quiet --file /tmp/a4.js
const fs = require("fs");
const OUT = "/tmp/out/";
fs.mkdirSync(OUT, { recursive: true });

function stages(s) {
  if (!s) return [];
  const filhos = s.inputStage ? [s.inputStage] : (s.inputStages || []);
  return [s.stage].concat(...filhos.map(stages));
}
function mostra(nome, ex) {
  fs.writeFileSync(OUT + "a4_" + nome + "_explain.json", EJSON.stringify(ex, null, 2, { relaxed: true }));
  const es = ex.executionStats;
  const r = { cenario: nome, stages: stages(es.executionStages).join(" > "),
    indice: JSON.stringify(ex.queryPlanner.winningPlan).match(/"indexName":"([^"]+)"/)?.[1] || "-",
    totalKeysExamined: es.totalKeysExamined, totalDocsExamined: es.totalDocsExamined,
    nReturned: es.nReturned, executionTimeMillis: es.executionTimeMillis };
  printjson(r);
  return r;
}

const filtro = { tipo: "inspecao", terminal: "T2" };
db.movimentacoes.createIndex({ tipo: 1, terminal: 1, container: 1 }, { name: "idx_tipo_terminal_container" });

print("=== 1) com _id:0 (coberta) ===");
const r1 = mostra("1_coberta", db.movimentacoes.find(filtro, { _id: 0, container: 1 }).explain("executionStats"));
print("amostra: " + JSON.stringify(db.movimentacoes.find(filtro, { _id: 0, container: 1 }).limit(3).toArray()));

print("\n=== 2) sem _id:0 ===");
const r2 = mostra("2_sem_id0", db.movimentacoes.find(filtro, { container: 1 }).explain("executionStats"));
print("amostra: " + JSON.stringify(db.movimentacoes.find(filtro, { container: 1 }).limit(3).toArray()));

fs.writeFileSync(OUT + "a4_metricas.json", JSON.stringify([r1, r2], null, 2));
