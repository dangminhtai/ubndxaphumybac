import { useEffect, useRef } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';
import { cleanHtml, reportHtml } from '../utils/reportRichText';
import './report-rich-text.css';

// One consistent writing surface for staff and administrators; report structure
// remains outside the editor. Keep the five controls shown in the approved design.
export default function ReportRichTextEditor({ id, ariaLabel, value, format, onChange, placeholder = 'Nhập nội dung báo cáo…', disabled = false, readOnly = false }: {
  id: string; ariaLabel: string; value: string; format?: string;
  onChange: (html: string) => void; placeholder?: string; disabled?: boolean; readOnly?: boolean;
}) {
  const change = useRef(onChange); change.current = onChange;
  const last = useRef('');
  const editor = useEditor({
    extensions: [StarterKit.configure({ trailingNode: false, heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, link: false }), Placeholder.configure({ placeholder })],
    content: reportHtml(value, format),
    enableInputRules: false, enablePasteRules: false,
    editable: !disabled && !readOnly,
    editorProps: {
      attributes: { id, role: 'textbox', 'aria-label': ariaLabel, 'aria-multiline': 'true' },
      transformPastedHTML: cleanHtml,
      handleKeyDown(view, event) {
        if (event.key === 'Tab') {
          const list = editor?.isActive('listItem');
          if (list) { event.preventDefault(); if (event.shiftKey) editor?.chain().liftListItem('listItem').run(); else if (view.state.selection.$from.depth < 7) editor?.chain().sinkListItem('listItem').run(); return true; }
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => { const html = current.isEmpty ? '' : cleanHtml(current.getHTML()); last.current = html; change.current(html); },
  });
  const active = useEditorState({ editor, selector: ({ editor: current }) => current ? [current.isActive('bold'), current.isActive('italic'), current.isActive('underline'), current.isActive('bulletList'), current.isActive('orderedList')] : [] });
  useEffect(() => { editor?.setEditable(!disabled && !readOnly, false); }, [editor, disabled, readOnly]);
  useEffect(() => {
    const html = reportHtml(value, format);
    if (editor && html !== last.current && cleanHtml(editor.getHTML()) !== html) {
      editor.commands.setContent(html, { emitUpdate: false }); last.current = html;
    }
  }, [editor, value, format]);
  const tools = [
    { label: 'In đậm', Icon: Bold, run: () => editor?.chain().focus().toggleBold().run() },
    { label: 'In nghiêng', Icon: Italic, run: () => editor?.chain().focus().toggleItalic().run() },
    { label: 'Gạch chân', Icon: Underline, run: () => editor?.chain().focus().toggleUnderline().run() },
    { label: 'Danh sách gạch đầu dòng', Icon: List, run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: 'Danh sách đánh số', Icon: ListOrdered, run: () => editor?.chain().focus().toggleOrderedList().run() },
  ];
  return <div className={`report-editor${readOnly ? ' report-editor-readonly' : ''}`} aria-disabled={disabled}>
    {!readOnly && <div role="toolbar" aria-label={`Định dạng ${ariaLabel}`} className="report-editor-toolbar">
      {tools.map(({ label, Icon, run }, index) => <button key={label} type="button" title={label} aria-label={label} aria-pressed={Boolean(active?.[index])} disabled={disabled || !editor} onMouseDown={(event) => event.preventDefault()} onClick={run} className={index === 3 ? 'report-editor-list-tool' : ''}><Icon size={19} /></button>)}
    </div>}
    <EditorContent editor={editor} />
  </div>;
}

export function ReportRichTextView({ value, format }: { value?: string; format?: string }) {
  return <div className="report-rich-text-view" dangerouslySetInnerHTML={{ __html: reportHtml(value, format) }} />;
}
