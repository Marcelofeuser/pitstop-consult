import { useState, type ReactNode } from 'react';
import {
  Wrench,
  LayoutDashboard,
  Building2,
  Package,
  DollarSign,
  TrendingUp,
  Settings,
  ClipboardList,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export type PageKey =
  | 'dashboard'
  | 'empresas'
  | 'estoque'
  | 'financeiro'
  | 'comercial'
  | 'processos'
  | 'plano'
  | 'diagnostico';

interface NavItem {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'diagnostico', label: 'IDP & Diagnóstico', icon: ClipboardList },
  { key: 'estoque', label: 'Estoque', icon: Package },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { key: 'comercial', label: 'Comercial', icon: TrendingUp },
  { key: 'processos', label: 'Processos & Tecnologia', icon: Settings },
  { key: 'plano', label: 'Plano de 90 Dias', icon: Calendar },
];

interface AppLayoutProps {
  children: ReactNode;
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export function AppLayout({ children, currentPage, onNavigate }: AppLayoutProps) {
  const { usuario, empresa, empresas, selectedEmpresaId, setSelectedEmpresaId, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [empresaDropdown, setEmpresaDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const isConsultor = usuario?.role === 'consultor';

  const navItems: NavItem[] = isConsultor
    ? [{ key: 'empresas', label: 'Empresas', icon: Building2 }, ...NAV_ITEMS]
    : NAV_ITEMS;

  function handleNavigate(key: PageKey) {
    onNavigate(key);
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-navy-700 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-600">
          <div className="w-10 h-10 rounded-xl bg-orange-400 flex items-center justify-center shrink-0">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-serif font-bold text-lg leading-tight">Pit Stop</h1>
            <p className="text-navy-300 text-xs">Consult</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto text-navy-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.key;
            const disabled = !empresa && item.key !== 'empresas' && item.key !== 'dashboard';
            return (
              <button
                key={item.key}
                onClick={() => handleNavigate(item.key)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-orange-400 text-white shadow-card'
                    : disabled
                    ? 'text-navy-400 cursor-not-allowed'
                    : 'text-navy-200 hover:bg-navy-600 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-navy-600 p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-navy-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {usuario?.nome?.charAt(0)?.toUpperCase() || usuario?.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{usuario?.nome || usuario?.email}</p>
              <p className="text-navy-300 text-xs capitalize">{usuario?.role}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-navy-300 hover:text-white transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-navy-900/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-navy-100 px-4 lg:px-8 py-4 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-navy-500">
            <Menu className="w-6 h-6" />
          </button>

          {/* Empresa selector */}
          <div className="relative">
            <button
              onClick={() => isConsultor && setEmpresaDropdown(!empresaDropdown)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-navy-100 transition-all ${
                isConsultor ? 'hover:border-orange-400 hover:shadow-sm' : 'cursor-default'
              }`}
            >
              <Building2 className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-navy-700 truncate max-w-[140px] lg:max-w-xs">
                {empresa ? empresa.nome : isConsultor ? 'Selecionar empresa' : 'Sem empresa'}
              </span>
              {isConsultor && <ChevronDown className="w-4 h-4 text-navy-400" />}
            </button>

            {empresaDropdown && isConsultor && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setEmpresaDropdown(false)} />
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-card-hover border border-navy-100 z-20 max-h-80 overflow-y-auto animate-scale-in">
                  {empresas.length === 0 ? (
                    <div className="px-4 py-6 text-center text-navy-400 text-sm">
                      Nenhuma empresa cadastrada.
                      <br />
                      Vá em "Empresas" para criar.
                    </div>
                  ) : (
                    empresas.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmpresaId(emp.id);
                          setEmpresaDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-surface transition-colors border-b border-navy-50 last:border-0 ${
                          selectedEmpresaId === emp.id ? 'bg-orange-50' : ''
                        }`}
                      >
                        <p className="text-sm font-medium text-navy-700 truncate">{emp.nome}</p>
                        <p className="text-xs text-navy-400">
                          {emp.cidade || 'Sem cidade'} {emp.regiao ? `· ${emp.regiao}` : ''}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* User badge */}
          <div className="relative">
            <button
              onClick={() => setUserDropdown(!userDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-white text-xs font-semibold">
                {usuario?.nome?.charAt(0)?.toUpperCase() || usuario?.email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <ChevronDown className="w-4 h-4 text-navy-400 hidden lg:block" />
            </button>

            {userDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserDropdown(false)} />
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-card-hover border border-navy-100 z-20 animate-scale-in">
                  <div className="px-4 py-3 border-b border-navy-50">
                    <p className="text-sm font-medium text-navy-700 truncate">{usuario?.nome || 'Usuário'}</p>
                    <p className="text-xs text-navy-400 truncate">{usuario?.email}</p>
                    <span className="badge mt-2 bg-navy-50 text-navy-600 capitalize">{usuario?.role}</span>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setUserDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-navy-600 hover:bg-surface transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
