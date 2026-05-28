import React, { useState, useCallback, useMemo } from 'react';
import { Plus, FolderOpen, BookOpen, MoreVertical, Archive, Trash2, Pencil, ArrowLeft } from 'lucide-react';
import { LIFE_AREAS, listLifeAreas } from '../engine/LifeAreas';

/**
 * Tela de Projetos — PR D
 *
 * Spec: docs/HIERARQUIA-AREAS-PROJETOS-CADERNOS-NOTAS.md
 * Neuros consultados: NeuroEstética (#9 minimalismo, #19 calma, #23 silêncio),
 *   NeuroArquitetura (#6 hierarquia), Regra de Cor (camada 2 — cor da área).
 *
 * Princípios aplicados:
 *   - Minimalismo cognitivo estético: poucos elementos, muita respiração
 *   - Hierarquia espacial: projetos como cards dominantes, cadernos subordinados
 *   - Cor da área como assinatura: borda lateral colorida por área
 *   - Estética da calma: muito espaço branco, sem ruído visual
 *   - NeuroSilêncio estético: vazio como parte da experiência
 */

// === MODAL DE CRIAR/EDITAR PROJETO ===
function ProjectModal({ isOpen, onClose, onSave, initial = null }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [lifeArea, setLifeArea] = useState(initial?.lifeArea || '');
  const [emoji, setEmoji] = useState(initial?.coverEmoji || '');
  const [description, setDescription] = useState(initial?.description || '');

  const areas = useMemo(() => listLifeAreas(), []);

  const handleSave = () => {
    if (!title.trim() || !lifeArea) return;
    onSave({
      title: title.trim(),
      lifeArea,
      coverEmoji: emoji || null,
      description: description.trim(),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-anotata-text mb-4">
          {initial ? 'Editar Projeto' : 'Novo Projeto'}
        </h2>

        {/* Título */}
        <label className="block text-xs font-medium text-anotata-muted mb-1">Nome do projeto</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Lançar curso de neurodesign"
          className="w-full px-3 py-2 rounded-lg border border-anotata-border bg-anotata-bg text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:ring-2 focus:ring-purple-300 mb-3"
          autoFocus
        />

        {/* Área da vida */}
        <label className="block text-xs font-medium text-anotata-muted mb-1">Área da vida</label>
        <select
          value={lifeArea}
          onChange={(e) => setLifeArea(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-anotata-border bg-anotata-bg text-sm text-anotata-text focus:outline-none focus:ring-2 focus:ring-purple-300 mb-3"
        >
          <option value="">Selecione...</option>
          {areas.map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>

        {/* Emoji (opcional) */}
        <label className="block text-xs font-medium text-anotata-muted mb-1">Emoji (opcional)</label>
        <input
          type="text"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
          placeholder="🚀"
          className="w-16 px-3 py-2 rounded-lg border border-anotata-border bg-anotata-bg text-center text-lg focus:outline-none focus:ring-2 focus:ring-purple-300 mb-3"
        />

        {/* Descrição (opcional) */}
        <label className="block text-xs font-medium text-anotata-muted mb-1">Descrição (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve descrição do projeto..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-anotata-border bg-anotata-bg text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:ring-2 focus:ring-purple-300 mb-4 resize-none"
        />

        {/* Botões */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-anotata-muted hover:text-anotata-text transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || !lifeArea}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5B2D8E] rounded-lg hover:bg-[#7B4DBA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {initial ? 'Salvar' : 'Criar Projeto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// === CARD DE PROJETO ===
function ProjectCard({ project, notebooks, noteCount, onEdit, onArchive, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const area = LIFE_AREAS[project.lifeArea];
  const areaColor = area?.color || '#6B7280';

  return (
    <div
      className="relative bg-white rounded-xl border border-anotata-border shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
      style={{ borderLeftWidth: 4, borderLeftColor: areaColor }}
    >
      {/* Header do card */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {project.coverEmoji && (
              <span className="text-xl">{project.coverEmoji}</span>
            )}
            <h3 className="text-sm font-semibold text-anotata-text leading-tight">
              {project.title}
            </h3>
          </div>

          {/* Menu de ações (sutil, aparece no hover) */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-md text-anotata-muted hover:text-anotata-text hover:bg-anotata-bg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 bg-white rounded-lg border border-anotata-border shadow-lg z-10 py-1 min-w-[140px]">
                <button
                  onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-anotata-text hover:bg-anotata-bg"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onArchive(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-anotata-text hover:bg-anotata-bg"
                >
                  <Archive size={12} /> Arquivar
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Descrição (se houver) */}
        {project.description && (
          <p className="text-xs text-anotata-muted mt-1 line-clamp-2">{project.description}</p>
        )}
      </div>

      {/* Cadernos do projeto */}
      <div className="px-4 pb-3">
        {notebooks.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {notebooks.slice(0, 4).map(nb => (
              <span
                key={nb.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium"
                style={{ backgroundColor: nb.color + '15', color: nb.color }}
              >
                <BookOpen size={9} />
                {nb.name}
              </span>
            ))}
            {notebooks.length > 4 && (
              <span className="text-2xs text-anotata-muted">+{notebooks.length - 4}</span>
            )}
          </div>
        ) : (
          <p className="text-2xs text-anotata-muted italic mt-1">Nenhum caderno ainda</p>
        )}
      </div>

      {/* Footer: área + contagem */}
      <div className="px-4 py-2 border-t border-anotata-border/50 flex items-center justify-between">
        <span
          className="text-2xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: areaColor + '15', color: areaColor }}
        >
          {area?.label || 'Outros'}
        </span>
        <span className="text-2xs text-anotata-muted">
          {noteCount} {noteCount === 1 ? 'nota' : 'notas'}
        </span>
      </div>
    </div>
  );
}

// === TELA PRINCIPAL ===
export default function Projects({ store, onOpenMobileMenu }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [filterArea, setFilterArea] = useState('');

  const areas = useMemo(() => listLifeAreas(), []);

  // Projetos ativos (não arquivados), opcionalmente filtrados por área
  const visibleProjects = useMemo(() => {
    const all = (store.projects || []).filter(p => !p.archived);
    if (!filterArea) return all;
    return all.filter(p => p.lifeArea === filterArea);
  }, [store.projects, filterArea]);

  const handleCreate = useCallback((data) => {
    store.createProject(data.title, data.lifeArea, {
      description: data.description,
      coverEmoji: data.coverEmoji,
    });
  }, [store]);

  const handleEdit = useCallback((data) => {
    if (!editingProject) return;
    store.updateProject(editingProject.id, data);
    setEditingProject(null);
  }, [store, editingProject]);

  const handleArchive = useCallback((id) => {
    store.archiveProject(id);
  }, [store]);

  const handleDelete = useCallback((id) => {
    if (window.confirm('Excluir projeto? Os cadernos dentro dele não serão excluídos — ficarão avulsos.')) {
      store.deleteProject(id);
    }
  }, [store]);

  return (
    <div className="flex-1 overflow-y-auto bg-anotata-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-anotata-bg/80 backdrop-blur-sm border-b border-anotata-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onOpenMobileMenu && (
              <button onClick={onOpenMobileMenu} className="p-1.5 rounded-lg hover:bg-white/60 text-anotata-muted">
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <FolderOpen size={20} className="text-[#5B2D8E]" />
              <h1 className="text-lg font-semibold text-anotata-text">Projetos</h1>
            </div>
          </div>

          <button
            onClick={() => { setEditingProject(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#5B2D8E] rounded-lg hover:bg-[#7B4DBA] transition-colors"
          >
            <Plus size={14} />
            Novo Projeto
          </button>
        </div>

        {/* Filtro por área (chips) */}
        {visibleProjects.length > 0 && (
          <div className="max-w-4xl mx-auto px-6 pb-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterArea('')}
              className={`px-2.5 py-1 rounded-full text-2xs font-medium transition-colors ${
                !filterArea ? 'bg-[#5B2D8E] text-white' : 'bg-white text-anotata-muted border border-anotata-border hover:bg-anotata-bg'
              }`}
            >
              Todos
            </button>
            {areas.map(a => (
              <button
                key={a.id}
                onClick={() => setFilterArea(filterArea === a.id ? '' : a.id)}
                className={`px-2.5 py-1 rounded-full text-2xs font-medium transition-colors ${
                  filterArea === a.id
                    ? 'text-white'
                    : 'bg-white text-anotata-muted border border-anotata-border hover:bg-anotata-bg'
                }`}
                style={filterArea === a.id ? { backgroundColor: a.color } : {}}
              >
                {a.shortName || a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {visibleProjects.length === 0 ? (
          /* Estado vazio — NeuroSilêncio estético */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen size={48} className="text-anotata-muted/40 mb-4" />
            <h2 className="text-base font-medium text-anotata-text mb-1">
              {filterArea ? 'Nenhum projeto nesta área' : 'Nenhum projeto ainda'}
            </h2>
            <p className="text-sm text-anotata-muted max-w-sm">
              Projetos agrupam cadernos que juntos formam algo concreto — um curso, uma reforma, uma jornada.
            </p>
            <button
              onClick={() => { setEditingProject(null); setModalOpen(true); }}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#5B2D8E] rounded-lg hover:bg-[#7B4DBA] transition-colors"
            >
              <Plus size={14} />
              Criar primeiro projeto
            </button>
          </div>
        ) : (
          /* Grid de projetos — respiração generosa entre cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                notebooks={store.getProjectNotebooks(project.id)}
                noteCount={store.getProjectNoteCount(project.id)}
                onEdit={() => { setEditingProject(project); setModalOpen(true); }}
                onArchive={() => handleArchive(project.id)}
                onDelete={() => handleDelete(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de criar/editar */}
      <ProjectModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProject(null); }}
        onSave={editingProject ? handleEdit : handleCreate}
        initial={editingProject}
      />
    </div>
  );
}
