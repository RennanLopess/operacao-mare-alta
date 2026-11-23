UNWIND range(1, 8) AS n
CALL (n) {
  MATCH p = (s:Empresa {sancionada: true})-[:SOCIA_DE*1..8]-(x:Empresa)
  WHERE length(p) = n
  RETURN count(p) AS caminhos, count(DISTINCT x) AS empresas_distintas
}
RETURN n AS tamanho_caminho, caminhos, empresas_distintas;
