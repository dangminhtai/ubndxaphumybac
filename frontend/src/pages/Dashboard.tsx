import { useEffect, useState } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface Report {
  _id: string;
  title: string;
  department: string;
  sender: string;
  status: string;
  submittedAt: string;
}

interface UserData {
  fullName?: string;
  role?: string;
}

export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const user: UserData = JSON.parse(localStorage.getItem('user') || '{}') as UserData;

  useEffect(() => {
    const fetchReports = async () => {
      try {
        await axios.post('/api/reports/seed');
        const res = await axios.get<Report[]>('/api/reports');
        setReports(res.data);
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      }
    };
    fetchReports();
  }, []);

  const barChartData = {
    labels: ['Thôn 1', 'Thôn 2', 'Thôn 3', 'Bản A', 'Bản B', 'YT', 'CA'],
    datasets: [{
      label: 'Đã nộp',
      data: [1, 1, 0, 1, 1, 1, 1],
      backgroundColor: ['#10b981', '#10b981', '#cbd5e1', '#10b981', '#10b981', '#10b981', '#10b981'],
      borderRadius: 4,
      barThickness: 20
    }]
  };

  const donutChartData = {
    labels: ['Kinh tế', 'Văn hóa - Xã hội', 'An ninh trật tự', 'Khác'],
    datasets: [{
      data: [45, 25, 20, 10],
      backgroundColor: ['#00288e', '#b8c4ff', '#ffb59a', '#d3e4fe'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const commonBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { display: false, max: 1.2 },
      x: { grid: { display: false } }
    }
  } as const;

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%'
  } as const;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { className: 'bg-emerald-50 text-emerald-700', label: 'Đã duyệt' };
      case 'pending':
        return { className: 'bg-amber-50 text-amber-700', label: 'Chờ duyệt' };
      default:
        return { className: 'bg-surface-container text-on-surface', label: 'Bản nháp' };
    }
  };

  return (
    <div className="font-body-md text-on-surface bg-background flex">
      {/* SideNavBar */}
      <nav className="bg-primary w-[280px] h-screen fixed left-0 top-0 shadow-sm flex flex-col z-50">
        <div className="p-container-padding border-b border-white/10">
          <div className="flex items-center gap-3">
            <img alt="UBND Logo" className="w-10 h-10 object-contain rounded-full bg-white/20 p-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEH3Lc0Lb79jlvAepTsDvVFN6u3cw0t0vD_05SiC9z4W71fC-_cqztRCbFyMdl3ABIgd-bLRQZy3TXrUimkSdDrTYsFyPiXK97xjmesB8dAqUKtuvofWvwSAW7nX8Zi2Ig7Sah-c7I-h1-tN5xf34Oh8BW8tXA3LkZ8NVDVgL8NbVAof3CRphpw4JjIZldG1bVJRCg2OMbPkoO90Y7aMu8NqueSJi5SoIpz-Wvn9AEwful0J-gtda4hlImFyY6NVuM0zjeBv4o0iwG"/>
            <div>
              <h1 className="font-headline-sm text-headline-sm text-on-primary font-bold">UBND Cấp Xã</h1>
              <p className="text-white/70 text-xs">Hệ thống quản lý báo cáo</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-stack-md">
          <ul className="flex flex-col gap-1 px-3">
            <li>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 border-white bg-white/10 text-white font-semibold hover:bg-white/10 transition-colors duration-200" href="#">
                Trang chủ
              </a>
            </li>
            <li>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 border-transparent text-white/70 hover:text-white hover:bg-white/5 transition-colors duration-200" href="#">
                Báo cáo Tuần
              </a>
            </li>
            <li>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 border-transparent text-white/70 hover:text-white hover:bg-white/5 transition-colors duration-200" href="#">
                Báo cáo Tháng
              </a>
            </li>
            <li>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 border-transparent text-white/70 hover:text-white hover:bg-white/5 transition-colors duration-200" href="#">
                Bảng điều khiển
              </a>
            </li>
            <li>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 border-transparent text-white/70 hover:text-white hover:bg-white/5 transition-colors duration-200" href="#">
                Kho lưu trữ
              </a>
            </li>
            <li>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-4 border-transparent text-white/70 hover:text-white hover:bg-white/5 transition-colors duration-200" href="#">
                Thông báo
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Main Content Wrapper */}
      <div className="flex-1 ml-[280px] min-h-screen flex flex-col">
        {/* TopNavBar */}
        <header className="bg-surface h-16 w-full fixed top-0 z-40 border-b border-outline-variant flex justify-between items-center px-container-padding" style={{ width: 'calc(100% - 280px)' }}>
          <div className="flex items-center flex-1">
            <div className="relative w-64 focus-within:ring-2 focus-within:ring-primary rounded-full">
              <input className="w-full bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-0" placeholder="Tìm kiếm báo cáo..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-outline-variant">
              <div className="text-right">
                <div className="font-semibold text-sm">{user.fullName || 'Nguyễn Văn A'}</div>
                <div className="text-xs text-on-surface-variant">{user.role || 'Admin'}</div>
              </div>
              <img alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-outline-variant" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmfHRvD3phNFm-mTM_iEt-Bx7JHi6kCSeejQcvpragjYE8jJDtyZSsEzAk8JPyJOs3Qa5pjW7kn56X6WlesFFRHhehYGgQgAP9xWngUuQgpMKH_VF0g-AMx5ipn1UBS0fEMy889yGqfLHO24be3ANds9hCv8ZTsQ6E32U5zgENYZOTQWmQQp_Jsa7tREvRoX9v3Y5QZ3dDw6t0wmFAO9rPOpZ0Yp7dAAQR91CSrj54UKObIDHNg_Sv0FUppFGpURT6QtJQElYkYQoM"/>
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 mt-16 p-container-padding max-w-[1440px] mx-auto w-full">
          {/* Welcome Section */}
          <div className="flex justify-between items-end mb-stack-lg">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Xin chào, {user.fullName || 'Nguyễn Văn A'} 👋</h2>
              <p className="text-on-surface-variant">Chúc bạn một ngày làm việc hiệu quả.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-container shadow-level-1 transition-all">
                Tạo kỳ báo cáo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-gutter mb-stack-lg">
            {/* Main Statistics & Charts (Left 8 columns) */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-gutter">
              {/* Progress & Charts Row */}
              <div className="grid grid-cols-2 gap-gutter h-[380px]">
                <div className="bg-white rounded-xl p-5 border border-surface-variant shadow-level-1 flex flex-col">
                  <h3 className="font-headline-sm text-base text-on-surface mb-4">Tiến độ nộp theo thôn/bản</h3>
                  <div className="flex-1 relative w-full h-full">
                    <Bar data={barChartData} options={commonBarOptions} />
                  </div>
                </div>
                <div className="bg-white rounded-xl p-5 border border-surface-variant shadow-level-1 flex flex-col">
                  <h3 className="font-headline-sm text-base text-on-surface mb-4">Phân bổ theo lĩnh vực</h3>
                  <div className="flex-1 relative w-full h-full flex items-center justify-center">
                    <Doughnut data={donutChartData} options={donutOptions} />
                  </div>
                </div>
              </div>

              {/* Recent Reports Table */}
              <div className="bg-white rounded-xl p-5 border border-surface-variant shadow-level-1">
                <h3 className="font-headline-sm text-base text-on-surface mb-4">Báo cáo mới cập nhật</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-surface-variant text-xs text-on-surface-variant uppercase tracking-wider">
                        <th className="pb-3 font-medium">Tên báo cáo</th>
                        <th className="pb-3 font-medium">Đơn vị / Người gửi</th>
                        <th className="pb-3 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {reports.map((r) => {
                        const badge = getStatusBadge(r.status);
                        return (
                          <tr key={r._id} className="border-b border-surface-container-low hover:bg-surface-bright transition-colors group">
                            <td className="py-3 font-medium text-on-surface">{r.title}</td>
                            <td className="py-3">
                              <div className="text-on-surface">{r.department}</div>
                              <div className="text-xs text-on-surface-variant">{r.sender}</div>
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
