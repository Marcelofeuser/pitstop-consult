import { useState, useMemo } from 'react';
import { TrendingUp, Plus, Trash2, Users, Target, DollarSign, X, Building2, Filter, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { ChecklistPanel } from '@/components/ChecklistPanel';
import { LoadingState, ErrorState } from '@/components/LoadingState';
import { supabase } from '@/lib/supabase';
import { calcularIndicadoresComercial, formatCurrency, formatDate } from '@/lib/calculations';
import type { OficinaParceira, Orcamento } from '@/types/database';

export function ComercialPage() {
  const { empresa } = useAuth();
  const { oficinas, orcamentos, checklist, refresh, loading, error } = useEmpresaData(empresa?.id ?? null);
  const [aba, setAba] = useState<'indicadores' | 'oficinas' | 'orcamentos' | 'checklist'>('indicadores');
  const [showOficinaForm, setShowOficinaForm] = useState(false);
  const [showOrcamentoForm, setShowOrcamentoForm] = useState(false);
  const [editingOficina, setEditingOficina] = useState<OficinaParceira | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativa' | 'inativa'>('all');
  const [sortBy, setSortBy] = useState<'nome' | 'valor' | 'ultima'>('nome');

  const checklistCom = checklist.filter((i) => i.pilar === 'comercial');
  const indicadores = useMemo(
    () => calcularIndicadoresComercial(orcamentos, oficinas),
    [orcamentos, oficinas]
  );

  const trintaDias = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const oficinasFiltradas = useMemo(() => {
    let lista = [...oficinas];
    if (filterStatus === 'ativa') {
      lista = lista.filter((o) => o.ultima_compra && new Date(o.ultima_compra) >= trintaDias);
    } else if (filterStatus === 'inativa') {
      lista = lista.filter((o) => !o.ultima_compra || new Date(o.ultima_compra) < trintaDias);
    }
    if (sortBy === 'nome') lista.sort((a, b) => a.nome.localeCompare(b.nome));
    else if (sortBy === 'valor') lista.sort((a, b) => Number(b.valor_historico) - Number(a.valor_historico));
    else lista.sort((a, b) => (b.ultima_compra ?? '').localeCompare(a.ultima_compra ?? ''));
    return lista;
  }, [oficinas, filterStatus, sortBy, trintaDias]);

  if (!empresa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <TrendingUp className="w-12 h-12 text-navy-300 mb-4" />
        <p className="text-navy-400">Selecione uma empresa.</p>
      </div>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  async function deleteOficina(id: string) {
    if (!confirm('Excluir esta oficina parceira?')) return;
    const { error: delError } = await supabase.from('oficinas_parceiras').delete().eq('id', id);
    if (delError) {
      alert('Erro ao excluir oficina. Tente novamente.');
      return;
    }
    refresh();
  }

  async function deleteOrcamento(id: string) {
    if (!confirm('Excluir este orçamento?')) return;
    const { error: delError } = await supabase.from('orcamentos').delete().eq('id', id);
    if (delError) {
      alert('Erro ao excluir orçamento. Tente novamente.');
      return;
    }
    refresh();
  }

  async function updateOrcStatus(orc: Orcamento, newStatus: 'enviado' | 'convertido' | 'perdido') {
    const { error: updateError } = await supabase.from('orcamentos').update({ status: newStatus }).eq('id', orc.id);
    if (updateError) {
      alert('Erro ao atualizar status. Tente novamente.');
      return;
    }
    refresh();
  }

  const tabs = [
    { key: 'indicadores' as const, label: 'Indicadores', icon: Target },
    { key: 'oficinas' as const, label: 'Oficinas Parceiras', icon: Users },
    { key: 'orcamentos' as const, label: 'Funil de Orçamentos', icon: DollarSign },
    { key: 'checklist' as const, label: 'Checklist', icon: TrendingUp },
  ];

  const orcamentosPorStatus = {
    enviado: orcamentos.filter((o) => o.status === 'enviado'),
    convertido: orcamentos.filter((o) => o.status === 'convertido'),
    perdido: orcamentos.filter((o) => o.status === 'perdido'),
  };

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    enviado: { bg: '#FBF3DC', text: '#8A6404', label: 'Enviado' },
    convertido: { bg: '#DCF2E5', text: '#15803D', label: 'Convertido' },
    perdido: { bg: '#FCE8EC', text: '#C81E3A', label: 'Perdido' },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-bold text-navy-700">Comercial</h1>
        <p className="text-navy-400 text-sm mt-1">Pilar 3 — CRM de oficinas, funil de orçamentos e indicadores</p>
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

      {/* Indicadores */}
      {aba === 'indicadores' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Taxa de Conversão', value: `${indicadores.taxaConversao}%`, icon: Target, color: '#E67620', bg: '#FCEFE3' },
              { label: 'Ticket Médio', value: formatCurrency(indicadores.ticketMedio), icon: DollarSign, color: '#15803D', bg: '#DCF2E5' },
              { label: 'Oficinas Ativas', value: `${indicadores.oficinasAtivas}/${indicadores.totalOficinas}`, icon: Users, color: '#1F4068', bg: '#E8EDF3' },
              { label: 'Orçamentos Convertidos', value: `${indicadores.convertidos}/${indicadores.totalOrcamentos}`, icon: TrendingUp, color: '#8A6404', bg: '#FBF3DC' },
            ].map((ind) => {
              const Icon = ind.icon;
              return (
                <div key={ind.label} className="card">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: ind.bg }}>
                    <Icon className="w-6 h-6" style={{ color: ind.color }} />
                  </div>
                  <p className="text-sm text-navy-400 mb-1">{ind.label}</p>
                  <p className="text-2xl font-serif font-bold text-navy-700">{ind.value}</p>
                </div>
              );
            })}
          </div>

          {/* Funil visual */}
          {orcamentos.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-serif font-bold text-navy-700 mb-4">Funil de Orçamentos</h3>
              <div className="space-y-3">
                {(['enviado', 'convertido', 'perdido'] as const).map((status) => {
                  const items = orcamentosPorStatus[status];
                  const maxValue = Math.max(...Object.values(orcamentosPorStatus).map((arr) => arr.length), 1);
                  const width = (items.length / maxValue) * 100;
                  const totalValor = items.reduce((sum, o) => sum + Number(o.valor), 0);
                  return (
                    <div key={status} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-navy-600 w-24 shrink-0">{statusColors[status].label}</span>
                      <div className="flex-1">
                        <div
                          className="h-10 rounded-xl flex items-center px-4 transition-all"
                          style={{
                            width: `${Math.max(width, 15)}%`,
                            backgroundColor: statusColors[status].bg,
                            color: statusColors[status].text,
                          }}
                        >
                          <span className="text-sm font-semibold">{items.length} orçamento(s)</span>
                        </div>
                      </div>
                      <span className="text-sm text-navy-500 w-28 text-right shrink-0">{formatCurrency(totalValor)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Oficinas Parceiras */}
      {aba === 'oficinas' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-navy-400" />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'ativa' | 'inativa')} className="input-field py-2 text-sm w-auto">
                <option value="all">Todas</option>
                <option value="ativa">Ativas (30 dias)</option>
                <option value="inativa">Inativas</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'nome' | 'valor' | 'ultima')} className="input-field py-2 text-sm w-auto">
                <option value="nome">Ordenar: Nome</option>
                <option value="valor">Ordenar: Valor histórico</option>
                <option value="ultima">Ordenar: Última compra</option>
              </select>
            </div>
            <button onClick={() => { setEditingOficina(null); setShowOficinaForm(true); }} className="btn-primary">
              <Plus className="w-5 h-5" /> Nova oficina
            </button>
          </div>

          {oficinasFiltradas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {oficinasFiltradas.map((of) => {
                const ativa = of.ultima_compra && new Date(of.ultima_compra) >= trintaDias;
                return (
                  <div key={of.id} className="card group hover:shadow-card-hover transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-navy-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-navy-700">{of.nome}</h3>
                          {of.contato && <p className="text-xs text-navy-400">{of.contato}</p>}
                        </div>
                      </div>
                      <span className={`badge ${ativa ? 'bg-status-saudavel/10 text-status-saudavel' : 'bg-navy-50 text-navy-400'}`}>
                        {ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-navy-500">
                      <p>Última compra: <span className="text-navy-700 font-medium">{formatDate(of.ultima_compra)}</span></p>
                      <p>Valor histórico: <span className="text-navy-700 font-medium">{formatCurrency(of.valor_historico)}</span></p>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-navy-50">
                      <button onClick={() => { setEditingOficina(of); setShowOficinaForm(true); }} className="btn-ghost text-sm">Editar</button>
                      <button onClick={() => deleteOficina(of.id)} className="btn-ghost text-sm text-status-critico hover:bg-status-critico/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Users className="w-12 h-12 text-navy-200 mx-auto mb-3" />
              <p className="text-navy-400">Nenhuma oficina cadastrada. Clique em "Nova oficina" para começar.</p>
            </div>
          )}

          {showOficinaForm && (
            <OficinaForm
              empresaId={empresa.id}
              oficina={editingOficina}
              onClose={() => { setShowOficinaForm(false); setEditingOficina(null); }}
              onSaved={() => { setShowOficinaForm(false); setEditingOficina(null); refresh(); }}
            />
          )}
        </div>
      )}

      {/* Orçamentos */}
      {aba === 'orcamentos' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-navy-700">Funil de Orçamentos</h2>
            <button onClick={() => setShowOrcamentoForm(true)} className="btn-primary">
              <Plus className="w-5 h-5" /> Novo orçamento
            </button>
          </div>

          {orcamentos.length > 0 ? (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-left text-navy-400 text-xs uppercase">
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-3">Cliente</th>
                    <th className="py-2 px-3 text-right">Valor</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {orcamentos.map((orc) => (
                    <tr key={orc.id} className="border-b border-navy-50 hover:bg-surface">
                      <td className="py-2.5 px-3 text-navy-600">{formatDate(orc.data)}</td>
                      <td className="py-2.5 px-3 font-medium text-navy-700">{orc.cliente || '—'}</td>
                      <td className="py-2.5 px-3 text-right text-navy-600">{formatCurrency(orc.valor)}</td>
                      <td className="py-2.5 px-3 text-center">
                        <select
                          value={orc.status}
                          onChange={(e) => updateOrcStatus(orc, e.target.value as 'enviado' | 'convertido' | 'perdido')}
                          className="text-xs font-semibold rounded-lg px-2 py-1 border-0 cursor-pointer"
                          style={{ color: statusColors[orc.status].text, backgroundColor: statusColors[orc.status].bg }}
                        >
                          <option value="enviado">Enviado</option>
                          <option value="convertido">Convertido</option>
                          <option value="perdido">Perdido</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button onClick={() => deleteOrcamento(orc.id)} className="text-navy-300 hover:text-status-critico transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card text-center py-12">
              <DollarSign className="w-12 h-12 text-navy-200 mx-auto mb-3" />
              <p className="text-navy-400">Nenhum orçamento registrado.</p>
            </div>
          )}

          {showOrcamentoForm && (
            <OrcamentoForm
              empresaId={empresa.id}
              onClose={() => setShowOrcamentoForm(false)}
              onSaved={() => { setShowOrcamentoForm(false); refresh(); }}
            />
          )}
        </div>
      )}

      {/* Checklist */}
      {aba === 'checklist' && (
        <div className="animate-fade-in">
          <ChecklistPanel empresaId={empresa.id} pilar="comercial" items={checklistCom} onUpdate={refresh} />
        </div>
      )}
    </div>
  );
}

function OficinaForm({
  empresaId,
  oficina,
  onClose,
  onSaved,
}: {
  empresaId: string;
  oficina: OficinaParceira | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(oficina?.nome ?? '');
  const [contato, setContato] = useState(oficina?.contato ?? '');
  const [ultimaCompra, setUltimaCompra] = useState(oficina?.ultima_compra ?? '');
  const [valorHistorico, setValorHistorico] = useState(oficina?.valor_historico?.toString() ?? '0');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const payload = {
      empresa_id: empresaId,
      nome,
      contato: contato || null,
      ultima_compra: ultimaCompra || null,
      valor_historico: Number(valorHistorico),
    };
    const { error: upsertError } = oficina
      ? await supabase.from('oficinas_parceiras').update(payload).eq('id', oficina.id)
      : await supabase.from('oficinas_parceiras').insert(payload);
    setSaving(false);
    if (upsertError) {
      setSaveError('Erro ao salvar oficina. Tente novamente.');
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card-hover max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-50">
          <h2 className="text-lg font-serif font-bold text-navy-700">{oficina ? 'Editar oficina' : 'Nova oficina parceira'}</h2>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label-field">Nome *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required className="input-field" placeholder="Oficina do João" />
          </div>
          <div>
            <label className="label-field">Contato</label>
            <input value={contato} onChange={(e) => setContato(e.target.value)} className="input-field" placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="label-field">Data da última compra</label>
            <input type="date" value={ultimaCompra} onChange={(e) => setUltimaCompra(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">Valor histórico de compras (R$)</label>
            <input type="number" value={valorHistorico} onChange={(e) => setValorHistorico(e.target.value)} className="input-field" />
          </div>
          {saveError && (
            <div className="bg-status-critico/10 text-status-critico text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {saveError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrcamentoForm({ empresaId, onClose, onSaved }: { empresaId: string; onClose: () => void; onSaved: () => void }) {
  const [cliente, setCliente] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'enviado' | 'convertido' | 'perdido'>('enviado');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const { error: insertError } = await supabase.from('orcamentos').insert({
      empresa_id: empresaId,
      cliente: cliente || null,
      valor: Number(valor),
      data,
      status,
    });
    setSaving(false);
    if (insertError) {
      setSaveError('Erro ao registrar orçamento. Tente novamente.');
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card-hover max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-50">
          <h2 className="text-lg font-serif font-bold text-navy-700">Novo Orçamento</h2>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label-field">Cliente</label>
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} className="input-field" placeholder="Nome do cliente" />
          </div>
          <div>
            <label className="label-field">Valor (R$) *</label>
            <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} required className="input-field" placeholder="Ex: 1500" />
          </div>
          <div>
            <label className="label-field">Data *</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required className="input-field" />
          </div>
          <div>
            <label className="label-field">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as 'enviado' | 'convertido' | 'perdido')} className="input-field">
              <option value="enviado">Enviado</option>
              <option value="convertido">Convertido</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>
          {saveError && (
            <div className="bg-status-critico/10 text-status-critico text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {saveError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
