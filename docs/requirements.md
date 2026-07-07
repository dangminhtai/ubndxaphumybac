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
- Cải thiện logic fetch thông báo: So sánh ID thông báo mới nhất. Nếu có thông báo mới (chưa đọc), kích hoạt phát âm thanh và văng popup (toast).
- Click vào popup sẽ tự động điều hướng sang trang chi tiết thông báo `/notifications`.

Tiêu chí hoàn thành:
- App không lỗi build.
- Có popup bật lên và có âm thanh khi có thông báo mới (hoặc logic đã được code chuẩn xác đón nhận dữ liệu mới).
