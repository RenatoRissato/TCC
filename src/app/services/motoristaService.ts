import { supabase } from '../../lib/supabase';
import type { IdiomaApp, MotoristaRow, SomAlerta } from '../types/database';

export interface AtualizarPerfilInput {
  motoristaId: string;
  nome?: string;
  telefone?: string | null;
  placaVan?: string | null;
  marcaVan?: string | null;
  modeloVan?: string | null;
  anoVan?: number | null;
  fotoUrl?: string | null;
}

export async function atualizarPerfilMotorista(
  input: AtualizarPerfilInput,
): Promise<{ ok: boolean; erro?: string }> {
  const patch: Record<string, unknown> = {};
  if (input.nome !== undefined)      patch.nome = input.nome;
  if (input.telefone !== undefined)  patch.telefone = input.telefone;
  if (input.placaVan !== undefined)  patch.placa_van = input.placaVan;
  if (input.marcaVan !== undefined)  patch.marca_van = input.marcaVan;
  if (input.modeloVan !== undefined) patch.modelo_van = input.modeloVan;
  if (input.anoVan !== undefined)    patch.ano_van = input.anoVan;
  if (input.fotoUrl !== undefined)   patch.foto_url = input.fotoUrl;

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase
    .from('motoristas')
    .update(patch)
    .eq('id', input.motoristaId);

  if (error) {
    console.error('atualizarPerfilMotorista:', error);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

export interface AtualizarPreferenciasInput {
  motoristaId: string;
  notifWhatsapp?: boolean;
  notifPush?: boolean;
  notifPendentes?: boolean;
  somAlerta?: SomAlerta;
  idioma?: IdiomaApp;
}

export async function atualizarPreferenciasMotorista(
  input: AtualizarPreferenciasInput,
): Promise<{ ok: boolean; erro?: string; row?: MotoristaRow }> {
  const patch: Record<string, unknown> = {};
  if (input.notifWhatsapp  !== undefined) patch.notif_whatsapp  = input.notifWhatsapp;
  if (input.notifPush      !== undefined) patch.notif_push      = input.notifPush;
  if (input.notifPendentes !== undefined) patch.notif_pendentes = input.notifPendentes;
  if (input.somAlerta      !== undefined) patch.som_alerta      = input.somAlerta;
  if (input.idioma         !== undefined) patch.idioma          = input.idioma;

  if (Object.keys(patch).length === 0) return { ok: true };

  const { data, error } = await supabase
    .from('motoristas')
    .update(patch)
    .eq('id', input.motoristaId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('atualizarPreferenciasMotorista:', error);
    return { ok: false, erro: error.message };
  }
  return { ok: true, row: data as MotoristaRow };
}

export async function alterarSenha(
  novaSenha: string,
): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) {
    console.error('alterarSenha:', error);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}

/**
 * Reautentica o usuário com a senha atual antes de permitir a troca.
 * Retorna ok=true se as credenciais conferem.
 */
export async function verificarSenhaAtual(
  email: string,
  senhaAtual: string,
): Promise<{ ok: boolean; erro?: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senhaAtual,
  });
  if (error) {
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}
