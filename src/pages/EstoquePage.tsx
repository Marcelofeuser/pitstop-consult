import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Package, Plus, Trash2, Calculator, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { ChecklistPanel } from '@/components/ChecklistPanel';
import { LoadingState, ErrorState } from '@/components/LoadingState';
import { supabase } from '@/lib/supabase';
import {
  calcularCurvaABC,
  calcularGiroEstoque,
  calcularEstoqueParado,
  formatCurrency,
} from '@/lib/calculations';

export function EstoquePage() {
  const { empresa } = useAuth();
  const { estoqueItens, checklist, refresh, loading, error } = useEmpresaData(empresa?.id ?? null);
  const [novoItem, setNovoItem] = useState('');
  const [novoValor, setNovoValor] = useState('');
  const [aba, setAba] = useState<'curva' | 'giro' | 'parado' | 'checklist'>('curva');
  const [saving, setSaving] = useState(false);

  // Giro inputs
  const [cmv, setCmv] = useState('');
  const [estIni, setEstIni] = useState('');
  const [estFin, setEstFin] = useState('');

  // Parado inputs
  const [valorParado, setValorParado] = useState('');
  const [valorTotal, setValorTotal] = useState('');

  const curvaData = useMemo(() => calcularCurvaABC(estoqueItens), [estoqueItens]);
  const giroResult = useMemo(
    () => calcularGiroEstoque(Number(cmv), Number(estIni), Number(estFin)),
    [cmv, estIni, estFin]
  );
  const paradoResult = useMemo(
    () => calcularEstoqueParado(Number(valorParado), Number(valorTotal)),
    [valorParado, valorTotal]
  );

  const checklistEstoque = checklist.filter((i) => i.pilar === 'estoque');

  if (!empresa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Package className="w-12 h-12 text-navy-300 mb-4" />
        <p className="text-navy-400">Selecione uma empresa.</p>
      </div>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  async function addItem() {
    if (!novoItem.trim() || !novoValor) return;
    setSaving(true);
    const { error: insertError } = await supabase.from('estoque_itens').insert({
      empresa_id: empresa!.id,
      nome: novoItem.trim(),
      valor_vendido: Number(novoValor),
    });
    setSaving(false);
    if (insertError) {
      alert('Erro ao adicionar item. Tente novamente.');
      return;
    }
    setNovoItem('');
    setNovoValor('');
    refresh();
  }

  async function deleteItem(id: string) {
    const { error: delError } = await supabase.from('estoque_itens').delete().eq('id', id);
    if (delError) {
      alert('Erro ao excluir item. Tente novamente.');
      return;
    }
    refresh();
  }

  const tabs = [
    { key: 'curva' as const, label: 'Curva ABC', icon: TrendingUp },
    { key: 'giro' as const, label: 'Giro de Estoque', icon: Calculator },
    { key: 'parado' as const, label: 'Estoque Parado', icon: AlertTriangle },
    { key: 'checklist' as const, label: 'Checklist', icon: Package },
  ];

  const classeColors: Record<string, string> = { A: '#E67620', B: '#1F4068', C: '#6B7280' };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-bold text-navy-700">Estoque</h1>
        <p className="text-navy-400 text-sm mt-1">Pilar 1 — Curva ABC, Giro de Estoque e itens parados</p>
      </div>

      {/* Tabs */}
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

      {/* Curva ABC */}
      {aba === 'curva' && (
        <div className="space-y-6 animate-fade-in">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-bold text-navy-700">Curva ABC — Itens por Valor Vendido</h2>
              <div className="flex gap-3 text-xs">
                <span className="badge" style={{ color: '#E67620', backgroundColor: '#FCEFE3' }}>Classe A (até 80%)</span>
                <span className="badge" style={{ color: '#1F4068', backgroundColor: '#E8EDF3' }}>Classe B (80-95%)</span>
                <span className="badge" style={{ color: '#6B7280', backgroundColor: '#F4F5F7' }}>Classe C (5% restantes)</span>
              </div>
            </div>

            {/* Add item */}
            <div className="flex gap-2 mb-4">
              <input
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                placeholder="Nome do item"
                className="input-field flex-1"
              />
              <input
                type="number"
                value={novoValor}
                onChange={(e) => setNovoValor(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                placeholder="Valor vendido (R$)"
                className="input-field w-44"
              />
              <button onClick={addItem} disabled={saving} className="btn-primary shrink-0">
                <Plus className="w-5 h-5" /> {saving ? '...' : 'Adicionar'}
              </button>
            </div>

            {curvaData.length > 0 ? (
              <>
                {/* Pareto chart */}
                <ResponsiveContainer width="100%" height={280} className="mb-6">
                  <BarChart data={curvaData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-30} textAnchor="end" height={60} interval={0} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'Valor' ? formatCurrency(value) : `${value}%`
                      }
                      contentStyle={{ borderRadius: '12px', border: '1px solid #C9D5E3', fontSize: '13px' }}
                    />
                    <Bar yAxisId="left" dataKey="valor_vendido" name="Valor" radius={[4, 4, 0, 0]}>
                      {curvaData.map((entry, idx) => (
                        <Cell key={idx} fill={classeColors[entry.classe]} />
                      ))}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="percentAcumulado" name="% Acumulado" stroke="#C81E3A" strokeWidth={2} dot={false} />
                    <ReferenceLine yAxisId="right" y={80} stroke="#E67620" strokeDasharray="5 5" label={{ value: '80%', fontSize: 10, fill: '#E67620' }} />
                    <ReferenceLine yAxisId="right" y={95} stroke="#1F4068" strokeDasharray="5 5" label={{ value: '95%', fontSize: 10, fill: '#1F4068' }} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-navy-100 text-left text-navy-400 text-xs uppercase">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Item</th>
                        <th className="py-2 px-3 text-right">Valor Vendido</th>
                        <th className="py-2 px-3 text-right">% Individual</th>
                        <th className="py-2 px-3 text-right">% Acumulado</th>
                        <th className="py-2 px-3 text-center">Classe</th>
                        <th className="py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {curvaData.map((item) => (
                        <tr key={item.ordem} className="border-b border-navy-50 hover:bg-surface transition-colors">
                          <td className="py-2.5 px-3 text-navy-400">{item.ordem}</td>
                          <td className="py-2.5 px-3 font-medium text-navy-700">{item.nome}</td>
                          <td className="py-2.5 px-3 text-right text-navy-600">{formatCurrency(item.valor_vendido)}</td>
                          <td className="py-2.5 px-3 text-right text-navy-500">{item.percentIndividual}%</td>
                          <td className="py-2.5 px-3 text-right text-navy-500">{item.percentAcumulado}%</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className="badge"
                              style={{ color: classeColors[item.classe], backgroundColor: `${classeColors[item.classe]}15` }}
                            >
                              {item.classe}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="text-navy-300 hover:text-status-critico transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-navy-200 mx-auto mb-3" />
                <p className="text-navy-400">Adicione itens com seus valores de venda para gerar a Curva ABC.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Giro de Estoque */}
      {aba === 'giro' && (
        <div className="card max-w-2xl animate-fade-in">
          <h2 className="text-lg font-serif font-bold text-navy-700 mb-1">Calculadora — Giro de Estoque</h2>
          <p className="text-navy-400 text-sm mb-6">Mede quantas vezes o estoque "virou" no período.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="label-field">CMV do período (R$)</label>
              <input type="number" value={cmv} onChange={(e) => setCmv(e.target.value)} className="input-field" placeholder="Ex: 450000" />
            </div>
            <div>
              <label className="label-field">Estoque Inicial (R$)</label>
              <input type="number" value={estIni} onChange={(e) => setEstIni(e.target.value)} className="input-field" placeholder="Ex: 120000" />
            </div>
            <div>
              <label className="label-field">Estoque Final (R$)</label>
              <input type="number" value={estFin} onChange={(e) => setEstFin(e.target.value)} className="input-field" placeholder="Ex: 100000" />
            </div>
          </div>

          {cmv && estIni && estFin ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Estoque Médio', value: formatCurrency(giroResult.estoqueMedio), color: '#1F4068' },
                { label: 'Giro de Estoque', value: `${giroResult.giro}x`, color: '#E67620' },
                { label: 'Cobertura (dias)', value: `${giroResult.cobertura} dias`, color: '#15803D' },
              ].map((r) => (
                <div key={r.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: `${r.color}10` }}>
                  <p className="text-xs text-navy-400 mb-1">{r.label}</p>
                  <p className="text-2xl font-serif font-bold" style={{ color: r.color }}>{r.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-navy-300 text-center py-6">Preencha os 3 campos para calcular.</p>
          )}

          <div className="mt-6 bg-surface rounded-xl p-4 text-sm text-navy-500 space-y-1">
            <p><strong>Fórmulas:</strong></p>
            <p>Estoque Médio = (Inicial + Final) ÷ 2</p>
            <p>Giro = CMV ÷ Estoque Médio</p>
            <p>Cobertura = 365 ÷ Giro</p>
          </div>
        </div>
      )}

      {/* Estoque Parado */}
      {aba === 'parado' && (
        <div className="card max-w-2xl animate-fade-in">
          <h2 className="text-lg font-serif font-bold text-navy-700 mb-1">Indicador — Estoque Parado</h2>
          <p className="text-navy-400 text-sm mb-6">Identifica o percentual do estoque sem saída nos últimos 90 dias.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="label-field">Valor de itens sem saída (90 dias)</label>
              <input type="number" value={valorParado} onChange={(e) => setValorParado(e.target.value)} className="input-field" placeholder="R$" />
            </div>
            <div>
              <label className="label-field">Valor total do estoque</label>
              <input type="number" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} className="input-field" placeholder="R$" />
            </div>
          </div>

          {valorParado && valorTotal ? (
            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: paradoResult > 20 ? '#FCE8EC' : paradoResult > 15 ? '#FBF3DC' : '#DCF2E5' }}>
              <p className="text-sm text-navy-500 mb-2">% Estoque Parado</p>
              <p
                className="text-4xl font-serif font-bold"
                style={{ color: paradoResult > 20 ? '#C81E3A' : paradoResult > 15 ? '#8A6404' : '#15803D' }}
              >
                {paradoResult}%
              </p>
              {paradoResult > 20 && (
                <p className="text-status-critico text-sm mt-3 flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Acima de 20% — defina um plano de saída para o estoque parado.
                </p>
              )}
              {paradoResult > 15 && paradoResult <= 20 && (
                <p className="text-status-atencao text-sm mt-3">Entre 15-20% — acompanhe de perto.</p>
              )}
              {paradoResult <= 15 && (
                <p className="text-status-saudavel text-sm mt-3">Dentro da meta (abaixo de 15%).</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-navy-300 text-center py-6">Preencha os valores para calcular.</p>
          )}

          <div className="mt-6 bg-surface rounded-xl p-4 text-sm text-navy-500">
            <p><strong>Fórmula:</strong> % Estoque Parado = (Valor parado ÷ Valor total) × 100</p>
            <p className="mt-1 text-navy-400">Meta de referência: abaixo de 15%–20%.</p>
          </div>
        </div>
      )}

      {/* Checklist */}
      {aba === 'checklist' && (
        <div className="animate-fade-in">
          <ChecklistPanel
            empresaId={empresa.id}
            pilar="estoque"
            items={checklistEstoque}
            onUpdate={refresh}
          />
        </div>
      )}
    </div>
  );
}
