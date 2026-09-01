/*
# Painel Pit Stop Consult — Schema Inicial

## Objetivo
Cria o esquema completo do Painel Pit Stop Consult, uma plataforma multi-tenant
de consultoria para autopeças e centros automotivos.

## Tabelas criadas
1. `usuarios` — perfil vinculado a auth.users com papel (consultor/cliente) e empresa
2. `empresas` — clientes da consultoria (cada empresa é um tenant)
3. `diagnosticos` — snapshot do IDP por empresa e data (notas por pilar + observações)
4. `checklist_itens` — itens de checklist por pilar com status e data de conclusão
5. `estoque_itens` — itens para a Curva ABC (nome + valor vendido no período)
6. `lancamentos_financeiros` — lançamentos mensais de fluxo de caixa
7. `oficinas_parceiras` — cadastro CRM de oficinas parceiras
8. `orcamentos` — registro de orçamentos do funil comercial
9. `pops` — biblioteca de Procedimentos Operacionais Padrão
10. `plano_90_dias` — ações do plano em 3 fases com responsável, prazo, status

## Funções / Triggers
- `handle_new_user()` — cria automaticamente um registro em `usuarios` quando um
  novo usuário se cadastra em `auth.users`. O papel padrão é 'cliente'.

## Segurança (RLS)
- Todas as tabelas têm RLS habilitado.
- Usuários com papel 'consultor' têm acesso total a todas as empresas.
- Usuários com papel 'cliente' só acessam dados da própria empresa.

## Notas
- Os pesos do IDP ficam armazenados em `empresas` como campos editáveis pelo consultor.
- O IDP geral é calculado no frontend a partir das notas dos 4 pilares.
*/

-- ============================================================
-- 1. usuarios (profiles) — created first so helper function works
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  email text NOT NULL,
  role text NOT NULL DEFAULT 'cliente' CHECK (role IN ('consultor', 'cliente')),
  empresa_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_select" ON usuarios;
CREATE POLICY "usuarios_select" ON usuarios FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.role = 'consultor')
  );

DROP POLICY IF EXISTS "usuarios_update" ON usuarios;
CREATE POLICY "usuarios_update" ON usuarios FOR UPDATE
  TO authenticated USING (
    id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.role = 'consultor')
  )
  WITH CHECK (
    id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.role = 'consultor')
  );

DROP POLICY IF EXISTS "usuarios_insert" ON usuarios;
CREATE POLICY "usuarios_insert" ON usuarios FOR INSERT
  TO authenticated WITH CHECK (
    id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.role = 'consultor')
  );

DROP POLICY IF EXISTS "usuarios_delete" ON usuarios;
CREATE POLICY "usuarios_delete" ON usuarios FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.role = 'consultor')
  );

-- ============================================================
-- 2. empresas
-- ============================================================
CREATE TABLE IF NOT EXISTS empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cidade text,
  regiao text,
  contato text,
  consultor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  data_cadastro timestamptz DEFAULT now(),
  peso_estoque numeric DEFAULT 30,
  peso_financeiro numeric DEFAULT 30,
  peso_comercial numeric DEFAULT 20,
  peso_processos numeric DEFAULT 20
);

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

-- Now add the foreign key from usuarios to empresas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'usuarios_empresa_id_fkey'
    AND table_name = 'usuarios'
  ) THEN
    ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_empresa_id_fkey
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "empresas_select" ON empresas;
CREATE POLICY "empresas_select" ON empresas FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = empresas.id))
  );

DROP POLICY IF EXISTS "empresas_insert" ON empresas;
CREATE POLICY "empresas_insert" ON empresas FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
  );

DROP POLICY IF EXISTS "empresas_update" ON empresas;
CREATE POLICY "empresas_update" ON empresas FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
  );

DROP POLICY IF EXISTS "empresas_delete" ON empresas;
CREATE POLICY "empresas_delete" ON empresas FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
  );

-- ============================================================
-- Trigger: auto-create usuario on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', ''), 'cliente')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. diagnosticos
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnosticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  data timestamptz DEFAULT now(),
  nota_estoque numeric NOT NULL DEFAULT 0,
  nota_financeiro numeric NOT NULL DEFAULT 0,
  nota_comercial numeric NOT NULL DEFAULT 0,
  nota_processos numeric NOT NULL DEFAULT 0,
  observacoes text DEFAULT '',
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE diagnosticos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diagnosticos_select" ON diagnosticos;
CREATE POLICY "diagnosticos_select" ON diagnosticos FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = diagnosticos.empresa_id))
  );

DROP POLICY IF EXISTS "diagnosticos_insert" ON diagnosticos;
CREATE POLICY "diagnosticos_insert" ON diagnosticos FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = diagnosticos.empresa_id))
  );

DROP POLICY IF EXISTS "diagnosticos_update" ON diagnosticos;
CREATE POLICY "diagnosticos_update" ON diagnosticos FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = diagnosticos.empresa_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = diagnosticos.empresa_id))
  );

DROP POLICY IF EXISTS "diagnosticos_delete" ON diagnosticos;
CREATE POLICY "diagnosticos_delete" ON diagnosticos FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
  );

-- ============================================================
-- 4. checklist_itens
-- ============================================================
CREATE TABLE IF NOT EXISTS checklist_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  pilar text NOT NULL CHECK (pilar IN ('estoque', 'financeiro', 'comercial', 'processos')),
  descricao text NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  data_conclusao date,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_select" ON checklist_itens;
CREATE POLICY "checklist_select" ON checklist_itens FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = checklist_itens.empresa_id))
  );

DROP POLICY IF EXISTS "checklist_insert" ON checklist_itens;
CREATE POLICY "checklist_insert" ON checklist_itens FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = checklist_itens.empresa_id))
  );

DROP POLICY IF EXISTS "checklist_update" ON checklist_itens;
CREATE POLICY "checklist_update" ON checklist_itens FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = checklist_itens.empresa_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = checklist_itens.empresa_id))
  );

DROP POLICY IF EXISTS "checklist_delete" ON checklist_itens;
CREATE POLICY "checklist_delete" ON checklist_itens FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = checklist_itens.empresa_id))
  );

-- ============================================================
-- 5. estoque_itens (Curva ABC)
-- ============================================================
CREATE TABLE IF NOT EXISTS estoque_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  valor_vendido numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE estoque_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estoque_select" ON estoque_itens;
CREATE POLICY "estoque_select" ON estoque_itens FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = estoque_itens.empresa_id))
  );

DROP POLICY IF EXISTS "estoque_insert" ON estoque_itens;
CREATE POLICY "estoque_insert" ON estoque_itens FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = estoque_itens.empresa_id))
  );

DROP POLICY IF EXISTS "estoque_update" ON estoque_itens;
CREATE POLICY "estoque_update" ON estoque_itens FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = estoque_itens.empresa_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = estoque_itens.empresa_id))
  );

DROP POLICY IF EXISTS "estoque_delete" ON estoque_itens;
CREATE POLICY "estoque_delete" ON estoque_itens FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = estoque_itens.empresa_id))
  );

-- ============================================================
-- 6. lancamentos_financeiros
-- ============================================================
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  mes text NOT NULL,
  entradas numeric NOT NULL DEFAULT 0,
  saidas numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lancamentos_select" ON lancamentos_financeiros;
CREATE POLICY "lancamentos_select" ON lancamentos_financeiros FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = lancamentos_financeiros.empresa_id))
  );

DROP POLICY IF EXISTS "lancamentos_insert" ON lancamentos_financeiros;
CREATE POLICY "lancamentos_insert" ON lancamentos_financeiros FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = lancamentos_financeiros.empresa_id))
  );

DROP POLICY IF EXISTS "lancamentos_update" ON lancamentos_financeiros;
CREATE POLICY "lancamentos_update" ON lancamentos_financeiros FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = lancamentos_financeiros.empresa_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = lancamentos_financeiros.empresa_id))
  );

DROP POLICY IF EXISTS "lancamentos_delete" ON lancamentos_financeiros;
CREATE POLICY "lancamentos_delete" ON lancamentos_financeiros FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = lancamentos_financeiros.empresa_id))
  );

-- ============================================================
-- 7. oficinas_parceiras
-- ============================================================
CREATE TABLE IF NOT EXISTS oficinas_parceiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  contato text,
  ultima_compra date,
  valor_historico numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE oficinas_parceiras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oficinas_select" ON oficinas_parceiras;
CREATE POLICY "oficinas_select" ON oficinas_parceiras FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = oficinas_parceiras.empresa_id))
  );

DROP POLICY IF EXISTS "oficinas_insert" ON oficinas_parceiras;
CREATE POLICY "oficinas_insert" ON oficinas_parceiras FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = oficinas_parceiras.empresa_id))
  );

DROP POLICY IF EXISTS "oficinas_update" ON oficinas_parceiras;
CREATE POLICY "oficinas_update" ON oficinas_parceiras FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = oficinas_parceiras.empresa_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = oficinas_parceiras.empresa_id))
  );

DROP POLICY IF EXISTS "oficinas_delete" ON oficinas_parceiras;
CREATE POLICY "oficinas_delete" ON oficinas_parceiras FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = oficinas_parceiras.empresa_id))
  );

-- ============================================================
-- 8. orcamentos
-- ============================================================
CREATE TABLE IF NOT EXISTS orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  valor numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'convertido', 'perdido')),
  cliente text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orcamentos_select" ON orcamentos;
CREATE POLICY "orcamentos_select" ON orcamentos FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = orcamentos.empresa_id))
  );

DROP POLICY IF EXISTS "orcamentos_insert" ON orcamentos;
CREATE POLICY "orcamentos_insert" ON orcamentos FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = orcamentos.empresa_id))
  );

DROP POLICY IF EXISTS "orcamentos_update" ON orcamentos;
CREATE POLICY "orcamentos_update" ON orcamentos FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = orcamentos.empresa_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = orcamentos.empresa_id))
  );

DROP POLICY IF EXISTS "orcamentos_delete" ON orcamentos;
CREATE POLICY "orcamentos_delete" ON orcamentos FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = orcamentos.empresa_id))
  );

-- ============================================================
-- 9. pops (Procedimentos Operacionais Padrão)
-- ============================================================
CREATE TABLE IF NOT EXISTS pops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text DEFAULT '',
  passo_a_passo text DEFAULT '',
  responsavel text,
  ultima_atualizacao date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pops_select" ON pops;
CREATE POLICY "pops_select" ON pops FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = pops.empresa_id))
  );

DROP POLICY IF EXISTS "pops_insert" ON pops;
CREATE POLICY "pops_insert" ON pops FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = pops.empresa_id))
  );

DROP POLICY IF EXISTS "pops_update" ON pops;
CREATE POLICY "pops_update" ON pops FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = pops.empresa_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = pops.empresa_id))
  );

DROP POLICY IF EXISTS "pops_delete" ON pops;
CREATE POLICY "pops_delete" ON pops FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = pops.empresa_id))
  );

-- ============================================================
-- 10. plano_90_dias
-- ============================================================
CREATE TABLE IF NOT EXISTS plano_90_dias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fase integer NOT NULL CHECK (fase IN (1, 2, 3)),
  titulo_fase text NOT NULL,
  acao text NOT NULL,
  responsavel text,
  prazo date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE plano_90_dias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plano_select" ON plano_90_dias;
CREATE POLICY "plano_select" ON plano_90_dias FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = plano_90_dias.empresa_id))
  );

DROP POLICY IF EXISTS "plano_insert" ON plano_90_dias;
CREATE POLICY "plano_insert" ON plano_90_dias FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = plano_90_dias.empresa_id))
  );

DROP POLICY IF EXISTS "plano_update" ON plano_90_dias;
CREATE POLICY "plano_update" ON plano_90_dias FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = plano_90_dias.empresa_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = plano_90_dias.empresa_id))
  );

DROP POLICY IF EXISTS "plano_delete" ON plano_90_dias;
CREATE POLICY "plano_delete" ON plano_90_dias FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'consultor')
    OR
    (EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'cliente' AND empresa_id = plano_90_dias.empresa_id))
  );

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_empresas_consultor ON empresas(consultor_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_empresa ON diagnosticos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_checklist_empresa_pilar ON checklist_itens(empresa_id, pilar);
CREATE INDEX IF NOT EXISTS idx_estoque_empresa ON estoque_itens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa ON lancamentos_financeiros(empresa_id);
CREATE INDEX IF NOT EXISTS idx_oficinas_empresa ON oficinas_parceiras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_empresa ON orcamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pops_empresa ON pops(empresa_id);
CREATE INDEX IF NOT EXISTS idx_plano_empresa ON plano_90_dias(empresa_id);
