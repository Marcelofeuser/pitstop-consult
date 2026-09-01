import { useState } from 'react';
import { Calendar, Plus, Trash2, X, User, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { LoadingState, ErrorState } from '@/components/LoadingState';
import { supabase } from '@/lib/supabase';
import { FASES_PLANO } from '@/lib/constants';
import { formatDate } from '@/lib/calculations';
import type { Plano90Dias } from '@/types/database';
import type { PageKey } from '@/components/AppLayout';

interface PlanoPageProps {
  onNavigate: (page: PageKey) => void;
}

export function PlanoPage({ onNavigate }: PlanoPageProps) {
  const { empresa } = useAuth();
  const { plano, refresh, loading, error } = useEmpresaData(empresa?.id ?? null);
  const [showForm, setShowForm] = useState(false);
  const [formFase, setFormFase] = useState<1 | 2 | 3>(1);

  if (!empresa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Calendar className="w-12 h-12 text-navy-300 mb-4" />
        <p className="text-navy-400">Selecione uma empresa.</p>
      </div>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  async function deleteAcao(id: string) {
    if (!confirm('Excluir esta ação?')) return;
    const { error: delError } = await supabase.from('plano_90_dias').delete().eq('id', id);
    if (delError) {
      alert('Erro ao excluir ação. Tente novamente.');
      return;
    }
    refresh();
  }

  async function updateStatus(item: Plano90Dias, newStatus: 'pendente' | 'em_andamento' | 'concluido') {
    const { error: updateError } = await supabase.from('plano_90_dias').update({ status: newStatus }).eq('id', item.id);
    if (updateError) {
      alert('Erro ao atualizar status. Tente novamente.');
      return;
    }
    refresh();
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pendente: { label: 'Pendente', color: '#6B7280', bg: '#F4F5F7' },
    em_andamento: { label: 'Em andamento', color: '#8A6404', bg: '#FBF3DC' },
    concluido: { label: 'Concluído', color: '#15803D', bg: '#DCF2E5' },
  };

  const faseColors: Record<number, { border: string; header: string; accent: string }> = {
    1: { border: 'border-t-orange-400', header: 'bg-orange-50', accent: '#E67620' },
    2: { border: 'border-t-navy-500', header: 'bg-navy-50', accent: '#1F4068' },
    3: { border: 'border-t-status-saudavel', header: 'bg-status-saudavel/10', accent: '#15803D' },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy-700">Plano de 90 Dias</h1>
          <p className="text-navy-400 text-sm mt-1">Acompanhe as ações em 3 fases do método Pit Stop</p>
        </div>
        <button onClick={() => { setFormFase(1); setShowForm(true); }} className="btn-primary">
          <Plus className="w-5 h-5" /> Nova ação
        </button>
      </div>

      {/* Progress overview */}
      {plano.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FASES_PLANO.map((fase) => {
            const items = plano.filter((p) => p.fase === fase.fase);
            const concluidos = items.filter((p) => p.status === 'concluido').length;
            const percent = items.length > 0 ? Math.round((concluidos / items.length) * 100) : 0;
            return (
              <div key={fase.fase} className="card">
                <p className="text-sm text-navy-400 mb-1">{fase.titulo.split('—')[0].trim()}</p>
                <p className="text-2xl font-serif font-bold text-navy-700">{percent}%</p>
                <div className="h-2 rounded-full bg-navy-50 overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percent}%`, backgroundColor: faseColors[fase.fase].accent }}
                  />
                </div>
                <p className="text-xs text-navy-400 mt-2">{concluidos}/{items.length} ações concluídas</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Kanban — 3 columns by fase */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {FASES_PLANO.map((fase) => {
          const items = plano.filter((p) => p.fase === fase.fase);
          const config = faseColors[fase.fase];
          const faseConcluida = items.length > 0 && items.every((p) => p.status === 'concluido');

          return (
            <div key={fase.fase} className={`card border-t-4 ${config.border} flex flex-col`}>
              <div className={`rounded-xl ${config.header} px-4 py-3 mb-4`}>
                <h2 className="font-serif font-bold text-navy-700 text-sm leading-tight">{fase.titulo}</h2>
                <p className="text-xs text-navy-400 mt-1">{items.length} ação(ões)</p>
              </div>

              <div className="space-y-3 flex-1">
                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-navy-200 mx-auto mb-2" />
                    <p className="text-sm text-navy-300">Nenhuma ação nesta fase.</p>
                    <button
                      onClick={() => { setFormFase(fase.fase); setShowForm(true); }}
                      className="btn-ghost text-sm mt-2 text-orange-600"
                    >
                      <Plus className="w-4 h-4" /> Adicionar ação
                    </button>
                  </div>
                ) : (
                  items.map((item) => {
                    const st = statusConfig[item.status];
                    const prazoPassado = item.prazo && new Date(item.prazo + 'T00:00:00') < new Date() && item.status !== 'concluido';
                    return (
                      <div key={item.id} className="group rounded-xl border border-navy-50 p-4 hover:shadow-card transition-shadow bg-white">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-navy-700 flex-1">{item.acao}</p>
                          <button
                            onClick={() => deleteAcao(item.id)}
                            className="md:opacity-0 md:group-hover:opacity-100 text-navy-300 hover:text-status-critico transition-all shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {item.responsavel && (
                          <div className="flex items-center gap-1.5 text-xs text-navy-400 mb-2">
                            <User className="w-3 h-3" /> {item.responsavel}
                          </div>
                        )}

                        {item.prazo && (
                          <div className={`flex items-center gap-1.5 text-xs mb-2 ${prazoPassado ? 'text-status-critico' : 'text-navy-400'}`}>
                            <Clock className="w-3 h-3" />
                            Prazo: {formatDate(item.prazo)}
                            {prazoPassado && <AlertCircle className="w-3 h-3" />}
                          </div>
                        )}

                        <select
                          value={item.status}
                          onChange={(e) => updateStatus(item, e.target.value as 'pendente' | 'em_andamento' | 'concluido')}
                          className="text-xs font-semibold rounded-lg px-2.5 py-1.5 border-0 cursor-pointer w-full"
                          style={{ color: st.color, backgroundColor: st.bg }}
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_andamento">Em andamento</option>
                          <option value="concluido">Concluído</option>
                        </select>
                      </div>
                    );
                  })
                )}
              </div>

              {/* CTA ao final da fase */}
              {faseConcluida && (
                <div className="mt-4 bg-orange-50 rounded-xl p-3 text-center">
                  <p className="text-sm text-orange-700 font-medium mb-2">Fase concluída!</p>
                  <button
                    onClick={() => onNavigate('diagnostico')}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    Recalcular IDP
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <PlanoForm
          empresaId={empresa.id}
          faseInicial={formFase}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); }}
        />
      )}
    </div>
  );
}

function PlanoForm({
  empresaId,
  faseInicial,
  onClose,
  onSaved,
}: {
  empresaId: string;
  faseInicial: 1 | 2 | 3;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fase, setFase] = useState<1 | 2 | 3>(faseInicial);
  const [acao, setAcao] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [prazo, setPrazo] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const tituloFase = FASES_PLANO.find((f) => f.fase === fase)?.titulo ?? '';
    const { error: insertError } = await supabase.from('plano_90_dias').insert({
      empresa_id: empresaId,
      fase,
      titulo_fase: tituloFase,
      acao,
      responsavel: responsavel || null,
      prazo: prazo || null,
    });
    setSaving(false);
    if (insertError) {
      setSaveError('Erro ao adicionar ação. Tente novamente.');
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card-hover max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-50">
          <h2 className="text-lg font-serif font-bold text-navy-700">Nova Ação</h2>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label-field">Fase *</label>
            <select value={fase} onChange={(e) => setFase(Number(e.target.value) as 1 | 2 | 3)} className="input-field">
              {FASES_PLANO.map((f) => (
                <option key={f.fase} value={f.fase}>{f.titulo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Ação *</label>
            <textarea value={acao} onChange={(e) => setAcao(e.target.value)} required rows={2} className="input-field resize-none" placeholder="Descrição da ação" />
          </div>
          <div>
            <label className="label-field">Responsável</label>
            <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="input-field" placeholder="Quem vai executar" />
          </div>
          <div>
            <label className="label-field">Prazo</label>
            <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="input-field" />
          </div>
          {saveError && (
            <div className="bg-status-critico/10 text-status-critico text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {saveError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Adicionar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
