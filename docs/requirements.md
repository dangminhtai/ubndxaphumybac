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
