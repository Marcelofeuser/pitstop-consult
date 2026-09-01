export type Pilar = 'estoque' | 'financeiro' | 'comercial' | 'processos';

export type UserRole = 'consultor' | 'cliente';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  empresa_id: string | null;
  created_at: string;
}

export interface Empresa {
  id: string;
  nome: string;
  cidade: string | null;
  regiao: string | null;
  contato: string | null;
  consultor_id: string | null;
  data_cadastro: string;
  peso_estoque: number;
  peso_financeiro: number;
  peso_comercial: number;
  peso_processos: number;
}

export interface Diagnostico {
  id: string;
  empresa_id: string;
  data: string;
  nota_estoque: number;
  nota_financeiro: number;
  nota_comercial: number;
  nota_processos: number;
  observacoes: string;
  criado_por: string | null;
}

export interface ChecklistItem {
  id: string;
  empresa_id: string;
  pilar: Pilar;
  descricao: string;
  concluido: boolean;
  data_conclusao: string | null;
  ordem: number;
  created_at: string;
}

export interface EstoqueItem {
  id: string;
  empresa_id: string;
  nome: string;
  valor_vendido: number;
  created_at: string;
}

export interface LancamentoFinanceiro {
  id: string;
  empresa_id: string;
  mes: string;
  entradas: number;
  saidas: number;
  created_at: string;
}

export interface OficinaParceira {
  id: string;
  empresa_id: string;
  nome: string;
  contato: string | null;
  ultima_compra: string | null;
  valor_historico: number;
  created_at: string;
}

export interface Orcamento {
  id: string;
  empresa_id: string;
  data: string;
  valor: number;
  status: 'enviado' | 'convertido' | 'perdido';
  cliente: string | null;
  created_at: string;
}

export interface Pop {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string;
  passo_a_passo: string;
  responsavel: string | null;
  ultima_atualizacao: string;
  created_at: string;
}

export interface Plano90Dias {
  id: string;
  empresa_id: string;
  fase: 1 | 2 | 3;
  titulo_fase: string;
  acao: string;
  responsavel: string | null;
  prazo: string | null;
  status: 'pendente' | 'em_andamento' | 'concluido';
  ordem: number;
  created_at: string;
}
