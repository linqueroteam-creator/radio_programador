import React, { useMemo } from 'react';
import {
  FileText, Star, Trash2, BookOpen, Tag, TrendingUp,
  Clock, Activity, Calendar, Edit3, Plus, Brain, SpellCheck
} from 'lucide-react';
import grammarEngine from '../engine/GrammarEngine';
import predictiveEngine from '../engine/PredictiveEngine';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(text) {
  if (!text) return 0;
  return stripHtml(text).split(/\s+/).filter(w => w.length > 0).length;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getDayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Dashboard({ store }) {
  const stats = useMemo(() => {
    const activeNotes = store.notes.filter(n => !n.isTrash);
    const trashedNotes = store.notes.filter(n => n.isTrash);
    const favoriteNotes = activeNotes.filter(n => n.isFavorite);

    // Total de palavras escritas
    const totalWords = activeNotes.reduce((sum, n) => sum + countWords(n.content), 0);
    const totalChars = activeNotes.reduce((sum, n) => sum + stripHtml(n.content).length, 0);

    // Notas por caderno
    const byNotebook = store.notebooks.map(nb => ({
      ...nb,
      count: activeNotes.filter(n => n.notebookId === nb.id).length,
    }));

    // Atividade dos últimos 7 dias
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getDayKey(d);
      const count = store.notes.filter(n => getDayKey(n.updatedAt) === key).length;
      last7Days.push({
        date: d,
        label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3),
        count,
        isToday: i === 0,
      });
    }
    const maxDayCount = Math.max(...last7Days.map(d => d.count), 1);

    // Notas mais recentes
    const recentNotes = [...activeNotes]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5);

    // Tags mais usadas
    const tagFrequency = {};
    activeNotes.forEach(n => {
      n.tags.forEach(t => { tagFrequency[t] = (tagFrequency[t] || 0) + 1; });
    });
    const topTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Engines stats
    const grammarStats = grammarEngine.getStats();
    const predictiveStats = predictiveEngine.getStats();

    // Streak (dias consecutivos com escrita)
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getDayKey(d);
      const hasNote = store.notes.some(n => getDayKey(n.updatedAt) === key);
      if (hasNote) streak++;
      else if (i > 0) break;
    }

    return {
      total: activeNotes.length,
      trashed: trashedNotes.length,
      favorites: favoriteNotes.length,
      totalWords,
      totalChars,
      byNotebook,
      last7Days,
      maxDayCount,
      recentNotes,
      topTags,
      grammarStats,
      predictiveStats,
      streak,
    };
  }, [store.notes, store.notebooks]);

  const greetings = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return (
    <div className="flex-1 overflow-y-auto bg-anotata-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-anotata-roxo to-anotata-roxo-claro px-8 py-6 text-white">
        <h1 className="text-2xl font-bold mb-1">{greetings}! ✨</h1>
        <p className="text-sm text-white/80">
          Você tem {stats.total} {stats.total === 1 ? 'nota ativa' : 'notas ativas'} • {stats.totalWords.toLocaleString('pt-BR')} palavras escritas
        </p>
      </div>

      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText size={20} />}
            label="Notas"
            value={stats.total}
            color="#5B2D8E"
            onClick={() => { store.setCurrentView('all'); store.setSelectedNoteId(null); }}
          />
          <StatCard
            icon={<Star size={20} />}
            label="Favoritas"
            value={stats.favorites}
            color="#E8637C"
            onClick={() => { store.setCurrentView('favorites'); store.setSelectedNoteId(null); }}
          />
          <StatCard
            icon={<BookOpen size={20} />}
            label="Cadernos"
            value={store.notebooks.length}
            color="#7C4DC9"
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Sequência"
            value={`${stats.streak} ${stats.streak === 1 ? 'dia' : 'dias'}`}
            color="#5B2D8E"
            subtitle="consecutivos"
          />
        </div>

        {/* Atividade dos últimos 7 dias */}
        <Section icon={<Activity size={16} />} title="Atividade dos últimos 7 dias">
          <div className="bg-white rounded-xl border border-anotata-border p-5">
            <div className="flex items-end justify-between gap-2 h-32">
              {stats.last7Days.map((day, idx) => {
                const heightPct = day.count === 0 ? 4 : (day.count / stats.maxDayCount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '100px' }}>
                      <div className="text-2xs text-anotata-muted mb-1">
                        {day.count > 0 ? day.count : ''}
                      </div>
                      <div
                        className={`w-full rounded-t transition-all ${
                          day.isToday ? 'bg-anotata-goiaba' : 'bg-anotata-roxo'
                        } ${day.count === 0 ? 'opacity-20' : ''}`}
                        style={{ height: `${heightPct}%`, minHeight: '4px' }}
                      ></div>
                    </div>
                    <div className={`text-xs uppercase ${day.isToday ? 'text-anotata-goiaba font-bold' : 'text-anotata-text-suave'}`}>
                      {day.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* Grid de cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Notas recentes */}
          <Section icon={<Clock size={16} />} title="Notas recentes">
            <div className="bg-white rounded-xl border border-anotata-border overflow-hidden">
              {stats.recentNotes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-anotata-muted mb-3">Nenhuma nota ainda</p>
                  <button
                    onClick={() => store.createNote()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-anotata-roxo text-white rounded-lg hover:bg-anotata-roxo-escuro text-sm transition-colors"
                  >
                    <Plus size={14} />
                    Criar primeira nota
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-anotata-border">
                  {stats.recentNotes.map(note => {
                    const nb = store.notebooks.find(n => n.id === note.notebookId);
                    return (
                      <button
                        key={note.id}
                        onClick={() => {
                          store.setCurrentView('all');
                          store.setSelectedNoteId(note.id);
                        }}
                        className="w-full text-left p-3 hover:bg-anotata-hover transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {nb && (
                            <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: nb.color }}></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-anotata-text truncate">
                                {note.title || 'Sem título'}
                              </h4>
                              {note.isFavorite && <Star size={10} className="text-anotata-favorite fill-anotata-favorite" />}
                            </div>
                            <p className="text-xs text-anotata-muted truncate mt-0.5">
                              {stripHtml(note.content).slice(0, 80) || 'Vazia...'}
                            </p>
                            <p className="text-2xs text-anotata-muted mt-1">
                              {formatDate(note.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>

          {/* Cadernos */}
          <Section icon={<BookOpen size={16} />} title="Seus cadernos">
            <div className="bg-white rounded-xl border border-anotata-border p-3 space-y-1">
              {stats.byNotebook.map(nb => (
                <button
                  key={nb.id}
                  onClick={() => {
                    store.setCurrentView('notebook');
                    store.setCurrentNotebookId(nb.id);
                    store.setSelectedNoteId(null);
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-anotata-hover transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: nb.color + '20' }}>
                    <BookOpen size={14} style={{ color: nb.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-anotata-text truncate">{nb.name}</div>
                    <div className="text-xs text-anotata-muted">{nb.count} {nb.count === 1 ? 'nota' : 'notas'}</div>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* Tags mais usadas */}
          <Section icon={<Tag size={16} />} title="Tags mais usadas">
            <div className="bg-white rounded-xl border border-anotata-border p-4">
              {stats.topTags.length === 0 ? (
                <p className="text-sm text-anotata-muted text-center py-4">
                  Nenhuma tag em uso
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.topTags.map(([tag, count]) => (
                    <button
                      key={tag}
                      onClick={() => {
                        store.setCurrentView('tag');
                        store.setCurrentTagFilter(tag);
                        store.setSelectedNoteId(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-anotata-lavanda-clara text-anotata-roxo rounded-full text-xs font-medium hover:bg-anotata-lavanda transition-colors"
                    >
                      <span>#{tag}</span>
                      <span className="text-2xs bg-anotata-roxo text-white rounded-full px-1.5 py-0.5">
                        {count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Cérebros (Engines) */}
          <Section icon={<Brain size={16} />} title="Inteligências locais">
            <div className="bg-white rounded-xl border border-anotata-border p-4 space-y-3">
              {/* Texto preditivo */}
              <div className="p-3 bg-anotata-lavanda-clara rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Brain size={14} className="text-anotata-roxo" />
                  <span className="text-xs font-semibold text-anotata-text">Texto Preditivo</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-2">
                  <div>
                    <div className="text-base font-bold text-anotata-roxo">{stats.predictiveStats.vocabulario}</div>
                    <div className="text-2xs text-anotata-muted">palavras</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-anotata-roxo">{stats.predictiveStats.pares}</div>
                    <div className="text-2xs text-anotata-muted">pares</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-anotata-roxo">{stats.predictiveStats.trios}</div>
                    <div className="text-2xs text-anotata-muted">trios</div>
                  </div>
                </div>
              </div>

              {/* Corretor */}
              <div className="p-3 bg-anotata-lavanda-clara rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <SpellCheck size={14} className="text-anotata-roxo" />
                  <span className="text-xs font-semibold text-anotata-text">Corretor Gramatical</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-2">
                  <div>
                    <div className="text-base font-bold text-anotata-roxo">{stats.grammarStats.totalChecks}</div>
                    <div className="text-2xs text-anotata-muted">análises</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-anotata-goiaba">{stats.grammarStats.sessionErrors}</div>
                    <div className="text-2xs text-anotata-muted">correções</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-anotata-roxo">{stats.grammarStats.cacheSize}</div>
                    <div className="text-2xs text-anotata-muted">em cache</div>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Resumo final */}
        <div className="bg-white rounded-xl border border-anotata-border p-6 text-center">
          <p className="text-sm text-anotata-text-suave">
            Você já escreveu <span className="font-bold text-anotata-roxo">{stats.totalWords.toLocaleString('pt-BR')} palavras</span> em <span className="font-bold text-anotata-goiaba">{stats.total} notas</span>.
          </p>
          <p className="text-xs text-anotata-muted mt-1">
            Continue escrevendo, sua sequência atual é de {stats.streak} {stats.streak === 1 ? 'dia' : 'dias'} 🔥
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, subtitle, onClick }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`bg-white rounded-xl border border-anotata-border p-4 text-left ${
        onClick ? 'hover:border-anotata-roxo hover:shadow-md cursor-pointer transition-all' : ''
      }`}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
        style={{ backgroundColor: color + '15', color: color }}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold text-anotata-text">{value}</div>
      <div className="text-xs text-anotata-muted">
        {label}
        {subtitle && <span className="block text-2xs">{subtitle}</span>}
      </div>
    </Comp>
  );
}

function Section({ icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-anotata-roxo">{icon}</span>
        <h2 className="text-sm font-semibold text-anotata-text uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}
