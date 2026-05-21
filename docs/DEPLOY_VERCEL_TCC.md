# Deploy na Vercel - Checklist do TCC

Este checklist deixa o SmartRoute pronto para demonstracao na banca e para deploy do frontend na Vercel.

## Variaveis obrigatorias na Vercel

Configure em **Project Settings > Environment Variables**:

```text
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_supabase
```

Essas duas variaveis podem ficar no frontend porque sao publicas por natureza no Supabase. A seguranca dos dados depende das policies RLS no banco.

## Variaveis que NAO devem ir para a Vercel do frontend

Estas ficam apenas nos secrets das Supabase Edge Functions:

```text
SUPABASE_SERVICE_ROLE_KEY
EVOLUTION_API_URL
EVOLUTION_API_KEY
EVOLUTION_INSTANCE_NAME
WEBHOOK_SECRET
CRON_SECRET
GOOGLE_MAPS_API_KEY
APP_ORIGIN
DEBUG_LOGS
DEBUG_ERRORS
```

## Configuracao de rotas SPA

O arquivo `vercel.json` redireciona qualquer rota para `index.html`. Isso evita erro 404 quando alguem atualiza a pagina diretamente em rotas como:

- `/home`
- `/routes`
- `/whatsapp`
- `/settings`
- `/privacy`
- `/cookies`

## PWA basico

O projeto possui `public/manifest.json` e icones SVG para permitir instalacao basica como app. Esta camada e suficiente para apresentar como PWA no TCC.

Para uma versao real futura, ainda seria recomendado adicionar service worker, cache controlado e estrategia offline. Nao foi adicionado cache offline agora para evitar armazenar dados sensiveis de alunos e responsaveis no navegador.

## Checklist antes da banca

- Rodar `npm run build`.
- Rodar `npm test`.
- Conferir se a Vercel tem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- Conferir se as Edge Functions do Supabase tem os secrets da Evolution API.
- Usar dados ficticios na demonstracao.
- Testar login, dashboard, rotas, WhatsApp e configuracoes no celular.
- Testar refresh direto em `/whatsapp` e `/settings` depois do deploy.

