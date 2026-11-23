# Diário de bordo

## Preparação do ambiente

- Os geradores vieram copiados do PDF como `.txt`, com `&quot;`, `&gt;` no lugar dos caracteres, linhas quebradas no meio das strings e até o rodapé da página no meio do código (“Prova Prática Integradora… Página 8”). Montei os `.js` limpos sem mudar a lógica. Num ponto tive que decidir: o nome da empresa estava quebrado entre `"Empresa` e `" + i`, e usei `"Empresa " + i` (com espaço), que é o jeito mais natural.
- O contêiner `mongo-lab` já existia de outra atividade (tem um `techstore_db`) e não tem porta publicada. Na 27017 do Windows tem um serviço MongoDB local rodando. Por isso rodei tudo com `docker exec mongo-lab mongosh`, pra ter certeza de que estou no banco certo.
- O `grafo.cypher` gerado pelo PowerShell saiu em UTF-8 com BOM. Regravei sem BOM antes de mandar pro `cypher-shell`. Carregou tudo de uma vez, sem precisar ir bloco a bloco.
- Percebi que o gerador **não cria** nenhum índice TTL em `alertas`, só o `_id_`. Isso vai importar na A3.

## A1

- **Hipótese que falhou:** no índice b) eu previ ~14 mil docs examinados, achando que o Mongo ia buscar todos os documentos pra depois ordenar. Deu **20**. O plano real foi `FETCH > SORT > IXSCAN`: como o `peso_kg` também está no índice, o SORT foi feito em cima das chaves e o FETCH só aconteceu pros 20 que sobraram. As chaves examinadas bateram (13.953 contra ~14 mil previstos), e o SORT em memória continuou lá, que era o ponto principal.
- O resto bateu: COLLSCAN com 400 mil docs no a), e 27 chaves no ESR contra as ~29 que eu tinha estimado (20 / 0,7).
- O mongo do contêiner é a versão 8.3.8. Rodei a consulta uma vez antes dos explains pra aquecer o cache e deixar a comparação de tempo mais justa.

## A2

- O erro antes do índice veio como eu esperava (code 291, "unable to find index for $geoNear query").
- A conta de densidade funcionou: previ ~3.700 pontos no raio, contando o pedaço do círculo que fica fora da área por causa da borda sul, e deram 3.729.
- **Errei pra cima** nas chaves: previ centenas e foram 37 (14 docs). Não pensei que, com ~14 mil pontos por km², o primeiro anel de só 13 m já teria pontos suficientes. Com essa densidade, os 10 mais próximos estão todos a menos de 13 m.
- Quase escrevi `[lat, lon]` na consulta copiando do Maps. Se fizesse isso, o ponto cairia em outro lugar do planeta e não voltaria nada.
- A ordem dos stages também foi diferente do que imaginei: o FETCH fica **abaixo** do GEO_NEAR, porque ele precisa do documento pra calcular a distância exata.

## A3

- A hipótese bateu: 100% string, e o TTL ignorou tudo.
- Como o enunciado fala de um TTL que "existe", mas o gerador não cria esse índice, eu criei pra reproduzir o cenário.
- Só olhar `count` antes e depois não ia provar muita coisa, porque se ninguém fosse apagado eu não saberia se o TTL estava ligado ou não. Por isso coloquei um documento de controle com Date de verdade e acompanhei o `serverStatus().metrics.ttl`. O Date sumiu na primeira passada e o string ficou. Isso mostra que o problema é o tipo do campo, não o índice.
- Detalhe: meu loop de espera era pra aguardar 2 passadas, mas saiu depois de 1 (35 s). Acho que é porque o `passes` vem como Long e a soma `+ 2` não funcionou do jeito que eu imaginei. Uma passada já foi o suficiente pra prova, então deixei assim.

## A4

- Bateu certinho: 15.992 resultados (eu tinha chutado ~16 mil = 400 mil / 25), 0 docs examinados com `_id:0` e 15.992 sem.
- O planner escolheu o índice novo sem precisar de `hint`.
- O ganho de tempo aqui foi pequeno (20 vs 30 ms), porque a coleção inteira cabe na memória do contêiner. O ganho de verdade é o `totalDocsExamined`.

## Fechamento da Parte A

- Conferi o `getIndexes()`. Ficaram só os índices que alguma questão usa (ESR da A1, 2dsphere da A2, covered da A4), mais o `_id_`. O índice "na ordem do filtro" da A1 b) eu tinha removido antes de criar o ESR.

## B1

- Os números bateram: previ ~70 mil no `$match` e deram 69.843. Previ ~14 mil por terminal, peso médio ~16 mil e total ~220–230 milhões, e deu isso mesmo.
- **Tropecei no explain.** O Mongo 8 usa o SBE e empurra o `$group` pra dentro do `$cursor`. Minha primeira versão do script dizia que "entraram 5 docs no $group", mas 5 é o que **sai** do group (um por terminal). Os estágios de execução do SBE vêm em minúsculo (`group`, `fetch`, `ixseek`) e eu procurava `GROUP`. Corrigi pra percorrer a árvore e pegar o `nReturned` do estágio logo abaixo do `group`: 69.843.
- O tempo variou bastante entre as execuções (o primeiro explain depois de criar o índice deu 176 ms, mais lento que o COLLSCAN). Por isso rodei 3 vezes cada. Com tudo em memória, o ganho em tempo é pequeno. O ganho que importa é ler 70 mil docs em vez de 400 mil.

## B2

- Acertei os defeitos e o kg_total = 0, mas **não previ que o resultado ia mudar entre execuções**. Rodei 3 vezes: `[]`, `[]` e depois 2 linhas (T5 e T1). A ordem de saída do `$group` não é fixa, então o `$limit 3` pega grupos diferentes. Achei que ia dar sempre a mesma coisa errada, mas é pior: dá uma coisa errada diferente a cada vez.
- Na terceira execução vieram 2 linhas, e eu tinha previsto no máximo 1. Pensei "1/4 de chance por grupo" e esqueci que podem vir 2 Refrigerados entre os 3.
- Não sabia que o otimizador troca `$sort` e `$match` de lugar sozinho. Apareceu no explain (`$limit > $match > $sort`).
- O total dos Refrigerados do T2 deu 20.091, igual ao código de autenticidade. Usei isso como prova extra, além da soma feita no shell sem aggregate.
- O `$sum` com `$peso_kg` no shell apareceu como `{high:1, low:...}`, que é um Long passando de 2³². Convertendo, dá 6.394.785.318.
- Fechamento da Parte B: `getIndexes()` com 5 índices, todos usados. Não precisei criar índice na B2.
