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

## A3 — TTL em `alertas.registrado_em` que não apaga nada

Observação antes de rodar: no `getIndexes()` do setup a coleção `alertas` só tinha o `_id_`, porque o gerador não cria TTL nenhum. Vou criar o TTL do enunciado pra reproduzir o cenário.

**Hipótese inicial:** o problema não está no índice, está no **tipo do dado**. O gerador grava `registrado_em` com `.toISOString()`, ou seja, uma **string** do tipo `"2026-03-14T..."`, e não um BSON Date. O monitor TTL (uma thread que roda mais ou menos a cada 60 s) só compara datas: se o campo indexado não for Date (ou array de Dates), o documento é ignorado e fica pra sempre, sem dar erro nenhum.

O que espero ver:
- `aggregate` com `$type` em `registrado_em` → **100% "string"**, 0 "date".
- Mesmo com o TTL criado e esperando mais de 60 s, o `countDocuments()` continua em **100.000**. As datas vão de jan a out/2026 e hoje é 23/11/2026, então se fossem Date, quase tudo já teria passado dos 30 dias.
- Um documento de teste com `new Date()` antigo deve sumir no próximo ciclo do TTL. Um com string não.

## A4 — covered query: `find({tipo:"inspecao", terminal:"T2"}, {_id:0, container:1})`

Raciocínio: 5 tipos × 5 terminais uniformes, então ~400.000 / 25 ≈ **16 mil docs**. Índice que vou criar: `{ tipo: 1, terminal: 1, container: 1 }`. O filtro (tipo, terminal) e a projeção (container) ficam todos dentro da chave.

| | com `_id:0` | sem `_id:0` |
|---|---|---|
| stage | `PROJECTION_COVERED > IXSCAN` | `PROJECTION_SIMPLE > FETCH > IXSCAN` |
| totalKeysExamined | ~16 mil | ~16 mil |
| totalDocsExamined | **0** | **~16 mil** (um por resultado) |
| SORT em memória | não | não |
| nReturned | ~16 mil | ~16 mil |

Por quê: o `_id` sai na projeção por padrão e não está no índice. Se eu não excluir, o Mongo precisa ir em cada documento (FETCH) só pra pegar o `_id`, e a consulta deixa de ser coberta. O índice ESR da A1 começa por `terminal` mas não tem `tipo` nem `container`, então acho que o planner nem vai escolher ele.

## B1 — agregação por terminal (Refrigerado, ts ≥ 2026-04-01)

Raciocínio: Refrigerado é 1/4 de 400 mil ≈ 100 mil, e 70% depois do corte (dia 90 de 300) dá **~70 mil docs** no `$match`.

- **Sem índice próprio:** o `idx_esr` começa por `terminal`, e o `$match` não filtra terminal, então ele não serve como prefixo. Com os índices de hoje, espero **COLLSCAN com 400 mil docs examinados**.
- **Índice que vou criar:** `{ classe: 1, ts: 1 }` (igualdade e depois range).
- **Com o índice:** `IXSCAN → FETCH` (o FETCH é necessário porque `terminal` e `peso_kg` não estão no índice) → `$group`. Estimo **totalKeysExamined ≈ totalDocsExamined ≈ 70 mil**, e são esses **~70 mil docs que entram no `$group`**.
- **SORT em memória:** só o `$sort` depois do `$group`, que ordena 5 linhas (uma por terminal), então não pesa nada.
- **Saída (nReturned final):** 3 linhas. Cada terminal tem ~14 mil movimentações, peso médio perto de 16 mil kg (média de 1.000 + 0 a 29.999), peso total na casa de ~220–230 milhões de kg e maior peso perto de 31 mil kg. Os três primeiros devem ficar bem próximos, porque os dados são uniformes.

## B2 — pipeline com defeito (todo o período, Refrigerado, top 3 por peso)

**a) Rodando como está, eu espero:**
- `$project {terminal, classe}` mantém também o `_id` e **joga fora o `peso_kg`**.
- `$group` por (terminal, classe) → **20 grupos** (5 × 4), cada um com `mov` ≈ 20 mil.
- `kg_total: {$sum: "peso_kg"}` sem `$` soma a **string literal** "peso_kg", que não é número. O `$sum` ignora valor não numérico, então **kg_total = 0 em todos**. (Mesmo com `$`, daria 0, porque o `$project` já tirou o campo.)
- `$limit 3` antes do `$sort` pega **3 grupos quaisquer** (a ordem de saída do `$group` não é garantida), e o `$sort` depois ordena só esses 3, todos empatados em 0.
- `$match` no fim filtra Refrigerado só entre esses 3 grupos aleatórios. Cada grupo tem 1/4 de chance de ser Refrigerado, então espero **0 ou 1 documento** na saída, e com `kg_total: 0`.
- **Plano:** COLLSCAN, 400 mil docs examinados, 0 chaves. Nenhum índice ajuda, porque o filtro só aparece no fim, depois de `$group` e `$limit`, e o otimizador não pode passar um `$match` por cima de um `$limit`.

**c) Pipeline corrigido:** `$match {classe}` → `$group` por terminal com `$sum: "$peso_kg"` → `$sort` → `$limit 3` → `$project`.
- Plano: **IXSCAN no `idx_classe_ts`** (prefixo `classe`, `ts` sem limite) → FETCH → group. ~100 mil chaves e ~100 mil docs (1/4 de 400 mil), **~100 mil entram no `$group`**, 5 grupos, 3 na saída.
- Cada terminal com ~20 mil mov. e ~320 milhões de kg (20 mil × ~16 mil kg).
- SORT só de 5 linhas.

## C2 — empresas ligadas à sancionada (E22) até 3 níveis, com container no mesmo terminal e na mesma data

Escrita **antes** de consultar o grafo (nem a C1 eu rodei ainda). Só sei o que o gerador faz.

**Direção:** no gerador a aresta é `(a)-[:SOCIA_DE {pct}]->(b)`, ou seja, "a é sócia de b" (a tem pct% de b). Vou seguir **a partir da sancionada pra fora**: `(s)-[:SOCIA_DE*1..3]->(x)`. Isso pega as empresas em que a E22 tem participação, direta ou por meio de outras empresas. É por elas que uma empresa sancionada consegue continuar operando "por baixo dos panos" (laranjas, controladas). Quem é dono da E22 (direção contrária) é outra investigação. Pra comparar, vou contar também quantas aparecem sem direção.

**Ordem de grandeza:**
- 45 arestas entre 30 empresas dão ~1,5 saídas por empresa. Em 3 níveis seriam 1,5 + 2,25 + 3,4 ≈ 7, menos repetições: **~4 a 7 empresas alcançadas**.
- Cada empresa tem ~3 containers (90/30). A E22 tem os 3 forçados (K0, K1, K2) + ~3 aleatórios ≈ **~6 containers, ~12 passagens**.
- As investigadas teriam ~6 × 3 × 2 ≈ 36 passagens. A chance de duas passagens caírem no mesmo terminal e no mesmo dia é 1/5 × 1/30 = 1/150. Então 36 × 12 / 150 ≈ **~3 coincidências**.
- Espero **poucas linhas, de 0 a 5 (chute: ~3)**. Pode até dar 0. O DISTINCT deve remover pouca coisa (só se a mesma empresa aparecer por dois caminhos diferentes).
