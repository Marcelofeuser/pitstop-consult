import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Usuario, Empresa } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  usuario: Usuario | null;
  empresa: Empresa | null;
  empresas: Empresa[];
  selectedEmpresaId: string | null;
  loading: boolean;
  setSelectedEmpresaId: (id: string | null) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data: profile } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (profile) {
      setUsuario(profile as Usuario);
      return profile as Usuario;
    }
    return null;
  }, []);

  const fetchEmpresas = useCallback(async (profile: Usuario) => {
    if (profile.role === 'consultor') {
      const { data } = await supabase.from('empresas').select('*').order('nome');
      if (data) setEmpresas(data as Empresa[]);
    } else if (profile.empresa_id) {
      const { data } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', profile.empresa_id)
        .maybeSingle();
      if (data) {
        setEmpresas([data as Empresa]);
        setSelectedEmpresaId(data.id);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const profile = await fetchProfile(session.user.id);
    if (profile) {
      await fetchEmpresas(profile);
    }
  }, [session, fetchProfile, fetchEmpresas]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id).then(async (profile) => {
          if (!mounted || !profile) {
            setLoading(false);
            return;
          }
          await fetchEmpresas(profile);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        if (!mounted) return;
        setSession(s);
        if (s?.user) {
          const profile = await fetchProfile(s.user.id);
          if (profile) await fetchEmpresas(profile);
        } else {
          setUsuario(null);
          setEmpresa(null);
          setEmpresas([]);
          setSelectedEmpresaId(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile, fetchEmpresas]);

  useEffect(() => {
    if (selectedEmpresaId) {
      const found = empresas.find((e) => e.id === selectedEmpresaId);
      setEmpresa(found ?? null);
    } else {
      setEmpresa(null);
    }
  }, [selectedEmpresaId, empresas]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setEmpresa(null);
    setEmpresas([]);
    setSelectedEmpresaId(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        usuario,
        empresa,
        empresas,
        selectedEmpresaId,
        loading,
        setSelectedEmpresaId,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
