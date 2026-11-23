// A3 — rodar com: docker exec mongo-lab mongosh logiporto --quiet --file /tmp/a3.js
const ttlStats = () => db.serverStatus().metrics.ttl; // { passes, deletedDocuments, ... }

print("=== 1) tipo real do campo registrado_em ===");
db.alertas.aggregate([
  { $group: { _id: { $type: "$registrado_em" }, qtd: { $sum: 1 }, exemplo: { $first: "$registrado_em" } } }
]).forEach(d => print(JSON.stringify(d)));
print("docs com registrado_em do tipo date: " + db.alertas.countDocuments({ registrado_em: { $type: "date" } }));
print("docs com registrado_em do tipo string: " + db.alertas.countDocuments({ registrado_em: { $type: "string" } }));

print("\n=== 2) índice TTL (o gerador não cria, então crio o do cenário) ===");
if (!db.alertas.getIndexes().some(i => i.key.registrado_em))
  db.alertas.createIndex({ registrado_em: 1 }, { expireAfterSeconds: 2592000, name: "ttl_registrado_em" });
printjson(db.alertas.getIndexes());

print("\n=== 3) prova: um doc de controle com Date e outro com string, as duas datas de 60 dias atrás ===");
const antigo = new Date(Date.now() - 60 * 86400000);
db.alertas.insertMany([
  { sensor: "TESTE_A3", nivel: "info", registrado_em: antigo, obs: "controle BSON Date" },
  { sensor: "TESTE_A3", nivel: "info", registrado_em: antigo.toISOString(), obs: "controle string" }
]);
const antes = { total: db.alertas.countDocuments(), ttl: ttlStats() };
print("antes: total=" + antes.total + " ttl.passes=" + antes.ttl.passes + " ttl.deletedDocuments=" + antes.ttl.deletedDocuments);

// espera o monitor TTL passar pelo menos uma vez completa (roda a cada 60 s)
const inicio = Date.now();
while (ttlStats().passes < antes.ttl.passes + 2 && Date.now() - inicio < 180000) sleep(5000);
const depois = { total: db.alertas.countDocuments(), ttl: ttlStats() };
print("depois de " + Math.round((Date.now() - inicio) / 1000) + " s: total=" + depois.total +
  " ttl.passes=" + depois.ttl.passes + " ttl.deletedDocuments=" + depois.ttl.deletedDocuments);
print("docs de controle que sobraram:");
db.alertas.find({ sensor: "TESTE_A3" }, { _id: 0, obs: 1, registrado_em: 1 }).forEach(d =>
  print("  " + JSON.stringify(d) + "  tipo=" + (d.registrado_em instanceof Date ? "date" : typeof d.registrado_em)));

// tira o controle string pra coleção voltar aos 100.000 originais
db.alertas.deleteMany({ sensor: "TESTE_A3" });
print("\ntotal final (sem os controles): " + db.alertas.countDocuments());
