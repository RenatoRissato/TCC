# CONTEXTO PARA IA — SmartRoutes

Este projeto é um PWA mobile-first chamado SmartRoutes.

O sistema é voltado para motoristas de vans escolares e tem como objetivo automatizar confirmações de presença dos alunos via WhatsApp, organizar as rotas do dia e reduzir paradas desnecessárias.

## Tecnologias principais
- React
- Vite
- TypeScript
- Tailwind CSS
- Supabase
- Evolution API
- Edge Functions

## O que a IA deve fazer antes de alterar código
1. Ler todos os arquivos da pasta docs
2. Entender a arquitetura atual
3. Verificar a estrutura do código
4. Comparar código e documentação
5. Explicar o plano antes de modificar arquivos

## Regras importantes
- Não alterar a arquitetura sem avisar
- Não expor chaves de API no frontend
- Usar backend/Edge Functions para chamadas sensíveis
- Manter o projeto mobile-first
- Preservar o padrão visual já existente
- Não apagar arquivos sem autorização

## Documentos importantes
- docs/PROJETO_historico.md — fases do projeto e decisões arquiteturais (incluindo a Fase 15 que cobre o fluxo real de WhatsApp, cron multi-pass e status UI unificado)
- docs/requisitos_resumido.md — regras de negócio (RN66+ cobrem cron multi-pass, RN71 cobre `{saudacao}`, RN72 cobre status UI unificado)
- docs/diagrama_arquitetura.md — fluxo principal (sendText, cron multi-pass)
- docs/Edge_Functions.md — todas as 13 Edge Functions, payloads, códigos de erro
- docs/evolution_api.md — endpoints da Evolution (sendText como padrão; sendList legado documentado)
- docs/banco.md — schema, histórico de migrations, regra `confirmado + nao_vai` ≠ "VAI"
- docs/Cron_Automacao.md — instalação do `pg_cron` + cenários multi-pass
- docs/sobreprojeto.md — visão geral, variáveis disponíveis, estado atual