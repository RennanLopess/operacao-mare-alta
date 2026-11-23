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
