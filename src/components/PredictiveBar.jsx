import React, { useState, useEffect, useCallback } from 'react';
import { Brain } from 'lucide-react';
import engine from '../engine/PredictiveEngine';

export default function PredictiveBar({ editor }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [stats, setStats] = useState({ vocabulario: 0, pares: 0, trios: 0 });

  // Atualizar sugestões quando o texto muda
  useEffect(() => {
    if (!editor || !isActive) {
      setSuggestions([]);
      return;
    }

    const updateSuggestions = () => {
      const text = editor.getText();
      if (!text || text.length < 2) {
        setSuggestions([]);
        return;
      }

      // Pegar sugestões do motor
      const predicted = engine.predict(text);
      setSuggestions(predicted);

      // Aprender em tempo real
      engine.learnRealtime(text);

      // Atualizar estatísticas
      setStats(engine.getStats());
    };

    // Escutar mudanças no editor
    editor.on('update', updateSuggestions);
    editor.on('selectionUpdate', updateSuggestions);

    return () => {
      editor.off('update', updateSuggestions);
      editor.off('selectionUpdate', updateSuggestions);
    };
  }, [editor, isActive]);

  // Inserir sugestão ao clicar
  const insertSuggestion = useCallback((word) => {
    if (!editor) return;

    const text = editor.getText();
    const lastSpace = text.lastIndexOf(' ');
    const lastNewline = text.lastIndexOf('\n');
    const lastBreak = Math.max(lastSpace, lastNewline);
    
    // Verificar se está no meio de uma palavra
    const currentPartial = text.slice(lastBreak + 1);
    
    if (currentPartial && word.startsWith(currentPartial.toLowerCase())) {
      // Completar a palavra parcial
      const completion = word.slice(currentPartial.length);
      editor.commands.insertContent(completion + ' ');
    } else {
      // Inserir palavra inteira
      editor.commands.insertContent(word + ' ');
    }

    editor.commands.focus();
    setSuggestions([]);
  }, [editor]);

  if (!isActive && suggestions.length === 0) {
    return (
      <div className="border-b border-anotata-border px-4 py-1.5 flex items-center justify-between">
        <button
          onClick={() => setIsActive(true)}
          className="flex items-center gap-1.5 text-[11px] text-anotata-muted hover:text-anotata-accent transition-colors"
        >
          <Brain size={12} />
          Ativar sugestões
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-anotata-border px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
      {/* Indicador do cérebro */}
      <button
        onClick={() => setIsActive(!isActive)}
        className={`flex items-center gap-1 text-[11px] shrink-0 transition-colors ${
          isActive ? 'text-anotata-accent' : 'text-anotata-muted'
        }`}
        title={`Vocabulário: ${stats.vocabulario} palavras aprendidas`}
      >
        <Brain size={13} className={isActive ? 'animate-pulse' : ''} />
        <span className="hidden sm:inline">{stats.vocabulario > 0 ? stats.vocabulario : ''}</span>
      </button>

      {/* Separador */}
      {suggestions.length > 0 && (
        <div className="w-px h-4 bg-anotata-border shrink-0"></div>
      )}

      {/* Sugestões */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {suggestions.map((word, idx) => (
          <button
            key={`${word}-${idx}`}
            onClick={() => insertSuggestion(word)}
            className="px-2.5 py-0.5 text-xs rounded-full bg-anotata-card border border-anotata-border 
                       text-anotata-lavanda hover:bg-anotata-accent hover:text-white hover:border-anotata-accent
                       transition-all whitespace-nowrap cursor-pointer"
          >
            {word}
          </button>
        ))}
      </div>

      {/* Placeholder quando não tem sugestões */}
      {suggestions.length === 0 && isActive && (
        <span className="text-[11px] text-anotata-muted italic">
          Comece a escrever — vou aprender seu jeito...
        </span>
      )}
    </div>
  );
}
