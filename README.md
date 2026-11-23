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
