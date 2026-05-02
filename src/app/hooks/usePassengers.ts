import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listarPassageiros,
  criarPassageiro,
  atualizarPassageiro,
  inativarPassageiro,
  calcularSummary,
} from '../services/passageiroService';
import { useAuth } from '../context/AuthContext';
import type { Passenger, RouteType, StudentStatus, TipoPassageiro } from '../types';

export type PassengerFilter = 'all' | StudentStatus;
export type PassengerPeriod = 'all' | string; // 'all' | rotaId

export interface PassengerFormValues {
  name: string;
  // Tipo + dados acadêmicos. nomeResponsavel só usado quando série é Fundamental.
  tipoPassageiro: TipoPassageiro;
  instituicao: string;
  serieSemestre: string;
  curso: string;
  nomeResponsavel: string;
  // phone vai sempre para telefone_responsavel no banco — pode ser do
  // responsável (Fundamental) ou do próprio aluno (Médio/Faculdade).
  phone: string;
  addressRua: string;
  addressNumero: string;
  addressBairro: string;
  addressCep: string;
  routes: RouteType[];
  rotaId?: string;
}

interface UsePassengersOptions {
  search?: string;
  filter?: PassengerFilter;
  period?: PassengerPeriod;
}

const STATUS_ORDER: Record<StudentStatus, number> = { going: 0, pending: 1, absent: 2 };

export function usePassengers({ search = '', filter = 'all', period = 'all' }: UsePassengersOptions = {}) {
  const { motoristaId } = useAuth();
  const [list, setList] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    try {
      const dados = await listarPassageiros();
      setList(dados);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarrega quando o motoristaId fica disponível (evita race condition
  // em registro novo / primeiro login, quando o JWT ainda não está pronto).
  useEffect(() => {
    if (!motoristaId) return;
    recarregar();
  }, [motoristaId, recarregar]);

  const counts = useMemo(() => ({
    all: list.length,
    going: list.filter(p => p.status === 'going').length,
    absent: list.filter(p => p.status === 'absent').length,
    pending: list.filter(p => p.status === 'pending').length,
  }), [list]);

  const filtered = useMemo(() => {
    let l = [...list];
    if (period !== 'all') l = l.filter(p => p.rotaId === period);
    if (filter !== 'all') l = l.filter(p => p.status === filter);
    const q = search.trim().toLowerCase();
    if (q) {
      l = l.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.parentName.toLowerCase().includes(q),
      );
    }
    return l.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [list, search, filter, period]);

  const periodSummary = useMemo(
    () => calcularSummary(period === 'all' ? list : list.filter(p => p.rotaId === period)),
    [list, period],
  );

  const add = useCallback(async (form: PassengerFormValues) => {
    if (!form.rotaId) {
      console.warn('add passageiro sem rotaId — selecione uma rota antes de salvar');
      return;
    }
    await criarPassageiro({
      rotaId: form.rotaId,
      nomeCompleto: form.name,
      telefoneResponsavel: form.phone,
      embarqueRua:    form.addressRua,
      embarqueNumero: form.addressNumero || undefined,
      embarqueBairro: form.addressBairro || undefined,
      embarqueCep:    form.addressCep    || undefined,
      tipoPassageiro: form.tipoPassageiro,
      instituicao:    form.instituicao || undefined,
      serieSemestre:  form.serieSemestre || undefined,
      curso:          form.curso || undefined,
      nomeResponsavel: form.nomeResponsavel || undefined,
    });
    await recarregar();
  }, [recarregar]);

  const edit = useCallback(async (id: string, form: PassengerFormValues) => {
    await atualizarPassageiro(id, {
      rotaId: form.rotaId,
      nomeCompleto: form.name,
      telefoneResponsavel: form.phone,
      embarqueRua:    form.addressRua,
      embarqueNumero: form.addressNumero || undefined,
      embarqueBairro: form.addressBairro || undefined,
      embarqueCep:    form.addressCep    || undefined,
      tipoPassageiro: form.tipoPassageiro,
      instituicao:    form.instituicao || undefined,
      serieSemestre:  form.serieSemestre || undefined,
      curso:          form.curso || undefined,
      nomeResponsavel: form.nomeResponsavel || undefined,
    });
    await recarregar();
  }, [recarregar]);

  const remove = useCallback(async (id: string) => {
    await inativarPassageiro(id);
    await recarregar();
  }, [recarregar]);

  return { list, filtered, counts, periodSummary, add, edit, remove, loading, error, recarregar };
}
