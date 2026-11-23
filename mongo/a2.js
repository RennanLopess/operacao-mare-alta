const fs = require("fs");
const OUT = "/tmp/out/";
fs.mkdirSync(OUT, { recursive: true });

const PONTO = { type: "Point", coordinates: [-48.5030, -25.4980] };
const filtro = { posicao: { $near: { $geometry: PONTO, $maxDistance: 300 } } };

function stages(s) {
  if (!s) return [];
  const filhos = s.inputStage ? [s.inputStage] : (s.inputStages || []);
  return [s.stage].concat(...filhos.map(stages));
}

db.movimentacoes.getIndexes().filter(i => i.key.posicao).forEach(i => db.movimentacoes.dropIndex(i.name));

print("=== 1) antes do indice 2dsphere ===");
print("indices: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.key)));
try {
  const r = db.movimentacoes.find(filtro).limit(10).toArray();
  print("resultado: " + r.length + " docs");
} catch (e) {
  print("ERRO code " + e.code + " (" + e.codeName + "): " + e.message);
}
const semIdx = db.movimentacoes.find({ posicao: { $geoWithin: { $centerSphere: [PONTO.coordinates, 300 / 6378100] } } })
  .explain("executionStats").executionStats;
print("$geoWithin $centerSphere: stages=" + stages(semIdx.executionStages).join(" > ") +
  " docsExamined=" + semIdx.totalDocsExamined + " nReturned=" + semIdx.nReturned + " ms=" + semIdx.executionTimeMillis);

print("\n=== 2) createIndex ===");
print(db.movimentacoes.createIndex({ posicao: "2dsphere" }, { name: "idx_posicao_2dsphere" }));

print("\n=== 3) $near limit 10 explain executionStats ===");
const ex = db.movimentacoes.find(filtro).limit(10).explain("executionStats");
fs.writeFileSync(OUT + "a2_explain.json", EJSON.stringify(ex, null, 2, { relaxed: true }));
const es = ex.executionStats;
print("stages: " + stages(es.executionStages).join(" > "));
printjson({ totalDocsExamined: es.totalDocsExamined, totalKeysExamined: es.totalKeysExamined,
  nReturned: es.nReturned, executionTimeMillis: es.executionTimeMillis });

function detalhe(s, nivel) {
  const extra = s.stage === "IXSCAN" ? " idx=" + s.indexName : (s.stage.startsWith("GEO_NEAR") ? " searchIntervals=" + (s.searchIntervals || []).length : "");
  print("  ".repeat(nivel) + s.stage + extra + " | works=" + s.works + " advanced=" + s.advanced +
    (s.keysExamined !== undefined ? " keysExamined=" + s.keysExamined : "") +
    (s.docsExamined !== undefined ? " docsExamined=" + s.docsExamined : ""));
  (s.inputStage ? [s.inputStage] : (s.inputStages || [])).forEach(f => detalhe(f, nivel + 1));
}
detalhe(es.executionStages, 0);
const gn = (function acha(s) { if (!s) return null; if (s.stage.startsWith("GEO_NEAR")) return s;
  return acha(s.inputStage) || (s.inputStages || []).map(acha).find(x => x); })(es.executionStages);
if (gn && gn.searchIntervals) gn.searchIntervals.forEach((iv, i) =>
  print("  intervalo " + (i + 1) + ": " + iv.minDistance.toFixed(1) + " m a " + iv.maxDistance.toFixed(1) + " m, nBuffered=" + iv.nBuffered + ", nReturned=" + iv.nReturned));

print("\n=== 4) $geoNear distanceField ===");
db.movimentacoes.aggregate([
  { $geoNear: { near: PONTO, distanceField: "dist_m", maxDistance: 300, spherical: true } },
  { $limit: 10 },
  { $project: { _id: 0, container: 1, tipo: 1, terminal: 1, coords: "$posicao.coordinates", dist_m: { $round: ["$dist_m", 1] } } }
]).forEach(d => print(JSON.stringify(d)));
print("countDocuments raio 300 m: " + db.movimentacoes.countDocuments({ posicao: { $geoWithin: { $centerSphere: [PONTO.coordinates, 300 / 6378100] } } }));
print("\nindices: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.key)));
