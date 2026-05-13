import type { SupabaseClient } from '@supabase/supabase-js'
import {
  montarMensagemDecisaoInvalida,
  montarMensagemJaConfirmou,
  montarMensagemManterAnterior,
  montarMensagemNovaEscolha,
  montarMensagemOpcoesInvalidas,
  montarMensagemSemConfirmacaoHoje,
  montarPerguntaAlteracao,
  montarRespostaAlteracao,
  montarRespostaConfirmacao,
} from './conversaMensagens.ts'
import {
  validarOpcaoConfirmacao,
  validarOpcaoDecisao,
  type EstadoConversaConfirmacao,
  type TipoConfirmacao,
} from './conversaValidacao.ts'
import { dataBrasilISO } from './viagem.ts'
import {
  atualizarConfirmacao,
  buscarConfirmacaoDoDia,
  buscarConfirmacaoPorId,
  buscarEstadoConversa,
  buscarPassageirosPorTelefone,
  escolherPassageiroDoDia,
  obterInstanciaIdDoMotorista,
  registrarMensagemConversa,
  registrarNotificacaoResposta,
  salvarEstadoConversa,
  type ConfirmacaoConversa,
} from './conversaRepository.ts'

export interface EntradaConversaConfirmacao {
  telefoneRemetente: string
  texto: string
  whatsappMessageId?: string | null
  confirmacaoId?: string | null
  /**
   * Motorista dono da instância de WhatsApp ativa. O webhook descobre via
   * `obterMotoristaDaInstanciaAtiva` antes de chamar. Quando presente,
   * restringe a busca de passageiros aos passageiros desse motorista —
   * passageiros de outro motorista com mesmo telefone ficam fora.
   */
  motoristaIdAtivo?: string | null
}

export interface SaidaConversaConfirmacao {
  ignorado?: boolean
  motivo?: string
  telefoneDestino?: string
  mensagemResposta?: string
  tipoMensagemResposta?: 'resposta_confirmacao' | 'resposta_invalida'
  contextoLog?: {
    instanciaId: string | null
    passageiroId: string | null
    confirmacaoId: string | null
  }
  estado?: EstadoConversaConfirmacao
  tipoConfirmacao?: TipoConfirmacao | null
}

function estadoAtualDaConversa(
  estadoPersistido: EstadoConversaConfirmacao | null | undefined,
  confirmacao: ConfirmacaoConversa,
): EstadoConversaConfirmacao {
  if (
    estadoPersistido === 'aguardando_decisao' ||
    estadoPersistido === 'aguardando_nova_resposta'
  ) {
    return estadoPersistido
  }
  return confirmacao.status === 'pendente' ? 'sem_resposta' : 'confirmado'
}

function contextoBasico(confirmacao: ConfirmacaoConversa, instanciaId: string | null) {
  return {
    instanciaId,
    passageiroId: confirmacao.passageiro_id,
    confirmacaoId: confirmacao.id,
  }
}

export async function processarMensagemConfirmacao(
  supabase: SupabaseClient,
  entrada: EntradaConversaConfirmacao,
): Promise<SaidaConversaConfirmacao> {
  const hoje = dataBrasilISO()
  console.log(
    '[conversa] processarMensagemConfirmacao: inicio',
    JSON.stringify({
      telefone_remetente: entrada.telefoneRemetente,
      texto: entrada.texto,
      confirmacao_id_payload: entrada.confirmacaoId ?? null,
      data_hoje_brasil: hoje,
    }),
  )

  // Busca passageiro UMA vez — usamos `rota_id` na busca da confirmação
  // (que agora vai por viagem da rota, evitando filtro em embed). O nome
  // `passageiroInicial` evita colisão com o `passageiro` extraído de
  // `confirmacao.passageiros` mais abaixo nesta mesma função.
  //
  // Desambiguação: o mesmo telefone pode estar cadastrado em mais de um
  // passageiro (ex.: dois irmãos do mesmo responsável). `escolherPassageiroDoDia`
  // prioriza quem tem confirmação pendente hoje — assim a resposta volta
  // com o nome certo.
  const candidatos = entrada.confirmacaoId
    ? []
    : await buscarPassageirosPorTelefone(
        supabase,
        entrada.telefoneRemetente,
        entrada.motoristaIdAtivo ?? null,
      )

  const passageiroInicial = entrada.confirmacaoId
    ? null
    : await escolherPassageiroDoDia(supabase, candidatos, hoje)

  const confirmacao = entrada.confirmacaoId
    ? await buscarConfirmacaoPorId(supabase, entrada.confirmacaoId)
    : passageiroInicial
      ? await buscarConfirmacaoDoDia(
          supabase,
          passageiroInicial.id,
          passageiroInicial.rota_id,
          hoje,
        )
      : null

  if (!confirmacao) {
    const paxFallback = passageiroInicial
    if (!paxFallback) {
      console.log(
        '[conversa] sem passageiro ativo para o telefone — mensagem ignorada',
        JSON.stringify({ telefone_remetente: entrada.telefoneRemetente }),
      )
      return { ignorado: true, motivo: 'remetente sem passageiro ativo' }
    }
    console.log(
      '[conversa] sem confirmacao do dia — devolvendo fallback ao responsavel',
      JSON.stringify({
        passageiro_id: paxFallback.id,
        rota_id: paxFallback.rota_id,
        data: hoje,
      }),
    )
    return {
      telefoneDestino: paxFallback.telefone_responsavel,
      mensagemResposta: montarMensagemSemConfirmacaoHoje(),
      tipoMensagemResposta: 'resposta_invalida',
      contextoLog: {
        instanciaId: null,
        passageiroId: paxFallback.id,
        confirmacaoId: null,
      },
      estado: 'sem_resposta',
    }
  }

  if (confirmacao.viagens?.data && confirmacao.viagens.data !== hoje) {
    return {
      telefoneDestino: confirmacao.passageiros.telefone_responsavel,
      mensagemResposta: montarMensagemSemConfirmacaoHoje(),
      tipoMensagemResposta: 'resposta_invalida',
      contextoLog: {
        instanciaId: null,
        passageiroId: confirmacao.passageiro_id,
        confirmacaoId: confirmacao.id,
      },
      estado: 'sem_resposta',
    }
  }

  const passageiro = confirmacao.passageiros
  const motoristaId = passageiro?.rotas?.motorista_id ?? null
  const instanciaId = await obterInstanciaIdDoMotorista(supabase, motoristaId)
  const estadoPersistido = await buscarEstadoConversa(
    supabase,
    confirmacao.passageiro_id,
    hoje,
  )
  const estado = estadoAtualDaConversa(estadoPersistido?.estado, confirmacao)
  const contextoLog = contextoBasico(confirmacao, instanciaId)

  await registrarMensagemConversa(supabase, {
    ...contextoLog,
    conteudo: entrada.texto,
    direcao: 'entrada',
    tipo: 'resposta_confirmacao',
    statusEnvio: 'entregue',
    whatsappMessageId: entrada.whatsappMessageId ?? null,
  })

  if (estado === 'sem_resposta') {
    const validacao = validarOpcaoConfirmacao(entrada.texto)
    if (!validacao.valido || !validacao.tipo) {
      return {
        telefoneDestino: passageiro.telefone_responsavel,
        mensagemResposta: montarMensagemOpcoesInvalidas(),
        tipoMensagemResposta: 'resposta_invalida',
        contextoLog,
        estado,
      }
    }

    await atualizarConfirmacao(supabase, confirmacao.id, validacao.tipo)
    await salvarEstadoConversa(supabase, {
      passageiroId: confirmacao.passageiro_id,
      viagemId: confirmacao.viagem_id,
      confirmacaoId: confirmacao.id,
      data: hoje,
      estado: 'confirmado',
      tipoConfirmacaoAnterior: validacao.tipo,
      alterada: false,
    })
    await registrarNotificacaoResposta(supabase, {
      motoristaId,
      passageiroNome: passageiro.nome_completo,
      tipo: validacao.tipo,
    })

    return {
      telefoneDestino: passageiro.telefone_responsavel,
      mensagemResposta: montarRespostaConfirmacao(
        validacao.tipo,
        passageiro.nome_completo,
      ),
      tipoMensagemResposta: 'resposta_confirmacao',
      contextoLog,
      estado: 'confirmado',
      tipoConfirmacao: validacao.tipo,
    }
  }

  if (estado === 'confirmado') {
    const validacao = validarOpcaoConfirmacao(entrada.texto)
    if (!validacao.valido) {
      return {
        telefoneDestino: passageiro.telefone_responsavel,
        mensagemResposta: montarMensagemJaConfirmou(passageiro.nome_completo),
        tipoMensagemResposta: 'resposta_invalida',
        contextoLog,
        estado,
        tipoConfirmacao: confirmacao.tipo_confirmacao,
      }
    }

    await salvarEstadoConversa(supabase, {
      passageiroId: confirmacao.passageiro_id,
      viagemId: confirmacao.viagem_id,
      confirmacaoId: confirmacao.id,
      data: hoje,
      estado: 'aguardando_decisao',
      tipoConfirmacaoAnterior: confirmacao.tipo_confirmacao,
      alterada: estadoPersistido?.alterada ?? false,
    })

    return {
      telefoneDestino: passageiro.telefone_responsavel,
      mensagemResposta: montarPerguntaAlteracao(passageiro.nome_completo),
      tipoMensagemResposta: 'resposta_confirmacao',
      contextoLog,
      estado: 'aguardando_decisao',
      tipoConfirmacao: confirmacao.tipo_confirmacao,
    }
  }

  if (estado === 'aguardando_decisao') {
    const decisao = validarOpcaoDecisao(entrada.texto)
    if (!decisao.valido) {
      return {
        telefoneDestino: passageiro.telefone_responsavel,
        mensagemResposta: montarMensagemDecisaoInvalida(),
        tipoMensagemResposta: 'resposta_invalida',
        contextoLog,
        estado,
        tipoConfirmacao: confirmacao.tipo_confirmacao,
      }
    }

    if (decisao.numero === '2') {
      await salvarEstadoConversa(supabase, {
        passageiroId: confirmacao.passageiro_id,
        viagemId: confirmacao.viagem_id,
        confirmacaoId: confirmacao.id,
        data: hoje,
        estado: 'confirmado',
        tipoConfirmacaoAnterior: confirmacao.tipo_confirmacao,
        alterada: estadoPersistido?.alterada ?? false,
      })

      return {
        telefoneDestino: passageiro.telefone_responsavel,
        mensagemResposta: montarMensagemManterAnterior(passageiro.nome_completo),
        tipoMensagemResposta: 'resposta_confirmacao',
        contextoLog,
        estado: 'confirmado',
        tipoConfirmacao: confirmacao.tipo_confirmacao,
      }
    }

    await salvarEstadoConversa(supabase, {
      passageiroId: confirmacao.passageiro_id,
      viagemId: confirmacao.viagem_id,
      confirmacaoId: confirmacao.id,
      data: hoje,
      estado: 'aguardando_nova_resposta',
      tipoConfirmacaoAnterior: confirmacao.tipo_confirmacao,
      alterada: estadoPersistido?.alterada ?? false,
    })

    return {
      telefoneDestino: passageiro.telefone_responsavel,
      mensagemResposta: montarMensagemNovaEscolha(),
      tipoMensagemResposta: 'resposta_confirmacao',
      contextoLog,
      estado: 'aguardando_nova_resposta',
      tipoConfirmacao: confirmacao.tipo_confirmacao,
    }
  }

  const novaResposta = validarOpcaoConfirmacao(entrada.texto)
  if (!novaResposta.valido || !novaResposta.tipo) {
    return {
      telefoneDestino: passageiro.telefone_responsavel,
      mensagemResposta: montarMensagemOpcoesInvalidas(),
      tipoMensagemResposta: 'resposta_invalida',
      contextoLog,
      estado,
      tipoConfirmacao: confirmacao.tipo_confirmacao,
    }
  }

  await atualizarConfirmacao(supabase, confirmacao.id, novaResposta.tipo)
  await salvarEstadoConversa(supabase, {
    passageiroId: confirmacao.passageiro_id,
    viagemId: confirmacao.viagem_id,
    confirmacaoId: confirmacao.id,
    data: hoje,
    estado: 'confirmado',
    tipoConfirmacaoAnterior: novaResposta.tipo,
    alterada: true,
  })
  await registrarNotificacaoResposta(supabase, {
    motoristaId,
    passageiroNome: passageiro.nome_completo,
    tipo: novaResposta.tipo,
    alterada: true,
  })

  return {
    telefoneDestino: passageiro.telefone_responsavel,
    mensagemResposta: montarRespostaAlteracao(
      novaResposta.tipo,
      passageiro.nome_completo,
    ),
    tipoMensagemResposta: 'resposta_confirmacao',
    contextoLog,
    estado: 'confirmado',
    tipoConfirmacao: novaResposta.tipo,
  }
}
