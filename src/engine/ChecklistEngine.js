/**
 * ANOTATA — Motor de Checklist
 *
 * Lê e manipula checklists dentro do conteúdo HTML da nota.
 * Conta progresso, gera barra visual, alterna estados.
 *
 * Sem IA. Apenas regex e DOM.
 */

export function countChecklistItems(html) {
  if (!html) return { total: 0, done: 0, open: 0, percent: 0 };

  const taskItemRegex = /<li[^>]*data-checked="(true|false)"/gi;
  let total = 0;
  let done = 0;
  let m;
  while ((m = taskItemRegex.exec(html)) !== null) {
    total++;
    if (m[1] === 'true') done++;
  }

  // Markdown checkboxes em texto puro
  const stripped = html.replace(/<[^>]*>/g, '\n');
  const mdLines = stripped.split('\n');
  for (const line of mdLines) {
    const t = line.trim();
    if (/^[-*]\s*\[\s*\]/i.test(t)) {
      total++;
    } else if (/^[-*]\s*\[x\]/i.test(t)) {
      total++;
      done++;
    }
  }

  return {
    total,
    done,
    open: total - done,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export function appendChecklistItem(html, itemText = '') {
  const safe = itemText.replace(/[<>]/g, '');
  const newItem = `<li data-checked="false"><div><p>${safe || ''}</p></div></li>`;

  if (/data-type="taskList"/i.test(html)) {
    return html.replace(
      /(<ul[^>]*data-type="taskList"[^>]*>[\s\S]*?)(<\/ul>)/i,
      `$1${newItem}$2`
    );
  }

  return html + `<ul data-type="taskList">${newItem}</ul>`;
}

export function markAllDone(html) {
  if (!html) return html;
  return html.replace(/(<li[^>]*data-checked=)"false"/gi, '$1"true"');
}

export function markAllUndone(html) {
  if (!html) return html;
  return html.replace(/(<li[^>]*data-checked=)"true"/gi, '$1"false"');
}

export function extractChecklistText(html) {
  if (!html) return [];
  const items = [];
  const regex = /<li[^>]*data-checked="(true|false)"[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const done = m[1] === 'true';
    const text = m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) items.push({ done, text });
  }
  return items;
}

export function formatProgress(stats) {
  if (!stats || stats.total === 0) return '';
  return `${stats.done}/${stats.total}`;
}
