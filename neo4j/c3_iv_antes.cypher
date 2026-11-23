MATCH (k:Container)-[:PASSOU_POR]->(t:Terminal) WHERE k.classe='Perigoso' RETURN t.nome, count(k);

MATCH (k:Container {classe: 'Perigoso'})-[p:PASSOU_POR]->(t:Terminal)
WITH k, t, count(p) AS passagens
WHERE passagens > 1
RETURN k.id AS container, t.nome AS terminal, passagens
ORDER BY terminal, container;
