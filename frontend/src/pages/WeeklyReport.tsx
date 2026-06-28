import { Link } from 'react-router-dom';
import type { User } from '../types/user';

export default function WeeklyReport() {
  const user = JSON.parse(localStorage.getItem('user') || '{}') as Partial<User>;

  return (
    <div className="bg-background text-on-background font-body-lg min-h-screen flex">
      {/* SideNavBar */}
      <nav className="hidden md:flex flex-col h-screen fixed w-[280px] left-0 top-0 p-4 border-r border-outline-variant bg-surface-container-low">
        <div className="mb-8">
          <h1 className="font-headline-lg text-headline-lg font-bold text-primary">Culture & Social</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Phòng Văn hóa - Xã hội</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ul className="space-y-2">
            <li>
              <Link to="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>home</span>
                <span className="font-body-sm text-body-sm">Trang chủ</span>
              </Link>
            </li>
            <li>
              <a className="flex items-center space-x-3 p-3 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all" href="#">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>assignment</span>
                <span className="font-body-sm text-body-sm">Nhiệm vụ được giao</span>
              </a>
            </li>
            <li>
              <Link to="/weekly-report" className="flex items-center space-x-3 p-3 rounded-lg bg-primary-container text-on-primary-container font-bold">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_view_week</span>
                <span className="font-body-sm text-body-sm">Báo cáo tuần</span>
              </Link>
            </li>
            <li>
              <a className="flex items-center space-x-3 p-3 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all" href="#">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>calendar_month</span>
                <span className="font-body-sm text-body-sm">Báo cáo tháng</span>
              </a>
            </li>
            <li>
              <a className="flex items-center space-x-3 p-3 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all" href="#">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>verified</span>
                <span className="font-body-sm text-body-sm">Minh chứng</span>
              </a>
            </li>
            <li>
              <a className="flex items-center space-x-3 p-3 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all" href="#">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>send</span>
                <span className="font-body-sm text-body-sm">Báo cáo đã gửi</span>
              </a>
            </li>
            <li>
              <a className="flex items-center space-x-3 p-3 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all" href="#">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
                <span className="font-body-sm text-body-sm">Thông báo</span>
              </a>
            </li>
            <li>
              <a className="flex items-center space-x-3 p-3 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all" href="#">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>account_circle</span>
                <span className="font-body-sm text-body-sm">Hồ sơ cá nhân</span>
              </a>
            </li>
          </ul>
          <div className="mt-8">
            <button className="w-full bg-primary text-on-primary py-3 rounded-lg font-title-md text-title-md hover:bg-on-primary-fixed-variant transition-colors shadow-sm">
              Tạo báo cáo mới
            </button>
          </div>
        </div>
        <div className="mt-auto border-t border-outline-variant pt-4">
          <ul className="space-y-2">
            <li>
              <a className="flex items-center space-x-3 p-3 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all" href="#">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>settings</span>
                <span className="font-body-sm text-body-sm">Cài đặt</span>
              </a>
            </li>
            <li>
              <Link to="/login" className="flex items-center space-x-3 p-3 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
                <span className="font-body-sm text-body-sm">Đăng xuất</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* TopNavBar (Mobile) */}
      <header className="md:hidden flex justify-between items-center w-full px-container-mobile h-16 sticky top-0 z-50 bg-surface-bright shadow-sm">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary">Culture & Social</h1>
        <div className="flex items-center space-x-4">
          <span className="material-symbols-outlined text-primary cursor-pointer hover:bg-surface-container-high rounded-full p-2 transition-colors">notifications</span>
          <img className="w-8 h-8 rounded-full object-cover" alt="User Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuApqHkYU35rYte8h8LHD5NOKlxNcX_CWK2RYk9YnMNVDLIiLSqwOsIbQ_sQ1z7mXHYC1ihTMJP2eM26nk3ZPvN6xxJNXOGjrMV5pAWvr7O8Rt8tSTh9hZa2xytZQhr4ZUjLs1O9h21N36yTIROknY2Mfl-WrHsyXBMKxUJ8fASRR54DjGyhRWTgu41zIM8YYPll4nzekiLyQBSnisp8DWitzZ5pIY7E856IYFAN_i6-_ft8yaKs2038A5MmRRfZqKa3KMOgBvG3j7F8" />
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 md:ml-[280px] p-container-mobile md:p-container-desktop bg-[#F4F7FB] min-h-screen">
        <div className="max-w-[1440px] mx-auto">
          <header className="mb-section-margin flex justify-between items-end mt-4">
            <div>
              <h2 className="font-display-lg text-display-lg text-on-surface mb-2">Nhập Báo Cáo Tuần</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant">Kỳ báo cáo: Tuần 3 - Tháng 10/2023</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="material-symbols-outlined text-primary p-2 hover:bg-surface-container-high rounded-full cursor-pointer transition-colors">notifications</span>
              <img className="w-10 h-10 rounded-full object-cover border border-outline-variant" alt="User Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC5rtFAcycJ4iGuPncaR1R8-kiTdcIJhUjaYZNCSGviWFMzCs8goqmCfmycmayPLcTRt2l51mVIGtB6XclNuGo8gwJcWZy9P9T-s2cn1EW4wu_pSfGFPhgpFYntekLoJAQu2AC8eXFn1c7G9rDdCIBeuBG6g-WeMddqtBye85JI4Eia8R8Ty9U-6vLI-CWyVq6yaUX4YEq0hm8ZIGgeWlSD9d-gzQRwpOhbgITR3hswF9l4-2qW9Ry-OvZf8FL7y-wFYkn2VeOjhi2A" />
              <div className="flex flex-col ml-2">
                 <span className="font-bold text-sm">{user.fullName || 'Nguyễn Văn A'}</span>
                 <span className="text-xs text-gray-500">{user.department || 'Cán bộ'}</span>
              </div>
            </div>
          </header>

          <form className="space-y-card-gap pb-32">
            {/* I. Kết quả thực hiện */}
            <section className="bg-surface-container-lowest rounded-xl p-6 soft-shadow task-card-accent border-l-4 border-primary">
              <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center">
                <span className="material-symbols-outlined mr-2 text-primary">edit_document</span>
                I. Kết quả thực hiện
              </h3>
              <div className="border border-outline-variant rounded-lg overflow-hidden focus-within:border-primary transition-colors">
                <div className="bg-surface-container-low p-2 border-b border-outline-variant flex space-x-2">
                  <button className="p-1 hover:bg-surface-container-high rounded" type="button"><span className="material-symbols-outlined text-on-surface-variant">format_bold</span></button>
                  <button className="p-1 hover:bg-surface-container-high rounded" type="button"><span className="material-symbols-outlined text-on-surface-variant">format_italic</span></button>
                  <button className="p-1 hover:bg-surface-container-high rounded" type="button"><span className="material-symbols-outlined text-on-surface-variant">format_underlined</span></button>
                  <button className="p-1 hover:bg-surface-container-high rounded" type="button"><span className="material-symbols-outlined text-on-surface-variant">format_list_bulleted</span></button>
                </div>
                <textarea className="w-full h-48 p-4 bg-transparent border-none focus:ring-0 resize-y text-body-lg font-body-lg" placeholder="Nhập tóm tắt kết quả thực hiện các nhiệm vụ văn hóa, xã hội trong tuần..."></textarea>
              </div>
            </section>

            {/* II. Số liệu */}
            <section className="bg-surface-container-lowest rounded-xl p-6 soft-shadow mt-6">
              <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center">
                <span className="material-symbols-outlined mr-2 text-primary">bar_chart</span>
                II. Số liệu
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant text-on-surface-variant font-label-caps text-label-caps uppercase tracking-wider">
                      <th className="py-3 px-4 w-1/2">Chỉ tiêu</th>
                      <th className="py-3 px-4 w-1/4 text-right">Kế hoạch</th>
                      <th className="py-3 px-4 w-1/4 text-right">Thực hiện</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-surface-container-low transition-colors group border-b border-outline-variant">
                      <td className="py-3 px-4 font-body-lg text-body-lg text-on-surface font-semibold">Số tin bài</td>
                      <td className="py-3 px-4 text-right">
                        <input className="w-20 bg-surface-container-low border border-transparent rounded px-2 py-1 text-right focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" type="number" defaultValue="10" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input className="w-20 border border-outline-variant rounded px-2 py-1 text-right focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="0" type="number" />
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-container-low transition-colors group border-b border-outline-variant">
                      <td className="py-3 px-4 font-body-lg text-body-lg text-on-surface font-semibold">Số cuộc tuyên truyền</td>
                      <td className="py-3 px-4 text-right">
                        <input className="w-20 bg-surface-container-low border border-transparent rounded px-2 py-1 text-right focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" type="number" defaultValue="2" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input className="w-20 border border-outline-variant rounded px-2 py-1 text-right focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="0" type="number" />
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-container-low transition-colors group border-b border-outline-variant">
                      <td className="py-3 px-4 font-body-lg text-body-lg text-on-surface font-semibold">Số hộ nghèo hỗ trợ</td>
                      <td className="py-3 px-4 text-right">
                        <input className="w-20 bg-surface-container-low border border-transparent rounded px-2 py-1 text-right focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" type="number" defaultValue="15" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input className="w-20 border border-outline-variant rounded px-2 py-1 text-right focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="0" type="number" />
                      </td>
                    </tr>
                    <tr className="hover:bg-surface-container-low transition-colors group">
                      <td className="py-3 px-4 font-body-lg text-body-lg text-on-surface font-semibold">Số người tham gia BHYT</td>
                      <td className="py-3 px-4 text-right">
                        <input className="w-20 bg-surface-container-low border border-transparent rounded px-2 py-1 text-right focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none" type="number" defaultValue="500" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input className="w-20 border border-outline-variant rounded px-2 py-1 text-right focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="0" type="number" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* III. Khó khăn */}
              <section className="bg-surface-container-lowest rounded-xl p-6 soft-shadow">
                <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center">
                  <span className="material-symbols-outlined mr-2 text-secondary-container">warning</span>
                  III. Khó khăn
                </h3>
                <textarea className="w-full h-32 p-4 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none text-body-lg font-body-lg" placeholder="Nêu các vướng mắc, khó khăn trong quá trình thực hiện..."></textarea>
              </section>

              {/* IV. Kiến nghị */}
              <section className="bg-surface-container-lowest rounded-xl p-6 soft-shadow">
                <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center">
                  <span className="material-symbols-outlined mr-2 text-primary">lightbulb</span>
                  IV. Kiến nghị
                </h3>
                <textarea className="w-full h-32 p-4 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none text-body-lg font-body-lg" placeholder="Đề xuất các giải pháp, kiến nghị lên cấp trên..."></textarea>
              </section>
            </div>

            {/* V. Nhiệm vụ thời gian tới */}
            <section className="bg-surface-container-lowest rounded-xl p-6 soft-shadow mt-6">
              <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center">
                <span className="material-symbols-outlined mr-2 text-primary">next_plan</span>
                V. Nhiệm vụ thời gian tới
              </h3>
              <textarea className="w-full h-32 p-4 border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none text-body-lg font-body-lg" placeholder="Kế hoạch và nhiệm vụ trọng tâm cho tuần/tháng tiếp theo..."></textarea>
            </section>

            {/* Minh chứng Upload */}
            <section className="bg-surface-container-lowest rounded-xl p-6 soft-shadow border border-dashed border-outline-variant mt-6">
              <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center">
                <span className="material-symbols-outlined mr-2 text-primary">upload_file</span>
                Minh chứng đính kèm
              </h3>
              <div className="flex flex-col items-center justify-center p-8 bg-surface-container-low rounded-lg border border-dashed border-outline-variant cursor-pointer hover:bg-surface-container-highest transition-colors">
                <span className="material-symbols-outlined text-4xl text-primary mb-2">cloud_upload</span>
                <p className="font-body-lg text-body-lg text-on-surface-variant text-center mb-1">Kéo thả file vào đây hoặc nhấn để chọn file</p>
                <p className="font-body-sm text-body-sm text-outline text-center">Hỗ trợ PDF, DOCX, JPG, PNG (Tối đa 10MB)</p>
              </div>
            </section>
          </form>

          {/* Fixed Bottom Actions */}
          <div className="fixed bottom-0 right-0 md:left-[280px] left-0 bg-surface-container-lowest border-t border-outline-variant p-4 flex justify-end items-center space-x-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
            <button className="px-6 py-2 rounded-lg font-title-md text-title-md text-primary border border-primary hover:bg-primary-container hover:text-on-primary-container transition-colors" type="button">Lưu nháp</button>
            <button className="px-6 py-2 rounded-lg font-title-md text-title-md text-on-surface-variant hover:bg-surface-container-high transition-colors" type="button">Xem trước</button>
            <button className="px-6 py-2 rounded-lg font-title-md text-title-md bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary transition-colors shadow-sm flex items-center" type="button">
              <span className="material-symbols-outlined mr-2 text-[20px]">send</span>
              Gửi báo cáo
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
