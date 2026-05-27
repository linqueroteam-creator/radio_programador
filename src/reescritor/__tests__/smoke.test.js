// Smoke test final — texto longo combinando todas as melhorias da F3
import { describe, it, expect } from 'vitest';
import { rephrase, ENGINE_VERSION } from '../index.js';

describe('Smoke F3 — versao + texto longo realista', () => {
  it('engine versao bate com 1.2.0-fase3', () => {
    expect(ENGINE_VERSION).toBe('1.2.0-fase3');
  });

  it('texto realista no modo conciso reduz volume', () => {
    const before = `Eu vou estar enviando o relatório a fim de que o time possa fazer a análise dos dados.
Tenho estado revisando o projeto e estarei verificando os pontos abertos amanhã de manhã.
O bolo foi comido pela criança em uma festa que foi organizada pelos pais.
Vi ela na entrada e ja ja vou subir pra cima pra falar com vc.`;

    const r = rephrase(before, 'conciso');
    console.log('\n--- ORIGINAL ---\n' + before);
    console.log('\n--- CONCISO ---\n' + r.result);
    console.log('\n--- STATS ---\n' + JSON.stringify(r.stats, null, 2));

    expect(r.stats.charsAfter).toBeLessThan(r.stats.charsBefore);
    expect(r.changes.length).toBeGreaterThan(3);
  });

  it('texto realista no modo formal eleva tom', () => {
    const before = 'Tô na praia pra descansar e vou estar enviando o e-mail tbm pra vc msm.';
    const r = rephrase(before, 'formal');
    console.log('\n--- ORIGINAL ---\n' + before);
    console.log('\n--- FORMAL ---\n' + r.result);
    expect(r.result.toLowerCase()).not.toMatch(/\b(tô|tbm|vc|msm)\b/);
  });

  it('texto realista no modo fluente faz voz ativa + verbaliza', () => {
    // Voice usa agente curto (limite conservador de 40 chars), entao
    // teste com agente curto pra fixar o casamento.
    const before = 'O relatório foi enviado pelo João. Antes ele realizou a análise dos dados.';
    const r = rephrase(before, 'fluente');
    console.log('\n--- ORIGINAL ---\n' + before);
    console.log('\n--- FLUENTE ---\n' + r.result);
    expect(r.result).toMatch(/João enviou/);
    expect(r.result).toMatch(/analisou/i);
  });

  it('texto realista no modo simples', () => {
    const before = 'Devemos efetuar a verificação previamente e implementar a correção concomitantemente.';
    const r = rephrase(before, 'simples');
    console.log('\n--- ORIGINAL ---\n' + before);
    console.log('\n--- SIMPLES ---\n' + r.result);
    expect(r.result).not.toBe(before);
  });
});
