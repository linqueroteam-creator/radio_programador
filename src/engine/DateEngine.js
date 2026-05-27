/**
 * ANOTATA — Motor de Datas e Prazos
 *
 * Detecta datas no texto, converte palavras-chave em datas reais,
 * calcula proximidade do prazo e formata para exibição.
 *
 * Sem IA, sem API, sem dependências externas.
 */

const DAY_OF_WEEK_MAP = {
  'domingo': 0,
  'segunda': 1, 'segunda-feira': 1, 'seg': 1,
  'terça': 2, 'terça-feira': 2, 'terca': 2, 'ter': 2,
  'quarta': 3, 'quarta-feira': 3, 'qua': 3,
  'quinta': 4, 'quinta-feira': 4, 'qui': 4,
  'sexta': 5, 'sexta-feira': 5, 'sex': 5,
  'sábado': 6, 'sabado': 6, 'sab': 6,
};

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Converte palavra-chave de data em Date absoluto.
 * "hoje", "amanhã", dia da semana, ou formato DD/MM/YYYY ou YYYY-MM-DD
 */
export function parseDate(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  const today = startOfDay(new Date());

  if (lower === 'hoje') return today;
  if (lower === 'amanhã' || lower === 'amanha') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (lower === 'depois de amanhã' || lower === 'depois de amanha') {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d;
  }
  if (lower === 'na próxima semana' || lower === 'proxima semana') {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (lower === 'no próximo mês' || lower === 'proximo mes') {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 1);
    return d;
  }

  if (DAY_OF_WEEK_MAP[lower] !== undefined) {
    const target = DAY_OF_WEEK_MAP[lower];
    const current = today.getDay();
    let daysToAdd = (target - current + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
    const d = new Date(today);
    d.setDate(d.getDate() + daysToAdd);
    return d;
  }

  const brMatch = lower.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brMatch) {
    let year = parseInt(brMatch[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(brMatch[2]) - 1, parseInt(brMatch[1]));
    if (!isNaN(d.getTime())) return startOfDay(d);
  }

  const isoMatch = lower.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    if (!isNaN(d.getTime())) return startOfDay(d);
  }

  return null;
}

/**
 * Calcula o estado do prazo
 */
export function getDueDateStatus(dueDateIso) {
  if (!dueDateIso) return null;
  const due = startOfDay(new Date(dueDateIso));
  const today = startOfDay(new Date());
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'vencido';
  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'amanha';
  if (diffDays <= 3) return 'em-breve';
  if (diffDays <= 7) return 'esta-semana';
  return 'futuro';
}

export function formatDueDate(dueDateIso) {
  if (!dueDateIso) return '';
  const due = new Date(dueDateIso);
  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);
  const diffDays = Math.round((dueDay - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'amanhã';
  if (diffDays === -1) return 'ontem';
  if (diffDays > 1 && diffDays <= 7) return `em ${diffDays} dias`;
  if (diffDays < -1 && diffDays >= -7) return `há ${Math.abs(diffDays)} dias`;

  return due.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: diffDays > 365 || diffDays < -180 ? 'numeric' : undefined,
  });
}

export function getDueDateMeta(status) {
  const map = {
    'vencido': { label: 'Vencido', color: '#C44862', bg: '#FCE7EB' },
    'hoje': { label: 'Hoje', color: '#E8637C', bg: '#FCE7EB' },
    'amanha': { label: 'Amanhã', color: '#9B6F00', bg: '#FFF4D9' },
    'em-breve': { label: 'Em breve', color: '#7C4DC9', bg: '#EDE8F2' },
    'esta-semana': { label: 'Esta semana', color: '#5B2D8E', bg: '#EDE8F2' },
    'futuro': { label: 'Futuro', color: '#5B4A7A', bg: '#F0E9F8' },
  };
  return map[status] || map['futuro'];
}

export function findDatesInText(text) {
  if (!text) return [];
  const found = [];
  const lower = text.toLowerCase();

  Object.keys(DAY_OF_WEEK_MAP).forEach(kw => {
    let idx = 0;
    while ((idx = lower.indexOf(kw, idx)) !== -1) {
      found.push({ text: kw, parsed: parseDate(kw), offset: idx });
      idx += kw.length;
    }
  });
  ['hoje', 'amanhã', 'amanha', 'depois de amanhã', 'na próxima semana', 'no próximo mês'].forEach(kw => {
    let idx = lower.indexOf(kw);
    if (idx !== -1) found.push({ text: kw, parsed: parseDate(kw), offset: idx });
  });

  const formal = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})|(\d{4})-(\d{2})-(\d{2})/g;
  let match;
  while ((match = formal.exec(text)) !== null) {
    found.push({
      text: match[0],
      parsed: parseDate(match[0]),
      offset: match.index,
    });
  }

  return found.filter(f => f.parsed).sort((a, b) => a.offset - b.offset);
}

export function suggestDueDateFromText(text) {
  const dates = findDatesInText(text);
  const today = startOfDay(new Date());
  for (const d of dates) {
    if (d.parsed >= today) return d.parsed.toISOString();
  }
  return null;
}

/**
 * Lembrete local — verifica notas com prazos próximos
 */
export function checkRemindersNow(notes) {
  const reminders = [];
  for (const n of notes) {
    if (n.isTrash || n.isArchived) continue;
    if (!n.dueDate) continue;
    const status = getDueDateStatus(n.dueDate);
    if (status === 'vencido' || status === 'hoje' || status === 'amanha') {
      reminders.push({
        noteId: n.id,
        title: n.title || 'Sem título',
        status,
        formatted: formatDueDate(n.dueDate),
      });
    }
  }
  return reminders;
}
