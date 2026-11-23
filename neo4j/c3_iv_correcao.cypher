MATCH (k:Container)-[:PASSOU_POR]->(t:Terminal)
WHERE k.classe = 'Perigoso'
RETURN t.nome AS terminal, count(DISTINCT k) AS containers_perigosos, count(k) AS passagens
ORDER BY terminal;
