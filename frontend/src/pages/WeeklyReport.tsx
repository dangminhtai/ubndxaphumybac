import { Bold, FilePenLine, Italic, List, Send, Underline, UploadCloud, BarChart3 } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';

const METRICS = [
  { label: 'Số tin bài', plan: 10 },
  { label: 'Số cuộc tuyên truyền', plan: 2 },
  { label: 'Số hộ nghèo hỗ trợ', plan: 15 },
  { label: 'Số người tham gia BHYT', plan: 500 },
];

export default function WeeklyReport() {
  return (
    <AppLayout
      title="Nhập báo cáo tuần"
      subtitle="Kỳ báo cáo: Tuần 3 - Tháng 10/2023"
      bottomBar={
        <>
          <button
            className="rounded-lg border border-primary px-6 py-2 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
            type="button"
          >
            Lưu nháp
          </button>
          <button
            className="rounded-lg px-6 py-2 font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
            type="button"
          >
            Xem trước
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-secondary-container px-6 py-2 font-medium text-on-secondary-container shadow-sm transition-colors hover:bg-secondary hover:text-on-secondary disabled:opacity-60"
            type="button"
            disabled
          >
            <Send className="h-5 w-5" />
            Gửi báo cáo
          </button>
        </>
      }
    >
      <form className="space-y-gutter">
        <section className="rounded-xl border border-outline-variant border-l-4 border-l-primary bg-white p-6 shadow-level-1">
          <h3 className="mb-4 flex items-center gap-2 font-headline-sm text-base text-on-surface">
            <FilePenLine className="h-5 w-5 text-primary" />
            I. Kết quả thực hiện
          </h3>

          <div className="overflow-hidden rounded-lg border border-outline-variant focus-within:border-primary">
            <div className="flex gap-2 border-b border-outline-variant bg-surface-container-low p-2">
              <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button" aria-label="In đậm">
                <Bold className="h-5 w-5" />
              </button>
              <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button" aria-label="In nghiêng">
                <Italic className="h-5 w-5" />
              </button>
              <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button" aria-label="Gạch chân">
                <Underline className="h-5 w-5" />
              </button>
              <button className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high" type="button" aria-label="Danh sách">
                <List className="h-5 w-5" />
              </button>
            </div>
            <textarea
              className="h-48 w-full resize-y border-none bg-transparent p-4 text-body-lg outline-none"
              placeholder="Nhập tóm tắt kết quả thực hiện các nhiệm vụ văn hóa, xã hội trong tuần..."
            />
          </div>
        </section>

        <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-level-1">
          <h3 className="mb-4 flex items-center gap-2 font-headline-sm text-base text-on-surface">
            <BarChart3 className="h-5 w-5 text-primary" />
            II. Số liệu
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                  <th className="px-4 py-3">Chỉ tiêu</th>
                  <th className="px-4 py-3 text-right">Kế hoạch</th>
                  <th className="px-4 py-3 text-right">Thực hiện</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => (
                  <tr key={metric.label} className="border-b border-outline-variant hover:bg-surface-container-low">
                    <td className="px-4 py-3 font-semibold text-on-surface">{metric.label}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        className="w-24 rounded border border-transparent bg-surface-container-low px-2 py-1 text-right outline-none focus:border-primary focus:bg-white"
                        type="number"
                        defaultValue={metric.plan}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        className="w-24 rounded border border-outline-variant bg-white px-2 py-1 text-right outline-none focus:border-primary"
                        type="number"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-level-1">
            <h3 className="mb-4 font-headline-sm text-base text-on-surface">III. Khó khăn</h3>
            <textarea
              className="h-32 w-full resize-none rounded-lg border border-outline-variant p-4 outline-none focus:border-primary"
              placeholder="Nêu các vướng mắc, khó khăn trong quá trình thực hiện..."
            />
          </section>

          <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-level-1">
            <h3 className="mb-4 font-headline-sm text-base text-on-surface">IV. Kiến nghị</h3>
            <textarea
              className="h-32 w-full resize-none rounded-lg border border-outline-variant p-4 outline-none focus:border-primary"
              placeholder="Đề xuất các giải pháp, kiến nghị lên cấp trên..."
            />
          </section>
        </div>

        <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-level-1">
          <h3 className="mb-4 font-headline-sm text-base text-on-surface">V. Nhiệm vụ thời gian tới</h3>
          <textarea
            className="h-32 w-full resize-none rounded-lg border border-outline-variant p-4 outline-none focus:border-primary"
            placeholder="Kế hoạch và nhiệm vụ trọng tâm cho tuần/tháng tiếp theo..."
          />
        </section>

        <section className="rounded-xl border border-dashed border-outline-variant bg-white p-6 shadow-level-1">
          <h3 className="mb-4 font-headline-sm text-base text-on-surface">Minh chứng đính kèm</h3>
          <button
            className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-8 text-center transition-colors hover:bg-surface-container-high"
            type="button"
          >
            <UploadCloud className="mb-2 h-9 w-9 text-primary" />
            <span className="text-on-surface-variant">Kéo thả file vào đây hoặc nhấn để chọn file</span>
            <span className="mt-1 text-sm text-outline">Hỗ trợ PDF, DOCX, JPG, PNG (Tối đa 10MB)</span>
          </button>
        </section>
      </form>
    </AppLayout>
  );
}
