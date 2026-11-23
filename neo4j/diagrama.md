# C1 — Modelo do grafo

## Modelo (rótulos, relações, direções e propriedades)

```mermaid
flowchart LR
    E1["<b>:Empresa</b><br/>cnpj: String<br/>nome: String<br/>sancionada: Boolean"]
    E2["<b>:Empresa</b>"]
    C1["<b>:Container</b><br/>id: String<br/>classe: String"]
    C2["<b>:Container</b>"]
    T1["<b>:Terminal</b><br/>nome: String"]

    E1 -- "SOCIA_DE {pct: Integer}" --> E2
    C1 -- "PERTENCE_A" --> E1
    C1 -- "PASSOU_POR {data: String}" --> T1
    C1 -- "EMPILHADO_SOBRE" --> C2
```

**Legenda**

| elemento | significado |
|---|---|
| retângulo | nó, com o **rótulo** em negrito e as propriedades embaixo |
| seta | relação **com direção** (o Neo4j sempre grava a relação com direção) |
| `{...}` na seta | propriedade da **própria relação** |
| `(a:Empresa)-[:SOCIA_DE {pct}]->(b:Empresa)` | **a** tem `pct`% de **b** |
| `(k:Container)-[:PERTENCE_A]->(e:Empresa)` | o container **k** é da empresa **e** |
| `(k:Container)-[:PASSOU_POR {data}]->(t:Terminal)` | **k** passou pelo terminal **t** na data `data` (um container pode passar várias vezes) |
| `(a:Container)-[:EMPILHADO_SOBRE]->(b:Container)` | **a** está em cima de **b**, ou seja, quem está preso em cima da base aponta **para** ela |

Não tem chave estrangeira nem tabela associativa. A ligação entre empresa e empresa é uma relação de verdade, guardada junto dos nós, e o `pct` (que num banco relacional ficaria numa tabela `socios(de, para, pct)`) mora na própria aresta `SOCIA_DE`. O mesmo vale pra `data` em `PASSOU_POR`, que no relacional seria uma tabela associativa `passagens(container, terminal, data)`.

## Subgrafo real da EMPRESA_SANCIONADA (E22)

Consultado no meu Neo4j ([c1_subgrafo.cypher](c1_subgrafo.cypher) → [c1_subgrafo_saida.txt](c1_subgrafo_saida.txt)).

```mermaid
flowchart LR
    S["<b>:Empresa</b> E22<br/>Empresa 22<br/>sancionada: true"]
    E2["<b>:Empresa</b> E2<br/>Empresa 2"]
    E7["<b>:Empresa</b> E7<br/>Empresa 7"]

    S -- "SOCIA_DE {pct: 59}" --> E2
    S -- "SOCIA_DE {pct: 72}" --> E7

    K0["<b>:Container</b> K0<br/>Granel"] -- PERTENCE_A --> S
    K1["<b>:Container</b> K1<br/>Perigoso"] -- PERTENCE_A --> S
    K2["<b>:Container</b> K2<br/>Granel"] -- PERTENCE_A --> S
    K49["<b>:Container</b> K49<br/>Granel"] -- PERTENCE_A --> S

    TT1["<b>:Terminal</b> T1"]
    TT2["<b>:Terminal</b> T2"]
    TT4["<b>:Terminal</b> T4"]
    TT5["<b>:Terminal</b> T5"]

    K0 -- "PASSOU_POR {data: 2026-10-21}" --> TT2
    K0 -- "PASSOU_POR {data: 2026-10-22}" --> TT5
    K1 -- "PASSOU_POR {data: 2026-10-09}" --> TT1
    K1 -- "PASSOU_POR {data: 2026-10-11}" --> TT1
    K2 -- "PASSOU_POR {data: 2026-10-10}" --> TT4
    K2 -- "PASSOU_POR {data: 2026-10-21}" --> TT4
    K49 -- "PASSOU_POR {data: 2026-10-16}" --> TT2
    K49 -- "PASSOU_POR {data: 2026-10-30}" --> TT4

    style S fill:#fdd,stroke:#c00,stroke-width:2px
```

- **Sócios diretos:** a E22 é sócia da **E2 (59%)** e da **E7 (72%)**. Nenhuma empresa aponta pra E22, ou seja, ela não tem sócios acima dela.
- **Containers:** K0, K1 e K2 (forçados pelo gerador) e mais o K49. São 8 passagens no total. O K1 passou duas vezes no T1.
- **BASE_DA_PILHA K28:** só o `K29` aponta pra ele (`(K29)-[:EMPILHADO_SOBRE]->(K28)`), e o K28 não aponta pra ninguém, então ele é a base da pilha.
