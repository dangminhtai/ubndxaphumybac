import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import AppLayout from '../components/layout/AppLayout';
import { getRecentReports, seedReports } from '../api/reportApi';
import type { Report } from '../types/report';
import type { User } from '../types/user';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function readUser() {
  return JSON.parse(localStorage.getItem('user') || '{}') as Partial<User>;
}

export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const user = readUser();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        await seedReports();
        const data = await getRecentReports();
        setReports(data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      }
    };
    void fetchReports();
  }, []);

  const barChartData = {
    labels: ['Thôn 1', 'Thôn 2', 'Thôn 3', 'Bản A', 'Bản B', 'YT', 'CA'],
    datasets: [
      {
        label: 'Đã nộp',
        data: [1, 1, 0, 1, 1, 1, 1],
        backgroundColor: ['#10b981', '#10b981', '#cbd5e1', '#10b981', '#10b981', '#10b981', '#10b981'],
        borderRadius: 4,
        barThickness: 20,
      },
    ],
  };

  const donutChartData = {
    labels: ['Kinh tế', 'Văn hóa - Xã hội', 'An ninh trật tự', 'Khác'],
    datasets: [
      {
        data: [45, 25, 20, 10],
        backgroundColor: ['#00288e', '#b8c4ff', '#ffb59a', '#d3e4fe'],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const commonBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { display: false, max: 1.2 },
      x: { grid: { display: false } },
    },
  } as const;

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
  } as const;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { className: 'bg-emerald-50 text-emerald-700', label: 'Đã duyệt' };
      case 'pending':
        return { className: 'bg-amber-50 text-amber-700', label: 'Chờ duyệt' };
      case 'rejected':
        return { className: 'bg-error-container text-error', label: 'Từ chối' };
      default:
        return { className: 'bg-surface-container text-on-surface', label: 'Bản nháp' };
    }
  };

  return (
    <AppLayout
      title={`Xin chào, ${user.fullName || 'Nguyễn Văn A'}`}
      subtitle="Chúc bạn một ngày làm việc hiệu quả."
      actions={
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-level-1 transition-colors hover:bg-primary-container">
          Tạo kỳ báo cáo
        </button>
      }
    >
      <div className="grid grid-cols-12 gap-gutter">
        <section className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            <div className="flex h-[360px] flex-col rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
              <h3 className="mb-4 font-headline-sm text-base text-on-surface">Tiến độ nộp theo thôn/bản</h3>
              <div className="relative min-h-0 flex-1">
                <Bar data={barChartData} options={commonBarOptions} />
              </div>
            </div>

            <div className="flex h-[360px] flex-col rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
              <h3 className="mb-4 font-headline-sm text-base text-on-surface">Phân bổ theo lĩnh vực</h3>
              <div className="relative flex min-h-0 flex-1 items-center justify-center">
                <Doughnut data={donutChartData} options={donutOptions} />
              </div>
            </div>
          </div>

          <div className="mt-gutter rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
            <h3 className="mb-4 font-headline-sm text-base text-on-surface">Báo cáo mới cập nhật</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant text-xs uppercase tracking-wide text-on-surface-variant">
                    <th className="pb-3 font-medium">Tên báo cáo</th>
                    <th className="pb-3 font-medium">Đơn vị / Người gửi</th>
                    <th className="pb-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {reports.map((report) => {
                    const badge = getStatusBadge(report.status);
                    return (
                      <tr key={report._id} className="border-b border-surface-container-low hover:bg-surface-bright">
                        <td className="py-3 font-medium text-on-surface">{report.title}</td>
                        <td className="py-3">
                          <div className="text-on-surface">{report.department}</div>
                          <div className="text-xs text-on-surface-variant">{report.sender}</div>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
