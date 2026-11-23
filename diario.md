# Diário de bordo

## Preparação do ambiente

- Os geradores vieram copiados do PDF como `.txt`, com `&quot;`, `&gt;` no lugar dos caracteres, linhas quebradas no meio das strings e até o rodapé da página no meio do código (“Prova Prática Integradora… Página 8”). Montei os `.js` limpos sem mudar a lógica. Num ponto tive que decidir: o nome da empresa estava quebrado entre `"Empresa` e `" + i`, e usei `"Empresa " + i` (com espaço), que é o jeito mais natural.
- O contêiner `mongo-lab` já existia de outra atividade (tem um `techstore_db`) e não tem porta publicada. Na 27017 do Windows tem um serviço MongoDB local rodando. Por isso rodei tudo com `docker exec mongo-lab mongosh`, pra ter certeza de que estou no banco certo.
- O `grafo.cypher` gerado pelo PowerShell saiu em UTF-8 com BOM. Regravei sem BOM antes de mandar pro `cypher-shell`. Carregou tudo de uma vez, sem precisar ir bloco a bloco.
- Percebi que o gerador **não cria** nenhum índice TTL em `alertas`, só o `_id_`. Isso vai importar na A3.
