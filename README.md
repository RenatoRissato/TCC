# 🚌 SmartRoutes

> Sistema inteligente para gestão de vans escolares com automação de confirmação de presença via WhatsApp.

[![Status](https://img.shields.io/badge/status-funcional-success)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![PWA](https://img.shields.io/badge/PWA-ready-orange)]()

---

## 📋 Sobre o projeto

O **SmartRoutes** é um Progressive Web App (PWA) desenvolvido para resolver um problema concreto enfrentado diariamente por motoristas de vans escolares no Brasil: a **incerteza diária sobre quais alunos vão usar o transporte**.

Em vez de depender de mensagens manuais em grupos desorganizados de WhatsApp, o SmartRoutes inverte o fluxo de comunicação: **é o sistema que pergunta ativamente** ao responsável, no horário configurado pelo motorista, se o aluno vai utilizar o transporte naquele dia. A resposta é processada automaticamente e o dashboard do motorista é atualizado em tempo real.

Este projeto foi desenvolvido como Trabalho de Conclusão de Curso (TCC) do curso de **Análise e Desenvolvimento de Sistemas** do Centro Universitário Einstein de Limeira (UniEinstein), em 2026.

---

## ✨ Diferencial

A análise de seis aplicativos brasileiros consolidados no mercado (SmartVan, Via Van, VanEscola, Meu Escolar, Tio da Van e Van Inteligente) revelou que nenhum deles oferece **confirmação diária automatizada de presença**. Quando existe mecanismo de aviso de ausência, ele depende sempre da ação proativa do responsável dentro de um aplicativo dedicado.

O SmartRoutes diferencia-se por:

- **Inversão do fluxo:** o sistema pergunta, em vez de esperar que o responsável lembre
- **Zero atrito:** o responsável não precisa instalar nenhum aplicativo — toda a interação acontece pelo WhatsApp
- **Resposta com um único caractere:** basta enviar "1" para "Ida e volta", "2" para "Só ida", etc.
- **Tempo real:** o dashboard do motorista é atualizado instantaneamente via WebSocket

---

## 🎯 Principais funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 🔑 Autenticação segura | Login via Supabase Auth com JWT |
| 👥 Cadastro de passageiros | Vinculação a rotas, com endereço, telefone do responsável e turno |
| 🗺️ Gestão de rotas múltiplas | Rotas matutina, vespertina e noturna por motorista |
| 💬 Integração com WhatsApp | Envio e recebimento automático via Evolution API |
| ⏰ Automação por horário | Cron job dispara mensagens no horário configurado pelo motorista |
| 📊 Dashboard em tempo real | Status de presença atualizados sem recarregar a página |
| 🗺️ Visualização de rota | Google Maps com waypoints filtrados (sem alunos ausentes) |
| 📈 Histórico e estatísticas | Acompanhamento de presenças por dia, semana e mês |
| 🔒 Proteção de dados | Row Level Security (RLS) e conformidade com a LGPD |

---

## 🏗️ Arquitetura

O SmartRoutes foi construído com uma arquitetura **serverless** de baixo custo operacional, escolhida pela robustez e capacidade de escalar para múltiplos motoristas simultaneamente.

```
┌──────────────┐      ┌─────────────────┐      ┌──────────────┐      ┌──────────────┐
│   Motorista  │      │     Supabase    │      │ Evolution API│      │  Responsável │
│   (PWA/React)│◄────►│  Edge Functions │◄────►│   (Railway)  │◄────►│  (WhatsApp)  │
│              │ HTTPS│   PostgreSQL    │ REST │              │ Bot  │              │
└──────────────┘      │      Auth       │      └──────────────┘      └──────────────┘
       ▲              │     Realtime    │
       │              └─────────────────┘
       │                       ▲
       │ Realtime              │
       │ WebSocket             │ pg_cron (1x/min)
       └───────────────────────┘
```

**Decisão arquitetural importante:** todas as chamadas à API de comunicação são intermediadas por Edge Functions, evitando a exposição de credenciais sensíveis no frontend.

---

## 🛠️ Stack tecnológica

### Frontend
- **React 18** + **TypeScript** — interface componentizada e tipada
- **Vite 6** — build tool e dev server
- **Tailwind CSS v4** + **Radix UI** — design system consistente
- **React Router v7** — roteamento
- **Recharts** — gráficos do dashboard
- **PWA** — instalável no celular sem depender de lojas de aplicativos

### Backend
- **Supabase** (Backend as a Service)
  - **PostgreSQL** — banco relacional com 13 tabelas normalizadas
  - **Auth** — autenticação via JWT
  - **Edge Functions** (Deno/TypeScript) — lógica de negócio serverless
  - **Realtime** — atualizações em tempo real via WebSocket
  - **pg_cron + pg_net** — disparo automático de mensagens no horário configurado
- **Row Level Security (RLS)** — isolamento de dados entre diferentes motoristas

### Integrações
- **Evolution API** (protocolo Baileys) — gateway WhatsApp não oficial
- **Google Routes API** — otimização de rota com fallback OpenStreetMap/OSRM
- **Webhooks REST** — recebimento e processamento de respostas

### Deploy & DevOps
- **Vercel** — hospedagem do frontend
- **Railway** — hospedagem da Evolution API
- **Supabase Cloud** — banco, auth, edge functions
- **GitHub** — versionamento e colaboração via pull requests

---

## 🚀 Setup local

### Pré-requisitos
- Node.js 18+ e npm
- Conta no Supabase com projeto configurado
- Conta no Railway (ou outra plataforma) com a Evolution API rodando
- (Opcional) Chave da Google Routes API para otimização de rota

### Estrutura de variáveis de ambiente

O projeto utiliza **dois arquivos `.env` distintos**, cada um com responsabilidades diferentes:

| Arquivo | Localização | Para que serve |
|---|---|---|
| `.env` | Raiz do projeto | Variáveis públicas do frontend (Vite) |
| `.env` | Pasta `/supabase` | Secrets das Edge Functions (servidor) |

> ⚠️ **Por que essa separação?** Tudo que tem prefixo `VITE_` fica visível no código do navegador. Credenciais sensíveis (Evolution API, secrets de webhook e cron) **nunca** podem estar no `.env` da raiz — elas precisam estar protegidas dentro do `.env` da pasta `/supabase`, que só é acessado pelas Edge Functions no servidor.

### Instalação

1. **Clone o repositório:**

```bash
git clone https://github.com/RenatoRissato/TCC.git
cd TCC
```

2. **Instale as dependências:**

```bash
npm install
```

3. **Configure o `.env` do frontend (raiz do projeto):**

```bash
cp .env.example .env
```

Preencha com as credenciais públicas do seu projeto Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_supabase
```

4. **Configure o `.env` das Edge Functions (pasta `/supabase`):**

```bash
cp supabase/.env.example supabase/.env
```

Preencha com as credenciais sensíveis:

```env
# --- Supabase ---
# Em LOCAL (supabase start), o CLI injeta automaticamente.
# Em PRODUÇÃO, NÃO definir manualmente — o runtime injeta.
# SUPABASE_URL=
# SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=

# --- Evolution API (WhatsApp) ---
EVOLUTION_API_URL=https://sua-evolution-api.up.railway.app
EVOLUTION_API_KEY=sua_chave_da_evolution_api
EVOLUTION_INSTANCE_NAME=smartroute

# --- Segurança ---
# Use strings aleatórias longas (>= 32 chars).
# Geração sugerida: openssl rand -hex 32
WEBHOOK_SECRET=string_aleatoria_de_pelo_menos_32_caracteres
CRON_SECRET=string_aleatoria_de_pelo_menos_32_caracteres
```

> **Como gerar os secrets do webhook e cron:**
> ```bash
> openssl rand -hex 32
> ```
> Gere **um valor diferente** para cada secret. Eles protegem os endpoints contra requisições não autorizadas.

5. **Configure as mesmas secrets no Supabase Cloud (produção):**

No painel do Supabase, vá em **Project Settings → Edge Functions → Secrets** e adicione cada variável do `supabase/.env` (exceto as comentadas, que são injetadas automaticamente):

- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE_NAME`
- `WEBHOOK_SECRET`
- `CRON_SECRET`
- `GOOGLE_MAPS_API_KEY` *(opcional, para otimização de rota)*

6. **Rode o projeto:**

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:5173`.

### Configurações adicionais

**Webhook da Evolution API:** após criar a instância no painel da Evolution API, configure o webhook apontando para a Edge Function que processa respostas:

```
https://seu-projeto.supabase.co/functions/v1/webhook-evolution
```

Inclua o cabeçalho `x-webhook-secret` com o valor da variável `WEBHOOK_SECRET` para autenticar as chamadas.

**Cron Job no Supabase:** a automação diária de envio é disparada por `pg_cron` + `pg_net`, configurados via migration na pasta `supabase/migrations`. O job roda a cada minuto e dispara a Edge Function `automacao-diaria` quando o horário configurado pelo motorista é atingido, autenticando-se via cabeçalho `x-cron-secret` com o valor de `CRON_SECRET`.

---

## 🗺️ Otimização de rota

O botão de **otimizar sequência** no Dashboard funciona em duas camadas:

1. **Google Routes API** — quando `GOOGLE_MAPS_API_KEY` está configurada nas secrets do Supabase
2. **Fallback automático com OpenStreetMap + OSRM** — quando a chave não existe

Assim, é possível utilizar a funcionalidade imediatamente e adicionar a chave do Google posteriormente, sem precisar trocar código.

---

## 📊 Como funciona o fluxo principal

```
1. Motorista configura horário de envio da rota (ex: 06:30)
   ↓
2. Cron Job dispara automaticamente no horário configurado
   ↓
3. Edge Function envia mensagens via Evolution API para os responsáveis
   ↓
4. Responsável recebe pelo WhatsApp: "Bom dia! João vai usar o transporte hoje?
   1 - Ida e volta | 2 - Só ida | 3 - Só volta | 4 - Não vai"
   ↓
5. Responsável responde "1" (por exemplo)
   ↓
6. Webhook recebe a resposta e atualiza o banco de dados
   ↓
7. Supabase Realtime envia a atualização para o dashboard via WebSocket
   ↓
8. Motorista vê o status mudar de "pendente" para "Ida e volta" instantaneamente
   ↓
9. Ao abrir "Ver rota no Maps", o sistema gera waypoints apenas com passageiros confirmados
```

---

## 🔒 Segurança e privacidade

O SmartRoutes lida com dados de menores de idade e adotou medidas iniciais de adequação à **Lei Geral de Proteção de Dados Pessoais (LGPD — Lei n.º 13.709/2018)**:

- ✅ Armazenamento mínimo de dados pessoais
- ✅ Política de privacidade acessível na aplicação
- ✅ Tela de consentimento de cookies
- ✅ Row Level Security (RLS) garantindo que cada motorista acesse apenas seus dados
- ✅ Edge Functions protegendo credenciais sensíveis (a chave da API nunca trafega pelo navegador)
- ✅ Comunicação criptografada (HTTPS + JWT)

---

## 🧪 Validação

O sistema foi validado em ambiente de desenvolvimento com serviços reais integrados. Foram executados **10 casos de teste** cobrindo:

- Autenticação válida e inválida
- Cadastro, listagem, edição e exclusão de passageiros
- Envio automático de mensagens
- Processamento de respostas válidas e inválidas
- Atualização em tempo real
- Isolamento de dados (RLS)
- Marcação manual de presença
- Visualização de rota com waypoints filtrados

**Resultado:** 100% dos casos aprovados.

Os testes utilizaram entre 5 e 10 números de telefone reais pertencentes a familiares e pessoas próximas dos autores, configurados como passageiros do sistema mediante consentimento prévio. **Os dados cadastrais foram fictícios**, sem envolvimento de alunos ou responsáveis reais do segmento de transporte escolar.

---

## 🚧 Limitações conhecidas

Reconhecemos as fragilidades metodológicas do projeto, que serão endereçadas em trabalhos futuros:

- **Levantamento de requisitos baseado em um único profissional**, o que restringe a generalização
- **Integração com WhatsApp via API não oficial** (protocolo Baileys), com risco de instabilidade caso o protocolo seja alterado
- **Sem validação em contexto operacional real** — testes conduzidos apenas em ambiente de desenvolvimento

---

## 🛣️ Roadmap

### Alta prioridade
- 💰 **Módulo Financeiro** — controle de mensalidades, emissão de cobranças e integração com gateways de pagamento (Pix/cartão)
- 📍 **Rastreamento GPS em tempo real** — pais acompanham a localização da van no mapa com estimativa de chegada

### Médio prazo
- 📱 **App nativo** — migração do PWA para aplicativo nativo (React Native) disponível na App Store e Play Store
- 💬 **API oficial do WhatsApp Business** — migração da Evolution API para a API oficial Meta/WhatsApp, garantindo estabilidade de longo prazo
- 📈 **Avaliação de desempenho em escala** — testes com múltiplos motoristas simultâneos
- 🔬 **Testes de usabilidade com usuários reais** — estudo de campo com motoristas e responsáveis

---

## 👥 Autores

Trabalho de Conclusão de Curso desenvolvido por:

- **Gustavo Henrique Carrijo**
- **Lucas Oliveira da Costa Turatti**
- **Renato Rissato da Silva** — *autor correspondente*

**Orientação:** Prof. Thiago Salhab Alves
**Instituição:** Centro Universitário Einstein de Limeira — UniEinstein
**Curso:** Tecnologia em Análise e Desenvolvimento de Sistemas
**Ano:** 2026

---

## 📄 Licença

Este projeto está licenciado sob a Licença MIT — consulte o arquivo `LICENSE` para detalhes.

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona MinhaFeature'`)
4. Faça push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

> **Importante:** este repositório segue o fluxo de feature branches → pull request → merge para `main`. Não faça commits diretos na `main`.

---

## 📚 Referências acadêmicas

Este projeto fundamenta-se em obras consolidadas de engenharia de software e bancos de dados:

- **SOMMERVILLE, Ian.** Engenharia de Software. 10. ed. São Paulo: Pearson, 2018.
- **PRESSMAN, Roger S.; MAXIM, Bruce R.** Engenharia de Software: uma abordagem profissional. 8. ed. Porto Alegre: AMGH, 2016.
- **ELMASRI, Ramez; NAVATHE, Shamkant B.** Sistemas de banco de dados. 7. ed. São Paulo: Pearson, 2018.
- **NIELSEN, Jakob.** Usability Engineering. San Diego: Academic Press, 1993.

---

<div align="center">

**Desenvolvido com ☕ em Limeira/SP — 2026**

[Reportar Bug](https://github.com/RenatoRissato/TCC/issues) · [Sugerir Funcionalidade](https://github.com/RenatoRissato/TCC/issues)

</div>