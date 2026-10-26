# Khởi động và trạng thái sẵn sàng

- `npm run dev` chạy backend trước; tiến trình frontend chờ `/api/ready` trả HTTP 200, `ready=true`, `phase=ready` mới chạy Vite.
- PORT được đọc từ môi trường hoặc `.env` ở root, thống nhất giữa backend, waiter và proxy Vite.
- MongoDB kết nối chưa đủ: phải hoàn tất toàn bộ callback khởi tạo (tài khoản mặc định, kỳ hiện tại). Khởi tạo lỗi giữ trạng thái chưa sẵn sàng, ghi log và thử lại sau 5 giây.
- `/api/live`: HTTP 200 khi tiến trình HTTP sống. `/api/health` và `/api/ready`: HTTP 503 khi chưa sẵn sàng, HTTP 200 khi đã sẵn sàng; trả thêm `mongodb` và `phase`, không cache.
- API nghiệp vụ trả 503 có mã `APPLICATION_NOT_READY` khi đang chờ, thay vì cho truy vấn mắc kẹt lúc DB chưa kết nối.
- Giao diện kiểm tra readiness trước khi mở app, sau đó kiểm tra định kỳ 3 giây. Nếu mất kết nối, màn hình chờ chặn thao tác; app vẫn được mount để giữ nội dung đang nhập. Kết nối phục hồi thì tự mở lại, không tự gửi lại thao tác lưu/nộp.
- Thay đổi script npm có hiệu lực khi chạy lại `npm run dev`. Nếu frontend được chạy riêng, màn hình readiness vẫn bảo vệ giao diện.

## Kiểm tra

Kết quả thực tế ngày 26/10/2026:

| Hạng mục | Trạng thái | Expected / Actual |
| --- | --- | --- |
| Backend build | PASS | `npm run test:database` chạy tsc thành công. |
| Readiness khởi tạo | PASS | Fixture Mongoose: kết nối xong nhưng callback chưa xong vẫn chưa ready; callback hoàn tất mới ready; mất kết nối/khởi tạo lỗi trở về chưa sẵn sàng; tự thử lại khởi tạo sau 5 giây và phục hồi. |
| HTTP app thật với trạng thái giả lập | PASS | `test-readiness-http.cjs`: health/ready trả 503 trong cả ba trạng thái chờ DB/đang khởi tạo/khởi tạo lỗi; login bị chặn 503; live vẫn 200; ready rồi thì health 200 và auth hoạt động bình thường (401 nếu thiếu token). Không kết nối DB thật trong fixture. |
| Chờ trước khi chạy frontend | PASS | `node scripts/test-startup-wait.cjs`: tiến trình waiter chưa thoát khi server HTTP giả lập vẫn initializing; chỉ thoát 0 và log READY khi trạng thái ready. |
| Frontend typecheck/bundle | PASS | tsc -b và Vite build vào output QA riêng; warning chunk size không chặn build. |
| Browser chờ/phục hồi | PASS | `scripts/test_weekly_summary_ui.py`: chưa ready không mount app; ready tự mở; mất ready giữ nguyên hai đoạn đang sửa, phần app bị inert chặn thao tác; phục hồi tiếp tục và lưu lại nguyên văn. Đã xem ảnh màn hình chờ. Test API mock, không gây mất kết nối DB thật. |
| Regression tổng hợp tuần | PASS | Contract, DOCX và HTTP fixture vẫn đạt; test PDF thật được skip trong lần regression này vì converter không đổi. |
| Trạng thái local đang chạy | PASS | GET qua Vite `http://localhost:5173/api/health` và `/api/ready` thực tế trả 200, ready=true, mongodb=connected, phase=ready; `/api/live` trả 200. Đây là kiểm tra đọc trạng thái, không phải kiểm thử đăng nhập hoặc ghi DB thật. |
| Tắt MongoDB thật / production | NOT TESTED | Không dừng DB hiện hữu hoặc tác động production để mô phỏng sự cố. |

Ảnh kiểm tra: `C:/Users/Public/weekly-summary-qa/weekly-ui-test/startup-wait.png`. Không commit/push/deploy trong thay đổi này.
