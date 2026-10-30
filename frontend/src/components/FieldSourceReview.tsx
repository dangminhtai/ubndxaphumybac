import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { formatApiError } from '../utils/apiError';
import SourceFieldMapping from './SourceFieldMapping';

interface Review { items: Array<{ _id: string; title: string; sender: string; field: string; status: string; periodMissing?: boolean }>; total: number }
export default function FieldSourceReview() {
  const [data, setData] = useState<Review>({ items: [], total: 0 });
  const [error, setError] = useState('');
  async function load() { try { setData((await apiClient.get<Review>('/fields/review')).data); } catch (err) { setError(formatApiError(err, 'Không tải được báo cáo cần đối soát.')); } }
  useEffect(() => { void load(); }, []);
  return <details className="mb-6 rounded-xl border border-outline-variant bg-white p-4">
    <summary className="cursor-pointer font-semibold">Báo cáo chưa xác định mã lĩnh vực ({data.total})</summary>
    <p className="mt-3 text-sm text-on-surface-variant">Đối chiếu từng nguồn rồi xác nhận mã, không sửa nội dung chữ. Nguồn không còn kỳ báo cáo được đánh dấu và không tự đưa vào tuần hiện tại.</p>
    {data.total > data.items.length && <p className="text-sm">Đang hiển thị {data.items.length}/{data.total} báo cáo mới nhất.</p>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    <div className="mt-3 grid gap-3 md:grid-cols-2">{data.items.map((item) => <div key={item._id} className="rounded-lg border border-outline-variant p-3">
      <p className="text-sm font-semibold">{item.sender} — {item.status === 'draft' ? 'Nháp' : 'Đã nộp'}</p>
      <p className="text-xs text-on-surface-variant">{item.title}</p><p className="text-xs">Lĩnh vực nguồn: {item.field}</p>
      {item.periodMissing && <p className="mt-2 text-xs text-error">Không còn kỳ báo cáo tương ứng. Xác nhận mã không khôi phục được kỳ; bản này chưa thể dùng để tổng hợp theo tuần.</p>}
      <SourceFieldMapping reportId={item._id} readOnly={false} onSaved={load} />
    </div>)}</div>
  </details>;
}
