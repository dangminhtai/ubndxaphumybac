import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { getReports } from '../api/reportApi';
import type { Report } from '../types/report';

export default function MyReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getReports().then(setReports).catch(() => setError('Không tải được danh sách báo cáo'));
  }, []);

  return (
    <AppLayout title="Báo cáo của tôi" subtitle="Danh sách bản nháp và báo cáo đã nộp theo tài khoản hiện tại.">
      {error && <div className="mb-4 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-error">{error}</div>}
      <section className="rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-outline-variant text-xs uppercase text-on-surface-variant">
              <tr>
                <th className="py-2">Tên báo cáo</th>
                <th className="py-2">Kỳ</th>
                <th className="py-2">Trạng thái</th>
                <th className="py-2">Ngày nộp</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report._id} className="border-b border-surface-container-low">
                  <td className="py-3 font-semibold">{report.title}</td>
                  <td className="py-3">{report.period}</td>
                  <td className="py-3">{report.status === 'pending' ? 'Đã nộp' : 'Bản nháp'}</td>
                  <td className="py-3">{report.submittedAt ? new Date(report.submittedAt).toLocaleString('vi-VN') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppLayout>
  );
}
