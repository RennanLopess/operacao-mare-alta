// A1 — rodar com: docker exec mongo-lab mongosh logiporto --quiet --file /tmp/a1.js
const fs = require("fs");
const OUT = "/tmp/out/";
fs.mkdirSync(OUT, { recursive: true });

const filtro = { terminal: "T2", classe: "Refrigerado", ts: { $gte: ISODate("2026-04-01T00:00:00Z") } };
const consulta = () => db.movimentacoes.find(filtro).sort({ peso_kg: -1 }).limit(20);

// percorre a árvore do plano e devolve os stages (ex.: LIMIT > FETCH > IXSCAN)
function stages(s) {
  if (!s) return [];
  const filhos = s.inputStage ? [s.inputStage] : (s.inputStages || []);
  return [s.stage].concat(...filhos.map(stages));
}
function metricas(nome, ex) {
  const es = ex.executionStats;
  const plano = ex.queryPlanner.winningPlan.queryPlan || ex.queryPlanner.winningPlan;
  const lista = stages(es.executionStages);
  const r = {
    cenario: nome,
    stages: lista.join(" > "),
    sortEmMemoria: lista.some(x => x === "SORT"),
    indice: JSON.stringify(plano).match(/"indexName":"([^"]+)"/)?.[1] || "-",
    totalDocsExamined: es.totalDocsExamined,
    totalKeysExamined: es.totalKeysExamined,
    nReturned: es.nReturned,
    executionTimeMillis: es.executionTimeMillis
  };
  fs.writeFileSync(OUT + "a1_" + nome + "_explain.json", EJSON.stringify(ex, null, 2, { relaxed: true }));
  return r;
}

print("versao do mongod: " + db.version());
db.movimentacoes.getIndexes().filter(i => i.name !== "_id_").forEach(i => db.movimentacoes.dropIndex(i.name));
consulta().toArray(); // aquece o cache, pra comparar os três cenários de forma justa

const res = [];
// a) sem índice
res.push(metricas("a_sem_indice", consulta().explain("executionStats")));

// b) índice na ordem do filtro
db.movimentacoes.createIndex({ terminal: 1, classe: 1, ts: 1, peso_kg: -1 }, { name: "idx_ordem_filtro" });
res.push(metricas("b_ordem_filtro", consulta().explain("executionStats")));

// c) remove o b e cria o ESR: Equality (terminal, classe) -> Sort (peso_kg) -> Range (ts)
db.movimentacoes.dropIndex("idx_ordem_filtro");
db.movimentacoes.createIndex({ terminal: 1, classe: 1, peso_kg: -1, ts: 1 }, { name: "idx_esr" });
res.push(metricas("c_esr", consulta().explain("executionStats")));

// confere que os três devolvem o mesmo resultado
print("top3 (c): " + JSON.stringify(consulta().limit(3).toArray().map(d => d.peso_kg)));
printjson(res);
fs.writeFileSync(OUT + "a1_metricas.json", JSON.stringify(res, null, 2));
print("indices: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.key)));
