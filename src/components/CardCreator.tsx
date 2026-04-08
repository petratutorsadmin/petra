'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/core';
import { Plus, Save, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Row {
  id: string;
  prompt: string;
  answer: string;
  translation_ja?: string;
  example_sentence?: string;
  collocation?: string;
  related_words?: string;
  topic?: string;
  difficulty?: string;
  recall_directions?: string;
  cue?: string;
}

export default function CardCreator({ onBack }: { onBack: () => void }) {
  const [title, setTitle] = useState('');
  const [libraries, setLibraries] = useState<{ id: string; title: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; title: string; library_id: string }[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [rows, setRows] = useState<Row[]>(
    Array.from({ length: 5 }).map(() => ({ id: Math.random().toString(), prompt: '', answer: '' }))
  );

  useEffect(() => {
    const load = async () => {
      const { data: libs } = await supabase.from('libraries').select('id, title');
      if (libs) setLibraries(libs);
      const { data: lus } = await supabase.from('library_units').select('id, title, library_id');
      if (lus) setUnits(lus);
    };
    load();
  }, []);

  const addRow = () => {
    setRows([...rows, { id: Math.random().toString(), prompt: '', answer: '' }]);
  };

  const updateRow = (index: number, field: keyof Row, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const handleSave = async () => {
    if (!selectedUnit) {
      setToast('Choose a unit before saving.');
      return;
    }

    const payload = rows
      .filter(r => r.prompt.trim() && r.answer.trim())
      .map(r => ({
        unit_id: selectedUnit,
        prompt: r.prompt.trim(),
        answer: r.answer.trim(),
        translation_ja: r.translation_ja?.trim() || null,
        example_sentence: r.example_sentence?.trim() || null,
        collocation: r.collocation?.trim() || null,
        related_words: r.related_words
          ? r.related_words.split(/[,;]\s*/).filter(Boolean)
          : null,
        topic: r.topic?.trim() || null,
        difficulty: r.difficulty?.trim() || 'medium',
        recall_directions: r.recall_directions
          ? r.recall_directions.split(/[,;]\s*/).filter(Boolean)
          : null,
        cue: r.cue?.trim() || null,
      }));

    if (!payload.length) {
      setToast('Add at least one card.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('cards').insert(payload);
    setSaving(false);
    setToast(error ? error.message : 'Saved. New cards ready.');
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-12">
        <button onClick={onBack} className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <Button className="h-12 px-8 rounded-none font-bold" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Set'}
        </Button>
      </div>

      <div className="mb-12">
        <input 
          type="text" 
          placeholder="Enter a title, like 'Biology - Chapter 22'" 
          className="w-full text-4xl font-bold bg-transparent border-b-2 border-text-muted/10 outline-none pb-4 focus:border-brand-gold transition-colors text-text-primary placeholder:text-text-muted/30"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-1">Library</label>
            <select
              className="w-full bg-surface border border-text-muted/20 px-3 py-2 text-sm"
              value={selectedLibrary}
              onChange={(e) => {
                setSelectedLibrary(e.target.value);
                setSelectedUnit('');
              }}
            >
              <option value="">Select...</option>
              {libraries.map(l => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-text-muted block mb-1">Unit</label>
            <select
              className="w-full bg-surface border border-text-muted/20 px-3 py-2 text-sm"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            >
              <option value="">Select...</option>
              {units
                .filter(u => !selectedLibrary || u.library_id === selectedLibrary)
                .map(u => (
                  <option key={u.id} value={u.id}>{u.title}</option>
              ))}
            </select>
          </div>
        </div>
        {toast && <p className="mt-2 text-xs text-warning font-mono">{toast}</p>}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">Core fields first. Add depth when needed.</p>
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="text-[10px] font-mono uppercase tracking-widest text-text-primary border border-text-muted/30 px-3 py-1"
        >
          {showAdvanced ? 'Hide advanced' : 'More details'}
        </button>
      </div>

      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={row.id} className="flex gap-6 p-6 bg-surface rounded-none border border-text-muted/10 shadow-sm transition-all focus-within:border-brand-gold focus-within:shadow-lg hover:-translate-y-0.5">
            <span className="text-text-muted/50 font-mono text-xs w-6 flex-shrink-0 pt-3">{i + 1}</span>
            <div className="flex-1 space-y-1 group">
               <input 
                 className="w-full bg-transparent border-b border-text-muted/10 outline-none pb-2 focus:border-brand-gold text-lg text-text-primary placeholder:text-text-muted/30"
                 placeholder="Term"
                 value={row.prompt}
                 onChange={(e) => updateRow(i, 'prompt', e.target.value)}
               />
               <span className="text-[10px] uppercase tracking-widest font-mono text-text-muted opacity-0 group-focus-within:opacity-100 transition-opacity block mt-2">TERM</span>
            </div>
            <div className="flex-1 space-y-1 group">
               <input 
                 className="w-full bg-transparent border-b border-text-muted/10 outline-none pb-2 focus:border-brand-gold text-lg text-text-primary placeholder:text-text-muted/30"
                 placeholder="Definition"
                 value={row.answer}
                 onChange={(e) => updateRow(i, 'answer', e.target.value)}
               />
               <span className="text-[10px] uppercase tracking-widest font-mono text-text-muted opacity-0 group-focus-within:opacity-100 transition-opacity block mt-2">DEFINITION</span>
            </div>
            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm flex-1">
                <input
                  className="bg-transparent border-b border-text-muted/10 outline-none pb-2 focus:border-brand-gold"
                  placeholder="Translation (JA)"
                  value={row.translation_ja || ''}
                  onChange={(e) => updateRow(i, 'translation_ja', e.target.value)}
                />
                <input
                  className="bg-transparent border-b border-text-muted/10 outline-none pb-2 focus:border-brand-gold"
                  placeholder="Example sentence"
                  value={row.example_sentence || ''}
                  onChange={(e) => updateRow(i, 'example_sentence', e.target.value)}
                />
                <input
                  className="bg-transparent border-b border-text-muted/10 outline-none pb-2 focus:border-brand-gold"
                  placeholder="Collocation / usage"
                  value={row.collocation || ''}
                  onChange={(e) => updateRow(i, 'collocation', e.target.value)}
                />
                <input
                  className="bg-transparent border-b border-text-muted/10 outline-none pb-2 focus:border-brand-gold"
                  placeholder="Related words (comma / ; )"
                  value={row.related_words || ''}
                  onChange={(e) => updateRow(i, 'related_words', e.target.value)}
                />
                <input
                  className="bg-transparent border-b border-text-muted/10 outline-none pb-2 focus:border-brand-gold"
                  placeholder="Topic / category"
                  value={row.topic || ''}
                  onChange={(e) => updateRow(i, 'topic', e.target.value)}
                />
                <input
                  className="bg-transparent border-b border-text-muted/10 outline-none pb-2 focus:border-brand-gold"
                  placeholder="Difficulty (easy/medium/hard)"
                  value={row.difficulty || ''}
                  onChange={(e) => updateRow(i, 'difficulty', e.target.value)}
                />
                <input
                  className="bg-transparent border-b border-text-muted/10 outline-none pb-2 focus:border-brand-gold"
                  placeholder="Recall directions (ja_to_en, definition_to_term...)"
                  value={row.recall_directions || ''}
                  onChange={(e) => updateRow(i, 'recall_directions', e.target.value)}
                />
                <input
                  className="bg-transparent border-b border-text-muted/10 outline-none pb-2 focus:border-brand-gold"
                  placeholder="Cue / mnemonic"
                  value={row.cue || ''}
                  onChange={(e) => updateRow(i, 'cue', e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Button variant="secondary" onClick={addRow} className="h-20 w-full rounded-none border-dashed border-2 bg-transparent hover:bg-surface border-text-muted/20 text-text-muted hover:text-text-primary font-bold tracking-widest transition-all">
          <Plus className="w-6 h-6 mr-2" /> ADD CARD
        </Button>
      </div>
    </div>
  );
}
