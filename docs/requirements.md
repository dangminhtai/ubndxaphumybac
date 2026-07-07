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
