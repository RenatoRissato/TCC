/**
 * Conteúdo da Central de Ajuda.
 *
 * Cada FAQ pertence a uma categoria (`CATEGORIAS_FAQ`). A `resposta` aceita
 * quebras de linha simples — múltiplos `\n\n` viram parágrafos no render.
 * Não precisa de Markdown completo aqui; mantemos texto puro pra evitar
 * dependência extra (react-markdown, etc).
 *
 * Para adicionar nova pergunta: copia um item existente, gera um `id` único
 * (slug) e escolhe a categoria certa. Sem mudança de código necessária.
 */

export interface FaqCategoria {
  id: string;
  label: string;
  emoji: string;
}

export interface FaqItem {
  id: string;
  categoria: string;
  pergunta: string;
  resposta: string;
}

export const CATEGORIAS_FAQ: FaqCategoria[] = [
  { id: 'primeiros-passos', label: 'Primeiros passos',       emoji: '🚀' },
  { id: 'whatsapp',         label: 'WhatsApp e mensagens',   emoji: '💬' },
  { id: 'rotas-viagens',    label: 'Rotas e viagens',        emoji: '🚐' },
  { id: 'confirmacoes',     label: 'Confirmações de presença', emoji: '✅' },
  { id: 'conta-config',     label: 'Conta e configurações',  emoji: '⚙️' },
];

export const FAQS: FaqItem[] = [
  // ─── Primeiros passos ─────────────────────────────────────────────
  {
    id: 'comecar',
    categoria: 'primeiros-passos',
    pergunta: 'Por onde começo a usar o SmartRoutes?',
    resposta:
      'Depois de criar sua conta, siga 3 passos:\n\n1. Acesse "Gerenciar Rotas" no Dashboard e cadastre o ponto de partida e o destino final de cada rota (escola/faculdade).\n2. Vá em Configurações → Gerenciar Passageiros e cadastre seus alunos com o telefone do responsável (com DDD).\n3. Abra a tela WhatsApp, escaneie o QR Code e configure o horário do envio automático das mensagens.\n\nA partir daí o sistema envia as confirmações automaticamente no horário que você escolheu.',
  },
  {
    id: 'rotas-padrao',
    categoria: 'primeiros-passos',
    pergunta: 'Por que apareceram 3 rotas (Manhã, Tarde, Noite) ao criar a conta?',
    resposta:
      'O sistema cria automaticamente 3 rotas padrão para acelerar o primeiro uso. Você pode editar nome, horário, ponto de saída e destinos de cada uma. Se não usar alguma, basta desativá-la em "Gerenciar Rotas". Você também pode criar quantas rotas adicionais quiser, inclusive mais de uma no mesmo turno.',
  },
  {
    id: 'cadastrar-passageiro',
    categoria: 'primeiros-passos',
    pergunta: 'Como cadastro um aluno?',
    resposta:
      'Vá em "Rotas" no menu inferior → escolha a rota → toque no botão "+" para abrir o formulário. Preencha nome, telefone do responsável (com DDD), endereço de embarque e turno. O telefone precisa ter 10 ou 11 dígitos — é por ele que o WhatsApp identifica de quem é a resposta.',
  },

  // ─── WhatsApp ─────────────────────────────────────────────────────
  {
    id: 'conectar-whatsapp',
    categoria: 'whatsapp',
    pergunta: 'Como conecto meu WhatsApp ao sistema?',
    resposta:
      'Na tela "WhatsApp" do menu inferior, toque em "Conectar" para gerar um QR Code. Abra o WhatsApp no seu celular, vá em "Dispositivos conectados" e escaneie o código que aparece na tela do SmartRoutes. A conexão fica salva — você não precisa escanear de novo a cada uso.',
  },
  {
    id: 'horario-envio',
    categoria: 'whatsapp',
    pergunta: 'Que horas as mensagens são enviadas?',
    resposta:
      'O horário é definido por você na tela WhatsApp. O sistema dispara exatamente no horário cadastrado (sem janela de tolerância), no fuso de Brasília. Você pode configurar um horário diferente para cada rota.',
  },
  {
    id: 'editar-template',
    categoria: 'whatsapp',
    pergunta: 'Posso mudar o texto da mensagem enviada aos responsáveis?',
    resposta:
      'Sim. Na tela WhatsApp existe o editor do template, onde você ajusta o cabeçalho e o rodapé. As 4 opções de resposta (Ida e volta, Só ida, Só volta, Não vai hoje) também podem ter o texto personalizado. Use as variáveis {saudacao}, {nome_passageiro} e {data_formatada} para deixar a mensagem dinâmica.',
  },
  {
    id: 'reenviar-mensagem',
    categoria: 'whatsapp',
    pergunta: 'Como reenvio a mensagem para quem não respondeu?',
    resposta:
      'Há duas formas:\n\n• Manualmente, na lista de passageiros: toque no botão "Reenviar" no card de quem está pendente.\n• Automaticamente: o sistema só reenvia para confirmações que ainda estão pendentes nas próximas execuções do horário configurado. Quem já respondeu não recebe mensagem duplicada.',
  },
  {
    id: 'whatsapp-desconectado',
    categoria: 'whatsapp',
    pergunta: 'O que acontece se o WhatsApp desconectar?',
    resposta:
      'O envio automático é pausado enquanto o WhatsApp estiver desconectado — o sistema avisa no app com um alerta visual. Para reativar, abra a tela WhatsApp e escaneie o QR Code novamente. Confirmações já recebidas continuam preservadas, e você pode marcar presenças manualmente nesse período.',
  },

  // ─── Rotas e viagens ──────────────────────────────────────────────
  {
    id: 'iniciar-viagem',
    categoria: 'rotas-viagens',
    pergunta: 'Como inicio uma viagem?',
    resposta:
      'Na tela Home, toque no botão amarelo de Play (botão circular grande no centro da barra inferior). O sistema abre um assistente de 3 etapas:\n\n1. Escolha a rota\n2. Decida se quer otimizar automaticamente a ordem das paradas\n3. Escolha a direção: "Buscar alunos" ou "Levar para casa"\n\nNo final, o Google Maps abre com o trajeto pronto e a viagem fica registrada como em andamento.',
  },
  {
    id: 'buscar-vs-levar',
    categoria: 'rotas-viagens',
    pergunta: 'O que significa "Buscar alunos" e "Levar para casa"?',
    resposta:
      '"Buscar alunos" monta o trajeto do ponto de partida da van → casa dos alunos → escola. É o sentido da ida.\n\n"Levar para casa" inverte: sai da escola → casa dos alunos em ordem inversa → ponto de partida. É o sentido do retorno.\n\nO Maps inclui apenas os alunos compatíveis com a direção escolhida: quem respondeu "Somente ida" só entra na ida; quem respondeu "Somente volta" só entra na volta.',
  },
  {
    id: 'otimizar-rota',
    categoria: 'rotas-viagens',
    pergunta: 'Como funciona a otimização automática da rota?',
    resposta:
      'Na segunda etapa do botão Play, escolha "Otimizar automaticamente". O sistema usa a API de mapas para calcular a melhor ordem das paradas com base nos endereços cadastrados e atualiza a sequência dos passageiros. Em seguida, o Google Maps abre o trajeto na nova ordem otimizada.',
  },
  {
    id: 'finalizar-viagem',
    categoria: 'rotas-viagens',
    pergunta: 'Como finalizo uma viagem?',
    resposta:
      'Abra a tela da viagem em andamento (você é levado pra ela automaticamente após iniciar). No canto superior direito, toque em "Finalizar". A viagem é encerrada e o histórico do dia é gerado. Confirmações que ainda estavam pendentes não viram ausentes automaticamente — só por resposta do responsável ou marcação manual.',
  },
  {
    id: 'multiplas-rotas',
    categoria: 'rotas-viagens',
    pergunta: 'Posso ter mais de uma rota no mesmo turno?',
    resposta:
      'Sim. Você pode criar quantas rotas precisar — inclusive duas ou mais no mesmo período (ex: duas rotas no turno da manhã). Cada rota tem seu próprio ponto de partida, destinos, passageiros e horário de envio automático.',
  },

  // ─── Confirmações ─────────────────────────────────────────────────
  {
    id: '5-status',
    categoria: 'confirmacoes',
    pergunta: 'Quais são os status de confirmação?',
    resposta:
      'Existem 5 status, com cores diferentes em todas as telas:\n\n• Ida e volta (verde) — aluno embarca de manhã e volta à tarde\n• Somente ida (azul) — vai só na ida\n• Somente volta (roxo) — vai só na volta\n• Não vai hoje (vermelho) — responsável avisou que o aluno não usa a van\n• Pendente (laranja) — responsável ainda não respondeu',
  },
  {
    id: 'resposta-responsavel',
    categoria: 'confirmacoes',
    pergunta: 'O que o responsável precisa responder no WhatsApp?',
    resposta:
      'Ele recebe a mensagem com 4 opções numeradas e responde com o número:\n\n• 1 — Ida e volta\n• 2 — Somente ida\n• 3 — Somente volta\n• 4 — Não vai hoje\n\nO sistema aceita variações como "1", "1 - Ida e volta", "1.", etc. Se digitar algo fora desse padrão, o bot pede pra responder novamente com uma das 4 opções.',
  },
  {
    id: 'marcar-manual',
    categoria: 'confirmacoes',
    pergunta: 'Posso marcar a presença manualmente?',
    resposta:
      'Sim. Na tela da viagem em andamento, toque no menu (seta para baixo) do card do passageiro e escolha o status. Marcação manual sobrescreve a resposta do WhatsApp e fica registrada como origem "manual".',
  },
  {
    id: 'alterar-resposta',
    categoria: 'confirmacoes',
    pergunta: 'O responsável pode mudar a resposta dele?',
    resposta:
      'Sim. Se ele enviar um novo número após já ter respondido, o bot pergunta se quer alterar a resposta anterior. Se confirmar, o status do dia é atualizado. A última resposta sempre prevalece.',
  },

  // ─── Conta e configurações ────────────────────────────────────────
  {
    id: 'notificacoes',
    categoria: 'conta-config',
    pergunta: 'Como funcionam as notificações in-app?',
    resposta:
      'Em Configurações → Notificações você pode ligar dois alertas que disparam quando um responsável responde:\n\n• Toast no canto da tela com o nome do aluno e o tipo de resposta\n• Som curto (4 tipos disponíveis — toque em "Testar" para ouvir)\n\nOs alertas funcionam em qualquer tela enquanto o app estiver aberto. Push notifications externas (com o app fechado) ainda não estão disponíveis.',
  },
  {
    id: 'editar-perfil',
    categoria: 'conta-config',
    pergunta: 'Como atualizo meus dados (nome, telefone, foto da van)?',
    resposta:
      'Vá em Configurações e toque na sua foto/iniciais no topo da tela. Abre o modal de edição onde você pode mudar nome, telefone, dados do veículo (placa, marca, modelo, ano) e enviar uma foto de perfil.',
  },
  {
    id: 'dados-seguros',
    categoria: 'conta-config',
    pergunta: 'Meus dados e dos meus alunos estão seguros?',
    resposta:
      'Sim. Cada motorista só acessa seus próprios dados — o banco usa Row Level Security para garantir isso no servidor. A chave de acesso ao WhatsApp fica no servidor e nunca chega ao navegador. As mensagens trafegam por HTTPS e são gravadas com o motorista dono identificado.',
  },
];
