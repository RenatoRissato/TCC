# Relatorio LGPD, privacidade e cookies

Data: 2026-05-21

Este relatorio descreve melhorias tecnicas aplicadas ao SmartRoute para aproximar o projeto de boas praticas de privacidade, transparencia e consentimento. Ele nao afirma conformidade legal completa com a LGPD, pois isso depende tambem de analise juridica, base legal, contratos com terceiros, processos internos e operacao real.

## Arquivos criados

- `src/app/utils/cookieConsent.ts`
- `src/app/components/privacy/CookieConsentBanner.tsx`
- `src/app/components/settings/PrivacySection.tsx`
- `src/app/screens/PrivacyPolicyScreen.tsx`
- `src/app/screens/CookiePolicyScreen.tsx`
- `docs/LGPD_PRIVACIDADE_RELATORIO.md`

## Arquivos alterados

- `src/app/components/AppLayout.tsx`
- `src/app/routes.tsx`
- `src/app/screens/SettingsScreen.tsx`
- `src/app/context/ThemeContext.tsx`
- `src/app/utils/localCache.ts`
- `src/app/hooks/useWhatsApp.ts`
- `src/app/components/passengers/PassengerForm.tsx`
- `src/app/screens/WhatsAppScreen.tsx`

## O que foi implementado

- Banner LGPD de cookies com botoes `Aceitar todos`, `Recusar nao essenciais` e `Gerenciar preferencias`.
- Modal de preferencias com categorias `Necessarios`, `Preferencias`, `Analiticos` e `Marketing`.
- Persistencia da decisao em `localStorage` na chave `smartroute-cookie-consent-v1`, com data/hora e versao da politica.
- Cookies/armazenamentos necessarios permanecem ativos para sessao, seguranca e funcionamento basico.
- Analiticos e Marketing ficam desativados por padrao e nao carregam scripts externos.
- Preferencias e caches nao essenciais agora respeitam o consentimento do usuario.
- Limpeza de `theme`, `debug:whatsapp` e caches `sr_rotas_*` quando o usuario recusa preferencias.
- Pagina interna de Politica de Privacidade.
- Pagina interna de Politica de Cookies.
- Secao `Privacidade e LGPD` em Configuracoes, com links para politicas, gerenciamento de cookies e instrucoes para solicitar dados/exclusao.
- Aviso no cadastro/edicao de passageiro explicando uso dos dados para rota escolar e comunicacao via WhatsApp.
- Aviso na tela de WhatsApp explicando que telefones e mensagens trafegam pela Evolution API.

## O que ainda precisa ser feito no backend

- Criar fluxo real para atender solicitacoes de acesso, correcao, portabilidade e exclusao de dados.
- Definir politica de retencao e descarte de dados no banco.
- Registrar auditoria minima de consentimento se o projeto for para producao real.
- Garantir que RLS e autorizacao no backend impeçam um motorista de acessar dados de outro.
- Documentar contratos, operadores e subprocessadores, como Supabase, Evolution API e APIs de mapas.
- Implementar exclusao segura de arquivos e fotos no storage quando a conta for removida.

## O que ainda precisa ser validado juridicamente

- Base legal para tratamento de dados de alunos, responsaveis e motoristas.
- Necessidade de consentimento dos responsaveis ou outra base legal aplicavel.
- Politica oficial de privacidade e cookies revisada por responsavel juridico.
- Prazos de retencao de dados.
- Termos com terceiros: Supabase, Evolution API, WhatsApp/Meta e provedores de mapas.
- Papel do motorista, escola e SmartRoute como controlador/operador em um uso real.

## Dados pessoais tratados pelo sistema

- Nome do motorista.
- E-mail e dados de login.
- Telefone/WhatsApp do motorista.
- Foto de perfil.
- Dados da van, como placa, marca, modelo e ano.
- Nome do aluno/passageiro.
- Tipo de passageiro, escola/faculdade, serie, semestre e curso.
- Nome do responsavel quando aplicavel.
- Telefone/WhatsApp do responsavel ou aluno.
- Endereco de embarque.
- Rotas, horarios e status de presenca.
- Confirmacoes diarias recebidas via WhatsApp.
- Dados tecnicos de sessao, preferencia e status de integracao.

## Usos de localStorage, sessionStorage e cookies encontrados

- `smartroutes-auth-v1`: necessario. Sessao/autenticacao gerenciada pelo Supabase.
- `sr_motorista_*`: necessario. Cache tecnico do vinculo entre usuario autenticado e perfil de motorista.
- `sr_reset_success`: necessario/temporario. Sinaliza sucesso no fluxo de redefinicao de senha.
- `theme`: preferencia. Agora so persiste com consentimento de Preferencias.
- `sr_rotas_*`: preferencia/cache de experiencia. Agora so le e grava com consentimento de Preferencias.
- `debug:whatsapp`: preferencia/debug manual. Agora so funciona com consentimento de Preferencias.
- `smartroute-cookie-consent-v1`: necessario. Guarda a decisao de consentimento.
- Cookie `sidebar_state`: necessario de interface. Mantem estado visual da sidebar.
- `sr_passageiros_*`: sensivel/legado. O projeto ja remove esse cache ao carregar passageiros.

## Categorias de cookies implementadas

- Necessarios: sempre ativos para login, seguranca, sessao e funcionamento do app.
- Preferencias: tema, layout, filtros, debug manual e cache leve de experiencia.
- Analiticos: desativados por padrao; estrutura pronta, sem script carregado atualmente.
- Marketing: desativados por padrao; estrutura pronta para futuro, sem recurso ativo atualmente.

## Riscos LGPD restantes

- As politicas criadas sao texto tecnico inicial e ainda precisam de revisao juridica.
- O atendimento real aos direitos do titular ainda depende de fluxo operacional/backend.
- Dados de alunos e responsaveis continuam sendo dados sensiveis do ponto de vista operacional e exigem cuidado em producao.
- A Evolution API e APIs de mapas podem processar dados pessoais; contratos e configuracoes precisam ser avaliados antes de uso real.
- A foto de perfil e qualquer arquivo em storage precisam de politica clara de acesso, retencao e exclusao.

## Proximos passos recomendados

- Validar politicas com orientador/juridico antes de demonstracao publica.
- Criar tela ou fluxo backend para exportar e excluir dados da conta.
- Revisar RLS e Edge Functions antes de deploy definitivo.
- Evitar usar dados reais de criancas/responsaveis em apresentacoes do TCC.
- Documentar terceiros usados no projeto e finalidade de cada integracao.
