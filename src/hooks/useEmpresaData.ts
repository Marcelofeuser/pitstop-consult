import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Diagnostico,
  ChecklistItem,
  EstoqueItem,
  LancamentoFinanceiro,
  OficinaParceira,
  Orcamento,
  Pop,
  Plano90Dias,
} from '@/types/database';

export function useEmpresaData(empresaId: string | null) {
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [estoqueItens, setEstoqueItens] = useState<EstoqueItem[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [oficinas, setOficinas] = useState<OficinaParceira[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [plano, setPlano] = useState<Plano90Dias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      supabase.from('diagnosticos').select('*').eq('empresa_id', empresaId).order('data', { ascending: false }),
      supabase.from('checklist_itens').select('*').eq('empresa_id', empresaId).order('ordem', { ascending: true }),
      supabase.from('estoque_itens').select('*').eq('empresa_id', empresaId).order('nome'),
      supabase.from('lancamentos_financeiros').select('*').eq('empresa_id', empresaId).order('mes', { ascending: true }),
      supabase.from('oficinas_parceiras').select('*').eq('empresa_id', empresaId).order('nome'),
      supabase.from('orcamentos').select('*').eq('empresa_id', empresaId).order('data', { ascending: false }),
      supabase.from('pops').select('*').eq('empresa_id', empresaId).order('titulo'),
      supabase.from('plano_90_dias').select('*').eq('empresa_id', empresaId).order('ordem', { ascending: true }),
    ]);

    const getData = <T,>(r: PromiseSettledResult<{ data: T | null; error: { message: string } | null }>): T[] => {
      if (r.status === 'fulfilled') return (r.value.data as T[]) ?? [];
      return [];
    };

    setDiagnosticos(getData<Diagnostico>(results[0]));
    setChecklist(getData<ChecklistItem>(results[1]));
    setEstoqueItens(getData<EstoqueItem>(results[2]));
    setLancamentos(getData<LancamentoFinanceiro>(results[3]));
    setOficinas(getData<OficinaParceira>(results[4]));
    setOrcamentos(getData<Orcamento>(results[5]));
    setPops(getData<Pop>(results[6]));
    setPlano(getData<Plano90Dias>(results[7]));

    const hasError = results.some(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error !== null),
    );
    setError(hasError ? 'Erro ao carregar alguns dados. Tente recarregar a página.' : null);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    diagnosticos,
    checklist,
    estoqueItens,
    lancamentos,
    oficinas,
    orcamentos,
    pops,
    plano,
    loading,
    error,
    refresh: fetchAll,
  };
}
