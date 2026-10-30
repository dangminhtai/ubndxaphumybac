import DOMPurify from 'dompurify';

export type ContentFormat = 'html-v1';
export const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function cleanHtml(value: string) {
  const html = DOMPurify.sanitize(value, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'], ALLOWED_ATTR: ['start'], ALLOW_DATA_ATTR: false });
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('[start]').forEach((node) => {
    const start = node.getAttribute('start') || '';
    if (node.tagName !== 'OL' || !/^[1-9]\d{0,3}$/.test(start)) node.removeAttribute('start');
  });
  return (container.textContent || '').replace(/\u00a0/g, ' ').trim() ? container.innerHTML : '';
}

/** Only the old toolbar's explicit syntax is interpreted; other markup is text. */
export function reportHtml(value = '', format?: string) {
  if (format === 'html-v1') return cleanHtml(value);
  const inline = (text: string) => escapeText(text)
    .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<u>$1</u>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  let html = '', list = '';
  for (const line of value.split('\n')) {
    const match = line.match(/^\s*(?:(\d+)\.\s+|[-•]\s+)(.*)$/);
    const kind = match ? (match[1] ? 'ol' : 'ul') : '';
    if (kind !== list) { if (list) html += `</${list}>`; if (kind) html += `<${kind}${kind === 'ol' ? ` start="${match![1]}"` : ''}>`; list = kind; }
    html += match ? `<li><p>${inline(match[2])}</p></li>` : `<p>${inline(line) || '<br>'}</p>`;
  }
  if (list) html += `</${list}>`;
  return cleanHtml(html);
}
