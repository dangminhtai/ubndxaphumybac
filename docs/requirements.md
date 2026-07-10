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

## REQ009 - Ẩn phần Người thực hiện ở form tạo Lịch Công Tác

Mô tả:
- Bỏ ô chọn "Người thực hiện" trong giao diện tạo / sửa lịch công tác.
- Logic hệ thống cập nhật: mọi user đều có quyền xem mọi lịch công tác và nhận được thông báo khi có lịch công tác mới/cập nhật, không còn phân biệt ai là "người thực hiện".

Tiêu chí hoàn thành:
- Ẩn/xóa trường `executorIds` trên form `WorkScheduleForm.tsx`.
- Cập nhật logic notification trong backend: gửi thông báo đến tất cả user khi lịch công tác được tạo/cập nhật (dùng `notifyAllUsers`).
- Bỏ kiểm tra quyền `executor` ở phần chi tiết lịch và update status. Mọi người đều xem được chi tiết lịch, nhưng chỉ có role quản lý mới cập nhật được trạng thái.

## REQ010 - Thêm chức năng xóa tài liệu đính kèm ở Lịch Công Tác

Mô tả:
- Hiển thị tên file đính kèm trên giao diện thay vì chữ "Tải về / Xem tài liệu".
- Thêm biểu tượng thùng rác bên cạnh tên tài liệu đính kèm trong màn hình chi tiết.
- Sử dụng popup xác nhận tùy chỉnh (ConfirmModal) thay vì alert mặc định của trình duyệt.
- Xóa tham chiếu file trên Database khi người dùng xác nhận xóa.

Tiêu chí hoàn thành:
- Tên tài liệu đính kèm hiển thị chính xác.
- Nhấn vào biểu tượng thùng rác hiện popup xác nhận UI/UX đẹp.
- Xác nhận xóa thành công, API cập nhật trường `attachmentUrl` thành rỗng.

## REQ011 - Cho phép Chuyên viên tự thu hồi báo cáo tuần / tháng

Mô tả:
- Cho phép Chuyên viên tự thu hồi báo cáo đã gửi (trạng thái pending) về trạng thái nháp (draft) để tự chỉnh sửa khi còn hạn (kỳ báo cáo đang ở trạng thái open). Không nhất thiết phải đợi Admin từ chối/trả về.

Tiêu chí hoàn thành:
- Thêm nút "Thu hồi báo cáo" ở trang báo cáo tuần và báo cáo tháng khi báo cáo đang ở trạng thái pending và kỳ báo cáo đang open.
- Nhấn thu hồi gọi API đổi trạng thái báo cáo về draft.
- Sau khi thu hồi, mở khóa các ô nhập liệu cho phép chỉnh sửa và gửi lại.

## REQ012 - Quản lý kỳ báo cáo (Xóa, Tạo tự động, Tạo thủ công)

Mô tả:
- Admin có quyền xóa kỳ báo cáo và toàn bộ báo cáo con đi kèm.
- Admin có thể tự động tạo lại kỳ báo cáo tuần/tháng hiện tại.
- Admin có thể tạo thủ công kỳ báo cáo với ngày bắt đầu, ngày hết hạn và tiêu đề tùy chỉnh.

Tiêu chí hoàn thành:
- Có nút "Xóa" kế bên nút "Lưu trữ" ở trang Quản lý kỳ báo cáo của Admin.
- Bấm xóa hiện thông báo cảnh báo và xóa thành công kỳ báo cáo lẫn các báo cáo con của kỳ đó.
- Thêm nút "Tạo tự động tuần hiện tại", "Tạo tự động tháng hiện tại" hoạt động đúng.
- Thêm nút "Tạo thủ công" mở modal cho phép Admin nhập đầy đủ thông tin kỳ báo cáo và lưu thành công vào Database.

## REQ013 - Cho phép tổng hợp báo cáo sớm (không bắt buộc đủ 7/7 nhân viên)

Mô tả:
- Admin có thể thực hiện tổng hợp báo cáo tự động ngay cả khi chưa đầy đủ tất cả nhân viên (staff) nộp báo cáo.
- Hệ thống sẽ hiển thị cảnh báo cho Admin khi tổng hợp sớm và chỉ tổng hợp dữ liệu từ những người đã nộp.

Tiêu chí hoàn thành:
- Backend không báo lỗi hay chặn tổng hợp khi số lượng nhân viên đã nộp ít hơn tổng số nhân viên hoạt động.
- Frontend hiển thị cảnh báo ghi rõ "Hiện mới chỉ có X/Y nhân viên nộp báo cáo..." khi Admin bấm "Tạo tổng hợp tự động" trước khi đủ số lượng.
- Tiến trình tổng hợp hoàn thành bình thường và chỉ gộp nội dung của những người đã nộp.

## REQ014 - Thay đổi cấu trúc tiêu đề gộp trong Bản tổng hợp báo cáo tháng

Mô tả:
- Thay vì lấy tên nhân viên `[Tên nhân viên - Tên phòng ban]` làm tiêu đề phân tách khi tổng hợp báo cáo tự động, hệ thống sẽ sử dụng định dạng văn bản thường `- Lĩnh vực: [Tên lĩnh vực]` (nếu có lĩnh vực) hoặc `- Phòng ban: [Tên phòng ban]` (nếu không có lĩnh vực).
- Định dạng này không sử dụng cú pháp markdown (`###`) để tối ưu hóa trải nghiệm người dùng (UX) cho Admin (người không rành kỹ thuật), tránh gây bối rối khi chỉnh sửa trong ô soạn thảo văn bản thô.
- Khi xuất file Word (DOCX), định dạng này sẽ hiển thị tương thích dưới dạng dòng gạch đầu dòng phân cấp rõ ràng.

Tiêu chí hoàn thành:
- Khi bấm "Tạo tổng hợp tự động", nội dung được gộp không chứa tên của nhân viên hay ký tự markdown `### `.
- Tiêu đề phân tách chuyển thành dạng `- Lĩnh vực [Lĩnh vực]:` (ví dụ: `- Lĩnh vực Y tế:` hoặc `- Lĩnh vực Cải cách hành chính:`).
- Nếu không có lĩnh vực thì tự động lấy `- Phòng ban [Tên phòng ban]:` làm tiêu đề phân tách.
- Áp dụng thành công cho cả 4 phần nội dung tổng hợp.

## REQ015 - Kích hoạt thanh công cụ định dạng và tích hợp vào file xuất Word (DOCX)

Mô tả:
- Kích hoạt các nút định dạng (In đậm, In nghiêng, Gạch chân, Danh sách gạch đầu dòng, Danh sách đánh số) trên thanh công cụ của Trình soạn thảo báo cáo (`MonthlyReport.tsx` và `MonthlySummary.tsx`).
- Khi bôi đen văn bản và nhấn các nút trên thanh công cụ, nội dung sẽ được định dạng bằng các cú pháp markup tương ứng (`**`, `*`, `<u>`, `- `, `1. `).
- Tích hợp bộ chuyển đổi định dạng này vào tập lệnh Python ở Backend để khi xuất file DOCX, các phần được định dạng trên Web (in đậm, in nghiêng, gạch chân) sẽ hiển thị đúng kiểu định dạng tương ứng trong Microsoft Word.

Tiêu chí hoàn thành:
- Các nút định dạng hoạt động đúng khi người dùng tương tác trong ô soạn thảo văn bản.
- Xuất file Word (.docx) chuyển đổi thành công văn bản in đậm, in nghiêng, gạch chân tương ứng, thay vì hiển thị các ký tự code thô.
