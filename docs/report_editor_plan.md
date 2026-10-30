# Plan thống nhất trình soạn thảo nội dung báo cáo

Trạng thái: ĐÃ ĐƯỢC DUYỆT, ĐÃ TRIỂN KHAI LOCAL — chưa commit/push/deploy.
Ngày: 30/10/2026.

## 1. Mục tiêu đã xác nhận

Tất cả ô nhập **nội dung báo cáo** dùng chung cách soạn thảo như ảnh: thanh công cụ ở trên, vùng nhập ở dưới. Người dùng bấm định dạng và thấy kết quả trực tiếp, không phải đọc hoặc nhập Markdown/HTML.

- In đậm, in nghiêng, gạch chân.
- Danh sách gạch đầu dòng và danh sách đánh số có ở mọi ô, không tùy mục như hiện tại.
- Danh sách đánh số tự tăng 1 → 2 → 3 khi Enter, không lặp số 1.
- Nội dung giữ đúng khi lưu nháp, nộp, mở lại, admin tổng hợp và xuất Word/PDF.
- Giữ nguyên cấu trúc nghiệp vụ đã chốt: chuyên viên tuần có hai mục cho mỗi lĩnh vực; admin tổng hợp tuần có hai phần × tám lĩnh vực. Tên LV4 là “Y tế”. Báo cáo tháng giữ các mục hiện hữu.

## 2. Hiện trạng đã kiểm tra

| Vị trí | Hiện tại | Thay đổi dự kiến |
|---|---|---|
| `frontend/src/pages/MonthlyReport.tsx` | Toolbar nội bộ chèn `**…**`, `*…*`, `<u>…</u>` vào textarea; đánh số theo đoạn bôi chọn | Thay toolbar và textarea bằng editor chung |
| `frontend/src/pages/EmployeeReport.tsx` | Hai textarea/lĩnh vực, chưa có toolbar | Dùng editor chung cho kết quả và nhiệm vụ tuần tới |
| `frontend/src/components/GroupedSummaryEditor.tsx` | 16 textarea, gom nhiều entry bằng nối chuỗi | Dùng 16 editor; ghép nội dung theo cấu trúc, giữ đúng nhóm/nguồn |
| Đường xuất Python | Có đọc Markdown và một phần HTML; đang bỏ thẻ danh sách khi tách dòng | Bổ sung đọc cấu trúc đoạn/danh sách và xuất định dạng thật |
| Frontend dependencies | Chưa có thư viện rich text editor | Bổ sung thư viện editor phù hợp React hiện tại |

Không thay các trường tên báo cáo, tên người, ngày, tuần, lĩnh vực, tìm kiếm thành rich text. Ghi chú lịch công tác và nội dung nhiệm vụ ở `WorkScheduleForm`/`WeeklyTasks` là loại biểu mẫu khác, ngoài đợt này.

## 3. Thiết kế và cách dùng

Hướng thiết kế: một ô soạn văn bản hành chính quen thuộc, giúp chuyên viên tập trung vào nội dung; giữ giao diện nhẹ, không biến thành bộ công cụ Word đầy đủ.

- Khung bo góc, viền mảnh; toolbar nền xanh nhạt như ảnh; focus viền xanh theo màu primary hiện có.
- Thứ tự công cụ: **B · I · U | gạch đầu dòng · đánh số**. Nút có tooltip tiếng Việt, nhãn truy cập và trạng thái đang bật.
- Vùng nội dung dùng Times New Roman theo font báo cáo, cỡ dễ đọc tương đương 18 px, line-height khoảng 1.5; label dùng font giao diện hiện tại. Giữ hệ màu/token đang có.
- Padding nội dung 16 px; chiều cao ban đầu khoảng 180 px, có thể tăng chiều cao theo chiều dọc; mobile không tràn ngang. Placeholder theo từng mục, biến mất khi có nội dung.
- Nội dung là trọng tâm; toolbar gọn, không có lựa chọn cỡ chữ/font/màu, ảnh, bảng, tiêu đề, căn lề hay chức năng AI trong đợt này. Thể thức toàn văn bản vẫn do mẫu xuất quản lý.
- Các editor độc lập: bấm định dạng ở ô nào chỉ ảnh hưởng ô đó, không mất vùng bôi chọn và không gửi form.

### Hành vi bắt buộc

| Thao tác | Kết quả mong đợi |
|---|---|
| Bôi chọn rồi bấm B/I/U | Định dạng ngay đoạn chọn, không sinh ký hiệu hiển thị |
| Bấm B/I/U khi chưa chọn | Bật/tắt định dạng chữ gõ tiếp, không tự chèn chữ “in đậm” |
| Ctrl/Cmd+B, I, U | Tương đương nút toolbar; U không mở thao tác của trình duyệt khi đang soạn |
| Bật đánh số, gõ dòng đầu và Enter | Tạo mục 2, tiếp tục mục 3… |
| Enter tại mục danh sách trống | Thoát danh sách, về đoạn thường |
| Shift+Enter | Xuống dòng trong cùng đoạn hoặc cùng mục danh sách |
| Xóa/thêm mục ở giữa | Tự tính lại số, không lưu số như ký tự gõ tay |
| Ctrl/Cmd+Z và redo | Hoàn tác/khôi phục chữ và định dạng trong đúng editor |
| Gõ tiếng Việt qua bộ gõ | Không nhảy con trỏ, mất dấu hoặc nhân đôi chữ |
| Dán từ Word/web | Giữ đoạn, B/I/U, danh sách được hỗ trợ; bỏ font, màu, cỡ chữ và nội dung không được phép |
| Dán plain text | Giữ chữ và xuống dòng; không tự diễn giải `**`, `*` hay `<u>` thành định dạng |
| Mở bản đã nộp/kỳ lưu trữ | Hiển thị đúng định dạng, không cho sửa; toolbar ẩn hoặc vô hiệu hóa thống nhất |

Danh sách lồng tối đa ba cấp bằng Tab/Shift+Tab trong danh sách; Tab ở đoạn thường vẫn chuyển focus. Danh sách mới bắt đầu từ 1, giữ start hợp lệ khi đọc tài liệu có sẵn; chưa làm UI tùy chỉnh số bắt đầu.

## 4. Phương án kỹ thuật đề xuất

### Editor và component chung

Đề xuất Tiptap tích hợp React, dùng các extension cốt lõi cho paragraph/text, B/I/U, hard break, bullet/ordered list, list item và undo/redo. Tắt extension/input rules ngoài phạm vi để việc gõ ký hiệu không biến thành Markdown ngoài ý muốn. Chốt phiên bản đồng bộ của các package khi triển khai, xác nhận peer dependencies React 19; không dùng dịch vụ cloud.

Tài liệu chính thức: [React integration](https://tiptap.dev/docs/editor/getting-started/install/react), [StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit). Đây là lựa chọn đề xuất, chưa cài hoặc test trong repo.

Tạo `ReportRichTextEditor` và `ReportRichTextView` dùng chung. Props dự kiến gồm `id`, `ariaLabel`, `value`, `format`, `onChange`, `placeholder`, `readOnly`, `disabled`, `minHeight`, `error`. Phần dữ liệu trả về là HTML đã chuẩn hóa; lỗi/mapping/tuần/nguồn vẫn do form hiện tại quản lý.

### Hợp đồng dữ liệu và dữ liệu cũ

Giữ các trường nội dung dạng string; thêm dấu hiệu định dạng ở document báo cáo và bản tổng hợp, ví dụ `contentFormat: 'html-v1'`. Document không có dấu hiệu tiếp tục dùng luồng legacy; không đoán kiểu chỉ vì chuỗi có dấu `<`.

- HTML mới giới hạn: `p`, `br`, `strong`, `em`, `u`, `ul`, `ol`, `li`; chỉ giữ thuộc tính `start` hợp lệ của `ol`. Không lưu style tùy ý, script, event handler, URL hoặc embed.
- Cả client và server chuẩn hóa/sanitize. Server là nơi kiểm tra cuối cùng; API gọi trực tiếp cũng không đưa HTML ngoài allowlist vào dữ liệu.
- Phân biệt dữ liệu legacy plain text và quy ước Markdown/underline mà toolbar cũ từng tạo bằng adapter theo nguồn/phiên bản. Trường hợp không phân biệt chắc chắn giữ nguyên chữ, không tự đoán/xóa dấu. Kiểm tra fixture dữ liệu cũ trước khi chốt adapter.
- Khi chỉ mở/xem: chuyển đổi trong bộ nhớ, không ghi lại database. Khi người dùng lưu: chuyển toàn bộ các trường rich text thuộc document đó sang cùng format rồi mới gắn `html-v1`, kể cả các trường lịch sử được giữ ẩn. Tránh gắn cờ HTML cho một document còn chứa chuỗi legacy chưa chuyển.
- Không chạy migration hàng loạt hoặc sửa báo cáo đã nộp/đã lưu trữ chỉ để đổi editor.
- Nội dung rỗng như `<p></p>`, `<p><br></p>`, khoảng trắng/nbsp không được vượt kiểm tra bắt buộc. Chuẩn hóa rỗng về `''` để tương thích logic autofill hiện tại.
- Giữ giới hạn dung lượng hiện hành; kiểm tra cả giới hạn HTML lưu và chữ thực, thông báo rõ khi vượt thay vì âm thầm cắt.

### Admin tổng hợp và hiển thị

- Mỗi báo cáo nguồn mang theo format của nó. Trước khi ghép, chuyển sang cấu trúc HTML chuẩn; không nối Markdown và HTML thô rồi đoán kiểu sau.
- Ghép theo các block đoạn/danh sách, giữ thứ tự nguồn, mã lĩnh vực và sourceReportIds. Danh sách độc lập của hai nguồn vẫn là hai danh sách, không tự nối số hoặc trộn tác giả.
- Chuẩn hóa giá trị editor trước khi so sánh; tải trang/setContent không được đánh dấu admin đã sửa. Chỉ thao tác thực của người dùng mới bật dirty.
- Polling không thay nội dung khi đang nhập, không setContent mỗi lần React render và không làm nhảy con trỏ. Bản đã lưu thủ công vẫn được bảo vệ như hiện tại.
- Dùng renderer an toàn ở màn hình xem lại, kho lưu trữ, bản xem báo cáo và nguồn đối soát; không để lộ thẻ HTML ra người dùng. Đối soát vẫn giữ nguyên chữ và bốn trường lịch sử nếu nguồn cũ có chúng.

### Xuất DOCX/PDF

- Tạo bộ đọc HTML allowlist thành block/run có cấu trúc; route legacy dùng adapter riêng. HTML mới không chạy tiếp qua regex Markdown để tránh làm sai dấu `*`, `<`, `>` trong chữ thật.
- B/I/U tạo run thật trong DOCX; paragraph/hard break, đoạn trống có chủ ý được giữ theo quy tắc thống nhất.
- Danh sách dùng numbering/bullet thật của Word, hỗ trợ cấp lồng và start; không chỉ gắn “1.” vào text rồi bỏ cấu trúc.
- Áp dụng cho cả generator báo cáo chuyên viên tuần, tổng hợp tuần và báo cáo tháng sau khi kiểm tra callsite thực tế. PDF chuyển từ chính DOCX đã tạo để cùng nội dung.
- Mọi mẫu vẫn giữ font, lề, quốc hiệu, tiêu ngữ, số báo cáo, tuần/ngày tự tính, hai phần/tám lĩnh vực và phần ký đã chốt. Chỉ định dạng nội dung bên trong ô thay đổi theo thao tác người dùng.
- Cập nhật fixture/demo script nếu cần khai báo format mới, không sửa/xóa dữ liệu demo đang có trong database.

## 5. Thứ tự triển khai

1. Lập danh sách toàn bộ nơi nhập/đọc/lưu/tổng hợp/xuất nội dung báo cáo, fixture legacy và giới hạn request; xác định từng endpoint dùng format nào.
2. Làm hợp đồng format, sanitizer và adapter; kiểm thử legacy/plain/HTML/rỗng trước khi thay UI.
3. Làm component editor/view chung, style theo ảnh, đủ trạng thái và thao tác bàn phím.
4. Thay form chuyên viên tuần, rồi editor admin 16 ô; giữ luồng lưu, nộp, thu hồi, khóa kỳ và polling.
5. Thay editor tháng, xóa toolbar chèn Markdown cũ; cập nhật các màn xem nội dung liên quan.
6. Nâng parser xuất và test Word/PDF để hoàn tất luồng đầu cuối. Chưa coi xong khi chỉ đẹp trên giao diện.
7. Chạy regression, đối chiếu lại PDF mẫu và ghi bằng chứng PASS/FAIL/BLOCKED/NOT TESTED. Không commit/push/deploy trong phạm vi plan này.

## 6. Tiêu chí nghiệm thu

| Nhóm kiểm tra | Expected |
|---|---|
| Nhất quán | Tuần chuyên viên, tuần admin và tháng cùng toolbar/cách soạn; mọi ô đủ năm công cụ |
| Định dạng | Định dạng thấy ngay; không hiện mã do thao tác toolbar; đổi trạng thái đúng theo con trỏ/bôi chọn |
| Danh sách | Tạo 1–2–3, thêm/xóa giữa, Enter thoát, Shift+Enter, lồng cấp và undo/redo đúng |
| Tiếng Việt/paste | Bộ gõ giữ dấu/con trỏ; paste Word và plain text đúng chính sách |
| Lưu thật | Gõ → lưu nháp → đọc API/DB trong database QA riêng → reload → nộp → admin nhận đúng nội dung/format; toast/HTTP 200 không phải bằng chứng duy nhất |
| Nguồn hỗn hợp | Legacy và HTML cùng kỳ ghép đúng lĩnh vực, không mất chữ/định dạng/nguồn, không in ra thẻ |
| Bảo vệ bản sửa | Poll nguồn khi đang nhập không ghi đè; mở báo cáo không tự lưu hoặc bật dirty; khóa kỳ vẫn chặn sửa |
| Trống và ký tự đặc biệt | HTML rỗng bị xử lý đúng; chữ chứa `*`, `**`, `<`, `>`, `&` không bị diễn giải sai |
| An toàn | Payload script/onerror/style/URL không thực thi hoặc tồn tại ngoài allowlist; kiểm tra cả API trực tiếp và view |
| Xuất thật | Mở DOCX/XML xác nhận B/I/U và numbering; chuyển PDF thật, xem ảnh, kiểm tra đầy đủ chữ và số thứ tự |
| Mẫu tuần | Dùng lại bài đối chiếu PDF mẫu: đủ 16 mục, tên “Y tế”, thể thức đã chốt; fixture plain text vẫn giữ bố cục hiện tại |
| Mobile/read-only | Không tràn ngang; toolbar không chiếm vùng nhập; bản chỉ đọc không sửa được |
| Hiệu năng | Trang 16 editor không lag gõ/poll, không làm mất focus; đo trước khi thêm tối ưu hoặc lazy mount |

Build backend/frontend và các test report hiện hữu phải đạt. Kiểm thử converter Windows/Word và Linux/LibreOffice ghi riêng; môi trường chưa chạy phải ghi NOT TESTED, không suy từ môi trường còn lại.

## 7. Kết quả bàn giao dự kiến

- Một editor và một renderer dùng chung, toolbar cũ được gỡ khỏi form tháng.
- Luồng dữ liệu có version, đọc được báo cáo cũ, sanitize ở server, không cần migration ghi đè.
- Xuất Word/PDF giữ định dạng người dùng đã soạn và thể thức mẫu đã duyệt.
- Test, ảnh minh chứng và ghi chú triển khai dependency được cập nhật trong repo.

Phạm vi đã duyệt: ba loại form, năm công cụ như ảnh, rich text trực quan, định dạng mới HTML có version và nguyên tắc giữ dữ liệu cũ.

## 8. Kết quả thực hiện — 30/10/2026

- Đã dùng Tiptap 3.32.1 cho ba form; component `ReportRichTextEditor` và renderer dùng chung. Toolbar cũ chèn Markdown đã bỏ. Nội dung plain text mới có ký hiệu Markdown giữ nguyên chữ; dữ liệu legacy đi qua adapter riêng.
- Version thực tế: `contentFormat: html-v1` trên từng fieldReport và từng summary entry; trên report tháng và projection toàn báo cáo. Dùng version từng phần để ghép nguồn cũ/mới mà không tự đổi cả snapshot nguồn. Không migration dữ liệu ứng dụng.
- Sanitizer: DOMPurify ở client, sanitize-html ở server, allowlist thống nhất; server chuẩn hóa HTML rỗng và giới hạn ba cấp danh sách. Renderer không đưa HTML thô từ API trực tiếp vào trang.
- Chuyên viên tuần vẫn hai mục/lĩnh vực, admin vẫn 16 editor, báo cáo tháng giữ bốn mục. Các màn xem nguồn/đối soát/kho lưu trữ dùng renderer. Sửa thêm luồng nộp tháng để lưu chữ đang soạn thay vì nộp lại snapshot nháp cũ.
- Export HTML có parser block/run riêng, numbering/bullet thật, inline marks, hard break và ký tự đặc biệt. Generator tuần chuyên viên và generator XML tháng được cập nhật. Hiện hệ thống chưa có endpoint xuất tháng riêng; đã test generator tháng trực tiếp, không tự thêm endpoint ngoài phạm vi.

| Kiểm tra thực tế | Kết quả | Bằng chứng/phạm vi |
|---|---|---|
| Build backend, TypeScript/frontend build | PASS | TSC và Vite QA output; còn warning bundle lớn |
| Toolbar và form tuần/tháng | PASS | `scripts/test_report_rich_text_ui.py`: thao tác B/I/U, 1–2–3/Enter thoát, chữ literal, save/reload, paste HTML an toàn, nộp tháng với chữ mới nhất, mobile/read-only |
| Mapping và form hai lĩnh vực | PASS | `scripts/test_field_mapping_ui.py`: bốn editor cho hai lĩnh vực, lưu/tải lại, conflict, admin transfer và review |
| Admin 16 editor | PASS | `scripts/test_weekly_summary_ui.py`: polling nguồn mới, không đè chữ đang nhập, lưu/tải lại, download mock, readiness, archived, mobile |
| Database thật | PASS | `backend/scripts/test-field-mapping-integration.cjs`: DB QA tạo riêng/xóa sau test; field format, sanitize, rỗng, submit, summary/mapping và tháng giữ HTML sau readback |
| DOCX/PDF thật | PASS | Tám test `test_weekly_report_documents.py`, bật RUN_PDF_TESTS=1; Word trên Windows; numbering/start, nested lists, marks và ký tự literal; cả hai generator XML đọc được |
| Mẫu PDF hành chính cũ | PASS | `compare-weekly-template.py`: đủ 16 mục, cùng năm trang, các mốc trang đầu dưới 1 pt |
| Bộ gõ IME vật lý | NOT TESTED | Browser QA nhập chữ tiếng Việt có dấu; chưa thay thế phép thử với UniKey/EVKey thực tế |
| Linux/LibreOffice/Render | NOT TESTED | Chưa deploy; dependency Python/LibreOffice vẫn cần cấu hình server theo tài liệu trước |

Ảnh QA local ở `%TEMP%/report-rich-text-qa/`, `%TEMP%/field-mapping-ui/`, `%TEMP%/weekly-ui-test/`. Không ghi báo cáo giả vào database ứng dụng trong lượt này. Không cần tài khoản dịch vụ editor bên ngoài.
