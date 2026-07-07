BP01

Form đăng nhập
- "Hệ thống quản lý báo cáo điện tử" sửa thành "Hệ thống quản lý"
- "UBND cấp xã" sửa thành "Phòng Văn hóa - Xã hội xã Phù Mỹ Bắc" 
- Bỏ dòng chữ "Hệ thống yêu cầu....nội bộ"
- "Phiên bản 2.0.1 - ... 2024 UBND Cấp Xã" sửa thành "@UBND Phù Mỹ Bắc"

Form trang chủ admin
- "Xin chào, [Account Admin] Chúc bạn một ngày làm việc hiệu quả."  sửa thành: "Xin chào, [Account Admin] \n
XX giờ YY phút ZZ giây, Thứ A ngày BB tháng CC năm DDDD
"

BP02
"Được phát triển để đảm bảo tính minh bạch và hiệu quả" xóa đi



BP03
Thay logo thành logo được cấp ![alt text](../image.png) nên đưa vào thư mục assets riêng cho chuyên nghiệp
sửa "UBND cấp xã" thành "PHÒNG VĂN HÓA - XÃ HỘI"

Tất cả BP yêu cầu tính responsive cho tất cả thiết bị

BP04 - Thiết kế lại giao diện Lịch Công Tác (Weekly Schedule)
Yêu cầu: Giao diện phải bám sát mẫu thiết kế dạng bảng truyền thống (có cột Thời gian, Buổi, Nội dung, Chủ trì...) nhưng vẫn phải đảm bảo Responsive 100% trên điện thoại.

1. Giao diện Desktop (Màn hình lớn - PC/Laptop):
- Thiết kế dạng bảng (Table) cổ điển.
- Màu sắc: Header bảng màu xanh dương đậm (ví dụ #1E60A4), chữ màu trắng, in hoa (THỜI GIAN, BUỔI, NỘI DUNG, CHỦ TRÌ, ĐỊA ĐIỂM, CQCB NỘI DUNG, THÀNH PHẦN, LDVP/CV THEO DÕI).
- Gộp ô (rowSpan): Các sự kiện cùng Ngày sẽ gộp chung ô ở cột "THỜI GIAN" (ví dụ: Thứ hai 06/07/2026). Tương tự, gộp ô ở cột "BUỔI" (Sáng/Chiều/Tối) nếu có nhiều sự kiện trong cùng 1 buổi.
- Viền (Border): Kẻ khung nét mỏng, rõ ràng giữa các ô để dễ đọc.

2. Giao diện Mobile/Tablet (Màn hình nhỏ):
- Do bảng 8 cột không thể hiển thị trên Mobile (sẽ bị trượt ngang vỡ layout), bảng sẽ được tự động chuyển hóa thành dạng Thẻ (Card).
- Gom nhóm theo từng Ngày: Tiêu đề là Ngày (ví dụ: Thứ hai 06/07/2026).
- Gom nhóm con theo Buổi: Dưới Ngày là tiêu đề Buổi (Sáng/Chiều/Tối).
- Card sự kiện: Mỗi sự kiện là 1 khối nằm ngang, dòng đầu in đậm Nội dung (kèm giờ). Các thông tin Chủ trì, Địa điểm, Thành phần được hiển thị dạng danh sách (list) có icon (ví dụ: 👤 Chủ trì: BT Lương Đình Tiên, 📍 Địa điểm: Phòng họp...).

3. Dữ liệu:
- Nội dung (NỘI DUNG) cần hiển thị ghép cả giờ (ví dụ: "08h00. Hội ý Thường trực Đảng uỷ").
- Đính kèm file: Nếu có tài liệu đính kèm, thêm biểu tượng cái ghim (paperclip) kế bên Nội dung sự kiện để người dùng có thể tải về.