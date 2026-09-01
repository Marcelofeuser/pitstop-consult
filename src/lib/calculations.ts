import type { Diagnostico, Empresa } from '@/types/database';
import { FAIXAS_IDP } from '@/lib/constants';

export function getFaixa(nota: number) {
  return FAIXAS_IDP.find((f) => nota >= f.min && nota < f.max) ?? FAIXAS_IDP[FAIXAS_IDP.length - 1];
}

export function calcularIDPGeral(
  diag: Pick<Diagnostico, 'nota_estoque' | 'nota_financeiro' | 'nota_comercial' | 'nota_processos'>,
  empresa: Pick<Empresa, 'peso_estoque' | 'peso_financeiro' | 'peso_comercial' | 'peso_processos'>
): number {
  const totalPeso =
    Number(empresa.peso_estoque) +
    Number(empresa.peso_financeiro) +
    Number(empresa.peso_comercial) +
    Number(empresa.peso_processos);
  if (totalPeso === 0) return 0;

  const idp =
    (Number(diag.nota_estoque) * Number(empresa.peso_estoque) +
      Number(diag.nota_financeiro) * Number(empresa.peso_financeiro) +
      Number(diag.nota_comercial) * Number(empresa.peso_comercial) +
      Number(diag.nota_processos) * Number(empresa.peso_processos)) /
    totalPeso;

  return Math.round(idp * 10) / 10;
}

export function calcularCurvaABC(itens: { nome: string; valor_vendido: number }[]) {
  const ordenados = [...itens].sort((a, b) => b.valor_vendido - a.valor_vendido);
  const total = ordenados.reduce((sum, i) => sum + Number(i.valor_vendido), 0);

  let acumulado = 0;
  return ordenados.map((item, idx) => {
    const acumuladoAte = acumulado + Number(item.valor_vendido);
    const percentAcumulado = total > 0 ? (acumuladoAte / total) * 100 : 0;
    const percentIndividual = total > 0 ? (Number(item.valor_vendido) / total) * 100 : 0;

    let classe: 'A' | 'B' | 'C';
    if (percentAcumulado <= 80) classe = 'A';
    else if (percentAcumulado <= 95) classe = 'B';
    else classe = 'C';

    acumulado = acumuladoAte;
    return {
      ...item,
      ordem: idx + 1,
      percentIndividual: Math.round(percentIndividual * 100) / 100,
      percentAcumulado: Math.round(percentAcumulado * 100) / 100,
      classe,
    };
  });
}

export function calcularGiroEstoque(cmv: number, estoqueInicial: number, estoqueFinal: number) {
  const estoqueMedio = (Number(estoqueInicial) + Number(estoqueFinal)) / 2;
  const giro = estoqueMedio > 0 ? Number(cmv) / estoqueMedio : 0;
  const cobertura = giro > 0 ? 365 / giro : 0;
  return {
    estoqueMedio: Math.round(estoqueMedio * 100) / 100,
    giro: Math.round(giro * 100) / 100,
    cobertura: Math.round(cobertura * 10) / 10,
  };
}

export function calcularEstoqueParado(valorParado: number, valorTotal: number) {
  const percent = valorTotal > 0 ? (Number(valorParado) / Number(valorTotal)) * 100 : 0;
  return Math.round(percent * 10) / 10;
}

export function calcularPrecificacao(
  custo: number,
  despesasVariaveis: number,
  comissoes: number,
  impostos: number,
  margem: number
) {
  const divisor = 1 - (Number(despesasVariaveis) + Number(comissoes) + Number(impostos) + Number(margem)) / 100;
  if (divisor <= 0) return { precoVenda: 0, lucroReais: 0 };
  const precoVenda = Number(custo) / divisor;
  const lucroReais = precoVenda * (Number(margem) / 100);
  return {
    precoVenda: Math.round(precoVenda * 100) / 100,
    lucroReais: Math.round(lucroReais * 100) / 100,
  };
}

export function calcularMargemContribuicao(precoVenda: number, custosVariaveis: number, custosFixos: number) {
  const margemPercent =
    Number(precoVenda) > 0
      ? ((Number(precoVenda) - Number(custosVariaveis)) / Number(precoVenda)) * 100
      : 0;
  const pontoEquilibrio = margemPercent > 0 ? Number(custosFixos) / (margemPercent / 100) : 0;
  return {
    margemPercent: Math.round(margemPercent * 10) / 10,
    pontoEquilibrio: Math.round(pontoEquilibrio * 100) / 100,
  };
}

export function calcularNCG(estoques: number, contasReceber: number, fornecedores: number) {
  return Math.round((Number(estoques) + Number(contasReceber) - Number(fornecedores)) * 100) / 100;
}

export function calcularFluxoCaixa(
  lancamentos: { mes: string; entradas: number; saidas: number }[]
) {
  let saldoAcumulado = 0;
  return lancamentos.map((l) => {
    const saldoMes = Number(l.entradas) - Number(l.saidas);
    saldoAcumulado += saldoMes;
    return {
      mes: l.mes,
      entradas: Number(l.entradas),
      saidas: Number(l.saidas),
      saldoMes: Math.round(saldoMes * 100) / 100,
      saldoAcumulado: Math.round(saldoAcumulado * 100) / 100,
    };
  });
}

export function calcularIndicadoresComercial(
  orcamentos: { valor: number; status: string }[],
  oficinas: { ultima_compra: string | null }[]
) {
  const total = orcamentos.length;
  const convertidos = orcamentos.filter((o) => o.status === 'convertido');
  const taxaConversao = total > 0 ? (convertidos.length / total) * 100 : 0;
  const ticketMedio =
    convertidos.length > 0
      ? convertidos.reduce((sum, o) => sum + Number(o.valor), 0) / convertidos.length
      : 0;

  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
  const oficinasAtivas = oficinas.filter(
    (o) => o.ultima_compra && new Date(o.ultima_compra) >= trintaDiasAtras
  ).length;

  return {
    taxaConversao: Math.round(taxaConversao * 10) / 10,
    ticketMedio: Math.round(ticketMedio * 100) / 100,
    totalOrcamentos: total,
    convertidos: convertidos.length,
    oficinasAtivas,
    totalOficinas: oficinas.length,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
