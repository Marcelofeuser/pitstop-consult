import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Building2, Plus, MapPin, Phone, Calendar, Trash2, X, Users, AlertTriangle } from 'lucide-react';
import type { Empresa, Usuario, Diagnostico } from '@/types/database';
import { calcularIDPGeral, getFaixa, formatCurrency, formatDateTime } from '@/lib/calculations';

export function EmpresasPage() {
  const { usuario, empresas, refreshProfile, setSelectedEmpresaId } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [empresaUsers, setEmpresaUsers] = useState<Record<string, Usuario[]>>({});
  const [empresaDiags, setEmpresaDiags] = useState<Record<string, Diagnostico[]>>({});
  const [showUserModal, setShowUserModal] = useState<{ empresa: Empresa; users: Usuario[] } | null>(null);

  useEffect(() => {
    async function fetchExtra() {
      const usersMap: Record<string, Usuario[]> = {};
      const diagsMap: Record<string, Diagnostico[]> = {};

      for (const emp of empresas) {
        const [{ data: users }, { data: diags }] = await Promise.all([
          supabase.from('usuarios').select('*').eq('empresa_id', emp.id),
          supabase.from('diagnosticos').select('*').eq('empresa_id', emp.id).order('data', { ascending: false }).limit(1),
        ]);
        if (users) usersMap[emp.id] = users as Usuario[];
        if (diags) diagsMap[emp.id] = diags as Diagnostico[];
      }
      setEmpresaUsers(usersMap);
      setEmpresaDiags(diagsMap);
    }
    if (empresas.length > 0) fetchExtra();
  }, [empresas]);

  async function deleteEmpresa(emp: Empresa) {
    if (!confirm(`Excluir "${emp.nome}"? Todos os dados desta empresa serão removidos.`)) return;
    const { error: delError } = await supabase.from('empresas').delete().eq('id', emp.id);
    if (delError) {
      alert('Erro ao excluir empresa. Tente novamente.');
      return;
    }
    refreshProfile();
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy-700">Empresas</h1>
          <p className="text-navy-400 text-sm mt-1">{empresas.length} cliente(s) cadastrado(s)</p>
        </div>
        <button onClick={() => { setEditingEmpresa(null); setShowForm(true); }} className="btn-primary">
          <Plus className="w-5 h-5" /> Nova empresa
        </button>
      </div>

      {empresas.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-navy-50 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-navy-400" />
          </div>
          <h2 className="text-xl font-serif font-bold text-navy-700 mb-2">Nenhuma empresa cadastrada</h2>
          <p className="text-navy-400 mb-6">Crie seu primeiro cliente para começar.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-5 h-5" /> Cadastrar empresa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {empresas.map((emp) => {
            const diag = empresaDiags[emp.id]?.[0];
            const idp = diag ? calcularIDPGeral(diag, emp) : null;
            const faixa = idp !== null ? getFaixa(idp) : null;
            const users = empresaUsers[emp.id] ?? [];

            return (
              <div key={emp.id} className="card group hover:shadow-card-hover transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-navy-700 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-navy-700 text-lg leading-tight">{emp.nome}</h3>
                      <p className="text-xs text-navy-400 mt-0.5">
                        Cadastrado em {formatDateTime(emp.data_cadastro)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEmpresa(emp)}
                    className="opacity-0 group-hover:opacity-100 text-navy-300 hover:text-status-critico transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  {emp.cidade && (
                    <div className="flex items-center gap-2 text-navy-500">
                      <MapPin className="w-4 h-4 text-navy-300" /> {emp.cidade}
                      {emp.regiao ? ` · ${emp.regiao}` : ''}
                    </div>
                  )}
                  {emp.contato && (
                    <div className="flex items-center gap-2 text-navy-500">
                      <Phone className="w-4 h-4 text-navy-300" /> {emp.contato}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-navy-500">
                    <Users className="w-4 h-4 text-navy-300" /> {users.length} usuário(s)
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-navy-50">
                  {idp !== null && faixa ? (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-navy-400">IDP Atual</span>
                        <span className="text-2xl font-serif font-bold" style={{ color: faixa.color }}>
                          {idp.toFixed(0)}
                        </span>
                      </div>
                      <span className="badge" style={{ color: faixa.color, backgroundColor: faixa.bgColor }}>
                        {faixa.label}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-navy-300">Sem diagnóstico</span>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingEmpresa(emp); setShowForm(true); }}
                      className="btn-ghost text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => { setShowUserModal({ empresa: emp, users }); }}
                      className="btn-ghost text-sm"
                    >
                      Usuários
                    </button>
                    <button
                      onClick={() => setSelectedEmpresaId(emp.id)}
                      className="btn-primary text-sm px-3 py-1.5"
                    >
                      Acessar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <EmpresaForm
          empresa={editingEmpresa}
          consultorId={usuario?.id ?? null}
          onClose={() => { setShowForm(false); setEditingEmpresa(null); }}
          onSaved={() => { setShowForm(false); setEditingEmpresa(null); refreshProfile(); }}
        />
      )}

      {showUserModal && (
        <UserModal
          empresa={showUserModal.empresa}
          users={showUserModal.users}
          onClose={() => setShowUserModal(null)}
          onUpdated={async () => {
            const { data } = await supabase
              .from('usuarios')
              .select('*')
              .eq('empresa_id', showUserModal.empresa.id);
            setShowUserModal({ empresa: showUserModal.empresa, users: (data as Usuario[]) ?? [] });
          }}
        />
      )}
    </div>
  );
}

function EmpresaForm({
  empresa,
  consultorId,
  onClose,
  onSaved,
}: {
  empresa: Empresa | null;
  consultorId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(empresa?.nome ?? '');
  const [cidade, setCidade] = useState(empresa?.cidade ?? '');
  const [regiao, setRegiao] = useState(empresa?.regiao ?? '');
  const [contato, setContato] = useState(empresa?.contato ?? '');
  const [pesoEstoque, setPesoEstoque] = useState(empresa?.peso_estoque ?? 30);
  const [pesoFinanceiro, setPesoFinanceiro] = useState(empresa?.peso_financeiro ?? 30);
  const [pesoComercial, setPesoComercial] = useState(empresa?.peso_comercial ?? 20);
  const [pesoProcessos, setPesoProcessos] = useState(empresa?.peso_processos ?? 20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      nome,
      cidade: cidade || null,
      regiao: regiao || null,
      contato: contato || null,
      consultor_id: consultorId,
      peso_estoque: Number(pesoEstoque),
      peso_financeiro: Number(pesoFinanceiro),
      peso_comercial: Number(pesoComercial),
      peso_processos: Number(pesoProcessos),
    };

    const { error: err } = empresa
      ? await supabase.from('empresas').update(payload).eq('id', empresa.id)
      : await supabase.from('empresas').insert(payload);

    if (err) {
      setError(err.message);
      setSaving(false);
    } else {
      onSaved();
    }
  }

  const totalPesos = Number(pesoEstoque) + Number(pesoFinanceiro) + Number(pesoComercial) + Number(pesoProcessos);

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card-hover max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-50 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-serif font-bold text-navy-700">
            {empresa ? 'Editar empresa' : 'Nova empresa'}
          </h2>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="label-field">Nome da empresa *</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required className="input-field" placeholder="Auto Peças João Ltda" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Cidade</label>
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} className="input-field" placeholder="São Paulo" />
            </div>
            <div>
              <label className="label-field">Região</label>
              <input value={regiao} onChange={(e) => setRegiao(e.target.value)} className="input-field" placeholder="Zona Sul" />
            </div>
          </div>
          <div>
            <label className="label-field">Contato</label>
            <input value={contato} onChange={(e) => setContato(e.target.value)} className="input-field" placeholder="(11) 99999-9999" />
          </div>

          <div className="pt-2">
            <p className="text-sm font-medium text-navy-600 mb-3">Pesos do IDP (%)</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Estoque', value: pesoEstoque, set: setPesoEstoque },
                { label: 'Financeiro', value: pesoFinanceiro, set: setPesoFinanceiro },
                { label: 'Comercial', value: pesoComercial, set: setPesoComercial },
                { label: 'Processos', value: pesoProcessos, set: setPesoProcessos },
              ].map((p) => (
                <div key={p.label}>
                  <label className="label-field text-xs">{p.label}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={p.value}
                    onChange={(e) => p.set(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
            <p className={`text-xs mt-2 ${totalPesos === 100 ? 'text-status-saudavel' : 'text-status-atencao'}`}>
              Soma dos pesos: {totalPesos}% {totalPesos === 100 ? '✓' : '(recomendado: 100%)'}
            </p>
          </div>

          {error && <div className="bg-status-critico/10 text-status-critico text-sm rounded-xl px-4 py-3">{error}</div>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Salvando...' : empresa ? 'Salvar alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserModal({
  empresa,
  users,
  onClose,
  onUpdated,
}: {
  empresa: Empresa;
  users: Usuario[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setCreating(false);
      return;
    }

    if (data.user) {
      await supabase.from('usuarios').update({ empresa_id: empresa.id, nome }).eq('id', data.user.id);
      setEmail('');
      setNome('');
      setPassword('');
      onUpdated();
    }
    setCreating(false);
  }

  async function unlinkUser(uid: string) {
    await supabase.from('usuarios').update({ empresa_id: null }).eq('id', uid);
    onUpdated();
  }

  async function linkExisting(uid: string) {
    await supabase.from('usuarios').update({ empresa_id: empresa.id }).eq('id', uid);
    onUpdated();
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-card-hover max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-50">
          <div>
            <h2 className="text-lg font-serif font-bold text-navy-700">Usuários — {empresa.nome}</h2>
            <p className="text-xs text-navy-400 mt-0.5">Clientes que acessam os dados desta empresa</p>
          </div>
          <button onClick={onClose} className="text-navy-300 hover:text-navy-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Existing users */}
          <div className="space-y-2 mb-6">
            {users.length === 0 ? (
              <p className="text-sm text-navy-300 text-center py-4">Nenhum usuário vinculado a esta empresa.</p>
            ) : (
              users.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl bg-surface p-3">
                  <div className="w-9 h-9 rounded-full bg-navy-700 flex items-center justify-center text-white text-sm font-semibold">
                    {u.nome?.charAt(0)?.toUpperCase() || u.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-700 truncate">{u.nome || u.email}</p>
                    <p className="text-xs text-navy-400 truncate">{u.email}</p>
                  </div>
                  <span className="badge bg-navy-50 text-navy-600 capitalize">{u.role}</span>
                  {u.role === 'cliente' && (
                    <button
                      onClick={() => unlinkUser(u.id)}
                      className="text-navy-300 hover:text-status-critico transition-colors text-xs"
                    >
                      Desvincular
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Create new user */}
          <div className="border-t border-navy-50 pt-5">
            <h3 className="text-sm font-semibold text-navy-700 mb-3">Criar novo usuário cliente</h3>
            <form onSubmit={createUser} className="space-y-3">
              <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Nome" className="input-field" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="E-mail" className="input-field" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Senha (mín. 6)" className="input-field" />
              {error && <div className="bg-status-critico/10 text-status-critico text-sm rounded-xl px-4 py-2">{error}</div>}
              <button type="submit" disabled={creating} className="btn-primary w-full">
                {creating ? 'Criando...' : 'Criar e vincular usuário'}
              </button>
            </form>
            <p className="text-xs text-navy-300 mt-2 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              O usuário será criado como "cliente" e vinculado automaticamente a esta empresa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
