MATCH (e:Empresa) WHERE e.cnpj IN ['E1', 'E2']
RETURN e.cnpj AS cnpj, count(*) AS nos, collect(e.nome) AS nomes
ORDER BY cnpj;

MATCH (a:Empresa {cnpj: 'E1'})-[r:SOCIA_DE]->(b:Empresa {cnpj: 'E2'})
RETURN count(r) AS arestas_E1_E2;

CREATE (a:Empresa {cnpj:'E1'})-[:SOCIA_DE {pct:30}]->(b:Empresa {cnpj:'E2'});

MATCH (e:Empresa) WHERE e.cnpj IN ['E1', 'E2']
RETURN e.cnpj AS cnpj, count(*) AS nos, collect(e.nome) AS nomes
ORDER BY cnpj;

MATCH (e:Empresa) RETURN count(e) AS total_empresas;
