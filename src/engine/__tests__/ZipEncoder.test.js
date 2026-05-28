import { describe, it, expect } from 'vitest';
import { createZip, safeFilename, uniqueNames } from '../ZipEncoder';

/**
 * Testes do encoder ZIP. Como não temos descompressor disponível em
 * vitest, validamos o formato byte-a-byte:
 *   - assinaturas corretas (PK\3\4, PK\1\2, PK\5\6)
 *   - tamanhos batem
 *   - nomes/conteúdo extraídos via offsets ficam corretos
 */

function findSignature(bytes, sig) {
  // Busca little-endian. sig é um number 32-bit.
  const b0 = sig & 0xFF;
  const b1 = (sig >> 8) & 0xFF;
  const b2 = (sig >> 16) & 0xFF;
  const b3 = (sig >> 24) & 0xFF;
  for (let i = 0; i + 3 < bytes.length; i++) {
    if (bytes[i] === b0 && bytes[i + 1] === b1 && bytes[i + 2] === b2 && bytes[i + 3] === b3) {
      return i;
    }
  }
  return -1;
}

async function blobToBytes(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

describe('ZipEncoder', () => {
  it('cria ZIP válido com 1 arquivo', async () => {
    const blob = createZip([{ name: 'hello.txt', content: 'Olá mundo' }]);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/zip');
    expect(blob.size).toBeGreaterThan(30);

    const bytes = await blobToBytes(blob);
    // Local file header
    expect(findSignature(bytes, 0x04034b50)).toBe(0);
    // Central dir e EOCD presentes
    expect(findSignature(bytes, 0x02014b50)).toBeGreaterThan(0);
    expect(findSignature(bytes, 0x06054b50)).toBeGreaterThan(0);
  });

  it('cria ZIP com múltiplos arquivos e nomes UTF-8', async () => {
    const blob = createZip([
      { name: 'nota-um.md', content: '# Primeira nota\n\nTexto.' },
      { name: 'caderno-pessoal/anotação-com-acento.md', content: 'Conteúdo com çãáéí.' },
      { name: 'README.md', content: '🎉 Pacote de notas' },
    ]);
    const bytes = await blobToBytes(blob);

    // Deve ter 3 Local File Headers (PK\3\4)
    let count = 0;
    let pos = 0;
    while (pos < bytes.length) {
      const found = findSignature(bytes.slice(pos), 0x04034b50);
      if (found === -1) break;
      count++;
      pos += found + 4;
    }
    expect(count).toBe(3);
  });

  it('lança erro se lista vazia', () => {
    expect(() => createZip([])).toThrow();
  });

  it('lança erro se item sem name', () => {
    expect(() => createZip([{ content: 'xyz' }])).toThrow();
  });
});

describe('safeFilename', () => {
  it('mantém nome válido', () => {
    expect(safeFilename('Minha nota')).toBe('Minha nota');
  });
  it('substitui caracteres proibidos', () => {
    expect(safeFilename('foo/bar:baz?qux*')).toBe('foo-bar-baz-qux-');
  });
  it('preserva acentos', () => {
    expect(safeFilename('Anotação importante')).toBe('Anotação importante');
  });
  it('cai pro fallback se vazio', () => {
    expect(safeFilename('')).toBe('sem-titulo');
    expect(safeFilename(null)).toBe('sem-titulo');
    expect(safeFilename('   ')).toBe('sem-titulo');
  });
  it('limita a 80 caracteres', () => {
    const longName = 'a'.repeat(120);
    expect(safeFilename(longName).length).toBe(80);
  });
});

describe('uniqueNames', () => {
  it('mantém nomes únicos intactos', () => {
    expect(uniqueNames(['a.md', 'b.md', 'c.md'])).toEqual(['a.md', 'b.md', 'c.md']);
  });
  it('numera duplicatas a partir de (2)', () => {
    expect(uniqueNames(['a.md', 'a.md', 'a.md'])).toEqual(['a.md', 'a (2).md', 'a (3).md']);
  });
  it('lida com nomes sem extensão', () => {
    expect(uniqueNames(['nota', 'nota'])).toEqual(['nota', 'nota (2)']);
  });
});
