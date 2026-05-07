
# SmartRoutes

Frontend do SmartRoutes, um PWA para motoristas de vans escolares com rotas, passageiros, viagens em andamento e automação de confirmações por WhatsApp.

## Setup

1. Instale as dependências:

```bash
npm install
```

2. Crie seu arquivo de ambiente a partir do modelo:

```bash
copy .env.example .env
```

3. Preencha no `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_supabase
```

Notas:
- o frontend precisa apenas das variáveis públicas do Supabase
- a chave da Google Routes API não fica no navegador; ela deve ser configurada como secret no Supabase Edge Functions

4. Rode o projeto:

```bash
npm run dev
```

## Otimização de rota

O botão de otimizar sequência no Dashboard funciona em duas camadas:

- Google Routes API, quando `GOOGLE_MAPS_API_KEY` está configurada nas secrets do Supabase
- fallback automático com OpenStreetMap + OSRM, quando a chave não existe

Assim você pode usar a funcionalidade agora mesmo e adicionar a chave do Google depois, sem trocar código.
