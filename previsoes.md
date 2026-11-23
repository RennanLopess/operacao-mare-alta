# Previsões (escritas ANTES de rodar cada questão)

## A1 — find com terminal + classe + ts, sort peso_kg -1, limit 20

Raciocínio: são 400 mil docs, 5 terminais e 4 classes distribuídos de forma uniforme, então T2 + Refrigerado dá uns 20 mil (o código de autenticidade mostra 20.091, que é exatamente essa contagem). O `ts` é uniforme em 300 dias a partir de 01/01, e o corte em 01/04 é o dia 90, então sobram uns 70%: **~14 mil docs** casam com o filtro inteiro.

| | a) sem índice | b) {terminal, classe, ts, peso_kg:-1} | c) ESR {terminal, classe, peso_kg:-1, ts} |
|---|---|---|---|
| stage | COLLSCAN (+ SORT) | IXSCAN → FETCH → SORT | IXSCAN → FETCH (sem SORT) |
| totalKeysExamined | 0 | ~14 mil | algumas dezenas (~30) |
| totalDocsExamined | 400.000 | ~14 mil | ~20 |
| SORT em memória | sim | **sim** | **não** |
| nReturned | 20 | 20 | 20 |
| tempo | o maior (centenas de ms) | médio | quase 0 |

Por quê:
- **b)** Como o `ts` é um *range*, a partir dele as chaves da B-Tree ficam ordenadas por `ts` e não por `peso_kg`. O índice corta bem o filtro, mas o Mongo ainda tem que buscar os ~14 mil docs e ordenar em memória pra pegar os 20 mais pesados.
- **c)** Com igualdade → sort → range, depois de `terminal` e `classe` fixos as chaves já estão em ordem de `peso_kg` decrescente. O Mongo lê na ordem e testa o `ts` na própria chave (cerca de 70% passam), então para depois de uns 20/0,7 ≈ 29 chaves. Não precisa de SORT.

## A2 — 10 movimentações mais próximas do incidente (raio 300 m)

Ponto: lat -25.4980, lon -48.5030 → GeoJSON `[-48.5030, -25.4980]`. Vou usar `$near` com `$geometry` e `$maxDistance: 300`.

- **Antes do 2dsphere:** acho que vai dar **erro**, não um resultado lento. O `$near` precisa de um índice geoespacial pra funcionar, e sem ele o planner não acha plano nenhum ("unable to find index for $geoNear query").
- **Quantos pontos tem no raio:** os 400 mil pontos estão espalhados num quadrado de 0,05° × 0,05° (uns 5,6 km × 5,0 km ≈ 28 km²), então são ~14 mil pontos por km². Um círculo de 300 m tem 0,28 km², o que daria ~4 mil pontos. Só que o incidente fica a só 0,002° (~220 m) da borda sul do quadrado, então um pedaço do círculo cai fora da área. Estimo **~3.700 docs dentro do raio**.
- **Depois do índice:** stages `LIMIT > FETCH > GEO_NEAR_2DSPHERE` (com IXSCAN no índice 2dsphere por baixo). O `$near` vai buscando em anéis que crescem a partir do ponto e para quando já tem 10 garantidos, então **não lê os ~3.700**. Estimo **totalKeysExamined na casa das centenas** e **totalDocsExamined de dezenas a poucas centenas**.
- **SORT em memória:** não aparece estágio SORT. A ordenação por distância é feita pelo próprio estágio GEO_NEAR.
- **nReturned:** 10.
