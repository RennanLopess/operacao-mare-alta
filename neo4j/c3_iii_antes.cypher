MATCH (base:Container {id:'BASE_DA_PILHA'})-[:EMPILHADO_SOBRE*1..3]->(x:Container) RETURN x.id;

MATCH (base:Container {id:'BASE_DA_PILHA'})-[:EMPILHADO_SOBRE*1..3]->(x:Container) RETURN count(x) AS linhas_consulta_original;

MATCH (base:Container {id:'BASE_DA_PILHA'}) RETURN count(base) AS nos_com_id_literal;

MATCH (base:Container {id:'K28'})-[:EMPILHADO_SOBRE*1..3]->(x:Container) RETURN count(x) AS linhas_com_K28_direcao_original;
