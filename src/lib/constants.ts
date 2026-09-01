import type { Pilar } from '@/types/database';

export const PILARES: { key: Pilar; label: string; icon: string }[] = [
  { key: 'estoque', label: 'Estoque', icon: 'Package' },
  { key: 'financeiro', label: 'Financeiro', icon: 'DollarSign' },
  { key: 'comercial', label: 'Comercial', icon: 'TrendingUp' },
  { key: 'processos', label: 'Processos & Tecnologia', icon: 'Settings' },
];

export const PESOS_PADRAO = {
  estoque: 30,
  financeiro: 30,
  comercial: 20,
  processos: 20,
};

export const FAIXAS_IDP = [
  { min: 0, max: 40, label: 'Crítico', color: '#C81E3A', bgColor: '#FCE8EC' },
  { min: 40, max: 70, label: 'Atenção', color: '#8A6404', bgColor: '#FBF3DC' },
  { min: 70, max: 100, label: 'Saudável', color: '#15803D', bgColor: '#DCF2E5' },
];

export const FASES_PLANO = [
  { fase: 1 as const, titulo: 'Fase 1 (Dias 1–30) — Fundação e Diagnóstico' },
  { fase: 2 as const, titulo: 'Fase 2 (Dias 31–60) — Ajuste de Custos e Preços' },
  { fase: 3 as const, titulo: 'Fase 3 (Dias 61–90) — Expansão e Inteligência' },
];

export const CHECKLISTS: Record<Pilar, string[]> = {
  estoque: [
    'Fazer inventário físico completo e conferir com o sistema',
    'Rodar a Curva ABC dos últimos 12 meses',
    'Identificar itens Classe C parados há mais de 90 dias',
    'Definir plano de saída para o estoque parado',
    'Definir estoque mínimo e máximo por item Classe A e B',
    'Criar rotina de reposição',
    'Calcular o Giro de Estoque atual e definir uma meta',
    'Recalcular os indicadores todo mês',
  ],
  financeiro: [
    'Separar as contas da empresa das contas pessoais do dono',
    'Implantar controle de fluxo de caixa (diário ou semanal)',
    'Revisar a precificação de pelo menos as linhas Classe A',
    'Calcular o ponto de equilíbrio atual',
    'Calcular a Necessidade de Capital de Giro',
    'Revisar enquadramento tributário e tratamento da ST com o contador',
    'Negociar prazos com os 5 maiores fornecedores',
    'Montar reserva de emergência (meta inicial: 1 a 3 meses de custo fixo)',
  ],
  comercial: [
    'Definir e documentar o padrão de atendimento',
    'Levantar o perfil da frota da região de atuação',
    'Cadastrar e classificar as oficinas parceiras atuais',
    'Definir condições especiais para parceiros recorrentes',
    'Criar rotina de visitas e canal direto de orçamento (WhatsApp)',
    'Passar a medir ticket médio, conversão e recorrência todo mês',
  ],
  processos: [
    'Mapear as rotinas operacionais mais críticas',
    'Escrever um procedimento simples para cada uma',
    'Avaliar o ERP atual contra os critérios estabelecidos',
    'Implantar contagem cíclica de estoque',
    'Definir rotina de backup dos dados',
  ],
};

export const ROTINAS_OPERACIONAIS = [
  'Abertura e fechamento de caixa com conferência dupla',
  'Contagem cíclica de estoque (parte do estoque todo mês)',
  'Conferência de recebimento de mercadoria contra nota fiscal e pedido',
  'Backup e segurança dos dados do sistema de gestão',
];

export const CRITERIOS_ERP = [
  'Controle de estoque com curva ABC nativa',
  'Emissão fiscal integrada (NF-e/NFC-e)',
  'Controle financeiro',
  'Relatórios gerenciais',
  'Suporte técnico',
  'Custo compatível com o porte',
];
