import sanitizeHtml from 'sanitize-html';

export const HTML_FORMAT = 'html-v1' as const;
export function cleanReportHtml(value: string) {
  if (typeof value !== 'string' || value.length > 200000) throw Object.assign(new Error('Nội dung báo cáo vượt giới hạn hoặc không hợp lệ.'), { statusCode: 400 });
  let depth = 0;
  const result = sanitizeHtml(value, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
    allowedAttributes: { ol: ['start'] },
    onOpenTag: (name) => { if ((name === 'ol' || name === 'ul') && ++depth > 3) throw Object.assign(new Error('Danh sách chỉ hỗ trợ tối đa ba cấp.'), { statusCode: 400 }); },
    onCloseTag: (name) => { if (name === 'ol' || name === 'ul') depth = Math.max(0, depth - 1); },
    transformTags: { ol: (_tag, attrs) => ({ tagName: 'ol', attribs: /^[1-9]\d{0,3}$/.test(attrs.start || '') ? { start: attrs.start } : {} as Record<string, string> }) },
  });
  return richTextPlain(result).trim() ? result : '';
}
export function richTextPlain(value: string) {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/gi, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#\d+;/g, ' ');
}
export function normalizeReportText(value: string, format?: string) {
  if (format !== undefined && format !== HTML_FORMAT) throw Object.assign(new Error('Định dạng nội dung không hợp lệ.'), { statusCode: 400 });
  return format === HTML_FORMAT ? cleanReportHtml(value) : value;
}
export const escapeReportText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function reportAsHtml(value: string, format?: string): string {
  if (format === HTML_FORMAT) return cleanReportHtml(value);
  const inline = (text: string) => escapeReportText(text)
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
  return cleanReportHtml(html);
}
