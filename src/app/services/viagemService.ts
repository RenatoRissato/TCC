import { supabase } from '../../lib/supabase';
import type { ViagemRow, RotaRow, StatusConfirmacao, TipoConfirmacao, DirecaoViagem } from '../types/database';

export interface IniciarViagemResultado {
  viagem_id: string;
  total_passageiros: number;
  mensagens_enviadas: number;
  mensagens_com_falha: number;
  resultados: { passageiro_id: string; nome: string; sucesso: boolean; erro?: string }[];
  ja_existia?: boolean;
}

export interface FinalizarViagemResultado {
  viagem_id: string;
  finalizadaEm: string;
  ausentes_marcados: number;
}

export interface ReenviarConfirmacaoResultado {
  sucesso: boolean;
  confirmacao_id: string;
  tentativa: number;
}

interface EdgeFnError {
  erro: string;
  codigo?: string;
  detalhes?: unknown;
}

/**
 * Extrai a mensagem real de erro retornada pela Edge Function.
 *
 * Sem isso, `error.message` traz só a string genérica do SDK
 * ("Edge Function returned a non-2xx status code") que confunde o usuário.
 * A mensagem útil está no body JSON da Response em `error.context`.
 */
async function extrairErro(error: unknown, fallback = 'Erro inesperado'): Promise<EdgeFnError> {
  if (error && typeof error === 'object') {
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        const clone = ctx.clone();
        const contentType = clone.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const body = await clone.json();
          const mensagem = body?.erro ?? body?.message ?? body?.error;
          if (mensagem) {
            return {
              erro: String(mensagem),
              codigo: typeof body?.codigo === 'string' ? body.codigo : undefined,
              detalhes: body?.detalhes,
            };
          }
        } else {
          const texto = await clone.text();
          if (texto.trim()) return { erro: texto.trim() };
        }
      } catch (parseErr) {
        console.error('extrairErro: falhou ao parsear response body', parseErr);
      }
    }

    const msg = (error as { message?: string }).message;
    if (msg && msg !== 'Edge Function returned a non-2xx status code') {
      return { erro: msg };
    }
  }
  return { erro: fallback };
}

export async function iniciarViagem(
  rotaId: string,
  direcao?: DirecaoViagem | null,
): Promise<IniciarViagemResultado> {
  const body: Record<string, unknown> = { rota_id: rotaId };
  if (direcao === 'buscar' || direcao === 'retorno') {
    body.direcao = direcao;
  }
  const { data, error } = await supabase.functions.invoke<IniciarViagemResultado>(
    'iniciar-viagem',
    { body },
  );
  if (error) throw await extrairErro(error, 'Falha ao iniciar viagem');
  if (!data) throw { erro: 'Resposta vazia da função iniciar-viagem' };
  return data;
}

export async function finalizarViagem(viagemId: string): Promise<FinalizarViagemResultado> {
  const { data, error } = await supabase.functions.invoke<FinalizarViagemResultado>(
    'finalizar-viagem',
    { body: { viagem_id: viagemId } },
  );
  if (error) throw await extrairErro(error, 'Falha ao finalizar viagem');
  if (!data) throw { erro: 'Resposta vazia da função finalizar-viagem' };
  return data;
}

export async function reenviarConfirmacao(confirmacaoId: string): Promise<ReenviarConfirmacaoResultado> {
  const { data, error } = await supabase.functions.invoke<ReenviarConfirmacaoResultado>(
    'reenviar-confirmacao',
    { body: { confirmacao_id: confirmacaoId } },
  );
  if (error) throw await extrairErro(error, 'Falha ao reenviar confirmação');
  if (!data) throw { erro: 'Resposta vazia da função reenviar-confirmacao' };
  return data;
}

export async function buscarViagemDoDia(rotaId: string): Promise<ViagemRow | null> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('viagens')
    .select('*')
    .eq('rota_id', rotaId)
    .eq('data', hoje)
    .maybeSingle();
  if (error) {
    console.error('buscarViagemDoDia:', error);
    return null;
  }
  return data as ViagemRow | null;
}

export async function buscarViagem(viagemId: string): Promise<{ viagem: ViagemRow; rota: RotaRow } | null> {
  const { data, error } = await supabase
    .from('viagens')
    .select('*, rotas(*)')
    .eq('id', viagemId)
    .maybeSingle();
  if (error || !data) {
    console.error('buscarViagem:', error);
    return null;
  }
  const { rotas, ...viagem } = data as ViagemRow & { rotas: RotaRow };
  return { viagem: viagem as ViagemRow, rota: rotas };
}

export async function marcarConfirmacaoManual(
  confirmacaoId: string,
  status: StatusConfirmacao,
  tipo: TipoConfirmacao | null,
): Promise<boolean> {
  const { error } = await supabase
    .from('confirmacoes')
    .update({
      status,
      tipo_confirmacao: tipo,
      origem: 'manual',
      respondida_em: new Date().toISOString(),
    })
    .eq('id', confirmacaoId);
  if (error) {
    console.error('marcarConfirmacaoManual:', error);
    return false;
  }
  return true;
}
