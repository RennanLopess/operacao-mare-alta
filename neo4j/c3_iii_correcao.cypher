MATCH p = (x:Container)-[:EMPILHADO_SOBRE*1..3]->(base:Container {id: 'K28'})
RETURN x.id AS container_acima, length(p) AS niveis_acima
ORDER BY niveis_acima;
