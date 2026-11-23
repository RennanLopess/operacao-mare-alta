# Operação Maré Alta — Prova Prática (NoSQL)

**Aluno:** Rennan Rentz Lopes da Silva · **RA:** 240734452
Banco de Dados NoSQL — Engenharia de Software, Unicesumar · Prof. Leonardo Rocha

## Parâmetros da minha prova

| Parâmetro | Valor |
|---|---|
| CLASSE_ALVO | `Refrigerado` |
| TERMINAL_ALVO | `T2` |
| DATA_CORTE | `2026-04-01` |
| INCIDENTE (lat, lon) | `-25.4980, -48.5030` → GeoJSON `[-48.5030, -25.4980]` |
| **Código de Autenticidade** | **`LP-240734452-20091-40919`** |
| EMPRESA_SANCIONADA | `E22` |
| BASE_DA_PILHA | `K28` |

Saída original do gerador: [mongo/saida_gerador.txt](mongo/saida_gerador.txt). Primeira linha do [neo4j/grafo.cypher](neo4j/grafo.cypher).

## Ambiente

- MongoDB 7 no contêiner Docker `mongo-lab`; os comandos rodam com `docker exec mongo-lab mongosh logiporto`
- Neo4j 5 no contêiner `neo4j-lab`; as consultas rodam pelo `cypher-shell` dentro do contêiner
- Banco `logiporto`: `movimentacoes` (400.000 docs) e `alertas` (100.000 docs)
- Grafo: 5 Terminal, 30 Empresa, 90 Container · 45 SOCIA_DE, 90 PERTENCE_A, 180 PASSOU_POR, 45 EMPILHADO_SOBRE

## Estrutura

- `previsoes.md`: previsões feitas antes de rodar cada questão, cada uma com o seu commit
- `diario.md`: o que deu errado, hipóteses que falharam e correções
- `mongo/`: scripts, saídas e JSONs de explain (Partes A e B)
- `neo4j/`: cypher, evidências e `diagrama.md` (Parte C)

## Respostas

| Questão | Arquivo |
|---|---|
| A1: índice composto e ESR | [mongo/A1.md](mongo/A1.md) |
| A2: geoespacial 2dsphere | [mongo/A2.md](mongo/A2.md) |
| A3: TTL com string | [mongo/A3.md](mongo/A3.md) |
| A4: covered query | [mongo/A4.md](mongo/A4.md) |
| B1: agregação por terminal | [mongo/B1.md](mongo/B1.md) |
| B2: debug de pipeline | [mongo/B2.md](mongo/B2.md) |
| C1: diagrama Mermaid | [neo4j/diagrama.md](neo4j/diagrama.md) |
| C2: rede da sancionada | [neo4j/C2.md](neo4j/C2.md) |
| C3: debug Cypher | [neo4j/C3.md](neo4j/C3.md) |

Índices finais em `movimentacoes`: `_id_`, `idx_esr` (A1), `idx_posicao_2dsphere` (A2), `idx_tipo_terminal_container` (A4) e `idx_classe_ts` (B1/B2). Ver [mongo/indices_fim_parte_B.txt](mongo/indices_fim_parte_B.txt).
