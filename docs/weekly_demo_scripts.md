# Tạo và hoàn tác báo cáo mẫu theo tuần

Chạy lệnh tại root `main_web` bằng PowerShell. Hai script dùng database trong `.env` hiện tại.

## 1. Tạo dữ liệu mẫu

```powershell
npm run demo:weekly:seed
```

Script tìm đúng kỳ tuần hiện tại đang mở, đọc chuyên viên và phân công LV1–LV8 từ DB, rồi tạo một báo cáo `pending` cho mỗi chuyên viên. Với phân công hiện tại: bảy báo cáo, tám lĩnh vực; Vũ Linh có hai bộ bốn nội dung trong một báo cáo. Tất cả nội dung mang nhãn **DỮ LIỆU MẪU**, không phải số liệu thật.

Đăng nhập admin → **Tổng hợp tuần** → chọn tuần được in sau khi chạy → **Tạo tổng hợp tự động** → chỉnh sửa/lưu/xuất Word hoặc PDF để thử. Script không tự tạo bản tổng hợp, không đổi role, phân công hoặc mật khẩu.

Script chỉ dùng kỳ đang mở của tuần hiện tại. Nếu chưa có kỳ, mở backend để hệ thống khởi tạo hoặc mở kỳ bằng tài khoản admin. Nếu có nhiều kỳ cùng ngày bắt đầu, chỉ định ID sau khi đối chiếu:

```powershell
node backend/scripts/seed-weekly-demo.cjs --period-id <ID_KY>
```

Script **từ chối tạo khi kỳ đã có báo cáo tuần**, kể cả nháp. Không ghi đè hoặc xóa báo cáo hiện hữu. Cũng từ chối khi phân công thiếu/trùng mã, chưa đủ tám lĩnh vực hoặc đã có phiên demo chưa hoàn tác.

Xem trước, không tạo báo cáo hoặc snapshot DB:

```powershell
node backend/scripts/seed-weekly-demo.cjs --dry-run
```

Lệnh trực tiếp bằng `node` cần thư mục `backend/dist` đã build. Lệnh npm seed ở root tự build backend trước.

## 2. Hoàn tác về trạng thái trước khi tạo mẫu

Kết thúc các thao tác lưu/tổng hợp đang chạy, rồi chạy:

```powershell
npm run demo:weekly:reset
```

Script:

1. Chỉ xóa những report ID có đúng dấu phiên demo đã ghi trong manifest.
2. Nếu trước demo đã có bản tổng hợp thì khôi phục đúng bản đó, gồm nội dung trước khi thử. Nếu trước đó chưa có thì xóa bản tổng hợp được tạo trong phiên thử.
3. Khôi phục thông tin kỳ báo cáo, gồm snapshot người phải nộp và trạng thái, về bản sao trước lúc seed.
4. Đọc lại và so sánh dữ liệu BSON để xác nhận khôi phục khớp; không chỉ tin số document bị xóa.

Chạy reset lần nữa sẽ báo không có phiên demo và không xóa gì. Nếu có báo cáo mới ngoài phiên demo hoặc bản tổng hợp đã chứa nguồn khác, script dừng để tránh ghi đè dữ liệu thật. Không có tùy chọn ép xóa.

Xem trước kế hoạch hoàn tác:

```powershell
node backend/scripts/reset-weekly-demo.cjs --dry-run
```

**“Như ban đầu” áp dụng cho dữ liệu nghiệp vụ của kỳ thử:** báo cáo mẫu, bản tổng hợp và thông tin kỳ. Audit, thông báo phát sinh khi mày thao tác, file Word/PDF đã tải và bộ đếm khóa nội bộ được giữ, không xóa dấu vết hoạt động.

## Snapshot và sự cố

Manifest/snapshot BSON nằm ngoài Git tại `%USERPROFILE%/.codex/backups/main-web-weekly-demo/<database-key>/active.ejson`. Script seed in đường dẫn cụ thể. Sau reset, file đổi tên thành `restored-<run-id>.ejson` để giữ bản sao. Manifest không chứa mật khẩu/hash tài khoản hoặc URI kết nối.

Không xóa/mất manifest khi chưa reset; không đổi `.env` sang database khác giữa hai lệnh. Script kiểm tra cả tên database và fingerprint deployment trước khi hoàn tác.

Snapshot được ghi bền vững trước transaction. Nếu seed dừng giữa chừng, reset có thể đóng phiên chưa commit hoặc khôi phục phiên đã commit. Nếu còn `operation.lock` do tiến trình bị dừng cưỡng bức, kiểm tra PID trong file và chắc chắn tiến trình cũ đã kết thúc trước khi xử lý file lock; không chạy song song hai script.

## Kiểm chứng

- `npm --prefix backend run test:weekly-demo`: kiểm thử MongoDB thật trong database QA tên mới, không dùng dữ liệu ứng dụng; cần quyền tạo/xóa database QA và hỗ trợ transaction.
- Đã kiểm tra tạo bảy nguồn/tám lĩnh vực, tổng hợp 16 entry, không cho seed lặp, không ghi đè báo cáo thật, khôi phục bản tổng hợp có sẵn hoặc xóa bản tổng hợp demo, giữ nguyên báo cáo tuần khác, manifest sai DB và dữ liệu ngoài phiên thử bị chặn, dry-run và reset lặp.
- Đã so sánh toàn bộ users/reports/periods/summaries trước và sau reset, bao gồm kiểu BSON ObjectId/Date.
- Dry-run trên DB ứng dụng ngày 27/10/2026: chọn đúng Tuần 44 năm 2026, dự kiến bảy báo cáo/tám lĩnh vực, đủ điều kiện tạo mẫu. **Chưa tự seed dữ liệu vào DB ứng dụng**; người dùng chạy lệnh seed khi bắt đầu thử.
