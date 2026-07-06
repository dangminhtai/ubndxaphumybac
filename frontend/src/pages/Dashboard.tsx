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
import { getReports } from '../api/reportApi';
import { getDashboardOverview, getSubmissionProgress } from '../api/dashboardApi';
import type { DashboardOverview, SubmissionProgress } from '../api/dashboardApi';
import type { Report } from '../types/report';
import type { User } from '../types/user';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function readUser() {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) {
    throw new Error('Thiếu thông tin người dùng trong phiên đăng nhập');
  }
  return JSON.parse(rawUser) as Partial<User>;
}

export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [progress, setProgress] = useState<SubmissionProgress[]>([]);
  const user = readUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsData, overviewData, progressData] = await Promise.all([
          getReports(),
          getDashboardOverview(),
          getSubmissionProgress(),
        ]);
        setReports(reportsData);
        setOverview(overviewData);
        setProgress(progressData);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    };
    void fetchData();
  }, []);

  const barChartData = {
    labels: progress.map(p => p.department),
    datasets: [
      {
        label: 'Đã nộp',
        data: progress.map(p => p.submitted),
        backgroundColor: progress.map(p => p.submitted > 0 ? '#10b981' : '#cbd5e1'),
        borderRadius: 4,
        barThickness: 20,
      },
    ],
  };

  const donutChartData = {
    labels: ['Bản nháp', 'Chờ duyệt', 'Đã duyệt'],
    datasets: [
      {
        data: [
          overview ? overview.totalReports - overview.pendingReports - overview.approvedReports : 0,
          overview ? overview.pendingReports : 0,
          overview ? overview.approvedReports : 0,
        ],
        backgroundColor: ['#cbd5e1', '#f59e0b', '#10b981'],
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
      title={`Xin chào, ${user.fullName}`}
      subtitle="Chúc bạn một ngày làm việc hiệu quả."
    >
      <div className="grid grid-cols-12 gap-gutter">
        <section className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            <div className="flex h-[360px] flex-col rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
              <h3 className="mb-4 font-headline-sm text-base text-on-surface">Tiến độ nộp (Kỳ hiện tại)</h3>
              <div className="relative min-h-0 flex-1">
                <Bar data={barChartData} options={commonBarOptions} />
              </div>
            </div>

            <div className="flex h-[360px] flex-col rounded-xl border border-outline-variant bg-white p-5 shadow-level-1">
              <h3 className="mb-4 font-headline-sm text-base text-on-surface">Tình trạng báo cáo (Tổng quan)</h3>
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
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-on-surface-variant">Chưa có báo cáo nào</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
