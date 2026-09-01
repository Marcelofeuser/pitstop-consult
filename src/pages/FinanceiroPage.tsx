import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  BarChart,
} from 'recharts';
import { DollarSign, Plus, Trash2, Calculator, TrendingUp, Wallet, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { ChecklistPanel } from '@/components/ChecklistPanel';
import { LoadingState, ErrorState } from '@/components/LoadingState';
import { supabase } from '@/lib/supabase';
import { calcularFluxoCaixa, calcularPrecificacao, calcularMargemContribuicao, calcularNCG, formatCurrency } from '@/lib/calculations';

export function FinanceiroPage() {
  const { empresa } = useAuth();
  const { lancamentos, checklist, refresh, loading, error } = useEmpresaData(empresa?.id ?? null);
  const [aba, setAba] = useState<'fluxo' | 'precificacao' | 'margem' | 'ncg' | 'checklist'>('fluxo');
  const [saving, setSaving] = useState(false);

  const checklistFin = checklist.filter((i) => i.pilar === 'financeiro');

  // Fluxo de caixa
  const [novoMes, setNovoMes] = useState('');
  const [novasEntradas, setNovasEntradas] = useState('');
  const [novasSaidas, setNovasSaidas] = useState('');
  const fluxoData = useMemo(() => calcularFluxoCaixa(lancamentos), [lancamentos]);

  // Precificação
  const [custo, setCusto] = useState('');
  const [despVar, setDespVar] = useState('');
  const [comiss, setComiss] = useState('');
  const [impost, setImpost] = useState('');
  const [margem, setMargem] = useState('');
  const precResult = useMemo(
    () => calcularPrecificacao(Number(custo), Number(despVar), Number(comiss), Number(impost), Number(margem)),
    [custo, despVar, comiss, impost, margem]
  );

  // Margem/PE
  const [pv, setPv] = useState('');
  const [cv, setCv] = useState('');
  const [cf, setCf] = useState('');
  const margemResult = useMemo(
    () => calcularMargemContribuicao(Number(pv), Number(cv), Number(cf)),
    [pv, cv, cf]
  );

  // NCG
  const [estoques, setEstoques] = useState('');
  const [contasRec, setContasRec] = useState('');
  const [fornecedores, setFornecedores] = useState('');
  const ncgResult = useMemo(
    () => calcularNCG(Number(estoques), Number(contasRec), Number(fornecedores)),
    [estoques, contasRec, fornecedores]
  );

  if (!empresa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <DollarSign className="w-12 h-12 text-navy-300 mb-4" />
        <p className="text-navy-400">Selecione uma empresa.</p>
      </div>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  async function addLancamento() {
    if (!novoMes.trim() || !novasEntradas || !novasSaidas) return;
    setSaving(true);
    const { error: insertError } = await supabase.from('lancamentos_financeiros').insert({
      empresa_id: empresa!.id,
      mes: novoMes.trim(),
      entradas: Number(novasEntradas),
      saidas: Number(novasSaidas),
    });
    setSaving(false);
    if (insertError) {
      alert('Erro ao adicionar lançamento. Tente novamente.');
      return;
    }
    setNovoMes('');
    setNovasEntradas('');
    setNovasSaidas('');
    refresh();
  }

  async function deleteLanc(id: string) {
    const { error: delError } = await supabase.from('lancamentos_financeiros').delete().eq('id', id);
    if (delError) {
      alert('Erro ao excluir lançamento. Tente novamente.');
      return;
    }
    refresh();
  }

  const tabs = [
    { key: 'fluxo' as const, label: 'Fluxo de Caixa', icon: Wallet },
    { key: 'precificacao' as const, label: 'Precificação', icon: Calculator },
    { key: 'margem' as const, label: 'Margem & P.E.', icon: TrendingUp },
    { key: 'ncg' as const, label: 'Capital de Giro', icon: DollarSign },
    { key: 'checklist' as const, label: 'Checklist', icon: ClipboardCheck },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-bold text-navy-700">Financeiro</h1>
        <p className="text-navy-400 text-sm mt-1">Pilar 2 — Fluxo de caixa, precificação e indicadores</p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-card overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setAba(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                aba === tab.key ? 'bg-navy-700 text-white' : 'text-navy-500 hover:bg-surface'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Fluxo de Caixa */}
      {aba === 'fluxo' && (
        <div className="space-y-6 animate-fade-in">
          <div className="card">
            <h2 className="text-lg font-serif font-bold text-navy-700 mb-4">Fluxo de Caixa Simplificado</h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6">
              <input
                value={novoMes}
                onChange={(e) => setNovoMes(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLancamento()}
                placeholder="Mês (ex: Jan/25)"
                className="input-field"
              />
              <input
                type="number"
                value={novasEntradas}
                onChange={(e) => setNovasEntradas(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLancamento()}
                placeholder="Entradas (R$)"
                className="input-field"
              />
              <input
                type="number"
                value={novasSaidas}
                onChange={(e) => setNovasSaidas(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLancamento()}
                placeholder="Saídas (R$)"
                className="input-field"
              />
              <button onClick={addLancamento} disabled={saving} className="btn-primary">
                <Plus className="w-5 h-5" /> {saving ? '...' : 'Adicionar'}
              </button>
            </div>

            {fluxoData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260} className="mb-6">
                  <LineChart data={fluxoData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #C9D5E3', fontSize: '13px' }}
                    />
                    <Line type="monotone" dataKey="saldoAcumulado" name="Saldo Acumulado" stroke="#E67620" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-navy-100 text-left text-navy-400 text-xs uppercase">
                        <th className="py-2 px-3">Mês</th>
                        <th className="py-2 px-3 text-right">Entradas</th>
                        <th className="py-2 px-3 text-right">Saídas</th>
                        <th className="py-2 px-3 text-right">Saldo do Mês</th>
                        <th className="py-2 px-3 text-right">Saldo Acumulado</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fluxoData.map((l, idx) => {
                        const original = lancamentos[idx];
                        if (!original) return null;
                        return (
                          <tr key={original.id} className="border-b border-navy-50 hover:bg-surface">
                            <td className="py-2.5 px-3 font-medium text-navy-700">{l.mes}</td>
                            <td className="py-2.5 px-3 text-right text-status-saudavel">{formatCurrency(l.entradas)}</td>
                            <td className="py-2.5 px-3 text-right text-status-critico">{formatCurrency(l.saidas)}</td>
                            <td className={`py-2.5 px-3 text-right font-medium ${l.saldoMes >= 0 ? 'text-status-saudavel' : 'text-status-critico'}`}>
                              {formatCurrency(l.saldoMes)}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold ${l.saldoAcumulado >= 0 ? 'text-navy-700' : 'text-status-critico'}`}>
                              {formatCurrency(l.saldoAcumulado)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button onClick={() => deleteLanc(original.id)} className="text-navy-300 hover:text-status-critico transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-navy-200 mx-auto mb-3" />
                <p className="text-navy-400">Adicione lançamentos mensais para acompanhar o fluxo de caixa.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Precificação */}
      {aba === 'precificacao' && (
        <div className="card max-w-2xl animate-fade-in">
          <h2 className="text-lg font-serif font-bold text-navy-700 mb-1">Calculadora — Precificação (Markup)</h2>
          <p className="text-navy-400 text-sm mb-6">Calcula o preço de venda ideal com base nos custos e margem desejada.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label-field">Custo da peça (R$)</label>
              <input type="number" value={custo} onChange={(e) => setCusto(e.target.value)} className="input-field" placeholder="Ex: 50" />
            </div>
            <div>
              <label className="label-field">% Despesas variáveis</label>
              <input type="number" value={despVar} onChange={(e) => setDespVar(e.target.value)} className="input-field" placeholder="Ex: 5" />
            </div>
            <div>
              <label className="label-field">% Comissões</label>
              <input type="number" value={comiss} onChange={(e) => setComiss(e.target.value)} className="input-field" placeholder="Ex: 3" />
            </div>
            <div>
              <label className="label-field">% Impostos</label>
              <input type="number" value={impost} onChange={(e) => setImpost(e.target.value)} className="input-field" placeholder="Ex: 12" />
            </div>
            <div>
              <label className="label-field">% Margem de lucro desejada</label>
              <input type="number" value={margem} onChange={(e) => setMargem(e.target.value)} className="input-field" placeholder="Ex: 25" />
            </div>
          </div>

          {custo && margem ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-5 text-center bg-orange-50">
                <p className="text-xs text-navy-400 mb-1">Preço de Venda</p>
                <p className="text-3xl font-serif font-bold text-orange-600">{formatCurrency(precResult.precoVenda)}</p>
              </div>
              <div className="rounded-xl p-5 text-center bg-status-saudavel/10">
                <p className="text-xs text-navy-400 mb-1">Lucro por peça</p>
                <p className="text-3xl font-serif font-bold text-status-saudavel">{formatCurrency(precResult.lucroReais)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-navy-300 text-center py-6">Preencha custo e margem para calcular.</p>
          )}

          {custo && margem && Number(despVar) + Number(comiss) + Number(impost) + Number(margem) >= 100 && (
            <div className="mt-4 bg-status-critico/10 text-status-critico text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              A soma dos percentuais deve ser menor que 100%.
            </div>
          )}

          <div className="mt-6 bg-surface rounded-xl p-4 text-sm text-navy-500">
            <p><strong>Fórmula:</strong> Preço de Venda = Custo ÷ [1 − (% Desp. Var + % Comissões + % Impostos + % Margem)]</p>
          </div>
        </div>
      )}

      {/* Margem & PE */}
      {aba === 'margem' && (
        <div className="card max-w-2xl animate-fade-in">
          <h2 className="text-lg font-serif font-bold text-navy-700 mb-1">Margem de Contribuição & Ponto de Equilíbrio</h2>
          <p className="text-navy-400 text-sm mb-6">Calcula quanto sobra das vendas para cobrir custos fixos.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="label-field">Preço de venda (R$)</label>
              <input type="number" value={pv} onChange={(e) => setPv(e.target.value)} className="input-field" placeholder="Ex: 100" />
            </div>
            <div>
              <label className="label-field">Custos e despesas variáveis (R$)</label>
              <input type="number" value={cv} onChange={(e) => setCv(e.target.value)} className="input-field" placeholder="Ex: 60" />
            </div>
            <div>
              <label className="label-field">Custos fixos totais (R$)</label>
              <input type="number" value={cf} onChange={(e) => setCf(e.target.value)} className="input-field" placeholder="Ex: 20000" />
            </div>
          </div>

          {pv && cv && cf ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl p-5 text-center bg-navy-50">
                <p className="text-xs text-navy-400 mb-1">Margem de Contribuição</p>
                <p className="text-3xl font-serif font-bold text-navy-700">{margemResult.margemPercent}%</p>
              </div>
              <div className="rounded-xl p-5 text-center bg-orange-50">
                <p className="text-xs text-navy-400 mb-1">Ponto de Equilíbrio</p>
                <p className="text-3xl font-serif font-bold text-orange-600">{formatCurrency(margemResult.pontoEquilibrio)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-navy-300 text-center py-6">Preencha os 3 campos para calcular.</p>
          )}

          <div className="mt-6 bg-surface rounded-xl p-4 text-sm text-navy-500 space-y-1">
            <p><strong>Fórmulas:</strong></p>
            <p>Margem (%) = (PV − Custos Variáveis) ÷ PV × 100</p>
            <p>P.E. (R$) = Custos Fixos ÷ Margem (%)</p>
          </div>
        </div>
      )}

      {/* NCG */}
      {aba === 'ncg' && (
        <div className="card max-w-2xl animate-fade-in">
          <h2 className="text-lg font-serif font-bold text-navy-700 mb-1">Necessidade de Capital de Giro (NCG)</h2>
          <p className="text-navy-400 text-sm mb-6">Quanto capital a empresa precisa para financiar a operação.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="label-field">Estoques (R$)</label>
              <input type="number" value={estoques} onChange={(e) => setEstoques(e.target.value)} className="input-field" placeholder="Ex: 150000" />
            </div>
            <div>
              <label className="label-field">Contas a Receber (R$)</label>
              <input type="number" value={contasRec} onChange={(e) => setContasRec(e.target.value)} className="input-field" placeholder="Ex: 80000" />
            </div>
            <div>
              <label className="label-field">Fornecedores a Pagar (R$)</label>
              <input type="number" value={fornecedores} onChange={(e) => setFornecedores(e.target.value)} className="input-field" placeholder="Ex: 100000" />
            </div>
          </div>

          {estoques && contasRec && fornecedores ? (
            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: ncgResult > 0 ? '#FCE8EC' : '#DCF2E5' }}>
              <p className="text-sm text-navy-500 mb-2">Necessidade de Capital de Giro</p>
              <p className="text-4xl font-serif font-bold" style={{ color: ncgResult > 0 ? '#C81E3A' : '#15803D' }}>
                {formatCurrency(ncgResult)}
              </p>
              {ncgResult > 0 && (
                <p className="text-status-critico text-sm mt-3 flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  NCG positiva — a empresa precisa de capital para financiar a operação.
                </p>
              )}
              {ncgResult <= 0 && (
                <p className="text-status-saudavel text-sm mt-3">
                  NCG negativa — a operação se autofinancia com prazos de fornecedores.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-navy-300 text-center py-6">Preencha os 3 campos para calcular.</p>
          )}

          <div className="mt-6 bg-surface rounded-xl p-4 text-sm text-navy-500">
            <p><strong>Fórmula:</strong> NCG = (Estoques + Contas a Receber) − Fornecedores a Pagar</p>
          </div>
        </div>
      )}

      {/* Checklist */}
      {aba === 'checklist' && (
        <div className="animate-fade-in">
          <ChecklistPanel empresaId={empresa.id} pilar="financeiro" items={checklistFin} onUpdate={refresh} />
        </div>
      )}
    </div>
  );
}
