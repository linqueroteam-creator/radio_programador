/**
 * ============================================================================
 *  ANOTATA — Encoder ZIP minimalista (método STORE, sem compressão)
 * ============================================================================
 *
 *  Por que existe
 *  --------------
 *  Pacote C (Exportação em lote) precisa baixar um caderno inteiro como
 *  um único arquivo ZIP de .md. Em vez de adicionar uma dependência
 *  externa (jszip, ~40 KB gzip), o ANOTATA já tem uma engine policy:
 *  tudo é local e enxuto. Texto markdown comprime mal mesmo com DEFLATE
 *  (já é puro caractere), então STORE serve perfeitamente.
 *
 *  O que faz
 *  ---------
 *  Recebe uma lista `[{ name, content }]` e devolve um `Blob` MIME
 *  `application/zip`, pronto pra download. Suporta:
 *    - Nomes UTF-8 (acentuados, emojis nos títulos do caderno)
 *    - Subpastas implícitas (ex: "imagens/foto.png")
 *    - Conteúdo string OU Uint8Array
 *    - Tamanho até ~4 GB (limite do ZIP "clássico")
 *
 *  Estrutura ZIP (resumo)
 *  ----------------------
 *  Pra cada arquivo:
 *    [Local File Header] [filename] [data]
 *  Depois, no fim:
 *    [Central Directory entry] x N
 *    [End of Central Directory record]
 *
 *  CRC32 é o único algoritmo "matemático" — implementação tabular
 *  abaixo (~1 KB de código, idiomático).
 *
 *  Referência do formato:
 *    https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
 * ============================================================================
 */

// === CRC32 com tabela pré-computada ===
// Polinômio reverso 0xEDB88320 (padrão ZIP/PNG)
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = (CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Converte string UTF-8 em Uint8Array. TextEncoder existe em todo
// browser >= 2017; fallback manual seria gigante e desnecessário hoje.
const ENCODER = new TextEncoder();
function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (typeof value === 'string') return ENCODER.encode(value);
  if (value && value.buffer instanceof ArrayBuffer) return new Uint8Array(value.buffer);
  throw new TypeError('Conteúdo inválido pra ZIP: precisa ser string ou Uint8Array');
}

// Escreve número em little-endian no offset informado
function writeUint32LE(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}
function writeUint16LE(view, offset, value) {
  view.setUint16(offset, value & 0xFFFF, true);
}

// Converte Date → "DOS time" e "DOS date" (campos do ZIP)
// DOS time bits: hh:mmmmm:sssss/2 (5+6+5)
// DOS date bits: yyyyyyy (since 1980) :mmmm:ddddd (7+4+5)
function toDosDateTime(d) {
  const date = d || new Date();
  const time =
    ((date.getHours() & 0x1F) << 11) |
    ((date.getMinutes() & 0x3F) << 5) |
    (Math.floor(date.getSeconds() / 2) & 0x1F);
  const dateField =
    ((Math.max(0, date.getFullYear() - 1980) & 0x7F) << 9) |
    (((date.getMonth() + 1) & 0x0F) << 5) |
    (date.getDate() & 0x1F);
  return { time, date: dateField };
}

/**
 * Cria um Blob ZIP a partir de uma lista de arquivos.
 *
 * @param {Array<{ name: string, content: string | Uint8Array, date?: Date }>} files
 * @returns {Blob} Blob com `type: 'application/zip'`
 */
export function createZip(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('createZip: lista de arquivos vazia');
  }

  // Pré-processamento: bytes do nome, bytes do conteúdo, CRC, tamanhos
  const entries = files.map((f) => {
    if (!f || typeof f.name !== 'string' || !f.name) {
      throw new Error('createZip: cada arquivo precisa de "name" (string)');
    }
    const data = toBytes(f.content || '');
    const nameBytes = ENCODER.encode(f.name);
    const dt = toDosDateTime(f.date instanceof Date ? f.date : new Date());
    return {
      nameBytes,
      data,
      crc: crc32(data),
      size: data.length,
      dosTime: dt.time,
      dosDate: dt.date,
      // localHeaderOffset será preenchido durante escrita
      localHeaderOffset: 0,
    };
  });

  // === 1) Calcula tamanho total do ZIP ===
  // Local File Header = 30 bytes fixos + nome
  // Data = size
  // Central Directory entry = 46 bytes fixos + nome
  // End of Central Directory = 22 bytes fixos
  let localTotal = 0;
  let centralTotal = 0;
  for (const e of entries) {
    localTotal += 30 + e.nameBytes.length + e.size;
    centralTotal += 46 + e.nameBytes.length;
  }
  const total = localTotal + centralTotal + 22;

  const buf = new ArrayBuffer(total);
  const view = new DataView(buf);
  const out = new Uint8Array(buf);
  let offset = 0;

  // === 2) Escreve cada Local File Header + dados ===
  const GENERAL_PURPOSE_FLAGS = 0x0800; // bit 11 = nome em UTF-8 (importante pra acentos)
  for (const e of entries) {
    e.localHeaderOffset = offset;

    writeUint32LE(view, offset + 0, 0x04034b50);    // signature "PK\3\4"
    writeUint16LE(view, offset + 4, 20);             // version needed
    writeUint16LE(view, offset + 6, GENERAL_PURPOSE_FLAGS);
    writeUint16LE(view, offset + 8, 0);              // compression method = STORE (0)
    writeUint16LE(view, offset + 10, e.dosTime);
    writeUint16LE(view, offset + 12, e.dosDate);
    writeUint32LE(view, offset + 14, e.crc);
    writeUint32LE(view, offset + 18, e.size);        // compressed size
    writeUint32LE(view, offset + 22, e.size);        // uncompressed size
    writeUint16LE(view, offset + 26, e.nameBytes.length);
    writeUint16LE(view, offset + 28, 0);             // extra length

    out.set(e.nameBytes, offset + 30);
    out.set(e.data, offset + 30 + e.nameBytes.length);

    offset += 30 + e.nameBytes.length + e.size;
  }

  // === 3) Escreve Central Directory ===
  const centralStart = offset;
  for (const e of entries) {
    writeUint32LE(view, offset + 0, 0x02014b50);     // signature "PK\1\2"
    writeUint16LE(view, offset + 4, 20);              // version made by
    writeUint16LE(view, offset + 6, 20);              // version needed
    writeUint16LE(view, offset + 8, GENERAL_PURPOSE_FLAGS);
    writeUint16LE(view, offset + 10, 0);              // compression
    writeUint16LE(view, offset + 12, e.dosTime);
    writeUint16LE(view, offset + 14, e.dosDate);
    writeUint32LE(view, offset + 16, e.crc);
    writeUint32LE(view, offset + 20, e.size);
    writeUint32LE(view, offset + 24, e.size);
    writeUint16LE(view, offset + 28, e.nameBytes.length);
    writeUint16LE(view, offset + 30, 0);              // extra
    writeUint16LE(view, offset + 32, 0);              // comment
    writeUint16LE(view, offset + 34, 0);              // disk number
    writeUint16LE(view, offset + 36, 0);              // internal attrs
    writeUint32LE(view, offset + 38, 0);              // external attrs
    writeUint32LE(view, offset + 42, e.localHeaderOffset);

    out.set(e.nameBytes, offset + 46);
    offset += 46 + e.nameBytes.length;
  }
  const centralSize = offset - centralStart;

  // === 4) End of Central Directory record ===
  writeUint32LE(view, offset + 0, 0x06054b50);       // signature "PK\5\6"
  writeUint16LE(view, offset + 4, 0);                 // disk
  writeUint16LE(view, offset + 6, 0);                 // disk with central dir
  writeUint16LE(view, offset + 8, entries.length);    // entries on this disk
  writeUint16LE(view, offset + 10, entries.length);   // total entries
  writeUint32LE(view, offset + 12, centralSize);
  writeUint32LE(view, offset + 16, centralStart);
  writeUint16LE(view, offset + 20, 0);                // comment length

  return new Blob([buf], { type: 'application/zip' });
}

/**
 * Faz download de um Blob com nome de arquivo. Helper minúsculo, mas
 * concentra a feiura do `<a download>` num lugar só.
 */
export function downloadBlob(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sanitiza um título virando nome de arquivo seguro em qualquer SO.
 * Remove acentos opcionalmente é menos visualmente agradável; preferimos
 * manter os caracteres válidos e só trocar os proibidos.
 *
 * Regras:
 *   - Substitui /\?<>:|"* por "-"
 *   - Colapsa múltiplos espaços e hífens
 *   - Limita a 80 caracteres (Windows tem limite de 255 no path completo)
 *   - Vazio → "sem-titulo"
 */
export function safeFilename(title, fallback = 'sem-titulo') {
  if (!title || typeof title !== 'string') return fallback;
  const cleaned = title
    .replace(/[\\/?<>:|"*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
}

/**
 * Garante unicidade dentro de uma lista de nomes. Se aparecer duplicado,
 * sufixa "(2)", "(3)" etc. Útil porque várias notas podem ter o mesmo
 * título (ou todas estarem sem título).
 */
export function uniqueNames(names) {
  const seen = new Map();
  return names.map((name) => {
    const count = seen.get(name) || 0;
    seen.set(name, count + 1);
    return count === 0 ? name : name.replace(/(\.[^.]+)?$/, ` (${count + 1})$1`);
  });
}
