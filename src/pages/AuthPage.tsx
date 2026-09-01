import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Wrench, Mail, Lock, User as UserIcon, ArrowRight, Loader2, Briefcase, Building2 } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [role, setRole] = useState<'consultor' | 'cliente'>('cliente');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nome, role } },
        });
        if (err) throw err;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      if (msg.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.');
      } else if (msg.includes('already registered')) {
        setError('Este e-mail já está cadastrado.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-orange-400 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-orange-400 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-orange-400 flex items-center justify-center">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold">Pit Stop Consult</h1>
              <p className="text-navy-200 text-sm">Gestão para autopeças e centros automotivos</p>
            </div>
          </div>

          <h2 className="text-4xl font-serif font-bold leading-tight mb-6">
            O método dos<br />
            <span className="text-orange-400">4 Pilares</span> para<br />
            crescer com previsibilidade.
          </h2>

          <p className="text-navy-200 text-lg leading-relaxed mb-10 max-w-md">
            Acompanhe a evolução do seu negócio através do Índice de Desenvolvimento
            Pit Stop e execute um plano estruturado em Estoque, Financeiro, Comercial
            e Processos.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { label: 'IDP em tempo real', desc: 'Notas de 0 a 100 por pilar' },
              { label: 'Calculadoras', desc: 'Curva ABC, precificação, NCG' },
              { label: 'Plano de 90 dias', desc: 'Kanban com 3 fases' },
              { label: 'Checklists', desc: 'Acompanhamento por pilar' },
            ].map((item) => (
              <div key={item.label} className="bg-navy-800/50 rounded-xl p-4 border border-navy-600">
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-navy-300 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-orange-400 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-serif font-bold text-navy-700">Pit Stop Consult</h1>
          </div>

          <h2 className="text-2xl font-serif font-bold text-navy-700 mb-2">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h2>
          <p className="text-navy-400 mb-8">
            {mode === 'login'
              ? 'Acesse o painel da sua consultoria.'
              : 'Comece a usar o método dos 4 Pilares.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label-field">Nome completo</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-300" />
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="input-field pl-11"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                <div>
                  <label className="label-field">Eu sou</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('consultor')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                        role === 'consultor'
                          ? 'border-orange-400 bg-orange-50 text-navy-700'
                          : 'border-navy-100 bg-white text-navy-400 hover:border-navy-200'
                      }`}
                    >
                      <Briefcase className="w-5 h-5 shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-semibold">Consultor</p>
                        <p className="text-xs opacity-70">Gestão de clientes</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('cliente')}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                        role === 'cliente'
                          ? 'border-orange-400 bg-orange-50 text-navy-700'
                          : 'border-navy-100 bg-white text-navy-400 hover:border-navy-200'
                      }`}
                    >
                      <Building2 className="w-5 h-5 shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-semibold">Cliente</p>
                        <p className="text-xs opacity-70">Empresa autopeças</p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="label-field">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>

            <div>
              <label className="label-field">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-300" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            {error && (
              <div className="bg-status-critico/10 border border-status-critico/30 rounded-xl px-4 py-3 text-status-critico text-sm font-medium">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Entrar' : 'Criar conta'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-navy-400 text-sm mt-6">
            {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem uma conta? '}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-orange-600 font-semibold hover:text-orange-700 transition-colors"
            >
              {mode === 'login' ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
