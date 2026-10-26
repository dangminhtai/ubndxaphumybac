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
      ? { ...matching[0], text }
      : { id: matching[0]?.id || `manual-${section}-${groupId}`, section, groupId, text };
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
        const value = entries.filter((entry) => entry.section === section && entry.groupId === group.id).map((entry) => entry.text).join('\n\n');
        return <div key={group.id} className="space-y-2">
          <h4 className="text-sm font-semibold text-on-surface"><label htmlFor={inputId}>{index + 1}. {group.title}</label></h4>
          <textarea
            id={inputId}
            aria-label={`${section === 'results' ? 'Kết quả' : 'Nhiệm vụ'} - ${group.title}`}
            className="min-h-40 w-full resize-y rounded-lg border border-outline-variant bg-white p-3 text-sm leading-relaxed text-on-surface outline-none focus:border-primary disabled:opacity-75"
            disabled={readOnly}
            value={value}
            onChange={(event) => updateGroup(section, group.id, event.target.value)}
          />
        </div>;
      })}
    </section>)}
  </div>;
}
