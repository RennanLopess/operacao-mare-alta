// A2 — rodar com: docker exec mongo-lab mongosh logiporto --quiet --file /tmp/a2.js
const fs = require("fs");
const OUT = "/tmp/out/";
fs.mkdirSync(OUT, { recursive: true });

// Google Maps dá "lat, lon" = -25.4980, -48.5030 ; GeoJSON é [lon, lat]
const PONTO = { type: "Point", coordinates: [-48.5030, -25.4980] };
const filtro = { posicao: { $near: { $geometry: PONTO, $maxDistance: 300 } } };

function stages(s) {
  if (!s) return [];
  const filhos = s.inputStage ? [s.inputStage] : (s.inputStages || []);
  return [s.stage].concat(...filhos.map(stages));
}

// limpa um 2dsphere que tenha sobrado de uma execução anterior
db.movimentacoes.getIndexes().filter(i => i.key.posicao).forEach(i => db.movimentacoes.dropIndex(i.name));

print("=== 1) ANTES do índice 2dsphere ===");
print("índices: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.key)));
try {
  db.movimentacoes.find(filtro).limit(10).toArray();
  print("rodou sem erro (inesperado)");
} catch (e) {
  print("ERRO code " + e.code + " (" + e.codeName + "): " + e.message);
}
// sem índice dá pra filtrar por área ($geoWithin), mas sem ordenar por distância e com COLLSCAN
const semIdx = db.movimentacoes.find({ posicao: { $geoWithin: { $centerSphere: [PONTO.coordinates, 300 / 6378100] } } })
  .explain("executionStats").executionStats;
print("$geoWithin sem índice: stages=" + stages(semIdx.executionStages).join(" > ") +
  " docsExamined=" + semIdx.totalDocsExamined + " nReturned=" + semIdx.nReturned + " ms=" + semIdx.executionTimeMillis);

print("\n=== 2) criando o índice ===");
print(db.movimentacoes.createIndex({ posicao: "2dsphere" }, { name: "idx_posicao_2dsphere" }));

print("\n=== 3) DEPOIS: $near + limit 10 com explain ===");
const ex = db.movimentacoes.find(filtro).limit(10).explain("executionStats");
fs.writeFileSync(OUT + "a2_explain.json", EJSON.stringify(ex, null, 2, { relaxed: true }));
const es = ex.executionStats;
print("stages: " + stages(es.executionStages).join(" > "));
printjson({ totalDocsExamined: es.totalDocsExamined, totalKeysExamined: es.totalKeysExamined,
  nReturned: es.nReturned, executionTimeMillis: es.executionTimeMillis });

// detalhe de cada estágio, pra explicar o plano
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
  print("  anel " + (i + 1) + ": " + iv.minDistance.toFixed(1) + " m a " + iv.maxDistance.toFixed(1) + " m, " + iv.nBuffered + " docs bufferizados, " + iv.nReturned + " devolvidos"));

print("\n=== 4) resultado (distância calculada com $geoNear, só pra conferência) ===");
db.movimentacoes.aggregate([
  { $geoNear: { near: PONTO, distanceField: "dist_m", maxDistance: 300, spherical: true } },
  { $limit: 10 },
  { $project: { _id: 0, container: 1, tipo: 1, terminal: 1, coords: "$posicao.coordinates", dist_m: { $round: ["$dist_m", 1] } } }
]).forEach(d => print(JSON.stringify(d)));
print("total de docs dentro de 300 m: " + db.movimentacoes.countDocuments({ posicao: { $geoWithin: { $centerSphere: [PONTO.coordinates, 300 / 6378100] } } }));
print("\níndices: " + JSON.stringify(db.movimentacoes.getIndexes().map(i => i.key)));
