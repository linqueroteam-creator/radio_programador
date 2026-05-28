/**
 * @vitest-environment jsdom
 */
/**
 * Testes do CRUD de Projetos (PR C).
 *
 * Spec: docs/HIERARQUIA-AREAS-PROJETOS-CADERNOS-NOTAS.md
 *
 * Valida:
 *   - createProject: cria com título + lifeArea obrigatórios
 *   - updateProject: atualiza campos parcialmente
 *   - archiveProject / unarchiveProject
 *   - deleteProject: remove projeto, cadernos viram avulsos
 *   - getProjectById, getProjectNotebooks, getProjectNoteCount
 *   - assignNotebookToProject
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../useStore.js';

// Helper: renderiza o hook e retorna o result
function setup() {
  // Limpa localStorage pra cada teste ter estado limpo
  localStorage.clear();
  return renderHook(() => useStore());
}

describe('createProject', () => {
  it('cria projeto com título e lifeArea, retorna id', () => {
    const { result } = setup();
    let id;
    act(() => { id = result.current.createProject('Meu Projeto', 'carreira'); });
    expect(id).toBeTruthy();
    expect(result.current.projects).toHaveLength(1);
    expect(result.current.projects[0].title).toBe('Meu Projeto');
    expect(result.current.projects[0].lifeArea).toBe('carreira');
    expect(result.current.projects[0].archived).toBe(false);
  });

  it('retorna null se título vazio', () => {
    const { result } = setup();
    let id;
    act(() => { id = result.current.createProject('', 'carreira'); });
    expect(id).toBeNull();
    expect(result.current.projects).toHaveLength(0);
  });

  it('retorna null se lifeArea ausente', () => {
    const { result } = setup();
    let id;
    act(() => { id = result.current.createProject('Projeto', null); });
    expect(id).toBeNull();
  });

  it('aceita campos extras (description, coverEmoji, color)', () => {
    const { result } = setup();
    act(() => {
      result.current.createProject('P', 'lar', {
        description: 'Desc', coverEmoji: '🏠', color: '#FF0000',
      });
    });
    const p = result.current.projects[0];
    expect(p.description).toBe('Desc');
    expect(p.coverEmoji).toBe('🏠');
    expect(p.color).toBe('#FF0000');
  });
});

describe('updateProject', () => {
  it('atualiza título parcialmente', () => {
    const { result } = setup();
    let id;
    act(() => { id = result.current.createProject('Original', 'carreira'); });
    act(() => { result.current.updateProject(id, { title: 'Novo' }); });
    expect(result.current.projects[0].title).toBe('Novo');
    expect(result.current.projects[0].lifeArea).toBe('carreira'); // não mudou
  });

  it('atualiza updatedAt automaticamente', () => {
    const { result } = setup();
    let id;
    act(() => { id = result.current.createProject('P', 'saude'); });
    // Verifica que updatedAt existe e é string ISO
    act(() => { result.current.updateProject(id, { description: 'X' }); });
    expect(result.current.projects[0].updatedAt).toBeTruthy();
    expect(typeof result.current.projects[0].updatedAt).toBe('string');
  });
});

describe('archiveProject / unarchiveProject', () => {
  it('arquiva e desarquiva', () => {
    const { result } = setup();
    let id;
    act(() => { id = result.current.createProject('P', 'carreira'); });
    expect(result.current.projects[0].archived).toBe(false);
    act(() => { result.current.archiveProject(id); });
    expect(result.current.projects[0].archived).toBe(true);
    act(() => { result.current.unarchiveProject(id); });
    expect(result.current.projects[0].archived).toBe(false);
  });
});

describe('deleteProject', () => {
  it('remove projeto e cadernos viram avulsos (projectId = null)', () => {
    const { result } = setup();
    let projId, nbId;
    act(() => { projId = result.current.createProject('P', 'carreira'); });
    act(() => { nbId = result.current.createNotebook('Caderno', '#000', { projectId: projId }); });

    // Confirma vínculo
    const nbBefore = result.current.notebooks.find(nb => nb.id === nbId);
    expect(nbBefore.projectId).toBe(projId);

    // Exclui projeto
    act(() => { result.current.deleteProject(projId); });
    expect(result.current.projects).toHaveLength(0);

    // Caderno virou avulso — não foi excluído
    const nbAfter = result.current.notebooks.find(nb => nb.id === nbId);
    expect(nbAfter).toBeTruthy();
    expect(nbAfter.projectId).toBeNull();
  });

  it('não faz nada com id nulo', () => {
    const { result } = setup();
    act(() => { result.current.createProject('P', 'carreira'); });
    act(() => { result.current.deleteProject(null); });
    expect(result.current.projects).toHaveLength(1);
  });
});

describe('getProjectById / getProjectNotebooks / getProjectNoteCount', () => {
  it('getProjectById retorna o projeto correto', () => {
    const { result } = setup();
    let id;
    act(() => { id = result.current.createProject('P', 'carreira'); });
    const p = result.current.getProjectById(id);
    expect(p.title).toBe('P');
  });

  it('getProjectNotebooks retorna cadernos do projeto', () => {
    const { result } = setup();
    let projId;
    act(() => { projId = result.current.createProject('P', 'carreira'); });
    act(() => { result.current.createNotebook('Nb1', '#000', { projectId: projId }); });
    act(() => { result.current.createNotebook('Nb2', '#FFF', { projectId: projId }); });
    act(() => { result.current.createNotebook('Avulso', '#AAA'); }); // sem projeto

    const nbs = result.current.getProjectNotebooks(projId);
    expect(nbs).toHaveLength(2);
    expect(nbs.map(nb => nb.name).sort()).toEqual(['Nb1', 'Nb2']);
  });

  it('getProjectNoteCount conta notas dos cadernos do projeto', () => {
    const { result } = setup();
    let projId, nbId;
    act(() => { projId = result.current.createProject('P', 'carreira'); });
    act(() => { nbId = result.current.createNotebook('Nb', '#000', { projectId: projId }); });
    act(() => { result.current.createNote(nbId, { title: 'N1' }); });
    act(() => { result.current.createNote(nbId, { title: 'N2' }); });
    act(() => { result.current.createNote('default', { title: 'Outra' }); }); // não conta

    const count = result.current.getProjectNoteCount(projId);
    expect(count).toBe(2);
  });
});

describe('assignNotebookToProject', () => {
  it('vincula caderno existente a um projeto', () => {
    const { result } = setup();
    let projId, nbId;
    act(() => { projId = result.current.createProject('P', 'carreira'); });
    act(() => { nbId = result.current.createNotebook('Nb', '#000'); }); // avulso

    act(() => { result.current.assignNotebookToProject(nbId, projId); });
    const nb = result.current.notebooks.find(n => n.id === nbId);
    expect(nb.projectId).toBe(projId);
  });

  it('desvincula caderno passando null', () => {
    const { result } = setup();
    let projId, nbId;
    act(() => { projId = result.current.createProject('P', 'carreira'); });
    act(() => { nbId = result.current.createNotebook('Nb', '#000', { projectId: projId }); });

    act(() => { result.current.assignNotebookToProject(nbId, null); });
    const nb = result.current.notebooks.find(n => n.id === nbId);
    expect(nb.projectId).toBeNull();
  });
});
