import { useState, useEffect, useRef } from 'react';
import { Check, Circle, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CHECKLISTS } from '@/lib/constants';
import type { Pilar, ChecklistItem } from '@/types/database';
import { formatDate } from '@/lib/calculations';

interface ChecklistPanelProps {
  empresaId: string;
  pilar: Pilar;
  items: ChecklistItem[];
  onUpdate: () => void;
}

export function ChecklistPanel({ empresaId, pilar, items, onUpdate }: ChecklistPanelProps) {
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);
  const seededRef = useRef<string | null>(null);

  // Auto-seed default checklist items when none exist
  useEffect(() => {
    if (items.length === 0 && seededRef.current !== empresaId + pilar) {
      seededRef.current = empresaId + pilar;
      const defaults = CHECKLISTS[pilar];
      supabase
        .from('checklist_itens')
        .insert(
          defaults.map((descricao, idx) => ({
            empresa_id: empresaId,
            pilar,
            descricao,
            ordem: idx,
          }))
        )
        .then(() => onUpdate());
    }
  }, [items.length, empresaId, pilar, onUpdate]);

  async function toggleItem(item: ChecklistItem) {
    const concluido = !item.concluido;
    const { error: updateError } = await supabase
      .from('checklist_itens')
      .update({
        concluido,
        data_conclusao: concluido ? new Date().toISOString().split('T')[0] : null,
      })
      .eq('id', item.id);
    if (updateError) return;
    onUpdate();
  }

  async function addItem() {
    if (!newItem.trim()) return;
    setSaving(true);
    const { error: insertError } = await supabase.from('checklist_itens').insert({
      empresa_id: empresaId,
      pilar,
      descricao: newItem.trim(),
      ordem: items.length,
    });
    setSaving(false);
    if (insertError) return;
    setNewItem('');
    setAdding(false);
    onUpdate();
  }

  async function deleteItem(id: string) {
    const { error: delError } = await supabase.from('checklist_itens').delete().eq('id', id);
    if (delError) return;
    onUpdate();
  }

  const defaultItems = CHECKLISTS[pilar];
  const hasCustom = items.some((i) => !defaultItems.includes(i.descricao));

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-serif font-bold text-navy-700">Checklist de Ação</h3>
        <span className="text-sm text-navy-400">
          {items.filter((i) => i.concluido).length}/{items.length} concluídos
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 rounded-xl p-3 hover:bg-surface transition-colors"
          >
            <button
              onClick={() => toggleItem(item)}
              className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                item.concluido
                  ? 'bg-status-saudavel border-status-saudavel'
                  : 'border-navy-200 hover:border-orange-400'
              }`}
            >
              {item.concluido ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Circle className="w-3 h-3 text-transparent" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm ${
                  item.concluido ? 'line-through text-navy-300' : 'text-navy-600'
                }`}
              >
                {item.descricao}
              </p>
              {item.concluido && item.data_conclusao && (
                <p className="text-xs text-navy-300 mt-0.5">Concluído em {formatDate(item.data_conclusao)}</p>
              )}
            </div>
            {hasCustom && !defaultItems.includes(item.descricao) && (
              <button
                onClick={() => deleteItem(item.id)}
                className="md:opacity-0 md:group-hover:opacity-100 text-navy-300 hover:text-status-critico transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-3 flex gap-2">
          <input
            autoFocus
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Nova ação..."
            className="input-field flex-1"
          />
          <button onClick={addItem} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-ghost mt-3 text-sm">
          <Plus className="w-4 h-4" /> Adicionar ação
        </button>
      )}
    </div>
  );
}
