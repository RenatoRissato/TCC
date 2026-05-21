# Banco de Dados do SmartRoute - Explicacao para a Banca

Este documento resume o banco de dados do SmartRoute de forma simples, para explicar na apresentacao do TCC.

## Visao geral

O SmartRoute usa Supabase, que por baixo utiliza PostgreSQL. O banco foi modelado para atender o fluxo principal do sistema:

1. O motorista cria sua conta.
2. O sistema cria o perfil do motorista.
3. O motorista cadastra rotas.
4. O motorista cadastra passageiros/alunos em cada rota.
5. O sistema cria viagens e confirmacoes diarias.
6. O WhatsApp envia mensagens para os responsaveis.
7. As respostas alteram o status do passageiro no dia.
8. O dashboard mostra quem vai, quem nao vai e quem ainda esta pendente.

A prioridade do banco foi atender bem o fluxo real do TCC, mantendo a estrutura compreensivel, segura e facil de demonstrar.

## Por que usar Supabase/PostgreSQL

O Supabase foi escolhido porque oferece em uma unica plataforma:

- Autenticacao de usuarios.
- Banco PostgreSQL relacional.
- Row Level Security, conhecido como RLS.
- Edge Functions para regras de backend.
- Realtime para atualizar telas em tempo real.
- Storage para foto de perfil.

Isso ajuda no TCC porque reduz a necessidade de criar um backend completo do zero, mas ainda permite usar conceitos reais de banco de dados, seguranca e integracao.

## Principais tabelas

### motoristas

Representa o motorista autenticado no sistema.

Campos principais:

- `id`: identificador interno do motorista.
- `user_id`: vinculo com o usuario autenticado do Supabase Auth.
- `nome`, `email`, `telefone`: dados basicos do motorista.
- `placa_van`, `marca_van`, `modelo_van`, `ano_van`: dados da van.
- `foto_url`: foto de perfil.
- preferencias de notificacao e som.

Decisao do TCC:
As preferencias do motorista ficaram na propria tabela `motoristas`, em vez de criar uma tabela separada. Isso simplifica as consultas e evita complexidade desnecessaria para o escopo do projeto.

### rotas

Representa as rotas cadastradas pelo motorista.

Campos principais:

- `id`: identificador da rota.
- `motorista_id`: dono da rota.
- `nome`: nome da rota, por exemplo "Rota Manha".
- `turno`: periodo da rota, como manha, tarde ou noite.
- `horario_saida`: horario da rota.
- endereco do ponto de saida.
- `destinos`: destinos da rota em formato JSON.
- `status`: ativa ou inativa.

Decisao do TCC:
Os destinos foram salvos em JSON dentro da rota para simplificar o cadastro e a exibicao. Em uma versao comercial, poderia existir uma tabela separada de destinos/paradas para permitir mais relatorios e controle detalhado.

### passageiros

Representa os alunos ou passageiros cadastrados em uma rota.

Campos principais:

- `id`: identificador do passageiro.
- `rota_id`: rota em que o passageiro esta vinculado.
- `nome_completo`: nome do aluno/passageiro.
- `telefone_responsavel`: telefone usado para confirmacao via WhatsApp.
- endereco de embarque estruturado em rua, numero, bairro e CEP.
- `ordem_na_rota`: ordem do passageiro na rota.
- `observacoes`: dados complementares em JSON, como tipo de passageiro, instituicao, serie, curso e nome do responsavel.
- `status`: ativo ou inativo.

Decisao do TCC:
O responsavel foi armazenado dentro dos dados do passageiro, em vez de criar uma tabela propria de responsaveis. Isso foi feito para deixar o projeto mais simples e direto para o escopo academico.

Em producao, a melhoria ideal seria criar:

- `responsaveis`
- `passageiro_responsaveis`

Assim, dois irmaos poderiam compartilhar o mesmo responsavel sem duplicar telefone e nome.

### viagens

Representa uma viagem de uma rota em um determinado dia.

Campos principais:

- `id`: identificador da viagem.
- `rota_id`: rota relacionada.
- `data`: data da viagem.
- `status`: agendada, em andamento, finalizada ou cancelada.
- `direcao`: indica se a viagem e de buscar ou retorno.
- `iniciada_em` e `finalizada_em`: controle de tempo da viagem.

Decisao do TCC:
Foi usada uma viagem por rota e data. Isso simplifica o controle diario e evita duplicidade. Para producao, se o sistema precisar separar ida e volta como eventos independentes, poderia ter uma chave unica por rota, data e direcao.

### confirmacoes

Representa a resposta diaria do responsavel para um passageiro.

Campos principais:

- `id`: identificador da confirmacao.
- `viagem_id`: viagem relacionada.
- `passageiro_id`: passageiro relacionado.
- `status`: pendente, confirmado ou ausente.
- `tipo_confirmacao`: ida e volta, somente ida, somente volta ou nao vai.
- `origem`: WhatsApp ou manual.
- `respondida_em`: horario em que houve resposta.

Essa tabela e essencial para o funcionamento do sistema, porque e nela que o dashboard sabe quem vai, quem nao vai e quem ainda nao respondeu.

Decisao do TCC:
As confirmacoes estao ligadas a `viagens`, porque o fluxo do sistema gira em torno da rota do dia. Para producao, uma alternativa ainda mais direta seria uma tabela chamada `confirmacoes_diarias`, com `motorista_id`, `rota_id`, `passageiro_id`, `data` e `periodo`.

### mensagens

Armazena mensagens enviadas e recebidas pelo WhatsApp.

Campos principais:

- `id`: identificador da mensagem.
- `instancia_whatsapp_id`: instancia do WhatsApp usada.
- `passageiro_id`: passageiro relacionado.
- `confirmacao_id`: confirmacao relacionada.
- `conteudo`: texto da mensagem.
- `direcao`: saida ou entrada.
- `tipo`: confirmacao diaria, resposta, resposta invalida, avulsa ou teste.
- `status_envio`: pendente, enviada, entregue ou falha.
- `whatsapp_message_id`: identificador da mensagem na Evolution API.
- `enviada_em` e `resposta_recebida_em`.

Essa tabela permite auditar se a mensagem foi enviada, se falhou e se houve resposta.

Decisao do TCC:
O conteudo da mensagem e salvo para facilitar teste, auditoria e demonstracao. Em producao, seria recomendado definir uma politica de retencao, por exemplo apagar ou anonimizar mensagens antigas depois de alguns meses.

### conversas_confirmacao_whatsapp

Controla o estado da conversa do WhatsApp.

Exemplos de estado:

- `sem_resposta`
- `confirmado`
- `aguardando_decisao`
- `aguardando_nova_resposta`

Essa tabela ajuda o bot a entender se o responsavel esta respondendo pela primeira vez ou tentando alterar uma resposta ja feita.

Decisao do TCC:
Foi criada uma tabela especifica para controlar o fluxo da conversa, porque isso deixa a regra do bot mais organizada e facilita tratar respostas invalidas, alteracoes e duplicidades.

### instancias_whatsapp

Representa o status da conexao do WhatsApp do motorista.

Campos principais:

- `motorista_id`
- `status_conexao`
- `numero_conta`
- `nome_conta_wa`
- `data_ultima_conexao`
- `total_mensagens_enviadas`

Essa tabela permite saber se o WhatsApp esta conectado, desconectado, conectando ou aguardando QR Code.

### configuracoes_automacao

Guarda a configuracao geral de envio automatico.

Campos principais:

- `envio_automatico_ativo`
- `horario_envio_automatico`
- `saudacao_personalizada`
- `max_tentativas_envio`
- `intervalo_tentativas`

### configuracoes_automacao_rotas

Guarda configuracoes de envio automatico por rota.

Campos principais:

- `instancia_whatsapp_id`
- `rota_id`
- `envio_automatico_ativo`
- `horario_envio`

Decisao do TCC:
Essa tabela foi criada porque cada rota pode ter um horario diferente de envio. Por exemplo, uma rota da tarde pode receber mensagem em horario diferente da rota da manha.

### templates_mensagem e opcoes_resposta

Guardam o modelo da mensagem enviada pelo WhatsApp e as opcoes de resposta.

Opcoes principais:

- 1: ida e volta.
- 2: somente ida.
- 3: somente volta.
- 4: nao vai hoje.

Decisao do TCC:
As opcoes ficaram no banco para permitir alteracao futura sem precisar mexer no codigo.

### notificacoes

Guarda notificacoes internas do sistema, como resposta recebida pelo WhatsApp ou viagem iniciada/finalizada.

Essa tabela melhora a experiencia do motorista e permite mostrar alertas em tempo real.

### historico_presenca

Registra o resultado final da presenca quando uma viagem e finalizada.

Serve para relatorios e historico.

## Relacionamentos principais

O relacionamento principal do banco pode ser explicado assim:

```text
auth.users
  -> motoristas
      -> rotas
          -> passageiros
          -> viagens
              -> confirmacoes
                  -> mensagens
```

Tambem existem tabelas auxiliares:

```text
motoristas
  -> instancias_whatsapp
      -> configuracoes_automacao
      -> configuracoes_automacao_rotas

motoristas
  -> templates_mensagem
      -> opcoes_resposta
```

Explicacao simples:
Cada motorista tem suas rotas. Cada rota tem passageiros. Cada dia gera uma viagem. Cada viagem gera confirmacoes para os passageiros. As mensagens do WhatsApp ficam ligadas a essas confirmacoes.

## Segurança com RLS

O banco usa Row Level Security, ou RLS.

RLS e uma regra de seguranca no proprio banco de dados. Ela impede que um motorista acesse dados de outro motorista, mesmo que alguem tente fazer uma consulta manual pelo frontend.

Exemplo pratico:

- Motorista A so pode ver suas rotas.
- Motorista A so pode ver seus passageiros.
- Motorista A so pode ver suas confirmacoes.
- Motorista A nao consegue acessar dados do Motorista B.

As policies usam o usuario autenticado do Supabase, por meio de `auth.uid()`, e verificam se aquele usuario e dono do motorista relacionado aos dados.

## Por que isso e importante

Como o sistema trabalha com dados de alunos, responsaveis, telefones e enderecos, a seguranca precisa estar no banco, nao apenas na tela.

Se a seguranca estivesse apenas no React, uma pessoa poderia tentar burlar pelo navegador. Com RLS, o proprio Supabase/PostgreSQL bloqueia o acesso indevido.

## Uso de service_role

Algumas Edge Functions usam `service_role`.

O `service_role` e uma chave poderosa do Supabase, usada apenas no backend. Ela nao pode ir para o frontend.

No SmartRoute, ela e usada em funcoes como:

- envio automatico;
- webhook da Evolution API;
- criacao de perfil;
- atualizacao de status do WhatsApp.

Decisao do TCC:
Foi usado `service_role` nas Edge Functions porque algumas operacoes precisam acontecer automaticamente, sem depender da tela do usuario aberta. Isso e comum em automacoes, desde que a chave fique protegida no backend.

## WhatsApp e Evolution API

O banco guarda tanto a configuracao da instancia quanto as mensagens enviadas e recebidas.

Isso permite:

- saber se o WhatsApp esta conectado;
- saber se a mensagem foi enviada;
- saber se falhou;
- registrar resposta recebida;
- evitar processar mensagem duplicada;
- atualizar a confirmacao do passageiro.

O webhook da Evolution API envia eventos para o Supabase. A Edge Function valida o segredo do webhook antes de processar.

## LGPD e dados sensíveis

O sistema trata dados pessoais, como:

- nome de alunos;
- nome de responsaveis;
- telefone;
- endereco;
- rota;
- status de presenca.

Por isso, algumas decisoes foram tomadas:

- nao expor `service_role` no frontend;
- usar RLS para separar dados por motorista;
- evitar cache local de passageiros;
- manter logs mais seguros;
- criar documentacao de privacidade e cookies.

Para producao real, ainda seria necessario:

- definir politica de retencao de dados;
- permitir exportacao/exclusao de dados;
- revisar juridicamente a base legal;
- criar tabela separada de responsaveis;
- anonimizar historicos antigos quando necessario.

## Indices e performance

O banco ja possui indices para consultas importantes, como:

- buscar rotas por motorista;
- buscar passageiros por rota;
- buscar viagens por rota;
- buscar confirmacoes por viagem;
- buscar mensagens por passageiro ou confirmacao;
- buscar notificacoes recentes.

Isso melhora a velocidade do dashboard e das telas de rota.

Para producao, indices extras recomendados seriam:

```sql
create index idx_passageiros_telefone_status
on passageiros (telefone_responsavel, status);

create index idx_mensagens_whatsapp_message_id_direcao
on mensagens (whatsapp_message_id, direcao);

create index idx_confirmacoes_viagem_status
on confirmacoes (viagem_id, status);
```

Esses indices ajudariam principalmente o webhook do WhatsApp e as consultas de pendentes.

## Decisoes feitas por ser um TCC

Algumas decisoes foram feitas para equilibrar qualidade tecnica e tempo de desenvolvimento.

### 1. Responsavel dentro de passageiro

Em vez de criar uma tabela propria de responsaveis, o nome e telefone ficaram no passageiro.

Motivo:
Mais simples para cadastrar, consultar e demonstrar.

Melhoria futura:
Criar tabelas `responsaveis` e `passageiro_responsaveis`.

### 2. Destinos em JSON dentro de rotas

Os destinos ficaram em um campo JSON.

Motivo:
Facilita o formulario e evita muitas tabelas auxiliares.

Melhoria futura:
Criar tabela `rota_destinos` ou `paradas_rota`.

### 3. Confirmacao ligada a viagem

A confirmacao diaria esta ligada a uma viagem.

Motivo:
O sistema gira em torno da rota do dia, entao esse modelo atende bem ao fluxo atual.

Melhoria futura:
Criar `confirmacoes_diarias` diretamente por motorista, rota, passageiro, data e periodo.

### 4. Historico simples

O historico e registrado ao finalizar viagem.

Motivo:
Suficiente para relatorios basicos e apresentacao.

Melhoria futura:
Criar auditoria mais completa para alteracoes de status.

## O que esta bom para a banca

Pontos fortes para destacar:

- O banco e relacional e usa PostgreSQL.
- As tabelas tem chaves estrangeiras.
- O sistema usa RLS para proteger dados por motorista.
- O projeto separa frontend e backend via Edge Functions.
- As mensagens do WhatsApp ficam registradas.
- Existe controle de status de envio e resposta.
- Existe automacao por rota.
- Existe historico de presenca.
- O sistema considera LGPD e privacidade.

## O que pode ser dito como melhoria futura

Se a banca perguntar o que poderia melhorar em uma versao comercial:

- Separar responsaveis em tabela propria.
- Criar tabela direta de confirmacoes diarias.
- Criar politicas de retencao de mensagens.
- Adicionar mais indices para escala.
- Separar policies RLS por operacao.
- Criar rotina completa de exclusao/exportacao de dados LGPD.
- Melhorar auditoria de alteracoes manuais.

## Resumo para explicar oralmente

Uma forma simples de explicar:

> O banco do SmartRoute foi modelado em PostgreSQL usando Supabase. Cada motorista possui suas proprias rotas, cada rota possui passageiros, e para cada dia o sistema gera viagens e confirmacoes. As respostas do WhatsApp atualizam essas confirmacoes e o dashboard mostra o status em tempo real. Como o sistema lida com dados sensiveis, usei Row Level Security para garantir que cada motorista acesse apenas seus proprios dados. Algumas escolhas, como manter responsavel dentro de passageiro e destinos em JSON, foram feitas para simplificar o escopo do TCC, mas deixei documentado como isso poderia evoluir em uma versao de producao.

