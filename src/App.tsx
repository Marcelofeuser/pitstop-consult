import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLayout, type PageKey } from '@/components/AppLayout';
import AuthPage from '@/pages/AuthPage';
import { Dashboard } from '@/pages/Dashboard';
import { EmpresasPage } from '@/pages/EmpresasPage';
import { DiagnosticoPage } from '@/pages/DiagnosticoPage';
import { EstoquePage } from '@/pages/EstoquePage';
import { FinanceiroPage } from '@/pages/FinanceiroPage';
import { ComercialPage } from '@/pages/ComercialPage';
import { ProcessosPage } from '@/pages/ProcessosPage';
import { PlanoPage } from '@/pages/PlanoPage';

function AppContent() {
  const { session, usuario, loading } = useAuth();
  const [page, setPage] = useState<PageKey>('dashboard');

  // Consultor starts on empresas page; cliente starts on dashboard
  useEffect(() => {
    if (usuario?.role === 'consultor' && !usuario?.empresa_id) {
      setPage('empresas');
    } else {
      setPage('dashboard');
    }
  }, [usuario?.id, usuario?.role, usuario?.empresa_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-navy-100 border-t-orange-400 rounded-full animate-spin" />
          <p className="text-navy-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  const isConsultor = usuario?.role === 'consultor';

  function renderPage() {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={setPage} />;
      case 'empresas':
        return isConsultor ? <EmpresasPage /> : <Dashboard onNavigate={setPage} />;
      case 'diagnostico':
        return <DiagnosticoPage />;
      case 'estoque':
        return <EstoquePage />;
      case 'financeiro':
        return <FinanceiroPage />;
      case 'comercial':
        return <ComercialPage />;
      case 'processos':
        return <ProcessosPage />;
      case 'plano':
        return <PlanoPage onNavigate={setPage} />;
      default:
        return <Dashboard onNavigate={setPage} />;
    }
  }

  return (
    <AppLayout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </AppLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
