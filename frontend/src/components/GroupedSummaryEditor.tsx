import ReportRichTextEditor from './ReportRichTextEditor';
import { reportHtml } from '../utils/reportRichText';
import type { SummaryEntry, SummaryGroup } from '../api/weeklySummaryApi';

export default function GroupedSummaryEditor({ entries, groups, currentTitle, nextTitle, readOnly, onChange }: {
  entries: SummaryEntry[];
  groups: SummaryGroup[];
  currentTitle: string;
  nextTitle: string;
  readOnly: boolean;
  onChange: (entries: SummaryEntry[]) => void;
}) {
  const week = (title: string) => title.replace(/\s+năm\s+\d{4}$/i, '').toUpperCase();

  function updateGroup(section: SummaryEntry['section'], groupId: string, text: string) {
    const matching = entries.filter((entry) => entry.section === section && entry.groupId === groupId);
    const replacement: SummaryEntry = matching.length === 1
      ? { ...matching[0], text, contentFormat: 'html-v1' }
      : { id: matching[0]?.id || `manual-${section}-${groupId}`, section, groupId, text, contentFormat: 'html-v1' };
    if (!matching.length) {
      onChange([...entries, replacement]);
      return;
    }
    let replaced = false;
    onChange(entries.flatMap((entry) => {
      if (entry.section !== section || entry.groupId !== groupId) return [entry];
      if (replaced) return [];
      replaced = true;
      return [replacement];
    }));
  }

  return <div className="space-y-8">
    {(['results', 'nextTasks'] as const).map((section) => <section key={section} className="space-y-4">
      <h3 className="text-base font-semibold text-primary">
        {section === 'results'
          ? `I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ ${week(currentTitle)}`
          : `II. PHƯƠNG HƯỚNG, NHIỆM VỤ ${week(nextTitle)}`}
      </h3>
      {groups.map((group, index) => {
        const inputId = `summary-${section}-${group.id}`;
        const value = entries.filter((entry) => entry.section === section && entry.groupId === group.id).map((entry) => reportHtml(entry.text, entry.contentFormat)).join('');
        return <div key={group.id} className="space-y-2">
          <h4 className="text-sm font-semibold text-on-surface"><label htmlFor={inputId}>{index + 1}. {group.title}</label></h4>
          <ReportRichTextEditor id={inputId} ariaLabel={`${section === 'results' ? 'Kết quả' : 'Nhiệm vụ'} - ${group.title}`} value={value} format="html-v1" readOnly={readOnly}
            onChange={(html) => updateGroup(section, group.id, html)} />
        </div>;
      })}
    </section>)}
  </div>;
}
