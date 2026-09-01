import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { IDPGauge } from '@/components/IDPGauge';
import { LoadingState, ErrorState } from '@/components/LoadingState';
import { calcularIDPGeral, getFaixa, formatDateTime } from '@/lib/calculations';
import { Plus, X, Trash2, ClipboardList, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { PILARES } from '@/lib/constants';

export function DiagnosticoPage() {
  const { usuario, empresa } = useAuth();
  const { diagnosticos, refresh, loading, error } = useEmpresaData(empresa?.id ?? null);
  const [showForm, setShowForm] = useState(false);

  const isConsultor = usuario?.role === 'consultor';

  if (!empresa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ClipboardList className="w-12 h-12 text-navy-300 mb-4" />
        <p className="text-navy-400">Selecione uma empresa para gerenciar diagnósticos.</p>
      </div>
    );
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const diagnosticoAtual = diagnosticos[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy-700">IDP & Diagnóstico</h1>
          <p className="text-navy-400 text-sm mt-1">{empresa.nome}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-5 h-5" /> Novo diagnóstico
        </button>
      </div>

      {/* Current diagnosis */}
      {diagnosticoAtual ? (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-serif font-bold text-navy-700">Diagnóstico Atual</h2>
              <span className="text-sm text-navy-400">{formatDateTime(diagnosticoAtual.data)}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
              <div className="flex flex-col items-center md:border-r md:border-navy-50 md:pr-4">
                <IDPGauge value={calcularIDPGeral(diagnosticoAtual, empresa)} label="IDP Geral" size="lg" />
              </div>
              <div className="col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Estoque', nota: Number(diagnosticoAtual.nota_estoque) },
                  { label: 'Financeiro', nota: Number(diagnosticoAtual.nota_financeiro) },
                  { label: 'Comercial', nota: Number(diagnosticoAtual.nota_comercial) },
                  { label: 'Processos', nota: Number(diagnosticoAtual.nota_processos) },
                ].map((p) => (
                  <div key={p.label} className="flex flex-col items-center">
                    <IDPGauge value={p.nota} label={p.label} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {diagnosticoAtual.observacoes && (
              <div className="mt-6 pt-5 border-t border-navy-50">
                <p className="text-sm font-medium text-navy-600 mb-1">Observações</p>
                <p className="text-sm text-navy-500 leading-relaxed">{diagnosticoAtual.observacoes}</p>
              </div>
            )}
          </div>

          {/* History */}
          <div className="card">
            <h3 className="text-lg font-serif font-bold text-navy-700 mb-4">Histórico de Diagnósticos</h3>
            <div className="space-y-3">
              {diagnosticos.map((diag, idx) => {
                const idp = calcularIDPGeral(diag, empresa);
                const faixa = getFaixa(idp);
                const prev = diagnosticos[idx + 1];
                const diff = prev ? idp - calcularIDPGeral(prev, empresa) : null;
                return (
                  <div key={diag.id} className="flex items-center gap-4 rounded-xl bg-surface p-4 hover:bg-navy-50 transition-colors">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: faixa.bgColor }}>
                      <span className="font-serif font-bold text-lg" style={{ color: faixa.color }}>{idp.toFixed(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-700">{formatDateTime(diag.data)}</p>
                      <div className="flex gap-3 text-xs text-navy-400 mt-1">
                        <span>Est: {Number(diag.nota_estoque).toFixed(0)}</span>
                        <span>Fin: {Number(diag.nota_financeiro).toFixed(0)}</span>
                        <span>Com: {Number(diag.nota_comercial).toFixed(0)}</span>
                        <span>Proc: {Number(diag.nota_processos).toFixed(0)}</span>
                      </div>
                    </div>
                    {diff !== null && (
                      <span className={`flex items-center gap-0.5 text-sm font-semibold ${
                        diff > 0 ? 'text-status-saudavel' : diff < 0 ? 'text-status-critico' : 'text-navy-400'
                      }`}>
                        {diff > 0 ? <TrendingUp className="w-4 h-4" /> : diff < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    )}
                    {isConsultor && idx === 0 && (
                      <button
                        onClick={async () => {
                          if (confirm('Excluir este diagnóstico?')) {
                            const { error: delError } = await supabase.from('diagnosticos').delete().eq('id', diag.id);
                            if (delError) {
                              alert('Erro ao excluir diagnóstico. Tente novamente.');
                              return;
                            }
                            refresh();
                          }
                        }}
                        className="text-navy-300 hover:text-status-critico transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-serif font-bold text-navy-700 mb-2">Nenhum diagnóstico cadastrado</h2>
          <p className="text-navy-400 mb-6">Registre o primeiro diagnóstico para calcular o IDP da empresa.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-5 h-5" /> Criar primeiro diagnóstico
          </button>
        </div>
      )}

      {showForm && (
        <DiagnosticoForm
          empresaId={empresa.id}
          userId={usuario?.id ?? null}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); }}
        />
      )}
    </div>
  );
}

function DiagnosticoForm({
  empresaId,
  userId,
  onClose,
  onSaved,
}: {
  empresaId: string;
  userId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [notas, setNotas] = useState({ estoque: 50, financeiro: 50, comercial: 50, processos: 50 });
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const { error: insertError } = await supabase.from('diagnosticos').insert({
      empresa_id: empresaId,
      nota_estoque: Number(notas.estoque),
      nota_financeiro: Number(notas.financeiro),
      nota_comercial: Number(notas.comercial),
      nota_processos: Number(notas.processos),
      observacoes,
      criado_por: userId,
    });
    setSaving(false);
    if (insertError) {
      setSaveError('Erro ao salvar diagnóstico. Tente novamente.');
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card-hover max-w-xl w-full max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-50 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-serif font-bold text-navy-700">Novo Diagnóstico</h2>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <p className="text-sm text-navy-400">Atribua uma nota de 0 a 100 para cada pilar:</p>

          {PILARES.map((pilar) => {
            const key = pilar.key as keyof typeof notas;
            const nota = notas[key];
            const faixa = getFaixa(nota);
            return (
              <div key={pilar.key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-navy-600">{pilar.label}</label>
                  <div className="flex items-center gap-2">
                    <span className="badge" style={{ color: faixa.color, backgroundColor: faixa.bgColor }}>{faixa.label}</span>
                    <span className="text-lg font-serif font-bold w-10 text-right" style={{ color: faixa.color }}>{nota}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={nota}
                  onChange={(e) => setNotas({ ...notas, [key]: Number(e.target.value) })}
                  className="w-full accent-orange-400"
                  style={{ accentColor: faixa.color }}
                />
              </div>
            );
          })}

          <div>
            <label className="label-field">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="Notas sobre o momento atual da empresa, pontos de atenção, etc."
            />
          </div>

          {saveError && (
            <div className="bg-status-critico/10 text-status-critico text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {saveError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Salvando...' : 'Salvar diagnóstico'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
