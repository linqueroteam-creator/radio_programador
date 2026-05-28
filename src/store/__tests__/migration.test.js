/**
 * Testes da migração v2 → v3 do store.
 *
 * Spec: docs/HIERARQUIA-AREAS-PROJETOS-CADERNOS-NOTAS.md
 *
 * Princípios validados:
 *   - Silenciosa: rodar não quebra estado existente
 *   - Idempotente: rodar 2x dá o mesmo resultado
 *   - Não destrutiva: nenhum dado é apagado
 *   - lifeArea deduzido pela maioria das notas
 *   - projects: [] sempre presente após migração
 */
import { describe, it, expect } from 'vitest';
import {
  _migrateNotebook as migrateNotebook,
  _needsMigrationToV3 as needsMigrationToV3,
  _applyMigrationV3 as applyMigrationV3,
} from '../useStore.js';

// Helper: monta um caderno mínimo no formato v2 (sem lifeArea/projectId).
function makeNotebookV2(id, name = 'Caderno') {
  return { id, name, color: '#5B2D8E', createdAt: '2026-01-01T00:00:00Z' };
}

// Helper: monta uma nota mínima.
function makeNote(id, notebookId, lifeArea = 'outros') {
  return { id, title: `Nota ${id}`, content: '', notebookId, lifeArea };
}

describe('migrateNotebook — inferência de lifeArea pela maioria', () => {
  it('caderno sem notas → lifeArea = "outros" e projectId = null', () => {
    const nb = makeNotebookV2('nb-1');
    const result = migrateNotebook(nb, []);
    expect(result.lifeArea).toBe('outros');
    expect(result.projectId).toBeNull();
    expect(result.id).toBe('nb-1');
    expect(result.name).toBe('Caderno');
  });

  it('caderno com 3 notas de "saude" → lifeArea = "saude"', () => {
    const nb = makeNotebookV2('nb-1');
    const notes = [
      makeNote('n1', 'nb-1', 'saude'),
      makeNote('n2', 'nb-1', 'saude'),
      makeNote('n3', 'nb-1', 'saude'),
    ];
    const result = migrateNotebook(nb, notes);
    expect(result.lifeArea).toBe('saude');
  });

  it('caderno com 2 notas "carreira" e 1 "lar" → lifeArea = "carreira" (maioria)', () => {
    const nb = makeNotebookV2('nb-1');
    const notes = [
      makeNote('n1', 'nb-1', 'carreira'),
      makeNote('n2', 'nb-1', 'carreira'),
      makeNote('n3', 'nb-1', 'lar'),
    ];
    const result = migrateNotebook(nb, notes);
    expect(result.lifeArea).toBe('carreira');
  });

  it('caderno com notas só de OUTRO caderno → lifeArea = "outros"', () => {
    const nb = makeNotebookV2('nb-1');
    const notes = [
      makeNote('n1', 'nb-OUTRO', 'saude'),
      makeNote('n2', 'nb-OUTRO', 'carreira'),
    ];
    const result = migrateNotebook(nb, notes);
    expect(result.lifeArea).toBe('outros');
  });

  it('preserva todos os campos antigos do caderno (não destrutivo)', () => {
    const nb = { id: 'nb-1', name: 'X', color: '#FFF', createdAt: '2026-01-01T00:00:00Z', extra: 'campoCustom' };
    const result = migrateNotebook(nb, []);
    expect(result.id).toBe('nb-1');
    expect(result.name).toBe('X');
    expect(result.color).toBe('#FFF');
    expect(result.createdAt).toBe('2026-01-01T00:00:00Z');
    expect(result.extra).toBe('campoCustom');
  });

  it('idempotente: rodar duas vezes dá o mesmo resultado', () => {
    const nb = makeNotebookV2('nb-1');
    const notes = [makeNote('n1', 'nb-1', 'saude')];
    const r1 = migrateNotebook(nb, notes);
    const r2 = migrateNotebook(r1, notes);
    expect(r2).toEqual(r1);
  });

  it('idempotente: caderno já migrado mantém lifeArea original (não recalcula)', () => {
    const nb = { ...makeNotebookV2('nb-1'), lifeArea: 'lar', projectId: null };
    // Mesmo com notas indicando "saude", caderno já marcado fica como "lar".
    const notes = [makeNote('n1', 'nb-1', 'saude'), makeNote('n2', 'nb-1', 'saude')];
    const result = migrateNotebook(nb, notes);
    expect(result.lifeArea).toBe('lar');
    expect(result.projectId).toBeNull();
  });
});

describe('needsMigrationToV3 — detecta estados que precisam migrar', () => {
  it('schemaVersion < 3 precisa migrar', () => {
    expect(needsMigrationToV3({ schemaVersion: 2, notebooks: [], projects: [] })).toBe(true);
    expect(needsMigrationToV3({ schemaVersion: 1, notebooks: [], projects: [] })).toBe(true);
    expect(needsMigrationToV3({ notebooks: [], projects: [] })).toBe(true); // sem versão
  });

  it('estado v3 completo NÃO precisa migrar', () => {
    const v3 = {
      schemaVersion: 3,
      projects: [],
      notebooks: [{ id: 'a', name: 'A', color: '#000', lifeArea: 'outros', projectId: null }],
    };
    expect(needsMigrationToV3(v3)).toBe(false);
  });

  it('falta projects → precisa migrar', () => {
    expect(needsMigrationToV3({ schemaVersion: 3, notebooks: [] })).toBe(true);
  });

  it('caderno sem lifeArea → precisa migrar', () => {
    const semArea = {
      schemaVersion: 3,
      projects: [],
      notebooks: [{ id: 'a', name: 'A', color: '#000', projectId: null }], // falta lifeArea
    };
    expect(needsMigrationToV3(semArea)).toBe(true);
  });

  it('caderno sem projectId → precisa migrar', () => {
    const semProj = {
      schemaVersion: 3,
      projects: [],
      notebooks: [{ id: 'a', name: 'A', color: '#000', lifeArea: 'outros' }], // falta projectId
    };
    expect(needsMigrationToV3(semProj)).toBe(true);
  });

  it('null/undefined → não precisa migrar (defensivo)', () => {
    expect(needsMigrationToV3(null)).toBe(false);
    expect(needsMigrationToV3(undefined)).toBe(false);
  });
});

describe('applyMigrationV3 — migração completa de estado', () => {
  it('estado v2 inteiro → v3 com projects e cadernos completos', () => {
    const v2 = {
      schemaVersion: 2,
      notebooks: [
        makeNotebookV2('nb-1', 'Receitas'),
        makeNotebookV2('nb-2', 'Trabalho'),
      ],
      notes: [
        makeNote('n1', 'nb-1', 'lar'),
        makeNote('n2', 'nb-1', 'lar'),
        makeNote('n3', 'nb-2', 'carreira'),
      ],
      tags: ['x'],
      categories: [],
    };
    const v3 = applyMigrationV3(v2);
    expect(v3.schemaVersion).toBe(3);
    expect(v3.projects).toEqual([]);
    expect(v3.notebooks).toHaveLength(2);
    expect(v3.notebooks[0].lifeArea).toBe('lar');     // 2 notas "lar"
    expect(v3.notebooks[0].projectId).toBeNull();
    expect(v3.notebooks[1].lifeArea).toBe('carreira'); // 1 nota "carreira"
    expect(v3.notebooks[1].projectId).toBeNull();
    // Notas e tags intactas
    expect(v3.notes).toEqual(v2.notes);
    expect(v3.tags).toEqual(['x']);
  });

  it('idempotente: rodar applyMigrationV3 duas vezes dá o mesmo resultado', () => {
    const v2 = {
      schemaVersion: 2,
      notebooks: [makeNotebookV2('nb-1')],
      notes: [makeNote('n1', 'nb-1', 'saude')],
    };
    const v3a = applyMigrationV3(v2);
    const v3b = applyMigrationV3(v3a);
    expect(v3b).toEqual(v3a);
  });

  it('estado sem notebooks ou notes → cria projects: [] e mantém', () => {
    const v3 = applyMigrationV3({ schemaVersion: 2 });
    expect(v3.projects).toEqual([]);
    expect(v3.notebooks).toEqual([]);
    expect(v3.schemaVersion).toBe(3);
  });

  it('preserva projects existentes se já houver (ex: re-migração)', () => {
    const v3in = {
      schemaVersion: 3,
      projects: [{ id: 'p-1', title: 'P1', lifeArea: 'carreira' }],
      notebooks: [{ id: 'nb-1', name: 'N', color: '#000' }], // sem lifeArea/projectId
      notes: [],
    };
    const v3out = applyMigrationV3(v3in);
    expect(v3out.projects).toHaveLength(1);
    expect(v3out.projects[0].id).toBe('p-1');
    expect(v3out.notebooks[0].lifeArea).toBe('outros');
    expect(v3out.notebooks[0].projectId).toBeNull();
  });
});
