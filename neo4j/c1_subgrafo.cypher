MATCH (s:Empresa {cnpj: 'E22'})
RETURN s.cnpj AS cnpj, s.nome AS nome, s.sancionada AS sancionada;

MATCH (a:Empresa)-[r:SOCIA_DE]->(b:Empresa)
WHERE a.cnpj = 'E22' OR b.cnpj = 'E22'
RETURN a.cnpj AS de, r.pct AS pct, b.cnpj AS para
ORDER BY de, para;

MATCH (k:Container)-[:PERTENCE_A]->(s:Empresa {cnpj: 'E22'})
OPTIONAL MATCH (k)-[p:PASSOU_POR]->(t:Terminal)
RETURN k.id AS container, k.classe AS classe, t.nome AS terminal, p.data AS data
ORDER BY container, data;

MATCH (k:Container {id: 'K28'})
OPTIONAL MATCH (acima:Container)-[:EMPILHADO_SOBRE]->(k)
OPTIONAL MATCH (k)-[:EMPILHADO_SOBRE]->(abaixo:Container)
RETURN k.id AS base, collect(DISTINCT acima.id) AS apontam_para_k28, collect(DISTINCT abaixo.id) AS k28_aponta_para;
