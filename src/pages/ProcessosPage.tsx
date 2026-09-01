import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, X, FileText, CheckSquare, Server, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { ChecklistPanel } from '@/components/ChecklistPanel';
import { LoadingState, ErrorState } from '@/components/LoadingState';
import { supabase } from '@/lib/supabase';
import { ROTINAS_OPERACIONAIS, CRITERIOS_ERP } from '@/lib/constants';
import { formatDate } from '@/lib/calculations';
import type { Pop } from '@/types/database';

export function ProcessosPage() {
  const { empresa } = useAuth();
  const { pops, checklist, refresh, loading, error } = useEmpresaData(empresa?.id ?? null);
  const [aba, setAba] = useState<'pops' | 'rotinas' | 'erp' | 'checklist'>('pops');
  const [showPopForm, setShowPopForm] = useState(false);
  const [editingPop, setEditingPop] = useState<Pop | null>(null);
  const [erpEvaluations, setErpEvaluations] = useState<Record<number, boolean>>({});
  const [erpLoaded, setErpLoaded] = useState(false);

  const checklistProc = checklist.filter((i) => i.pilar === 'processos');

  useEffect(() => {
    if (!empresa) return;
    const stored = localStorage.getItem(`erp_eval_${empresa.id}`);
    if (stored) {
      try {
        setErpEvaluations(JSON.parse(stored));
      } catch {
        // ignore parse errors
      }
    }
    setErpLoaded(true);
  }, [empresa]);

  function toggleErp(idx: number) {
    if (!empresa) return;
    const updated = { ...erpEvaluations, [idx]: !erpEvaluations[idx] };
    setErpEvaluations(updated);
    localStorage.setItem(`erp_eval_${empresa.id}`, JSON.stringify(updated));
  }

  if (!empresa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Settings className="w-12 h-12 text-navy-300 mb-4" />
        <p className="text-navy-400">Selecione uma empresa.</p>
      </div>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  async function deletePop(id: string) {
    if (!confirm('Excluir este POP?')) return;
    const { error: delError } = await supabase.from('pops').delete().eq('id', id);
    if (delError) {
      alert('Erro ao excluir POP. Tente novamente.');
      return;
    }
    refresh();
  }

  const tabs = [
    { key: 'pops' as const, label: 'Biblioteca de POPs', icon: FileText },
    { key: 'rotinas' as const, label: 'Rotinas Operacionais', icon: CheckSquare },
    { key: 'erp' as const, label: 'Avaliação de ERP', icon: Server },
    { key: 'checklist' as const, label: 'Checklist', icon: Settings },
  ];

  const erpScore = Object.values(erpEvaluations).filter(Boolean).length;
  const erpPercent = Math.round((erpScore / CRITERIOS_ERP.length) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif font-bold text-navy-700">Processos & Tecnologia</h1>
        <p className="text-navy-400 text-sm mt-1">Pilar 4 — POPs, rotinas operacionais e avaliação de ERP</p>
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

      {/* POPs */}
      {aba === 'pops' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-navy-700">Procedimentos Operacionais Padrão</h2>
            <button onClick={() => { setEditingPop(null); setShowPopForm(true); }} className="btn-primary">
              <Plus className="w-5 h-5" /> Novo POP
            </button>
          </div>

          {pops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pops.map((pop) => (
                <div key={pop.id} className="card group hover:shadow-card-hover transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-navy-700">{pop.titulo}</h3>
                        {pop.responsavel && <p className="text-xs text-navy-400">Responsável: {pop.responsavel}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingPop(pop); setShowPopForm(true); }} className="btn-ghost text-sm p-1.5">Editar</button>
                      <button onClick={() => deletePop(pop.id)} className="text-navy-300 hover:text-status-critico p-1.5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {pop.descricao && <p className="text-sm text-navy-500 mb-2">{pop.descricao}</p>}
                  {pop.passo_a_passo && (
                    <div className="bg-surface rounded-xl p-3 mt-3">
                      <p className="text-xs font-medium text-navy-400 mb-1">Passo a passo</p>
                      <p className="text-sm text-navy-600 whitespace-pre-wrap">{pop.passo_a_passo}</p>
                    </div>
                  )}
                  <p className="text-xs text-navy-300 mt-3">Atualizado em {formatDate(pop.ultima_atualizacao)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <FileText className="w-12 h-12 text-navy-200 mx-auto mb-3" />
              <p className="text-navy-400">Nenhum POP cadastrado. Documente seus processos começando agora.</p>
            </div>
          )}

          {showPopForm && (
            <PopForm
              empresaId={empresa.id}
              pop={editingPop}
              onClose={() => { setShowPopForm(false); setEditingPop(null); }}
              onSaved={() => { setShowPopForm(false); setEditingPop(null); refresh(); }}
            />
          )}
        </div>
      )}

      {/* Rotinas */}
      {aba === 'rotinas' && (
        <div className="card max-w-3xl animate-fade-in">
          <h2 className="text-lg font-serif font-bold text-navy-700 mb-1">Checklist de Rotinas Operacionais</h2>
          <p className="text-navy-400 text-sm mb-6">Rotinas essenciais que devem ser executadas regularmente.</p>

          <div className="space-y-3">
            {ROTINAS_OPERACIONAIS.map((rotina, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-xl bg-surface p-4">
                <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4 text-navy-500" />
                </div>
                <p className="text-sm text-navy-600 flex-1">{rotina}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-orange-50 rounded-xl p-4">
            <p className="text-sm text-navy-600">
              <strong>Dica:</strong> Crie um POP na aba "Biblioteca de POPs" para cada uma destas rotinas,
              detalhando o passo a passo e o responsável.
            </p>
          </div>
        </div>
      )}

      {/* Avaliação ERP */}
      {aba === 'erp' && (
        <div className="card max-w-2xl animate-fade-in">
          <h2 className="text-lg font-serif font-bold text-navy-700 mb-1">Critérios de Avaliação de ERP</h2>
          <p className="text-navy-400 text-sm mb-6">Avalie seu sistema de gestão atual contra os critérios essenciais.</p>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-navy-600">Pontuação: {erpScore}/{CRITERIOS_ERP.length}</span>
              <span className="text-sm font-semibold" style={{ color: erpPercent >= 70 ? '#15803D' : erpPercent >= 40 ? '#8A6404' : '#C81E3A' }}>
                {erpPercent}% atendido
              </span>
            </div>
            <div className="h-3 rounded-full bg-navy-50 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${erpPercent}%`,
                  backgroundColor: erpPercent >= 70 ? '#15803D' : erpPercent >= 40 ? '#8A6404' : '#C81E3A',
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {CRITERIOS_ERP.map((criterio, idx) => (
              <button
                key={idx}
                onClick={() => toggleErp(idx)}
                className={`w-full flex items-center gap-3 rounded-xl p-4 transition-all ${
                  erpEvaluations[idx] ? 'bg-status-saudavel/10 border border-status-saudavel/30' : 'bg-surface border border-transparent hover:bg-navy-50'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    erpEvaluations[idx] ? 'bg-status-saudavel border-status-saudavel' : 'border-navy-200'
                  }`}
                >
                  {erpEvaluations[idx] && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className={`text-sm text-left flex-1 ${erpEvaluations[idx] ? 'text-navy-700 font-medium' : 'text-navy-500'}`}>
                  {criterio}
                </span>
              </button>
            ))}
          </div>

          {erpPercent < 70 && erpLoaded && (
            <div className="mt-6 bg-status-atencao/10 border border-status-atencao/30 rounded-xl p-4">
              <p className="text-sm text-status-atencao">
                Seu ERP atual atende {erpPercent}% dos critérios. Considere avaliar sistemas alternativos
                que cubram as lacunas identificadas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      {aba === 'checklist' && (
        <div className="animate-fade-in">
          <ChecklistPanel empresaId={empresa.id} pilar="processos" items={checklistProc} onUpdate={refresh} />
        </div>
      )}
    </div>
  );
}

function PopForm({
  empresaId,
  pop,
  onClose,
  onSaved,
}: {
  empresaId: string;
  pop: Pop | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState(pop?.titulo ?? '');
  const [descricao, setDescricao] = useState(pop?.descricao ?? '');
  const [passoAPasso, setPassoAPasso] = useState(pop?.passo_a_passo ?? '');
  const [responsavel, setResponsavel] = useState(pop?.responsavel ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const payload = {
      empresa_id: empresaId,
      titulo,
      descricao,
      passo_a_passo: passoAPasso,
      responsavel: responsavel || null,
      ultima_atualizacao: new Date().toISOString().split('T')[0],
    };
    const { error: upsertError } = pop
      ? await supabase.from('pops').update(payload).eq('id', pop.id)
      : await supabase.from('pops').insert(payload);
    setSaving(false);
    if (upsertError) {
      setSaveError('Erro ao salvar POP. Tente novamente.');
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card-hover max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-50 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-serif font-bold text-navy-700">{pop ? 'Editar POP' : 'Novo POP'}</h2>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label-field">Título *</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="input-field" placeholder="Ex: Recebimento de mercadoria" />
          </div>
          <div>
            <label className="label-field">Descrição do processo</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className="input-field resize-none" placeholder="Resumo do que o processo faz" />
          </div>
          <div>
            <label className="label-field">Passo a passo</label>
            <textarea value={passoAPasso} onChange={(e) => setPassoAPasso(e.target.value)} rows={5} className="input-field resize-none" placeholder="1. Conferir nota fiscal&#10;2. Comparar com pedido&#10;3. ..." />
          </div>
          <div>
            <label className="label-field">Responsável</label>
            <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className="input-field" placeholder="Quem executa" />
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
