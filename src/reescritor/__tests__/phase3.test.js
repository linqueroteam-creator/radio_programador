import { describe, it, expect } from 'vitest';
import { rephrase } from '../index.js';

describe('Fase 3 — gerundismo no futuro', () => {
  it('estarei verificando -> verificarei', () => {
    const r = rephrase('estarei verificando o pedido', 'geral');
    expect(r.result.toLowerCase()).toContain('verificarei');
    expect(r.result.toLowerCase()).not.toContain('estarei');
  });
  it('estará enviando -> enviará', () => {
    const r = rephrase('estará enviando o relatório', 'geral');
    expect(r.result.toLowerCase()).toContain('enviará');
  });
  it('estaremos analisando -> analisaremos', () => {
    const r = rephrase('estaremos analisando os dados', 'geral');
    expect(r.result.toLowerCase()).toContain('analisaremos');
  });
  it('estarão fazendo -> farão (irregular)', () => {
    const r = rephrase('estarão fazendo a entrega', 'geral');
    expect(r.result.toLowerCase()).toContain('farão');
  });
  it('vou estar enviando -> vou enviar/mandar/remeter (sem o "estar")', () => {
    const r = rephrase('vou estar enviando o e-mail', 'geral');
    // O gerundismo deve sumir — "estar" antes do gerundio nao pode ficar
    expect(r.result.toLowerCase()).not.toMatch(/vou estar/);
    expect(r.result.toLowerCase()).not.toMatch(/enviando/);
  });
  it('tenho estado revisando -> tenho revisado', () => {
    const r = rephrase('tenho estado revisando o projeto', 'geral');
    expect(r.result.toLowerCase()).toContain('tenho revisado');
  });
});

describe('Fase 3 — voz passiva preserva artigo', () => {
  it('"O bolo foi comido pela criança" -> "A criança comeu"', () => {
    const r = rephrase('O bolo foi comido pela criança.', 'fluente');
    expect(r.result).toMatch(/A criança comeu/);
  });
  it('"foi enviado pelo João" -> "João enviou" (drop article em nome próprio)', () => {
    const r = rephrase('O relatório foi enviado pelo João.', 'fluente');
    expect(r.result).toMatch(/João enviou/);
    expect(r.result).not.toMatch(/O João/);
  });
  it('"foi pintada pelo professor" -> "O professor pintou"', () => {
    const r = rephrase('A casa foi pintada pelo professor.', 'fluente');
    expect(r.result).toMatch(/O professor pintou/);
  });
});


describe('Fase 3 — cacofonia', () => {
  it('vi ela -> vi-a (pronome objeto)', () => {
    const r = rephrase('Eu vi ela na festa.', 'geral');
    expect(r.result).toMatch(/vi-a/);
  });
  it('boca dela -> a boca dela (som-feio)', () => {
    const r = rephrase('Olhei para boca dela.', 'geral');
    expect(r.result).toMatch(/a boca dela/);
  });
  it('alma minha -> minha alma', () => {
    const r = rephrase('Aquela alma minha precisa de paz.', 'geral');
    expect(r.result).toMatch(/minha alma/);
  });
  it('ja ja -> logo (redundancia sonora — pode encadear com sinonimos)', () => {
    const r = rephrase('Vou ja ja.', 'geral');
    // O "ja ja" tem que sumir. Depois o sinonimo de "logo" pode rodar (logo -> em breve)
    expect(r.result.toLowerCase()).not.toMatch(/ja ja/);
    expect(r.result).toMatch(/logo|em breve|imediatamente/i);
  });
});

describe('Fase 3 — nominalizacao (verbalize)', () => {
  it('"fez a analise" -> "analisou" no modo conciso', () => {
    const r = rephrase('Ele fez a análise dos dados.', 'conciso');
    expect(r.result).toMatch(/analisou/i);
    expect(r.result).not.toMatch(/fez a análise/i);
  });
  it('"realizou o pagamento" -> "pagou" no modo fluente', () => {
    const r = rephrase('A empresa realizou o pagamento ontem.', 'fluente');
    expect(r.result).toMatch(/pagou/i);
  });
  it('"tomou a decisao" -> "decidiu" no modo simples', () => {
    const r = rephrase('O diretor tomou a decisão final.', 'simples');
    expect(r.result).toMatch(/decidiu/i);
  });
});

describe('Fase 3 — modos compostos (smoke)', () => {
  it('todos os modos retornam string sem erro', () => {
    const text = 'Eu vou estar enviando o relatório pra ele depois da reunião.';
    for (const mode of ['geral', 'formal', 'conciso', 'fluente', 'simples']) {
      const r = rephrase(text, mode);
      expect(typeof r.result).toBe('string');
      expect(r.result.length).toBeGreaterThan(0);
    }
  });
  it('modo formal nao deixa "pra"', () => {
    const r = rephrase('Vou pra casa cedo hoje.', 'formal');
    expect(r.result).not.toMatch(/\bpra\b/i);
    expect(r.result).toMatch(/para/i);
  });
  it('modo conciso reduz tamanho em texto pesado', () => {
    const before = 'A fim de que possamos finalizar o trabalho de modo que tudo dê certo.';
    const r = rephrase(before, 'conciso');
    expect(r.stats.charsAfter).toBeLessThan(r.stats.charsBefore);
  });
  it('modo simples troca palavras eruditas', () => {
    const r = rephrase('Devemos efetuar a verificação anteriormente.', 'simples');
    expect(r.result).toMatch(/fazer|verificou|verificar|checar/i);
  });
});
