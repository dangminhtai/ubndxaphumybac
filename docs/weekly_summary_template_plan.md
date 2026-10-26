# Plan nâng cấp tổng hợp tuần theo mẫu hành chính

**USER CONFIRMED — giao diện cuối cùng:** hai phần I/II, mỗi phần đúng 8 lĩnh vực cố định và mỗi lĩnh vực đúng một textarea luôn có sẵn. Bỏ dropdown nhóm/phần, metadata nguồn và các nút thêm/xóa/tách đoạn. Mapping sẽ do người dùng hướng dẫn sau; lần này chỉ chỉnh editor, chưa đổi thêm logic mapping. Tiêu đề phần dùng “TUẦN {xx}” tự tính.

Trạng thái: ĐÃ TRIỂN KHAI TRONG WORKSPACE — build và kiểm thử fixture/browser đạt; chưa kiểm tra MongoDB thật hoặc runtime Linux/server. Không commit/push/deploy.

**USER CONFIRMED — điều chỉnh sau phản hồi giao diện:** chỉ admin đổi sang mẫu PDF hai phần × tám lĩnh vực. Xóa form admin cũ, nút/cảnh báo chuyển đổi và hai editor Khó khăn, vướng mắc / Kiến nghị, đề xuất. Chuyên viên tiếp tục biểu mẫu bốn mục cho một lĩnh vực, không sửa. Các quyết định giữ giao diện legacy/khó khăn/kiến nghị bên dưới là HISTORICAL và đã được thay thế bởi yêu cầu này.

## 1. Yêu cầu đã xác nhận

- Chỉ lấy nội dung báo cáo chuyên viên đã nộp trong đúng kỳ tuần được chọn. Không đọc file đính kèm, lịch công tác hoặc kho văn bản làm nguồn bổ sung.
- Giữ nội dung chuyên viên đã viết; không tự rút gọn, diễn đạt lại hoặc bổ sung nhiệm vụ bằng AI. Căn cứ ảnh trao đổi: “của chuyên viên viết sao để y dậy”.
- Xếp nội dung vào 8 nhóm lĩnh vực cố định; xuất hai phần kết quả tuần hiện tại và phương hướng, nhiệm vụ tuần kế tiếp.
- Tải được Word (.docx) và PDF theo thể thức PDF mẫu. Giao diện không cần mô phỏng trang giấy giống mẫu.
- Ngày ban hành tự lấy ngày hiện tại theo giờ Việt Nam, tận dụng logic có sẵn. Tuần báo cáo vẫn lấy từ kỳ được chọn, không lấy tuần hiện tại của máy.
- Số báo cáo để trống, không sao chép số 39 của mẫu.
- Tên cơ quan, địa danh, người ký, chức danh, kính gửi và nơi nhận dùng cấu hình chung.
- Thiếu người nộp vẫn tạo được bản tổng hợp; hiển thị thống kê/cảnh báo trên giao diện.
- Chưa xử lý trùng nội dung hoặc mâu thuẫn giữa các chuyên viên. Không thay đổi cơ chế chống trùng bản ghi cùng người/cùng kỳ hiện có trong phạm vi này.
- Không tự ký, không sao chép chữ ký hoặc con dấu trong mẫu.
- Xác nhận bổ sung: thống nhất tuần trong năm theo ISO 8601 ở màn tổng hợp và file xuất, tự tính từ ngày bắt đầu kỳ; tuần kế tiếp và năm cũng tự tính. Không nhập tay hoặc dùng `weekNumber` trong tháng của kỳ cũ.

## 2. Hiện trạng đã đọc từ code

- `backend/src/services/weekly-summary.service.ts`: nguồn lọc đúng `periodId`, `reportType=weekly`, trạng thái `pending/approved`; có kiểm tra người phải nộp và chống trùng bản ghi theo người.
- `combineSection` đang ghép nội dung với tiêu đề lấy từ `field/department`, chưa chuẩn hóa thành 8 nhóm cố định.
- `WeeklySummary` lưu bốn chuỗi `content`, `difficulties`, `proposals`, `nextTasks`; giữ `sourceReportIds` và thời điểm tổng hợp.
- Có luồng xuất DOCX, chưa có endpoint xuất PDF trong routes tổng hợp tuần.
- `generate_weekly_summary_docx.py` gọi generator dùng chung `docx_summary_generator.py`. Generator này tạo bốn phần, header xếp dọc, chưa theo mẫu; một số thông tin cơ quan đang hard-code.
- `format_place_date` đã lấy ngày hiện tại theo múi giờ Việt Nam.
- Chưa xác nhận có cơ chế cấu hình văn bản dùng chung ở nơi khác hoặc bộ chuyển DOCX sang PDF trên môi trường triển khai. Phải kiểm tra trước khi chọn cách triển khai.

## 3. Bố cục đích

- Header hai cột: cơ quan ban hành và số để trống bên trái; quốc hiệu, tiêu ngữ và địa danh/ngày ban hành bên phải.
- Tiêu đề BÁO CÁO; kết quả công tác tuần N/năm và phương hướng, nhiệm vụ tuần N+1/năm. Xử lý chuyển năm theo lịch kỳ thực tế; không cộng số tuần dạng chuỗi.
- Kính gửi, đoạn mở đầu.
- I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ TUẦN N.
- II. PHƯƠNG HƯỚNG, NHIỆM VỤ TUẦN KẾ TIẾP.
- Lời kết, nơi nhận bên trái; chức danh và tên người ký bên phải, chừa khoảng ký.
- A4, Times New Roman, căn lề, cỡ chữ, thụt đầu dòng, giãn dòng, tiêu đề đậm và số trang bám PDF mẫu; kiểm tra bằng bản render thực tế.

Tám nhóm theo thứ tự mẫu:

1. Lĩnh vực Nội vụ và công tác cán bộ.
2. Giáo dục và đào tạo.
3. Bảo trợ xã hội và bảo hiểm y tế.
4. Y tế và an toàn thực phẩm.
5. Người có công.
6. Tổ chức bộ máy, công tác cán bộ và cải cách hành chính.
7. Khoa học, công nghệ và chuyển đổi số.
8. Văn hóa và các lĩnh vực liên quan.

Giữ tên nhóm thống nhất giữa hai phần; mẫu dùng tên ngắn “Y tế” ở phần II nhưng cùng nhóm số 4.

## 4. Các bước triển khai

### A. Kiểm tra dữ liệu và chốt ánh xạ

- [x] Đọc model/form nhập báo cáo, danh mục lĩnh vực, API và editor tổng hợp hiện tại; kiểm tra báo cáo có nhiều lĩnh vực được lưu ra sao.
- [x] Ánh xạ lĩnh vực hiện có vào 8 nhóm bằng ID/mã ổn định, không dựa vào việc AI tự viết lại.
- [x] Hai nhóm 1 và 6 có tên giao nhau: dùng ánh xạ rõ ràng theo danh mục thực tế; báo cáo chưa ánh xạ phải hiện để người phụ trách phân nhóm, không âm thầm bỏ nội dung hoặc đoán nhóm.
- [x] Kiểm tra cấu hình chung hiện có; tái sử dụng nếu đủ, bổ sung tối thiểu nếu thiếu.
- [x] Kiểm tra định nghĩa số tuần/năm và runtime local: kỳ cũ dùng tuần trong tháng; màn tổng hợp mới tính ISO từ ngày kỳ. Local có Word, pywin32, python-docx 1.2.0 và Times New Roman.
- [ ] Kiểm tra runtime chuyển PDF và font trên máy triển khai Linux/server — NOT TESTED, chưa deploy trong phạm vi này.

### B. Chuẩn hóa bản tổng hợp

- [x] Lưu nội dung có cấu trúc theo hai phần × 8 nhóm, kèm liên kết nguồn đủ để đối chiếu; giữ nguyên văn bản và định dạng có ý nghĩa của chuyên viên.
- [x] `content` nguồn đưa vào kết quả; `nextTasks` nguồn đưa vào nhiệm vụ tuần tới. Không tự suy ra nhiệm vụ từ phần kết quả.
- [x] Giữ dữ liệu `difficulties/proposals` hiện có; chưa tự chèn vào cấu trúc hai phần khi chưa có quy tắc nghiệp vụ. Hiển thị để người phụ trách xử lý, không xóa hoặc âm thầm làm mất.
- [x] Cho rà soát, sửa nội dung và phân nhóm trước khi lưu/xuất. Cảnh báo ghi đè khi tổng hợp lại.
- [x] Giữ nguyên giới hạn kỳ, quyền admin, khóa kỳ archived và snapshot nguồn hiện có.
- [x] Thiếu người nộp không chặn. Trường hợp không có nguồn nào tiếp tục dùng lỗi hiện có; đây là mặc định đề xuất, chưa phải xác nhận cho phép tạo báo cáo rỗng.
- [x] Nhóm chưa có nội dung vẫn có vị trí trong editor; mặc định đề xuất giữ tiêu đề nhóm khi xuất, không tự điền “không phát sinh” vì thiếu dữ liệu không chứng minh không phát sinh.
- [x] Bản tổng hợp cũ vẫn đọc được; không tự ghi đè hoặc chuyển đổi phá hủy dữ liệu cũ.

### C. Word và PDF

- [x] Tạo generator/template riêng cho tổng hợp tuần để tránh thay đổi ngoài ý muốn luồng khác đang dùng generator chung.
- [x] Dựng thể thức theo PDF mẫu; lấy thông tin từ cấu hình chung, ngày hiện tại và kỳ được chọn; số báo cáo để trống.
- [x] Word và PDF cùng lấy từ bản tổng hợp đã lưu. Ưu tiên tạo DOCX rồi chuyển sang PDF để giữ bố cục thống nhất; lựa chọn converter sau khi kiểm tra môi trường.
- [x] Bổ sung endpoint/API client/nút tải PDF, giữ tải Word và xử lý lỗi tải file rõ ràng.
- [x] Dọn file tạm, tên file theo kỳ, MIME đúng; lỗi converter phải báo rõ, không trả DOCX giả PDF.

### D. Kiểm tra và nghiệm thu

- [x] Fixture hai tuần qua HTTP với model giả lập trong bộ nhớ: chỉ nội dung tuần chọn xuất hiện, không trộn tháng/tuần khác hoặc draft. Đây không phải test MongoDB thật.
- [x] Đối chiếu nguyên văn nguồn sau tổng hợp/xuất; số liệu, tên riêng, số hiệu văn bản và nội dung nhiệm vụ không đổi.
- [x] Kiểm tra thứ tự 8 nhóm, ánh xạ chưa xác định và một báo cáo chứa nhiều lĩnh vực.
- [x] Thiếu người nộp vẫn tạo được khi có nguồn; không có nguồn báo lỗi hiện có.
- [x] Kiểm tra ngày Việt Nam, xuất kỳ cũ nhưng ngày ban hành hiện tại, tuần chuyển năm và số báo cáo trống.
- [x] Kiểm tra cấu hình cơ quan/người ký/nơi nhận đi vào cả hai định dạng.
- [x] Mở DOCX bằng Word nếu có và render PDF: font tiếng Việt, header hai cột, lề, xuống trang, tiêu đề không bị tách, số trang, khối ký và nơi nhận; không có chữ ký/con dấu mẫu.
- [x] Kiểm tra file tải xuống mở được và có nội dung đúng bản đã lưu, không chỉ dựa vào HTTP 200.
- [x] Chạy build và các test liên quan; ghi PASS/FAIL/BLOCKED/NOT TESTED cùng bằng chứng thực tế.

## 5. Phạm vi và điểm cần quyết định khi triển khai

Không làm AI biên tập/rút gọn, tự ký, xử lý mâu thuẫn nội dung, sửa production, commit/push/deploy trong plan này.

Quyết định triển khai theo mặc định trong plan: khó khăn/kiến nghị giữ riêng để rà soát và đưa thủ công vào nhóm phù hợp; nhóm rỗng giữ tiêu đề; nội dung chưa ánh xạ nằm ở Chưa phân nhóm, lưu nháp được, cần chọn nhóm trước khi xuất. Báo cáo chứa nhiều lĩnh vực có thể tách tại con trỏ mà giữ nguồn và toàn bộ ký tự của hai phần.

## 6. Kết quả kiểm tra thực tế

HISTORICAL: kết quả trước lần người dùng yêu cầu xóa hoàn toàn editor admin cũ. Xem cập nhật mục 7.

Ngày kiểm tra: 26/10/2026, Windows, Python 3.12 / python-docx 1.2.0 / Microsoft Word.

| Hạng mục | Trạng thái | Expected / Actual và bằng chứng |
| --- | --- | --- |
| Backend build + contract | PASS | `npm run test:weekly-summary` chạy `tsc`, kiểm tra query, chống trùng bản ghi, nhãn tuần/năm và cấu trúc nguồn. |
| HTTP fixture hai tuần | PASS | `backend/scripts/test-weekly-summary-routes.cjs`: chỉ 2 nguồn đúng tuần, còn 1 người thiếu vẫn tổng hợp; tháng/tuần khác/draft bị loại. Lưu rồi GET lại khớp nội dung; nguồn không thuộc snapshot bị từ chối. |
| Đồng bộ kho lưu trữ | PASS | Sửa entries rồi GET: `content/nextTasks` được đồng bộ từ nội dung phân nhóm, không giữ bản ghép cũ. |
| Word/PDF thật | PASS | Bật `RUN_PDF_TESTS=1`: HTTP tải DOCX/PDF thật, đúng MIME/đuôi file/tuần 43-2026; mở DOCX bằng Word COM, xuất PDF và đọc nội dung bằng PyMuPDF. |
| Tài liệu và biên năm | PASS | 5 test Python: 8 nhóm × 2 phần, giữ số liệu 692/536/77,4%/2324/QĐ-UBND, đậm/gạch chân, ngày Việt Nam, số để trống, cấu hình người ký, không có ảnh dấu/ký; ISO 53/2026 → 1/2027 và UTC → ngày Việt Nam. Thiếu converter báo lỗi. |
| Bố cục tài liệu | PASS | Đã xem toàn bộ 3 ảnh trang render của fixture đủ 16 nhóm: header 2 cột, Times New Roman, tiếng Việt, căn lề, số trang, nơi nhận/khối ký; không thấy cắt chữ/chồng chữ. |
| Trình duyệt desktop/mobile | PASS | `scripts/test_weekly_summary_ui.py`, Chrome headless, API mock: nhãn tuần tự tính, chọn nhóm, tách đoạn, chuyển nhóm, lưu rồi reload, tải hai định dạng, archived chỉ đọc và chuyển nội dung legacy. Mobile 390×844 không tràn ngang. |
| Quyền và archived | PASS | HTTP fixture: 401/403 đúng; archived từ chối generate/update và vẫn xuất bản có cấu trúc; legacy vẫn đọc được, không bị tự chuyển đổi. |
| Frontend typecheck/bundle | PASS với thư mục output riêng | `tsc -b`; `node node_modules/vite/bin/vite.js build . --configLoader runner --outDir dist-weekly-summary-qa`. Có warning chunk >500kB; không chặn build. |
| Build vào dist hiện hữu | BLOCKED môi trường | Expected: Vite dọn dist; actual: EPERM khi unlink CSS đang bị khóa. Mức thấp / ưu tiên P3; tái hiện `npm run build` trong frontend khi file dist bị khóa. Đã kiểm chứng bundle ở output riêng, không cưỡng chế xóa dist của người dùng. |
| MongoDB thật / tài khoản thật | NOT TESTED | Bộ test dùng model giả lập, không ghi dữ liệu vào DB hiện hữu và không dùng tài khoản thật. |
| LibreOffice trên Linux/server | NOT TESTED | Đã có đường chuyển và lỗi khi thiếu runtime; phiên này kiểm tra chuyển PDF bằng Word trên Windows. |
| Ký số, commit/push/deploy | N/A | Ngoài phạm vi đã thống nhất. |

Artifacts QA ngoài repo: `C:/Users/Public/weekly-summary-qa/weekly-document-test/` (DOCX/PDF và 3 ảnh render); `C:/Users/Public/weekly-summary-qa/weekly-ui-test/` (ảnh desktop/mobile). Không đưa artifacts build vào source.

Hướng dẫn cấu hình chung, runtime Python/PDF và cách chạy lại kiểm tra: `docs/weekly_summary_setup.md`.

## 7. Bỏ hoàn toàn form admin cũ theo phản hồi người dùng

- Đã xóa SECTIONS, Toolbar và ReportEditor cũ khỏi trang admin; chỉ render GroupedSummaryEditor cho mọi trạng thái, kể cả chưa có bản tổng hợp.
- Không còn nút/cảnh báo chuyển đổi hoặc editor riêng khó khăn/kiến nghị. Bản ghi chưa có entries hiện mẫu trống 16 nhóm; tạo tổng hợp để lấy báo cáo đúng tuần.
- API admin chỉ cập nhật entries/status. Schema tổng hợp bỏ difficulties/proposals; generate/update gỡ hai trường này khỏi bản tổng hợp được lưu. Không xóa/sửa báo cáo chuyên viên và không bulk-delete database.
- Giữ content/nextTasks là projection cho kho lưu trữ, không dùng làm form admin bốn mục.
- PASS: build backend, frontend typecheck/bundle QA; contract và HTTP fixture xác nhận API admin không trả difficulties/proposals, nhưng báo cáo chuyên viên vẫn giữ hai trường nguồn. DOCX regression đạt; PDF conversion không đổi, không chạy lại trong lần sửa này.
- PASS browser QA: cả bản có entries và bản chưa có entries đều không hiện form/cảnh báo cũ; bản chưa có entries có đúng 16 nhóm trong form admin, không có hai editor khó khăn/kiến nghị. Đã xem ảnh `C:/Users/Public/weekly-summary-qa/weekly-ui-test/admin-empty-new-template.png`. Lưu/đọc lại, tải Word/PDF, desktop/mobile và archived tiếp tục đạt với API mock.

## 8. Đơn giản hóa editor thành 16 ô nhập cố định

- Đã thay editor từng đoạn bằng một textarea cho từng cặp phần/lĩnh vực. Nhiều đoạn đã nằm cùng nhóm được hiển thị cùng ô; sửa ô chỉ cập nhật nhóm tương ứng, các nhóm khác giữ nguyên.
- Xóa toàn bộ dropdown, nhãn nguồn, thêm/xóa/tách đoạn và hướng dẫn phân nhóm khỏi editor. Không sửa form chuyên viên hoặc logic mapping backend trong lần này.
- PASS frontend typecheck và bundle QA. Browser QA kiểm tra 16 ô, tiêu đề đúng tuần, gộp nội dung cùng lĩnh vực, sửa/lưu/reload đúng ô, mẫu trống đủ 16 ô, desktop/mobile, readiness và archived.
