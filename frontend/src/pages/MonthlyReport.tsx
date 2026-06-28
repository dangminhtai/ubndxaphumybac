import {
  Bold,
  CheckCircle2,
  CloudUpload,
  FileText,
  Italic,
  List,
  ListOrdered,
  Save,
  Send,
  Underline,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';

interface EditorSection {
  number: number;
  title: string;
  description?: string;
  placeholder: string;
  heightClass: string;
  orderedList?: boolean;
}

const SECTIONS: EditorSection[] = [
  {
    number: 1,
    title: 'Kết quả thực hiện',
    description: 'Mô tả chi tiết các công việc đã hoàn thành trong tháng, số liệu cụ thể nếu có.',
    placeholder: 'Nhập nội dung báo cáo tại đây...',
    heightClass: 'min-h-[160px]',
    orderedList: true,
  },
  {
    number: 2,
    title: 'Khó khăn, vướng mắc',
    placeholder: 'Nêu rõ những khó khăn gặp phải trong quá trình thực hiện nhiệm vụ...',
    heightClass: 'min-h-[120px]',
  },
  {
    number: 3,
    title: 'Kiến nghị, đề xuất',
    placeholder: 'Các đề xuất giải quyết vướng mắc (nếu có)...',
    heightClass: 'min-h-[120px]',
  },
  {
    number: 4,
    title: 'Nhiệm vụ trọng tâm thời gian tới',
    placeholder: 'Kế hoạch công tác cho tháng tiếp theo...',
    heightClass: 'min-h-[120px]',
  },
];

function Toolbar({ orderedList = false }: { orderedList?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-t-lg border-b border-outline-variant bg-surface-container-low p-2">
      <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button" aria-label="In đậm">
        <Bold className="h-4 w-4" />
      </button>
      <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button" aria-label="In nghiêng">
        <Italic className="h-4 w-4" />
      </button>
      {orderedList && (
        <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button" aria-label="Gạch chân">
          <Underline className="h-4 w-4" />
        </button>
      )}
      <div className="mx-1 h-5 w-px bg-outline-variant" />
      <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button" aria-label="Danh sách">
        <List className="h-4 w-4" />
      </button>
      {orderedList && (
        <button
          className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high"
          type="button"
          aria-label="Danh sách đánh số"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ReportEditor({ section }: { section: EditorSection }) {
  return (
    <section>
      <div className="mb-stack-sm flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {section.number}
        </span>
        <h3 className="font-headline-sm text-base text-on-surface">{section.title}</h3>
      </div>
      {section.description && <p className="mb-stack-md text-sm text-on-surface-variant">{section.description}</p>}
      <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface focus-within:border-primary">
        <Toolbar orderedList={section.orderedList} />
        <textarea
          className={`${section.heightClass} w-full resize-y border-none bg-transparent p-4 font-doc-preview text-doc-preview text-on-surface outline-none`}
          placeholder={section.placeholder}
        />
      </div>
    </section>
  );
}

export default function MonthlyReport() {
  return (
    <AppLayout
      title="Nhập liệu báo cáo Tháng 10/2024 - Phòng Tư pháp"
      subtitle="Vui lòng điền đầy đủ các thông tin dưới đây. Dữ liệu sẽ tự động lưu nháp sau mỗi 2 phút."
      bottomStatus={
        <span className="hidden items-center gap-2 text-sm text-on-surface-variant md:flex">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Đã lưu nháp lúc 10:42 AM
        </span>
      }
      bottomBar={
        <>
          <button
            className="rounded-lg border border-outline px-6 py-2.5 font-semibold text-on-surface transition-colors hover:bg-surface-container-low"
            type="button"
          >
            Hủy bỏ
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-surface-container-high px-6 py-2.5 font-semibold text-primary transition-colors hover:bg-surface-container-highest"
            type="button"
          >
            <Save className="h-5 w-5" />
            Lưu nháp
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-semibold text-white shadow-level-1 transition-colors hover:bg-primary-container"
            type="button"
          >
            <Send className="h-5 w-5" />
            Gửi báo cáo
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-stack-md flex items-center gap-2 text-sm text-on-surface-variant">
          <FileText className="h-4 w-4" />
          <span>Báo cáo tháng</span>
          <span>/</span>
          <span className="font-semibold text-primary">Tháng 10/2024</span>
        </div>

        <form className="space-y-stack-lg">
          <div className="rounded-xl border border-outline-variant bg-white p-stack-lg shadow-level-1">
            <div className="flex flex-col gap-stack-lg">
              {SECTIONS.map((section) => (
                <ReportEditor key={section.number} section={section} />
              ))}
            </div>
          </div>

          <section className="rounded-xl border border-outline-variant bg-white p-stack-lg shadow-level-1">
            <div className="mb-stack-md flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h3 className="font-headline-sm text-base text-on-surface">Đính kèm minh chứng</h3>
              <span className="text-sm text-on-surface-variant">Hỗ trợ: Word, Excel, PDF, PNG/JPG (Max: 25MB)</span>
            </div>

            <button
              className="group flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface p-8 text-center transition-colors hover:border-primary hover:bg-surface-container-low"
              type="button"
            >
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high transition-colors group-hover:bg-primary-fixed">
                <CloudUpload className="h-8 w-8 text-primary" />
              </span>
              <span className="font-semibold text-on-surface">Kéo thả tệp vào đây</span>
              <span className="my-1 text-sm text-on-surface-variant">hoặc</span>
              <span className="rounded-lg border border-outline px-4 py-2 font-semibold text-primary transition-colors group-hover:bg-surface-container-high">
                Chọn tệp từ máy tính
              </span>
            </button>
          </section>
        </form>
      </div>
    </AppLayout>
  );
}
