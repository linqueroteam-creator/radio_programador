import React, { useMemo, useState } from 'react';
import { X, Download, FileText, Package, Loader2, Check } from 'lucide-react';
import { createZip, downloadBlob, safeFilename, uniqueNames } from '../engine/ZipEncoder';

/**
 * ============================================================================
 *  <ExportNotebookModal> — Exportação em lote (Pacote C)
 * ============================================================================
 *
 *  Permite exportar:
 *    - Um caderno inteiro (todas as notas dele) — modo padrão
 *    - Apenas notas favoritas do caderno
 *    - Todas as notas (todos os cadernos juntos) quando notebook = null
 *
 *  Formatos:
 *    - .md (Markdown com cabeçalho de metadados)
 *    - .txt (texto puro, sem formatação)
 *    - Combinados num ZIP único, com README explicando o conteúdo.
 *
 *  UX:
 *    - Mostra prévia ("17 notas, ~2.500 palavras")
 *    - Botão "Exportar agora" → gera ZIP no cliente, dispara download
 *    - Estado de "gerando" pra evitar duplo-clique em coleções grandes
 *
 *  Implementação:
 *    - Usa `store.exportNoteAsMarkdown` e `store.exportNoteAsText` que já
 *      existiam (formatos consistentes com a exportação de nota única).
 *    - ZIP feito em memória pelo `ZipEncoder.js` local — sem dependências.
 * ============================================================================
 */

export default function ExportNotebookModal({ store, notebook, onClose }) {
  // notebook = null  → exporta TODAS as notas do app
  // notebook = obj   → exporta só desse caderno
  const [format, setFormat] = useState('md');           // 'md' | 'txt' | 'both'
  const [scope, setScope] = useState('all');            // 'all' | 'favorites'
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Notas que entrarão no ZIP, conforme escolhas atuais
  const notesToExport = useMemo(() => {
    let list = (store.notes || []).filter((n) => !n.isTrash && !n.isArchived);
    if (notebook) list = list.filter((n) => n.notebookId === notebook.id);
    if (scope === 'favorites') list = list.filter((n) => n.isFavorite);
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [store.notes, notebook, scope]);

  const wordCount = useMemo(() => {
    return notesToExport.reduce((acc, n) => {
      const text = (n.content || '').replace(/<[^>]*>/g, ' ');
      return acc + text.split(/\s+/).filter(Boolean).length;
    }, 0);
  }, [notesToExport]);

  const exportLabel = notebook ? notebook.name : 'Todas as notas';

  const handleExport = async () => {
    if (notesToExport.length === 0 || busy) return;
    setBusy(true);
    setDone(false);

    try {
      // Pequeno delay pra UI piscar — em coleção pequena é instantâneo demais
      await new Promise((r) => setTimeout(r, 50));

      const files = [];

      // Cada nota vira 1 ou 2 arquivos conforme formato
      const namesPlanned = [];
      const planned = notesToExport.map((note) => {
        const base = safeFilename(note.title || 'sem-titulo');
        return { note, base };
      });

      // Garante unicidade por extensão separadamente (pra .md e .txt não brigarem entre si)
      if (format === 'md' || format === 'both') {
        const mdNames = uniqueNames(planned.map((p) => `${p.base}.md`));
        planned.forEach((p, i) => {
          const md = store.exportNoteAsMarkdown(p.note.id) || '';
          files.push({ name: mdNames[i], content: md });
          namesPlanned.push(mdNames[i]);
        });
      }
      if (format === 'txt' || format === 'both') {
        const txtNames = uniqueNames(planned.map((p) => `${p.base}.txt`));
        planned.forEach((p, i) => {
          const txt = store.exportNoteAsText(p.note.id) || '';
          files.push({ name: txtNames[i], content: txt });
          namesPlanned.push(txtNames[i]);
        });
      }

      // README explicativo
      const readmeLines = [
        `# ${exportLabel}`,
        '',
        `Pacote exportado pelo ANOTATA em ${new Date().toLocaleString('pt-BR')}.`,
        '',
        `**Notas incluídas:** ${notesToExport.length}`,
        `**Palavras totais:** ${wordCount.toLocaleString('pt-BR')}`,
        `**Formato(s):** ${format === 'both' ? 'Markdown (.md) + Texto puro (.txt)' : format === 'md' ? 'Markdown (.md)' : 'Texto puro (.txt)'}`,
        scope === 'favorites' ? '**Filtro:** apenas favoritas' : '',
        '',
        '---',
        '',
        '## Lista de notas',
        '',
        ...notesToExport.map((n, i) => `${i + 1}. ${n.title || 'Sem título'}`),
      ].filter((l) => l !== '').join('\n');
      files.push({ name: 'LEIA-ME.md', content: readmeLines });

      const zip = createZip(files);

      const stamp = new Date().toISOString().slice(0, 10);
      const zipName = `anotata-${safeFilename(exportLabel).toLowerCase().replace(/\s+/g, '-')}-${stamp}.zip`;
      downloadBlob(zip, zipName);

      setDone(true);
      // Fecha automaticamente após 1.2s (suficiente pra ver "Pronto")
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ExportNotebookModal] erro ao gerar ZIP:', err);
      alert('Não consegui gerar o pacote. Tente novamente — e se persistir, exporte uma nota de cada vez.');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-anotata-text/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-anotata-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-anotata-roxo to-anotata-roxo-escuro flex items-center justify-center shrink-0">
            <Package size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-anotata-text truncate">
              Exportar em lote
            </h3>
            <p className="text-xs text-anotata-text-suave truncate">
              {exportLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 text-anotata-muted hover:text-anotata-text rounded hover:bg-anotata-hover disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Resumo */}
          <div className="bg-anotata-lavanda-clara rounded-lg p-3 flex items-center gap-3">
            <FileText size={16} className="text-anotata-roxo shrink-0" />
            <div className="text-xs text-anotata-text-suave flex-1">
              <strong className="text-anotata-text">{notesToExport.length}</strong>{' '}
              {notesToExport.length === 1 ? 'nota' : 'notas'}
              {' · '}
              <strong className="text-anotata-text">{wordCount.toLocaleString('pt-BR')}</strong>{' '}
              {wordCount === 1 ? 'palavra' : 'palavras'}
            </div>
          </div>

          {/* Escopo */}
          <div>
            <label className="text-xs font-medium text-anotata-text-suave block mb-2">
              O que exportar
            </label>
            <div className="grid grid-cols-2 gap-2">
              <ScopeChip
                active={scope === 'all'}
                onClick={() => setScope('all')}
                label="Todas as notas"
                hint="ativas, sem lixeira/arquivadas"
              />
              <ScopeChip
                active={scope === 'favorites'}
                onClick={() => setScope('favorites')}
                label="Só favoritas"
                hint="estrela ligada"
              />
            </div>
          </div>

          {/* Formato */}
          <div>
            <label className="text-xs font-medium text-anotata-text-suave block mb-2">
              Formato dos arquivos
            </label>
            <div className="space-y-1.5">
              <FormatRow
                checked={format === 'md'}
                onClick={() => setFormat('md')}
                title="Markdown (.md)"
                hint="Mantém títulos, listas, links e formatação. Recomendado."
              />
              <FormatRow
                checked={format === 'txt'}
                onClick={() => setFormat('txt')}
                title="Texto puro (.txt)"
                hint="Texto sem formatação. Pra abrir em qualquer lugar."
              />
              <FormatRow
                checked={format === 'both'}
                onClick={() => setFormat('both')}
                title="Os dois (.md + .txt)"
                hint="Pacote duplo — máxima compatibilidade."
              />
            </div>
          </div>

          {/* Aviso quando lista vazia */}
          {notesToExport.length === 0 && (
            <div className="text-xs text-anotata-goiaba bg-anotata-goiaba-bg rounded-lg p-3">
              ⚠️ Nenhuma nota corresponde aos filtros escolhidos. Tente "Todas as notas".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-anotata-lavanda-clara border-t border-anotata-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-sm text-anotata-text-suave hover:text-anotata-text rounded-lg hover:bg-white transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={notesToExport.length === 0 || busy}
            className="px-5 py-2 bg-anotata-roxo text-white text-sm font-medium rounded-lg hover:bg-anotata-roxo-escuro disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 min-w-[140px] justify-center"
          >
            {busy && !done && (
              <>
                <Loader2 size={14} className="animate-spin" />
                Gerando...
              </>
            )}
            {done && (
              <>
                <Check size={14} />
                Pronto
              </>
            )}
            {!busy && !done && (
              <>
                <Download size={14} />
                Exportar agora
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScopeChip({ active, onClick, label, hint }) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-lg border text-left transition-all ${
        active
          ? 'border-anotata-roxo bg-anotata-lavanda-clara ring-2 ring-anotata-roxo/20'
          : 'border-anotata-border bg-white hover:border-anotata-roxo/40'
      }`}
    >
      <div className={`text-sm font-medium ${active ? 'text-anotata-roxo' : 'text-anotata-text'}`}>
        {label}
      </div>
      <div className="text-2xs text-anotata-muted mt-0.5">{hint}</div>
    </button>
  );
}

function FormatRow({ checked, onClick, title, hint }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-start gap-3 ${
        checked
          ? 'border-anotata-roxo bg-anotata-lavanda-clara ring-2 ring-anotata-roxo/20'
          : 'border-anotata-border bg-white hover:border-anotata-roxo/40'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
          checked ? 'border-anotata-roxo bg-anotata-roxo' : 'border-anotata-border bg-white'
        }`}
      >
        {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${checked ? 'text-anotata-roxo' : 'text-anotata-text'}`}>
          {title}
        </div>
        <div className="text-2xs text-anotata-muted mt-0.5">{hint}</div>
      </div>
    </button>
  );
}
