import { supabase } from '../../lib/supabase';

export interface EnviarMensagemResultado {
  sucesso: boolean;
  passageiro: string;
  telefone: string;
}

export async function enviarMensagem(
  passageiroId: string,
  mensagem: string,
): Promise<EnviarMensagemResultado> {
  const { data, error } = await supabase.functions.invoke<EnviarMensagemResultado>(
    'enviar-mensagem',
    { body: { passageiro_id: passageiroId, mensagem } },
  );
  if (error) throw error;
  if (!data) throw new Error('Resposta vazia de enviar-mensagem');
  return data;
}
