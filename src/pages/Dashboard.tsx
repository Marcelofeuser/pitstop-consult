import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Package, DollarSign, TrendingUp as TrendIcon, Settings, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEmpresaData } from '@/hooks/useEmpresaData';
import { IDPGauge } from '@/components/IDPGauge';
import { calcularIDPGeral, getFaixa, formatDateTime } from '@/lib/calculations';
import type { PageKey } from '@/components/AppLayout';

interface DashboardProps {
  onNavigate: (page: PageKey) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { usuario, empresa } = useAuth();
  const { diagnosticos, checklist, orcamentos, oficinas, plano, loading } = useEmpresaData(empresa?.id ?? null);

  const diagnosticoAtual = diagnosticos[0];
  const diagnosticoAnterior = diagnosticos[1];

  const idpGeral = useMemo(() => {
    if (!diagnosticoAtual || !empresa) return null;
    return calcularIDPGeral(diagnosticoAtual, empresa);
  }, [diagnosticoAtual, empresa]);

  const historicoData = useMemo(() => {
    return [...diagnosticos]
      .reverse()
      .map((d) => ({
        data: formatDateTime(d.data),
        Estoque: Number(d.nota_estoque),
        Financeiro: Number(d.nota_financeiro),
        Comercial: Number(d.nota_comercial),
        Processos: Number(d.nota_processos),
        Geral: empresa ? calcularIDPGeral(d, empresa) : 0,
      }));
  }, [diagnosticos, empresa]);

  const comparacao = useMemo(() => {
    if (!diagnosticoAtual || !diagnosticoAnterior) return null;
    const pilares = [
      { key: 'nota_estoque', label: 'Estoque', atual: diagnosticoAtual.nota_estoque, anterior: diagnosticoAnterior.nota_estoque },
      { key: 'nota_financeiro', label: 'Financeiro', atual: diagnosticoAtual.nota_financeiro, anterior: diagnosticoAnterior.nota_financeiro },
      { key: 'nota_comercial', label: 'Comercial', atual: diagnosticoAtual.nota_comercial, anterior: diagnosticoAnterior.nota_comercial },
      { key: 'nota_processos', label: 'Processos', atual: diagnosticoAtual.nota_processos, anterior: diagnosticoAnterior.nota_processos },
    ];
    return pilares.map((p) => ({
      ...p,
      diff: Number(p.atual) - Number(p.anterior),
    }));
  }, [diagnosticoAtual, diagnosticoAnterior]);

  const alertas = useMemo(() => {
    if (!diagnosticoAtual) return [];
    const pilares = [
      { label: 'Estoque', nota: Number(diagnosticoAtual.nota_estoque) },
      { label: 'Financeiro', nota: Number(diagnosticoAtual.nota_financeiro) },
      { label: 'Comercial', nota: Number(diagnosticoAtual.nota_comercial) },
      { label: 'Processos', nota: Number(diagnosticoAtual.nota_processos) },
    ];
    return pilares.filter((p) => p.nota < 40);
  }, [diagnosticoAtual]);

  const checklistProgress = useMemo(() => {
    if (checklist.length === 0) return 0;
    return Math.round((checklist.filter((i) => i.concluido).length / checklist.length) * 100);
  }, [checklist]);

  const planoProgress = useMemo(() => {
    if (plano.length === 0) return 0;
    return Math.round((plano.filter((p) => p.status === 'concluido').length / plano.length) * 100);
  }, [plano]);

  if (!empresa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-navy-50 flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-navy-400" />
        </div>
        <h2 className="text-xl font-serif font-bold text-navy-700 mb-2">
          {usuario?.role === 'consultor' ? 'Selecione uma empresa' : 'Sem empresa vinculada'}
        </h2>
        <p className="text-navy-400 max-w-sm">
          {usuario?.role === 'consultor'
            ? 'Use o seletor no topo da tela para escolher qual cliente acompanhar.'
            : 'Entre em contato com seu consultor para vincular sua empresa.'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-3 border-navy-100 border-t-orange-400 rounded-full animate-spin" />
      </div>
    );
  }

  const pilarNotas = diagnosticoAtual
    ? [
        { label: 'Estoque', nota: Number(diagnosticoAtual.nota_estoque), icon: Package, color: getFaixa(Number(diagnosticoAtual.nota_estoque)).color },
        { label: 'Financeiro', nota: Number(diagnosticoAtual.nota_financeiro), icon: DollarSign, color: getFaixa(Number(diagnosticoAtual.nota_financeiro)).color },
        { label: 'Comercial', nota: Number(diagnosticoAtual.nota_comercial), icon: TrendIcon, color: getFaixa(Number(diagnosticoAtual.nota_comercial)).color },
        { label: 'Processos', nota: Number(diagnosticoAtual.nota_processos), icon: Settings, color: getFaixa(Number(diagnosticoAtual.nota_processos)).color },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-navy-700">{empresa.nome}</h1>
        <p className="text-navy-400 text-sm mt-1">
          {empresa.cidade ? `${empresa.cidade}` : ''}
          {empresa.regiao ? ` · ${empresa.regiao}` : ''}
          {empresa.contato ? ` · ${empresa.contato}` : ''}
        </p>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-status-critico/10 border border-status-critico/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-status-critico shrink-0 mt-0.5" />
          <div>
            <p className="text-status-critico font-semibold text-sm">Pilares em estado crítico</p>
            <p className="text-status-critico/80 text-sm mt-1">
              {alertas.map((a) => `${a.label} (${a.nota}/100)`).join(' · ')}
              {' — '}priorize ações nestes pilares.
            </p>
          </div>
        </div>
      )}

      {!diagnosticoAtual && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-navy-700 text-lg">Nenhum diagnóstico cadastrado</h3>
            <p className="text-navy-400 text-sm mt-1">Registre o primeiro diagnóstico para calcular o IDP.</p>
          </div>
          <button onClick={() => onNavigate('diagnostico')} className="btn-primary shrink-0">
            Criar diagnóstico
          </button>
        </div>
      )}

      {/* IDP Gauges */}
      {diagnosticoAtual && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-serif font-bold text-navy-700">Índice de Desenvolvimento Pit Stop (IDP)</h2>
            <span className="text-sm text-navy-400">
              Última avaliação: {formatDateTime(diagnosticoAtual.data)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
            {/* IDP Geral */}
            <div className="flex flex-col items-center md:border-r md:border-navy-50 md:pr-4">
              <IDPGauge value={idpGeral ?? 0} label="IDP Geral" size="lg" />
            </div>

            {/* 4 pilares */}
            <div className="col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {pilarNotas.map((pilar) => {
                const Icon = pilar.icon;
                return (
                  <div key={pilar.label} className="flex flex-col items-center text-center">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${pilar.color}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: pilar.color }} />
                    </div>
                    <IDPGauge value={pilar.nota} label={pilar.label} size="sm" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Comparison + Progress cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comparação */}
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-serif font-bold text-navy-700 mb-1">Comparação com diagnóstico anterior</h3>
          <p className="text-navy-400 text-sm mb-4">
            {comparacao ? `Comparando ${formatDateTime(diagnosticoAtual.data)} com ${formatDateTime(diagnosticoAnterior.data)}` : 'Necessário pelo menos 2 diagnósticos'}
          </p>

          {comparacao ? (
            <div className="space-y-3">
              {comparacao.map((c) => {
                const Icon = c.diff > 0 ? TrendingUp : c.diff < 0 ? TrendingDown : Minus;
                const color = c.diff > 0 ? 'text-status-saudavel' : c.diff < 0 ? 'text-status-critico' : 'text-navy-400';
                return (
                  <div key={c.key} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-navy-600 w-28 shrink-0">{c.label}</span>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-sm text-navy-400">{Number(c.anterior).toFixed(0)}</span>
                      <div className="flex-1 h-2 rounded-full bg-navy-50 overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Number(c.atual)}%`, backgroundColor: getFaixa(Number(c.atual)).color }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-navy-700 w-8 text-right">{Number(c.atual).toFixed(0)}</span>
                      <span className={`flex items-center gap-0.5 text-sm font-semibold ${color} w-16 justify-end`}>
                        <Icon className="w-4 h-4" />
                        {c.diff > 0 ? '+' : ''}{c.diff.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-navy-300 text-sm py-8 text-center">Ainda não há histórico suficiente para comparar.</p>
          )}
        </div>

        {/* Progress cards */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-navy-400">Checklist geral</p>
                <p className="text-2xl font-serif font-bold text-navy-700">{checklistProgress}%</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-navy-50 overflow-hidden">
              <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${checklistProgress}%` }} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-navy-500" />
              </div>
              <div>
                <p className="text-sm text-navy-400">Plano de 90 dias</p>
                <p className="text-2xl font-serif font-bold text-navy-700">{planoProgress}%</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-navy-50 overflow-hidden">
              <div className="h-full bg-navy-500 rounded-full transition-all" style={{ width: `${planoProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de evolução */}
      <div className="card">
        <h3 className="text-lg font-serif font-bold text-navy-700 mb-4">Evolução do IDP</h3>
        {historicoData.length > 1 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicoData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF3" />
              <XAxis dataKey="data" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #C9D5E3',
                  fontSize: '13px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '13px' }} />
              <Line type="monotone" dataKey="Geral" stroke="#E67620" strokeWidth={3} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="Estoque" stroke="#1F4068" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Financeiro" stroke="#15803D" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Comercial" stroke="#8A6404" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Processos" stroke="#C81E3A" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-navy-300 text-sm py-8 text-center">
            Registre pelo menos 2 diagnósticos para visualizar a evolução.
          </p>
        )}
      </div>
    </div>
  );
}
