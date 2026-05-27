import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  X, RotateCw, ArrowRight, Check, Info, Sparkles, AlertCircle
} from 'lucide-react';
import { rephrase, MODES, ENGINE_VERSION } from '../reescritor/index.js';

/**
 * ANOTATA — Painel do Reescritor
 *
 * Modal full-screen que mostra:
 *  - 5 chips para escolher o modo (geral / formal / conciso / fluente / simples)
 *  - Texto original (esquerda) x texto reescrito (direita) lado a lado
 *  - Lista de mudancas aplicadas (com regra)
 *  - Stats: palavras antes/depois, redução percentual
 *  - Botoes "Aplicar reescrita" / "Cancelar"
 *
 * Recebe via props:
 *  - originalText : texto a reescrever (string)
 *  - scope        : 'selection' | 'full' — apenas para exibir no header
 *  - onApply(text): callback ao confirmar
 *  - onClose()    : callback ao fechar
 *
 * Propriedades de UX:
 *  - Esc fecha
 *  - Modo padrao: 'geral'
 *  - Atualiza preview em tempo real ao trocar de modo
 *  - Honesto: subtítulo deixa claro que e regra linguistica, nao IA
 */

const MODE_META = {
  geral:   { label: 'Geral',   tagline: 'Versão alternativa, sem mudar o tom',     color: '#5B2D8E' },
  formal:  { label: 'Formal',  tagline: 'E-mail profissional, registro elevado',   color: '#3D1B66' },
  conciso: { label: 'Conciso', tagline: 'Menos palavras, mesmo sentido',           color: '#0F7A3F' },
  fluente: { label: 'Fluente', tagline: 'Mais fácil de ler em voz alta',           color: '#9B6F00' },
  simples: { label: 'Simples', tagline: 'Que qualquer pessoa entenda na primeira', color: '#E8637C' },
};

export default function RephrasePanel({ originalText, scope = 'full', onApply, onClose }) {
  const [mode, setMode] = useState('geral');
  const [applied, setApplied] = useState(false);

  // Esc fecha
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Recalcula a cada mudança de modo ou texto
  const result = useMemo(() => {
    try {
      return rephrase(originalText || '', mode);
    } catch (e) {
      return { result: originalText || '', changes: [], stats: {} };
    }
  }, [originalText, mode]);

  const reduction = useMemo(() => {
    const before = (result.stats && result.stats.charsBefore) || 0;
    const after = (result.stats && result.stats.charsAfter) || 0;
    if (before === 0) return 0;
    return Math.round(((before - after) / before) * 100);
  }, [result]);

  const handleApply = useCallback(() => {
    if (applied) return;
    setApplied(true);
    if (typeof onApply === 'function') onApply(result.result);
  }, [applied, onApply, result.result]);

  const isIdentical = result.result === originalText;
  const totalChanges = (result.changes || []).length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(45, 27, 78, 0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Reescritor"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-anotata-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-5 py-3 border-b border-anotata-border bg-anotata-sidebar flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-anotata-roxo to-anotata-roxo-escuro flex items-center justify-center text-white shadow-sm">
            <RotateCw size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-anotata-text">Reescritor</h2>
            <p className="text-xs text-anotata-muted">
              Reescreve seu texto seguindo regras linguísticas do português brasileiro
              {' · '}{scope === 'selection' ? 'apenas a seleção' : 'a nota inteira'}
              {' · '}<span className="text-anotata-text-suave">v{ENGINE_VERSION}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-anotata-muted hover:text-anotata-goiaba hover:bg-white transition-colors"
            title="Fechar (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* CHIPS DOS MODOS */}
        <div className="px-5 py-3 border-b border-anotata-border bg-white">
          <div className="flex items-center gap-1.5 flex-wrap">
            {MODES.map(m => {
              const meta = MODE_META[m];
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex flex-col items-start gap-0 px-3 py-2 rounded-xl text-left transition-all border ${
                    active
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-anotata-border text-anotata-text-suave hover:border-anotata-roxo bg-anotata-bg/50'
                  }`}
                  style={active ? { backgroundColor: meta.color } : {}}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider">{meta.label}</span>
                  <span className={`text-2xs ${active ? 'text-white/80' : 'text-anotata-muted'}`}>
                    {meta.tagline}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COMPARACAO LADO A LADO */}
        <div className="flex-1 overflow-hidden flex">
          {/* ORIGINAL */}
          <div className="flex-1 flex flex-col border-r border-anotata-border min-w-0">
            <div className="px-4 py-2 bg-anotata-bg border-b border-anotata-border">
              <span className="text-2xs uppercase font-bold tracking-wider text-anotata-muted">Original</span>
              <span className="ml-2 text-xs text-anotata-text-suave">
                {result.stats?.wordsBefore || 0} palavras · {result.stats?.charsBefore || 0} caracteres
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-anotata-text-suave whitespace-pre-wrap">
              {originalText || <span className="text-anotata-muted italic">Sem texto para reescrever.</span>}
            </div>
          </div>

          {/* REESCRITO */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2 bg-gradient-to-r from-anotata-lavanda-clara to-white border-b border-anotata-border flex items-center gap-2">
              <span className="text-2xs uppercase font-bold tracking-wider" style={{ color: MODE_META[mode].color }}>
                Reescrito · {MODE_META[mode].label}
              </span>
              <span className="ml-auto text-xs text-anotata-text-suave">
                {result.stats?.wordsAfter || 0} palavras · {result.stats?.charsAfter || 0} caracteres
                {reduction > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-anotata-success-bg text-anotata-success rounded text-2xs font-semibold">
                    −{reduction}%
                  </span>
                )}
                {reduction < 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-anotata-warn-bg text-anotata-warn rounded text-2xs font-semibold">
                    +{Math.abs(reduction)}%
                  </span>
                )}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-anotata-text whitespace-pre-wrap">
              {isIdentical && originalText ? (
                <div className="flex items-start gap-2 text-anotata-text-suave italic">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>O modo <strong>{MODE_META[mode].label}</strong> não encontrou nada para alterar neste texto. Tente outro modo ou edite o texto e tente de novo.</span>
                </div>
              ) : (
                result.result
              )}
            </div>
          </div>
        </div>

        {/* LISTA DE MUDANÇAS */}
        {totalChanges > 0 && (
          <div className="border-t border-anotata-border bg-anotata-sidebar max-h-[140px] overflow-y-auto">
            <div className="px-4 py-1.5 sticky top-0 bg-anotata-sidebar border-b border-anotata-border">
              <span className="text-2xs uppercase font-bold tracking-wider text-anotata-muted">
                Mudanças aplicadas · {totalChanges}
              </span>
            </div>
            <div className="px-4 py-2 space-y-1">
              {(result.changes || []).slice(0, 12).map((c, idx) => (
                <ChangeRow key={idx} change={c} />
              ))}
              {totalChanges > 12 && (
                <div className="text-xs text-anotata-muted italic px-1">
                  + {totalChanges - 12} mudança{totalChanges - 12 === 1 ? '' : 's'} adiciona{totalChanges - 12 === 1 ? 'l' : 'is'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-anotata-border bg-white flex items-center gap-3">
          <div className="text-xs text-anotata-text-suave flex items-center gap-1.5">
            {totalChanges === 0 ? (
              <>
                <AlertCircle size={12} className="text-anotata-muted" />
                Nenhuma mudança neste modo
              </>
            ) : (
              <>
                <Sparkles size={12} className="text-anotata-roxo" />
                {totalChanges} mudança{totalChanges === 1 ? '' : 's'} aplicada{totalChanges === 1 ? '' : 's'}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 text-xs text-anotata-text-suave hover:text-anotata-text transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={applied || isIdentical}
            className={`px-4 py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all ${
              applied || isIdentical
                ? 'bg-anotata-bg text-anotata-muted cursor-not-allowed'
                : 'bg-anotata-roxo text-white hover:bg-anotata-roxo-escuro shadow-sm'
            }`}
          >
            {applied ? <Check size={14} /> : <ArrowRight size={14} />}
            {applied ? 'Aplicado' : 'Aplicar reescrita'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeRow({ change }) {
  const ruleLabel = ruleLabels[change.rule?.split(':')[0]] || (change.rule || 'mudança');
  const truncate = (s, n) => (s && s.length > n) ? s.slice(0, n - 1) + '…' : s;

  return (
    <div className="flex items-start gap-2 text-xs py-1 border-b border-anotata-border-suave last:border-b-0">
      <span
        className="px-1.5 py-0.5 rounded text-2xs uppercase font-bold tracking-wide shrink-0 mt-0.5"
        style={{ backgroundColor: ruleLabel.bg, color: ruleLabel.color }}
        title={change.rule}
      >
        {ruleLabel.label}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-anotata-goiaba line-through opacity-70">"{truncate(change.from, 60)}"</span>
        <ArrowRight size={10} className="inline mx-1.5 text-anotata-muted" />
        <span className="text-anotata-roxo font-medium">"{truncate(change.to, 60)}"</span>
      </div>
    </div>
  );
}

const ruleLabels = {
  'gerundism':       { label: 'gerundismo',  bg: '#FFF4D9', color: '#9B6F00' },
  'redundancy':      { label: 'pleonasmo',   bg: '#FCE7EB', color: '#C44862' },
  'colloquialism':   { label: 'coloquial',   bg: '#F0E9F8', color: '#5B2D8E' },
  'connectors':      { label: 'conector',    bg: '#EDE8F2', color: '#5B2D8E' },
  'simplification':  { label: 'simples',     bg: '#FCE7EB', color: '#E8637C' },
  'voice':           { label: 'voz ativa',   bg: '#D4F4DD', color: '#0F7A3F' },
  'clause':          { label: 'quebra',      bg: '#D4F4DD', color: '#0F7A3F' },
  'concise':         { label: 'enxugar',     bg: '#D4F4DD', color: '#0F7A3F' },
  'cacofonia':       { label: 'som ruim',    bg: '#FFE7D9', color: '#9B4E00' },
  'nominalizacao':   { label: 'verbo direto', bg: '#E0F2FA', color: '#1A5C99' },
};
