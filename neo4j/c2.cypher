MATCH caminho = (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa)
WHERE x <> s
RETURN x.cnpj AS empresa, length(caminho) AS nivel, [r IN relationships(caminho) | r.pct] AS pcts
ORDER BY nivel, empresa;

MATCH (s:Empresa {sancionada: true})
OPTIONAL MATCH (s)-[:SOCIA_DE*1..3]->(saida:Empresa) WHERE saida <> s
WITH s, count(DISTINCT saida) AS saida
OPTIONAL MATCH (s)<-[:SOCIA_DE*1..3]-(entrada:Empresa) WHERE entrada <> s
WITH s, saida, count(DISTINCT entrada) AS entrada
OPTIONAL MATCH (s)-[:SOCIA_DE*1..3]-(sem_direcao:Empresa) WHERE sem_direcao <> s
RETURN saida, entrada, count(DISTINCT sem_direcao) AS sem_direcao;

MATCH (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa)
WHERE x <> s
MATCH (x)<-[:PERTENCE_A]-(kx:Container)-[px:PASSOU_POR]->(t:Terminal)<-[ps:PASSOU_POR]-(ks:Container)-[:PERTENCE_A]->(s)
WHERE px.data = ps.data
RETURN count(*) AS linhas_sem_distinct;

MATCH (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa)
WHERE x <> s
MATCH (x)<-[:PERTENCE_A]-(kx:Container)-[px:PASSOU_POR]->(t:Terminal)<-[ps:PASSOU_POR]-(ks:Container)-[:PERTENCE_A]->(s)
WHERE px.data = ps.data
RETURN DISTINCT x.nome AS empresa_investigada, kx.id AS container, t.nome AS terminal, px.data AS data
ORDER BY empresa_investigada, data, container;

MATCH (s:Empresa {sancionada: true})-[:SOCIA_DE*1..3]->(x:Empresa)
WHERE x <> s
MATCH (x)<-[:PERTENCE_A]-(kx:Container)-[px:PASSOU_POR]->(t:Terminal)<-[ps:PASSOU_POR]-(ks:Container)-[:PERTENCE_A]->(s)
WHERE px.data = ps.data
RETURN DISTINCT x.nome AS empresa_investigada, kx.id AS container, t.nome AS terminal, px.data AS data, ks.id AS container_sancionada
ORDER BY empresa_investigada, data, container;
