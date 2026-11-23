MATCH (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa)
WHERE x <> s
RETURN DISTINCT x.nome AS empresa
ORDER BY empresa;

MATCH p = (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa)
RETURN count(p) AS caminhos_percorridos;
