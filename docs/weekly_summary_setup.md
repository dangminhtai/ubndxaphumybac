# Tổng hợp tuần theo mẫu: cấu hình và vận hành

## Cách dùng

1. Mở Tổng hợp tuần và chọn kỳ. Tên tuần trong năm tự tính theo ISO 8601 từ ngày bắt đầu kỳ theo giờ Việt Nam, không dùng `weekNumber` trong tháng của dữ liệu cũ.
2. Tạo tổng hợp tự động. Chỉ báo cáo weekly đã nộp/được duyệt trong kỳ được chọn được lấy; thiếu người nộp vẫn tạo được nếu có ít nhất một báo cáo hợp lệ.
3. Rà soát hai phần, mỗi phần có 8 nhóm. Tên lĩnh vực khớp danh mục ánh xạ sẽ được xếp tự động. Lĩnh vực trống, không nhận diện được hoặc chứa nhiều lĩnh vực nằm ở Chưa phân nhóm. Chọn nhóm hoặc đặt con trỏ để tách đoạn rồi chuyển từng phần về nhóm phù hợp.
4. Nội dung được giữ nguyên, không gọi AI để viết lại. Các trường nguồn Cải cách hành chính / Chuyển đổi số được đưa vào nhóm 6 / 7 của phần kết quả nếu có.
5. Admin chỉ có editor hai phần theo mẫu PDF. Không có ô Khó khăn, vướng mắc / Kiến nghị, đề xuất riêng. Chuyên viên tiếp tục nộp bốn mục cho một lĩnh vực như trước; không đổi biểu mẫu chuyên viên.
6. Lưu hoặc Lưu & Xuất DOCX/PDF. Nội dung chưa phân nhóm lưu nháp được nhưng cần phân nhóm trước khi xuất. Nhóm rỗng giữ tiêu đề, không tự ghi “không phát sinh”.

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
