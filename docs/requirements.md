## REQ001 - Chỉnh sửa thông tin hiển thị và Dashboard

Mô tả:
- Cập nhật text tiêu đề, tên đơn vị, thông báo và footer trên trang Đăng nhập theo yêu cầu (đổi từ UBND Cấp Xã thành Phòng Văn hóa - Xã hội xã Phù Mỹ Bắc).
- Thêm đồng hồ hiển thị thời gian thực cập nhật mỗi giây ở phụ đề của Dashboard.

Tiêu chí hoàn thành:
- Chỉnh sửa thành công `Login.tsx`.
- Thêm cơ chế đồng hồ ở `Dashboard.tsx` và hiển thị đúng định dạng.

## REQ002 - Cập nhật BP02: Tối ưu hiển thị và Responsive

Mô tả:
- Xóa dòng chữ "Được phát triển để đảm bảo tính minh bạch và hiệu quả" ở trang Đăng nhập.
- Đảm bảo tất cả các trang đều responsive trên tất cả các thiết bị.

Tiêu chí hoàn thành:
- Text đã bị xóa ở footer của `Login.tsx`.
- Source code đảm bảo sử dụng các Tailwind classes cho responsive layout (`md:`, `lg:`...) cho mọi thiết bị.

## REQ003 - Cập nhật BP03: Thay đổi Logo và Tên đơn vị trên Header

Mô tả:
- Chuyển file `image.png` vào thư mục `frontend/src/assets/logo.png` để quản lý asset chuyên nghiệp.
- Cập nhật logo mới thay cho icon Shield ở thanh điều hướng (`AppLayout.tsx`) và ở trang đăng nhập (`Login.tsx`).
- Sửa chữ "UBND Cấp Xã" thành "PHÒNG VĂN HÓA - XÃ HỘI" ở thanh điều hướng (`AppLayout.tsx`).

Tiêu chí hoàn thành:
- Logo hiển thị đúng từ file ảnh mới.
- Tiêu đề header hiển thị đúng chữ "PHÒNG VĂN HÓA - XÃ HỘI".

## REQ004 - Bổ sung SEO và Open Graph Meta Tags

Mô tả:
- Thay đổi thông tin thẻ `<title>` và thêm `<meta description>` trong file `index.html`.
- Bổ sung các thẻ Open Graph (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`) để hiển thị preview link đẹp và minh bạch khi chia sẻ qua Zalo, Messenger.
- Copy file logo vào thư mục `public` để làm icon tab và hình ảnh thumbnail khi chia sẻ link.

Tiêu chí hoàn thành:
- `index.html` có đầy đủ các thẻ meta mới.
- `logo.png` tồn tại ở đường dẫn gốc `/logo.png`.

## REQ005 - Nâng cấp trải nghiệm Thông báo (Notification)

Mô tả:
- Tích hợp thư viện `react-hot-toast` để hiển thị popup thông báo góc màn hình.
- Tích hợp file âm thanh `notification.mp3` để phát khi có thông báo mới.
- Tích hợp HTML5 Web Notification API để đẩy thông báo thẳng ra màn hình Desktop (Action Center của Windows/macOS) ngay cả khi user đang thu nhỏ trình duyệt.
- Cải thiện logic fetch thông báo: So sánh ID thông báo mới nhất. Nếu có thông báo mới (chưa đọc), kích hoạt phát âm thanh và văng popup (toast & desktop notification).
- Click vào popup sẽ tự động điều hướng sang trang chi tiết thông báo `/notifications`.

Tiêu chí hoàn thành:
- App không lỗi build.
- Có popup bật lên và có âm thanh khi có thông báo mới (hoặc logic đã được code chuẩn xác đón nhận dữ liệu mới).

## REQ006 - Tăng thời hạn JWT Session lên 3 tháng

Mô tả:
- Sửa JWT expiration time từ 8 tiếng thành 90 ngày (`90d`).
- Điều này giúp người dùng sử dụng nội bộ không phải đăng nhập lại liên tục, giữ cookie/token trên thiết bị lâu dài.

Tiêu chí hoàn thành:
- File `auth.service.ts` được cập nhật chính xác tham số `expiresIn`.

## REQ007 - Sửa lỗi điều hướng "Tổng hợp báo cáo" trên di động

Mô tả:
- Khi truy cập route `/monthly-summary` từ menu mà không có `periodId`, giao diện không được phép ném lỗi "Không tìm thấy kỳ báo cáo" ngay lập tức.
- Yêu cầu chờ trạng thái `loading` để call API lấy ID kỳ báo cáo hiện tại.

Tiêu chí hoàn thành:
- Bổ sung `if (loading) return <Loading/>` trước khi báo lỗi `periodId`.

## REQ008 - Thiết kế lại Lịch Công Tác (Weekly Schedule)

Mô tả:
- Dựa theo BP04, thiết kế lại giao diện hiển thị Lịch Công Tác.
- Màn hình Desktop: Hiển thị dưới dạng Bảng (Table), gộp nhóm dữ liệu theo Ngày (`rowSpan` Thời gian) và theo Buổi (Sáng/Chiều/Tối). Hiển thị đầy đủ 8 cột như mẫu.
- Màn hình Mobile: Hiển thị dạng Thẻ (Cards), gộp nhóm theo Ngày -> Buổi.
- Thêm trường dữ liệu `preparingAgency` (CQCB Nội dung), `monitoringOfficer` (LDVP/CV Theo dõi), `attachmentUrl` (Link đính kèm) vào hệ thống Backend (schema, service validation) và Form nhập liệu.

Tiêu chí hoàn thành:
- Bảng hiển thị chính xác theo yêu cầu trên Desktop, không bị vỡ bố cục.
- Danh sách thẻ Card hiển thị đúng theo Ngày -> Buổi trên màn hình Mobile.
- Có thể thêm/sửa/lưu thành công các trường dữ liệu mới.
