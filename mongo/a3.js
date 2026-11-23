const ttlStats = () => db.serverStatus().metrics.ttl;
const num = (v) => Number(v);

print("=== 1) $type registrado_em ===");
db.alertas.aggregate([
  { $group: { _id: { $type: "$registrado_em" }, qtd: { $sum: 1 }, exemplo: { $first: "$registrado_em" } } }
]).forEach(d => print(JSON.stringify(d)));
print("$type date: " + db.alertas.countDocuments({ registrado_em: { $type: "date" } }));
print("$type string: " + db.alertas.countDocuments({ registrado_em: { $type: "string" } }));

print("\n=== 2) getIndexes ===");
if (!db.alertas.getIndexes().some(i => i.key.registrado_em))
  db.alertas.createIndex({ registrado_em: 1 }, { expireAfterSeconds: 2592000, name: "ttl_registrado_em" });
printjson(db.alertas.getIndexes());

print("\n=== 3) controle Date x string (agora - 60 dias) ===");
const antigo = new Date(Date.now() - 60 * 86400000);
db.alertas.insertMany([
  { sensor: "TESTE_A3", nivel: "info", registrado_em: antigo, obs: "controle Date" },
  { sensor: "TESTE_A3", nivel: "info", registrado_em: antigo.toISOString(), obs: "controle string" }
]);
const antes = { total: db.alertas.countDocuments(), ttl: ttlStats() };
print("antes: total=" + antes.total + " ttl.passes=" + num(antes.ttl.passes) + " ttl.deletedDocuments=" + num(antes.ttl.deletedDocuments));

const inicio = Date.now();
while (num(ttlStats().passes) < num(antes.ttl.passes) + 2 && Date.now() - inicio < 180000) sleep(5000);
const depois = { total: db.alertas.countDocuments(), ttl: ttlStats() };
print("depois (" + Math.round((Date.now() - inicio) / 1000) + " s): total=" + depois.total +
  " ttl.passes=" + num(depois.ttl.passes) + " ttl.deletedDocuments=" + num(depois.ttl.deletedDocuments));
print("find sensor TESTE_A3:");
db.alertas.find({ sensor: "TESTE_A3" }, { _id: 0, obs: 1, registrado_em: 1 }).forEach(d =>
  print("  " + JSON.stringify(d) + "  tipo=" + (d.registrado_em instanceof Date ? "date" : typeof d.registrado_em)));

db.alertas.deleteMany({ sensor: "TESTE_A3" });
print("\ncountDocuments final: " + db.alertas.countDocuments());
