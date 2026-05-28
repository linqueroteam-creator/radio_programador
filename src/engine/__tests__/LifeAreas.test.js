import { describe, it, expect } from 'vitest';
import {
  LIFE_AREAS,
  NOTE_STATES,
  getLifeArea,
  listLifeAreas,
  getAreaUsage,
  getActiveLifeAreas,
  calculateAreaGravity,
  getAreaTailwindTokens,
  getNoteState,
} from '../LifeAreas';

describe('LifeAreas — estrutura mestra', () => {
  it('contém exatamente 11 áreas (10 + outros)', () => {
    expect(Object.keys(LIFE_AREAS)).toHaveLength(11);
  });

  it('todas as áreas têm os campos essenciais', () => {
    Object.values(LIFE_AREAS).forEach((area) => {
      expect(area).toHaveProperty('id');
      expect(area).toHaveProperty('name');
      expect(area).toHaveProperty('icon');
      expect(area).toHaveProperty('color');
      expect(area).toHaveProperty('colorDark');
      expect(area).toHaveProperty('colorLight');
      expect(area).toHaveProperty('colorGlow');
      expect(area.color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  it('todas as 11 áreas têm cor base distinta (sem duplicatas)', () => {
    const colors = Object.values(LIFE_AREAS).map((a) => a.color);
    const unique = new Set(colors);
    expect(unique.size).toBe(11);
  });
});

describe('getLifeArea — defensivo', () => {
  it('retorna a área correta pelo id', () => {
    expect(getLifeArea('saude').name).toBe('Saúde & Corpo');
    expect(getLifeArea('carreira').name).toBe('Carreira & Trabalho');
  });

  it('retorna outros para id inválido/null/undefined', () => {
    expect(getLifeArea('inexistente').id).toBe('outros');
    expect(getLifeArea(null).id).toBe('outros');
    expect(getLifeArea(undefined).id).toBe('outros');
    expect(getLifeArea('').id).toBe('outros');
    expect(getLifeArea(123).id).toBe('outros');
  });
});

describe('listLifeAreas — ordem canônica', () => {
  it('lista todas as 11 áreas', () => {
    expect(listLifeAreas()).toHaveLength(11);
  });

  it('coloca outros no final', () => {
    const list = listLifeAreas();
    expect(list[list.length - 1].id).toBe('outros');
  });

  it('saude vem primeiro (order: 1)', () => {
    expect(listLifeAreas()[0].id).toBe('saude');
  });
});

describe('getAreaUsage — contagem segura', () => {
  it('conta corretamente Pulsos por área', () => {
    const notes = [
      { id: '1', lifeArea: 'saude', isTrash: false, isArchived: false },
      { id: '2', lifeArea: 'saude', isTrash: false, isArchived: false },
      { id: '3', lifeArea: 'carreira', isTrash: false, isArchived: false },
    ];
    const usage = getAreaUsage(notes);
    expect(usage.saude).toBe(2);
    expect(usage.carreira).toBe(1);
  });

  it('ignora Pulsos arquivados ou na lixeira', () => {
    const notes = [
      { id: '1', lifeArea: 'saude', isTrash: true },
      { id: '2', lifeArea: 'saude', isArchived: true },
      { id: '3', lifeArea: 'saude' },
    ];
    expect(getAreaUsage(notes).saude).toBe(1);
  });

  it('Pulsos sem lifeArea caem em outros', () => {
    const notes = [
      { id: '1' },
      { id: '2', lifeArea: null },
      { id: '3', lifeArea: 'inexistente' },
    ];
    expect(getAreaUsage(notes).outros).toBe(3);
  });

  it('aceita undefined e array vazio sem quebrar', () => {
    expect(getAreaUsage(undefined)).toEqual({});
    expect(getAreaUsage(null)).toEqual({});
    expect(getAreaUsage([])).toEqual({});
  });
});

describe('getActiveLifeAreas — filtra áreas vazias', () => {
  it('retorna apenas áreas que têm Pulsos', () => {
    const notes = [
      { id: '1', lifeArea: 'saude' },
      { id: '2', lifeArea: 'carreira' },
    ];
    const active = getActiveLifeAreas(notes);
    expect(active).toHaveLength(2);
    expect(active.map((a) => a.id).sort()).toEqual(['carreira', 'saude']);
  });

  it('inclui contagem de uso em cada área retornada', () => {
    const notes = [
      { id: '1', lifeArea: 'saude' },
      { id: '2', lifeArea: 'saude' },
      { id: '3', lifeArea: 'saude' },
    ];
    const active = getActiveLifeAreas(notes);
    expect(active[0].usage).toBe(3);
  });
});

describe('calculateAreaGravity — lei da gravidade', () => {
  it('área com mais Pulsos tem gravity 1.0', () => {
    const notes = [
      { id: '1', lifeArea: 'saude' },
      { id: '2', lifeArea: 'saude' },
      { id: '3', lifeArea: 'saude' },
      { id: '4', lifeArea: 'carreira' },
    ];
    const gravity = calculateAreaGravity(notes);
    expect(gravity.saude).toBe(1);
    expect(gravity.carreira).toBeCloseTo(1 / 3, 5);
  });

  it('retorna objeto vazio se não há notas', () => {
    expect(calculateAreaGravity([])).toEqual({});
  });
});

describe('getAreaTailwindTokens — geração de classes', () => {
  it('retorna tokens nomeados corretamente', () => {
    const tokens = getAreaTailwindTokens('saude');
    expect(tokens.bgLight).toBe('bg-area-saude-light');
    expect(tokens.textDark).toBe('text-area-saude-dark');
    expect(tokens.ringGlow).toBe('ring-area-saude-glow');
  });

  it('cai em outros para área inválida', () => {
    expect(getAreaTailwindTokens('xyz').bgBase).toBe('bg-area-outros-base');
  });
});

describe('NOTE_STATES e getNoteState', () => {
  it('contém os 7 estados canônicos', () => {
    const expected = ['critico', 'atencao', 'saudavel', 'informativo', 'esquecido', 'pulsando', 'favorito'];
    expected.forEach((s) => expect(NOTE_STATES[s]).toBeDefined());
  });

  it('cada estado tem cor, bg, dark e icon', () => {
    Object.values(NOTE_STATES).forEach((s) => {
      expect(s.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(s.bg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(s.dark).toMatch(/^#[0-9A-F]{6}$/i);
      expect(s.icon).toBeTruthy();
    });
  });

  it('getNoteState cai em informativo para id inválido', () => {
    expect(getNoteState('xyz').id).toBe('informativo');
    expect(getNoteState(null).id).toBe('informativo');
  });
});
