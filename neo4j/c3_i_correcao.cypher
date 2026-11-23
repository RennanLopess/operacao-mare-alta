MATCH (e:Empresa) WHERE e.cnpj IN ['E1', 'E2'] AND e.nome IS NULL
DETACH DELETE e
RETURN count(*) AS duplicados_apagados;

MATCH (e:Empresa) WHERE e.cnpj IN ['E1', 'E2']
RETURN e.cnpj AS cnpj, count(*) AS nos
ORDER BY cnpj;

CREATE CONSTRAINT empresa_cnpj_unico IF NOT EXISTS FOR (e:Empresa) REQUIRE e.cnpj IS UNIQUE;

MATCH (a:Empresa {cnpj: 'E1'}), (b:Empresa {cnpj: 'E2'})
MERGE (a)-[r:SOCIA_DE]->(b)
ON CREATE SET r.pct = 30
RETURN a.nome AS de, r.pct AS pct, b.nome AS para;

MATCH (a:Empresa {cnpj: 'E1'}), (b:Empresa {cnpj: 'E2'})
MERGE (a)-[r:SOCIA_DE]->(b)
ON CREATE SET r.pct = 30
RETURN a.nome AS de, r.pct AS pct, b.nome AS para;

MATCH (e:Empresa) WHERE e.cnpj IN ['E1', 'E2']
RETURN e.cnpj AS cnpj, count(*) AS nos
ORDER BY cnpj;

MATCH (a:Empresa {cnpj: 'E1'})-[r:SOCIA_DE]->(b:Empresa {cnpj: 'E2'})
RETURN count(r) AS arestas_E1_E2;

MATCH (e:Empresa) RETURN count(e) AS total_empresas;
