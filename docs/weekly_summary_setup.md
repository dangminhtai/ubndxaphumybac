# Tổng hợp tuần theo mẫu: cấu hình và vận hành

## Cách dùng

1. Mở Tổng hợp tuần và chọn kỳ. Tên tuần trong năm tự tính theo ISO 8601 từ ngày bắt đầu kỳ theo giờ Việt Nam, không dùng `weekNumber` trong tháng của dữ liệu cũ.
2. Khi chưa có bản soạn đã lưu, 16 ô tự hiển thị nội dung từ báo cáo weekly đã nộp/được duyệt trong đúng kỳ được chọn. Trang kiểm tra nguồn mỗi 5 giây. Đây là bản xem trước, không tự ghi database khi đọc trang. Bản tạo bằng nút Tạo tổng hợp tự động tiếp tục theo nguồn đến khi admin sửa/lưu; bản admin đã lưu được giữ, muốn lấy lại nguồn thì dùng nút tạo lại có xác nhận.
3. Giao diện admin có sẵn đúng 16 textarea: 8 lĩnh vực dưới phần I và 8 lĩnh vực dưới phần II, mỗi lĩnh vực một ô nhập. Không có dropdown nhóm/phần, nhãn nguồn, nút thêm/xóa/tách đoạn. Tiêu đề hai phần dùng tuần trong năm tự tính. Mapping LV1–LV8 và phân công đã triển khai theo `docs/field_mapping_plan.md`; báo cáo mới lưu mã cho từng bộ bốn nội dung.
4. Nội dung được giữ nguyên, không gọi AI để viết lại. Các trường nguồn Cải cách hành chính / Chuyển đổi số được đưa vào nhóm 6 / 7 của phần kết quả nếu có.
5. Admin chỉ có editor hai phần theo mẫu PDF. Không có ô Khó khăn, vướng mắc / Kiến nghị, đề xuất riêng. Chuyên viên tiếp tục nộp bốn mục cho một lĩnh vực như trước; không đổi biểu mẫu chuyên viên.
6. Lưu hoặc Lưu & Xuất DOCX/PDF. Ô nhập trống luôn hiện sẵn. Khi xuất, nhóm rỗng giữ tiêu đề, không tự ghi “không phát sinh”. Nguồn thiếu/trùng mã cần admin đối soát trước khi tạo tổng hợp; có công cụ riêng ở danh sách nguồn và Quản lý tài khoản.

Admin luôn hiện hai phần × tám nhóm, kể cả chưa tạo tổng hợp hoặc bản ghi chưa có entries. Không có form cũ, cảnh báo hoặc nút chuyển đổi. Dùng Tạo tổng hợp tự động để lấy nguồn đúng tuần và lưu theo mẫu. Các trường chuỗi kết quả/nhiệm vụ được đồng bộ để kho lưu trữ đọc đúng bản mới. Hai trường khó khăn/kiến nghị cũ của bản tổng hợp được gỡ khi tạo/lưu; các trường đó trong báo cáo chuyên viên không bị sửa. Kỳ archived chỉ đọc/xuất bản đã có cấu trúc.

## Cấu hình văn bản chung

File mặc định: `backend/src/config/document-defaults.json`. Các giá trị mặc định lấy từ PDF mẫu người dùng cung cấp. Kiểm tra giá trị người ký/cơ quan khi thay đổi nhân sự.

Có thể dùng biến môi trường `DOCUMENT_CONFIG_PATH` trỏ tới file JSON riêng, đầy đủ các trường cùng cấu trúc. Server đọc và kiểm tra cấu hình mỗi lần xuất. Cấu hình gồm cơ quan cấp trên, đơn vị, địa danh, mã văn bản, kính gửi, nơi nhận, chức danh và tên người ký. Số báo cáo luôn để trống; không có ảnh chữ ký/con dấu.

Ngày ban hành luôn lấy ngày xuất theo giờ Việt Nam. Tuần báo cáo/tuần tới lấy từ ngày kỳ được chọn và ngày đó +7 ngày, có xử lý năm ISO khác năm dương lịch. Mốc “cập nhật đến” nếu có dùng thời điểm chụp nguồn khi tạo tổng hợp, không gán hạn nộp trong tương lai khi tổng hợp sớm.

## Runtime xuất file

Trong môi trường Python backend sử dụng:

```powershell
python -m pip install -r backend/requirements-documents.txt
```

Nếu dùng `PYTHON_BIN`, cài vào đúng Python đó. DOCX dùng python-docx và generator tuần riêng; không cần Microsoft Word trên server để tạo DOCX.

PDF được chuyển từ cùng DOCX theo thứ tự:

- LibreOffice Writer qua `SOFFICE_BIN` hoặc lệnh `libreoffice`/`soffice` trong PATH. Mỗi lần chuyển dùng profile tạm riêng. Server cần cài font Times New Roman để giữ bố cục.
- Windows có Microsoft Word và pywin32: dùng một instance Word riêng, ẩn cửa sổ, đọc DOCX rồi xuất PDF. Đây là đường chuyển đã kiểm tra trên máy phát triển.

Linux/server chưa cài LibreOffice sẽ trả lỗi xuất rõ ràng, không trả một file DOCX mang đuôi PDF. Đường chuyển LibreOffice trên server chưa được kiểm chứng trong phiên này.

Đóng gói triển khai cần mang theo `backend/src/scripts/` và `backend/src/config/document-defaults.json` hoặc cấu hình `DOCUMENT_CONFIG_PATH`. File xuất tạm được dọn sau khi tải hoặc khi tạo thất bại. Không có migration ghi đè dữ liệu cũ.

## Kiểm tra

Backend: `npm run test:weekly-summary` trong `backend/`. Test HTTP dùng model giả lập trong bộ nhớ, không nối MongoDB thật. Đặt `RUN_PDF_TESTS=1` để chạy thêm chuyển PDF thật; Python kiểm tra PDF cần PyMuPDF (phục vụ QA, không phải runtime xuất file).

Frontend: `npm run build` trong `frontend/`. Nếu `dist` đang bị khóa trên Windows, build sang thư mục riêng sau khi chạy `tsc -b`:

```powershell
node node_modules/vite/bin/vite.js build . --configLoader runner --outDir dist-weekly-summary-qa
```

Browser QA: `python scripts/test_weekly_summary_ui.py` từ root; cần Playwright Python và Chrome. Test mở HTTP server local tạm, mock API, không đăng nhập tài khoản thật; kiểm tra desktop/mobile, phân nhóm/tách đoạn, lưu/đọc lại, download, archived và bản cũ. `CHROME_BIN` có thể chỉ định Chrome khác. Kết quả chuyển file thật được kiểm tra riêng trong test backend/Python.

Các kết quả thực tế và giới hạn được ghi trong `docs/weekly_summary_template_plan.md`.

## Đối chiếu thể thức với PDF mẫu — 30/10/2026

- USER CONFIRMED: LV4 thống nhất tên “Y tế” trong cả hai phần, danh mục, giao diện chuyên viên và xuất báo cáo. Mã LV4/health không đổi; tên cũ còn là alias đọc dữ liệu lịch sử, không sửa nội dung nguồn trong DB.
- Tiêu đề I/II chỉ ghi số tuần; năm giữ ở tiêu đề báo cáo và câu dẫn. Câu kết dùng “UBND xã”, năm ghi cuối cặp tuần cùng năm; khi giao năm vẫn ghi đủ hai năm. Nơi nhận kết thúc bằng dấu chấm.
- Ngày văn bản lấy ngày hiện tại ở Việt Nam; số báo cáo trống; ngày “cập nhật đến” lấy dueDate của kỳ, không lấy ngày tạo lại bản tổng hợp. Thông tin cơ quan/người ký/nơi nhận dùng cấu hình chung; closingAddressee tùy chọn, mặc định “UBND xã”.
- Khớp lại font, đường kẻ, khoảng cách, thụt dòng và chế độ tương thích Word 2013 trở lên. Không thêm dấu/chữ ký số vào file.
- PASS: build backend/frontend; contract summary; sáu kiểm thử tài liệu gồm xuất PDF thật bằng Word trên Windows; browser mock chuyên viên và admin.
- PASS: `python backend/scripts/compare-weekly-template.py` dùng nội dung chính PDF gốc để tạo DOCX/PDF trong thư mục tạm, giữ đủ 16 mục, cùng năm trang; các mốc tiêu đề trang đầu lệch dưới 1 pt. Đã xem ảnh trang đầu và cuối. Đây là bằng chứng trên Windows/Word, không phải tỷ lệ pixel “99%” hoặc kiểm chứng LibreOffice/Render.
- Artifacts local: `%TEMP%/weekly-template-comparison/` gồm comparison.docx, comparison.pdf và ảnh reference/actual. PDF gốc giữ nguyên; nội dung/ngắt trang báo cáo thật phụ thuộc dữ liệu tuần đó và font/converter được cài trên server.

## Tự cập nhật nội dung nguồn — 27/10/2026

- Tự điền cho bản chưa có hoặc bản draft rỗng chưa được chỉnh; bản admin chủ động lưu/xóa trắng không bị tự lấp lại.
- GET trả preview và sourceReportIds, không tự tạo bản tổng hợp. Khi admin lưu preview, server kiểm tra nguồn của đúng kỳ rồi lưu snapshot để Word/PDF dùng cùng dữ liệu.
- Refresh định kỳ không ghi đè chữ admin đang nhập; bản đã lưu thủ công không tự thay bằng nguồn mới. Kỳ archived không tự điền.
- Nguồn thiếu/trùng mã vẫn được cảnh báo và không tự tổng hợp, theo quy tắc đối soát.
- PASS: build backend/frontend; QA MongoDB thật cho preview không ghi DB, lưu preview, giữ sửa tay và giữ bản đã xóa trắng; browser mock kiểm tra nguồn mới tự hiện sau refresh và không ghi đè khi đang nhập. Regression mapping và HTTP summary đạt.
- Kiểm tra đọc trên DB hiện tại: tuần 44 có bảy báo cáo hợp lệ, 16 entry có nội dung và không có lỗi mã lĩnh vực. Bản tổng hợp hiện có được giữ nguyên, không ghi đè trong phép kiểm tra này.
