# Plan mã lĩnh vực, phân công chuyên viên và tổng hợp tuần

Trạng thái: **ĐÃ TRIỂN KHAI CODE, ÁP DỤNG MAPPING DATABASE VÀ KIỂM TRA**.

Người dùng đã duyệt và yêu cầu thực hiện. Mapping tài khoản thật đã cập nhật, đọc lại DB và kiểm tra bằng API/giao diện local. Không đổi mật khẩu, không commit/push/deploy. Còn 13 nguồn lịch sử cần admin xác nhận nghiệp vụ, gồm bốn bản không còn kỳ báo cáo; không tự đoán mã. Chi tiết và bằng chứng tại mục 11.

## 1. Mục tiêu và phạm vi đã thống nhất

- Tám mục trong mẫu PDF chính là **tám lĩnh vực cố định**, dùng chung ở hai phần báo cáo admin.
- Mỗi lĩnh vực có mã định danh LV1–LV8. Hệ thống ánh xạ bằng mã, không dựa vào tên người hoặc chuỗi lĩnh vực nhập tay.
- Một chuyên viên có một hoặc nhiều lĩnh vực. Staff phải có ít nhất một lĩnh vực.
- Bỏ ô nhập tên lĩnh vực tự do trên báo cáo chuyên viên. Hiển thị/chọn từ danh mục và phân công đã lưu.
- Chuyên viên tiếp tục báo cáo bốn mục cho từng lĩnh vực: kết quả, khó khăn/vướng mắc, kiến nghị/đề xuất, nhiệm vụ tuần tới.
- Admin tiếp tục editor **hai phần × tám ô nhập có sẵn** như giao diện đã chốt. Không thêm dropdown nhóm/phần, nút thêm/xóa/tách đoạn hoặc form bốn mục cũ vào editor admin.
- Chỉ tổng hợp báo cáo đã nộp/được duyệt trong đúng tuần được chọn; thiếu người nộp vẫn tổng hợp được khi có nguồn hợp lệ.
- Giữ nội dung nguồn, không dùng AI viết lại hoặc nhân bản một nội dung sang nhiều lĩnh vực.
- Phân công có thể thay đổi khi chuyển công tác. Báo cáo đã nộp giữ mã lĩnh vực tại thời điểm nộp.

## 2. Danh mục và phân công mặc định — USER CONFIRMED

| Mã cố định | Lĩnh vực | Username hiện hữu | Họ tên đã đọc từ DB trước đó |
| --- | --- | --- | --- |
| LV1 | Lĩnh vực Nội vụ và công tác cán bộ | `linh` | Đặng Vũ Linh |
| LV2 | Giáo dục và đào tạo | `Hạnh` | Phan Thị Hạnh |
| LV3 | Bảo trợ xã hội và bảo hiểm y tế | `Ngọc Linh` | Đặng Ngọc Linh |
| LV4 | Y tế và an toàn thực phẩm | `Phát` | Nguyễn Tấn Phát |
| LV5 | Người có công | `Bích Liễu` | Trần Thị Bích Liễu |
| LV6 | Tổ chức bộ máy, công tác cán bộ và cải cách hành chính | `linh` | Đặng Vũ Linh |
| LV7 | Khoa học, công nghệ và chuyển đổi số | `Hữu` | Đặng Minh Hữu |
| LV8 | Văn hóa và các lĩnh vực liên quan | `Hòa` | Thái Văn Hòa |

Vũ Linh phụ trách **hai lĩnh vực LV1 và LV6**. Không gán lĩnh vực cho một người chỉ vì tên gần giống nhau: `linh` và `Ngọc Linh` là hai tài khoản khác nhau.

Trước khi cập nhật phải đọc lại tài khoản hiện tại, đối chiếu username và `_id`. Bảng trên là cấu hình đã chốt trong cuộc trò chuyện, không chứng minh DB đã được cập nhật.

### Tài khoản Trọng

- Đổi tài khoản username `Trọng`, họ tên Võ Ngọc Trọng, từ `staff` sang `admin`.
- Chức danh hiển thị: **Phó phòng**; phân biệt chức danh với role phân quyền `admin`.
- Giữ tài khoản `admin` hiện có. Đích theo danh sách hiện tại là **hai tài khoản admin**.
- Trọng không bắt buộc gán lĩnh vực hoặc nộp báo cáo với tư cách staff.
- Không thay username, mật khẩu, họ tên của các tài khoản. Không tạo tài khoản thay thế.

**Mã LV1–LV8 không đổi khi nhân sự thay đổi.** Khi chuyển công tác, thay danh sách mã được gán cho tài khoản; mã của chính lĩnh vực giữ nguyên.

## 3. Chọn trùng lĩnh vực — quy tắc đã thống nhất

### Chuyên viên tự chọn/thay đổi

1. Cho chọn một hoặc nhiều lĩnh vực từ danh mục cố định, không nhập tên tự do.
2. Lĩnh vực chưa có người đang đảm nhận thì có thể lưu.
3. Nếu lĩnh vực đã do người khác đang đảm nhận, **chặn lưu thay đổi**, giữ phân công đang có và hiện:

> Lĩnh vực này đã có người khác đảm nhận. Vui lòng liên hệ admin để xử lý.

4. Lĩnh vực của chính tài khoản không bị coi là trùng. Chọn lại cùng phân công là hợp lệ.
5. Staff không được lưu danh sách trống hoặc mã ngoài LV1–LV8.
6. Kiểm tra tại backend, không chỉ vô hiệu hóa lựa chọn ở giao diện. Hai yêu cầu đồng thời chọn cùng lĩnh vực chỉ một yêu cầu được thành công.

### Admin xử lý

- Trang quản lý tài khoản/phân công hiển thị lĩnh vực và người đang đảm nhận; nếu trùng thì hiện rõ tất cả tài khoản liên quan.
- Admin được điều chỉnh lĩnh vực cho từng chuyên viên và chuyển một lĩnh vực từ người A sang người B.
- Dữ liệu đã trùng được đánh dấu để admin sửa; không tự xóa phân công, không tự chọn người ưu tiên.
- Khi đổi phân công, kiểm tra staff bị ảnh hưởng vẫn có ít nhất một lĩnh vực; nếu người đó thôi làm chuyên viên thì admin cần đổi role hoặc trạng thái phù hợp.
- Thay đổi phân công/role ghi audit: ai sửa, tài khoản nào, trước/sau, thời gian. Không ghi mật khẩu.

**Chi tiết triển khai đề xuất:** admin xử lý việc trùng qua thao tác chuyển/phân công lại có kiểm tra toàn bộ người bị ảnh hưởng, không tạo thêm trùng mới. Chỉ kiểm tra xung đột giữa các tài khoản staff đang hoạt động; tài khoản đã vô hiệu hóa không giữ chỗ lĩnh vực, nhưng khi kích hoạt lại phải kiểm tra xung đột. Đây là cách triển khai để người dùng duyệt cùng plan.

## 4. Giao diện chuyên viên

### Một lĩnh vực

Ví dụ Phát được gán LV4:

```text
Lĩnh vực: Y tế và an toàn thực phẩm

1. Kết quả thực hiện                  [ô nhập]
2. Khó khăn, vướng mắc                [ô nhập]
3. Kiến nghị, đề xuất                 [ô nhập]
4. Phương hướng, nhiệm vụ tuần tới    [ô nhập]
```

Không phải gõ lại chữ “Y tế”. Mã LV4 được hệ thống đưa vào dữ liệu báo cáo.

### Nhiều lĩnh vực

Vũ Linh có LV1 và LV6: báo cáo tuần có hai khối hoặc hai tab mang tên hai lĩnh vực; **mỗi khối có đủ bốn mục riêng**. Nhập nội dung LV1 không được tự điền vào LV6.

Giữ thao tác lưu nháp/nộp của một báo cáo tuần. Không bắt chuyên viên viết thành báo cáo tổng hợp tám lĩnh vực của cả phòng.

Phần thay đổi phân công đặt ở chức năng chọn lĩnh vực/phân công tài khoản, tách khỏi nội dung bốn mục. Mặc định tải lên phân công đã lưu; không phải chọn lại mỗi tuần.

## 5. Mapping nguồn sang admin

| Dữ liệu chuyên viên của lĩnh vực LVx | Đích |
| --- | --- |
| Kết quả thực hiện | Phần I, ô lĩnh vực LVx |
| Nhiệm vụ tuần tới | Phần II, ô lĩnh vực LVx |
| Khó khăn, vướng mắc | Giữ trong báo cáo chuyên viên để đọc/đối chiếu; không tạo ô riêng hoặc tự chèn vào báo cáo admin |
| Kiến nghị, đề xuất | Giữ trong báo cáo chuyên viên để đọc/đối chiếu; không tạo ô riêng hoặc tự chèn vào báo cáo admin |

Ví dụ:

- Kết quả LV2 của Hạnh → I.2 Giáo dục và đào tạo.
- Nhiệm vụ LV2 của Hạnh → II.2 Giáo dục và đào tạo.
- Hai bộ nội dung LV1 và LV6 của Vũ Linh → lần lượt I.1/II.1 và I.6/II.6.

Giữ đúng thứ tự LV1–LV8. Admin chỉnh được nội dung của từng ô rồi lưu/xuất Word hoặc PDF như hiện tại. Tuần trong năm và tuần kế tiếp tự tính từ kỳ đã chọn, không nhập tay.

### Nguồn đang trùng hoặc thiếu mã

- Không âm thầm chọn một báo cáo, bỏ nội dung hay nhân bản vào nhiều ô.
- Với dữ liệu đang trùng của cùng lĩnh vực, **đề xuất** đánh dấu nguồn xung đột ở phần rà soát nguồn và yêu cầu admin xử lý trước khi tạo lại bản tổng hợp từ nguồn đó. Các lĩnh vực hợp lệ vẫn được đọc; bản tổng hợp đã lưu không tự bị ghi đè.
- Với báo cáo lịch sử chưa xác định được mã, đánh dấu để đối soát; không suy ngược mã từ phân công hiện tại của tài khoản.
- Không đưa công cụ xử lý mapping vào 16 ô editor admin đã chốt.

Quy tắc chặn chọn trùng tài khoản đã xác nhận. Cách chặn việc generate khi chính dữ liệu nguồn cũ đang xung đột là đề xuất triển khai cần được đọc cùng plan.

## 6. Dữ liệu và thay đổi kỹ thuật dự kiến

Hiện trạng đã đọc: `User` chưa có danh sách mã lĩnh vực; `Report.field` là chuỗi tự do; unique báo cáo đang theo người/kỳ/loại; tổng hợp hiện dùng ID nội bộ như `personnel`, `education` và ánh xạ chuỗi tên.

### Danh mục dùng chung

- Một danh mục duy nhất chứa `code` LV1–LV8, tên, thứ tự và liên kết tới nhóm tổng hợp tương ứng.
- Frontend lấy danh mục từ backend hoặc module dùng chung, không duy trì hai bảng khác nhau.
- Loại bỏ việc đoán lĩnh vực từ `field`, `department` hoặc tên người trong luồng báo cáo mới.
- Các ID nhóm tổng hợp nội bộ đang có được liên kết tường minh với LV1–LV8; không sửa lung tung bản tổng hợp đã được admin chỉnh tay chỉ để đổi ID.

### Tài khoản và phân công

- Thêm `fieldCodes: string[]` hoặc cấu trúc phân công tương đương có kiểm tra LV1–LV8.
- API tạo/sửa tài khoản và chọn lĩnh vực kiểm tra role, staff có ít nhất một lĩnh vực và xung đột.
- Xử lý việc giữ chỗ/chuyển giao lĩnh vực bằng cập nhật có tính nguyên tử phù hợp MongoDB thực tế. Query rồi save riêng lẻ không đủ để chống hai người cùng chọn.
- Đối soát trùng hiện hữu trước khi bật ràng buộc; không tạo unique index làm database lỗi vì dữ liệu cũ chưa được xử lý.

### Báo cáo tuần

Đề xuất lưu một báo cáo/người/tuần, bên trong có các phần theo mã:

```ts
fieldReports: Array<{
  fieldCode: 'LV1' | 'LV2' | 'LV3' | 'LV4' | 'LV5' | 'LV6' | 'LV7' | 'LV8';
  fieldName: string; // snapshot tên khi nộp
  content: string;
  difficulties: string;
  proposals: string;
  nextTasks: string;
}>;
```

- Giữ unique người/kỳ/loại, không tạo tám báo cáo cho mỗi người.
- Không được có hai phần cùng `fieldCode` trong cùng báo cáo.
- Lưu nháp/nộp chỉ nhận lĩnh vực người đó được phân công. Nếu phân công đã đổi sau khi mở form thì báo rõ để tải lại, không nộp sai lĩnh vực.
- Báo cáo đã nộp giữ snapshot. Đổi phân công tài khoản không viết lại báo cáo cũ.
- Các trường nguồn cũ khác, nếu còn dữ liệu, phải được kiểm kê trước khi chuyển; không tự bỏ hoặc tự gộp vào một LV tùy ý.

### Kỳ báo cáo và thống kê

- Phân biệt **số người nộp** với **số lĩnh vực đã có nội dung**. Vũ Linh nộp hai lĩnh vực vẫn là một người.
- Theo danh sách đã chốt: bảy chuyên viên phụ trách tám lĩnh vực; hai admin không tự được tính thành người bắt buộc nộp.
- Kỳ tuần mới chụp danh sách người phải nộp theo role/phân công mới.
- Kỳ đang mở cần đối soát snapshot khi Trọng đổi thành admin; chỉ cập nhật có chủ đích và ghi audit. Không tự tính lại toàn bộ kỳ lịch sử bằng nhân sự hiện tại.

## 7. Cập nhật database có kiểm soát

- [x] Đọc lại tài khoản hiện hữu; kiểm tra username, `_id`, role, trạng thái và phân công nếu đã có.
- [x] Tạo script dry-run chỉ in thay đổi dự kiến: LV1–LV8 cho đúng bảy chuyên viên; Trọng → admin / Phó phòng; giữ admin hiện có.
- [x] Kiểm tra người thiếu/thừa, username không tìm thấy và xung đột. Không tự tạo người hoặc đoán thay thế.
- [x] Lưu bản sao các bản ghi sẽ sửa trước khi áp dụng; file chứa dữ liệu tài khoản đặt ngoài Git, không xuất hash/mật khẩu vào log.
- [x] Áp dụng đúng thay đổi đã duyệt, có kiểm tra trạng thái trước cập nhật để tránh ghi đè sửa đổi phát sinh.
- [x] Đọc lại từ DB sau cập nhật để xác nhận đủ tám lĩnh vực, Vũ Linh có hai mã, Trọng là admin và mật khẩu không bị thay đổi.
- [x] Đối soát báo cáo lịch sử riêng: chỉ gán mã khi xác định chắc chắn, không lấy phân công mới để đoán lịch sử.

Đã chạy dry-run, sao lưu ngoài Git và áp dụng transaction. Không bulk-delete tài khoản/báo cáo, không reset mật khẩu, không deploy. Snapshot chỉ được đối soát ở đúng kỳ tuần hiện tại; 17 kỳ cũ dù còn trạng thái open vẫn giữ nguyên roster.

## 8. Thứ tự triển khai

1. **Danh mục và contract:** LV1–LV8, API phân công, cấu trúc nhiều lĩnh vực trong một báo cáo và lỗi xung đột.
2. **Backend:** kiểm tra phân công, chống chọn trùng đồng thời, snapshot báo cáo, quyền sửa và audit.
3. **Quản lý tài khoản:** gán nhiều lĩnh vực, cảnh báo trùng, thao tác admin chuyển giao; Trọng hiển thị role/chức danh đúng.
4. **Form chuyên viên:** bỏ nhập tên tự do; hiện một bộ bốn mục cho mỗi lĩnh vực được gán; lưu/nộp nguyên tử theo tuần.
5. **Tổng hợp admin:** lấy mã trên từng phần báo cáo để điền đúng 16 ô; giữ nguyên editor và xuất Word/PDF đã chốt.
6. **Dry-run và cập nhật DB đã duyệt:** phân công đúng tài khoản, đối soát snapshot kỳ mở và dữ liệu lịch sử.
7. **Kiểm tra và ghi kết quả:** không báo PASS khi mới đọc code hoặc khi API chỉ trả HTTP 200.

## 9. Checklist nghiệm thu

- [x] Danh mục có đúng LV1–LV8; tên và thứ tự khớp mẫu PDF.
- [x] Đọc lại DB: đúng bảng phân công; `linh` có LV1/LV6; `Ngọc Linh` có LV3; Trọng là admin/Phó phòng; giữ admin hiện có.
- [x] Staff không lưu được phân công rỗng hoặc mã sai. Tài khoản admin không bị ép chọn lĩnh vực.
- [x] Chuyên viên chọn mã của người khác bị chặn với đúng thông báo; phân công cũ không bị thay đổi khi request thất bại.
- [x] Hai người đồng thời chọn một lĩnh vực chỉ một người thành công; admin nhìn thấy xung đột hiện hữu và chuyển giao đúng, có audit.
- [x] Đổi vai trò/kích hoạt lại tài khoản kiểm tra đầy đủ ràng buộc phân công.
- [x] Chuyên viên một lĩnh vực có bốn mục; Vũ Linh có hai bộ bốn mục độc lập. Không còn ô nhập lĩnh vực tự do.
- [x] Lưu rồi đọc lại báo cáo đúng từng mã; không chỉ dựa vào toast.
- [x] Chỉ nguồn đã nộp/được duyệt của tuần chọn vào tổng hợp; không trộn draft, báo cáo tháng hoặc tuần khác.
- [x] Kết quả LVx vào I.x; nhiệm vụ LVx vào II.x. Khó khăn/kiến nghị còn nguyên trong báo cáo chuyên viên, không tạo ô admin riêng.
- [x] Đổi lĩnh vực sau khi nộp không làm báo cáo lịch sử chuyển nhóm; admin không tự mất nội dung đã chỉnh tay.
- [x] Thống kê đúng số người và số lĩnh vực; một người hai lĩnh vực không bị đếm hai lần.
- [x] Admin vẫn có đúng 16 textarea, tuần tự tính; không xuất hiện lại form/cảnh báo chuyển đổi cũ.
- [x] Word/PDF lấy đúng bản đã lưu, đúng mã/thứ tự/nội dung, số báo cáo để trống và ngày xuất tự tính.
- [x] Build, test backend, kiểm thử phân quyền và browser desktop/mobile; ghi PASS/FAIL/BLOCKED/NOT TESTED cùng expected/actual và bằng chứng.

## 10. Cách đọc trạng thái

- **USER CONFIRMED:** bảng phân công, Trọng thành admin, staff ít nhất một lĩnh vực, cảnh báo/chặn chuyên viên chọn trùng, admin xử lý, chuyên viên bốn mục và admin 16 ô.
- **IMPLEMENTED:** nhiều lĩnh vực được trình bày bằng các khối bốn mục; chỉ staff đang hoạt động giữ chỗ lĩnh vực; chuyển giao nguyên tử; nguồn thiếu/trùng mã chặn generate và có công cụ đối soát riêng, không làm thay đổi editor 16 ô.
- **VERIFIED:** danh tính tài khoản hiện tại khớp bảng; MongoDB hỗ trợ transaction; mỗi LV có đúng một người đảm nhận sau migration; Trọng thành admin/Phó phòng, admin cũ giữ nguyên.
- **UNVERIFIED:** ý nghĩa nghiệp vụ của 13 tên lĩnh vực mơ hồ trong dữ liệu cũ. Chỉ người phụ trách có thể xác nhận; không lấy phân công hiện tại để đoán lịch sử.

## 11. Tiến độ, bằng chứng và giới hạn thực tế

Ngày thực hiện: 26/10/2026.

### Code và dữ liệu đã thay đổi

- Danh mục chuẩn duy nhất tại `backend/src/domain/fields.ts`; ID nhóm tổng hợp cũ liên kết tường minh với LV1–LV8. Alias chuỗi chỉ còn dùng cho kiểm kê/migration dữ liệu cũ.
- `User.fieldCodes`; API `/api/fields`, `/api/fields/mine`, `/api/fields/assignments`. Mọi thay đổi phân công và lưu/nộp báo cáo mới dùng transaction và một document khóa chung để chống tranh chấp.
- Admin có bảng tám lĩnh vực, thấy người đang phụ trách/trùng; chuyển giao bằng lưu toàn bộ phân công. Tạo/sửa/kích hoạt staff kiểm tra mã, ít nhất một lĩnh vực và xung đột. Các thay đổi có audit.
- Form chuyên viên bỏ nhập tên tự do; một lĩnh vực có bốn ô, Vũ Linh có hai lĩnh vực với tám ô. Có chọn lại lĩnh vực từ danh mục; chọn trùng cảnh báo ngay và backend chặn lưu.
- `Report.fieldReports` lưu riêng bốn nội dung và tên/mã snapshot của từng lĩnh vực. Tạo/nộp xác nhận lại phân công trong transaction; report đã nộp không đổi khi tài khoản đổi lĩnh vực.
- Tổng hợp chỉ đọc `fieldReports.fieldCode`, không còn đoán theo tên/đơn vị. Thống kê người nộp và độ phủ lĩnh vực riêng. Admin vẫn đúng 16 ô, khó khăn/kiến nghị chỉ ở báo cáo nguồn.
- Nguồn thiếu mã/trùng mã chặn generate, hiển thị ở phần đối soát. Admin có công cụ xác nhận mã nguồn theo từng khối, nội dung chữ chỉ đọc và giữ nguyên, có kiểm tra phiên bản trước khi lưu. Không chèn công cụ này vào editor 16 ô.

### Migration thật

Lệnh đã chạy trong `backend/`:

```text
node scripts/migrate-field-mapping.cjs
node scripts/migrate-field-mapping.cjs --apply
```

- Dry-run đối chiếu `_id`, username, họ tên và trạng thái của đúng tám tài khoản đã chốt.
- Sao lưu đầy đủ các bản ghi sẽ sửa vào file ngoài Git: `%USERPROFILE%/.codex/backups/main-web-fields/2026-10-26T07-33-57-965Z.json`. Backup có dữ liệu tài khoản nhạy cảm, không commit/upload.
- Transaction đã cập nhật bảy staff với đủ tám lĩnh vực và Trọng thành admin/Phó phòng. Giữ admin hiện có; đọc lại xác nhận có hai admin hoạt động.
- So sánh `passwordHash` trước/sau của từng tài khoản cập nhật: không đổi; không in hash ra log.
- Bổ sung snapshot mã cho sáu báo cáo cũ có tên lĩnh vực xác định chắc chắn; không sửa nội dung bốn mục của các báo cáo đó.
- Chỉ đối soát expectedReporterIds của một kỳ tuần hiện tại thành bảy người. Không cập nhật hàng loạt các kỳ lịch sử còn trạng thái open.
- Có 13 báo cáo chưa xác định được mã: chín bản thuộc kỳ còn tồn tại và bốn bản không còn tham chiếu kỳ. Admin xem trong Quản lý tài khoản → Báo cáo chưa xác định mã lĩnh vực. Không tự gắn bốn bản thiếu kỳ vào tuần hiện tại.

### Kết quả kiểm tra

| Hạng mục | Trạng thái | Expected / Actual và bằng chứng |
| --- | --- | --- |
| Backend build | PASS | `npm run build`; TypeScript không lỗi. |
| Frontend typecheck/bundle | PASS | `tsc -b` và Vite build sang `dist-weekly-summary-qa`; có warning kích thước bundle, không chặn build. |
| Transaction và tranh chấp thật | PASS | `npm run test:fields` dùng database QA tên mới, tách khỏi DB ứng dụng. Hai người cùng nhận một LV chỉ một người thành công; admin chuyển giao đồng thời, phân công thất bại được rollback. QA DB được dọn sau test, không để tài khoản/báo cáo giả trong DB ứng dụng. |
| Tạo/sửa/kích hoạt/xóa tài khoản | PASS | QA DB thật: staff thiếu mã bị từ chối, tạo người nhận LV thành công, tạo trùng rollback không để tài khoản rác, khóa giải phóng LV, mở lại khi trùng bị chặn, đổi mã rồi mở lại được, đổi role admin bỏ lĩnh vực; response xóa không chứa hash. |
| Báo cáo nhiều lĩnh vực và snapshot | PASS | QA DB thật: một báo cáo hai bộ bốn mục, lưu rồi nộp/đọc lại; thiếu mã được phân công bị từ chối; đổi phân công sau nộp không đổi snapshot. |
| Nguồn và mapping theo tuần | PASS | QA DB thật + HTTP fixture: LV2 vào Giáo dục, LV6 vào CCHC; một người hai lĩnh vực vẫn counted một người; nguồn tuần khác/draft/monthly bị loại; thiếu/trùng mã chặn generate. |
| Quyền API | PASS | HTTP thật trong QA: thiếu token 401, staff không gọi được batch admin/đối soát, admin không gọi chọn lĩnh vực dành cho staff; API trả phân công hiện tại từ DB. |
| Đối soát nguồn | PASS | QA DB thật: staff bị chặn, revision cũ bị từ chối, admin chọn mã và giữ nguyên nội dung; nguồn sau sửa hết lỗi mapping. Báo cáo kỳ archived không cho sửa. |
| Word/PDF sau mapping | PASS | Chạy `RUN_PDF_TESTS=1` với `npm run test:fields`: tạo DOCX/PDF thật từ bản tổng hợp đã lưu; đọc XML xác nhận Education 692/536 nằm sau mục 2, Administration 168 sau mục 6; đọc PDF xác nhận có đúng nội dung và không lẫn OTHER_WEEK. |
| Browser chuyên viên/admin | PASS | `scripts/test_field_mapping_ui.py`: chuyên viên một LV có bốn textarea, hai LV có tám; không có ô gõ lĩnh vực tự do; lưu/reload đúng từng nội dung; cảnh báo trùng đúng câu; gửi batch chuyển giao và đối soát mã; desktop/mobile không tràn ngang. API mock, tách biệt phép thử DB thật. |
| Regression editor admin | PASS | `scripts/test_weekly_summary_ui.py`: vẫn đúng 16 ô, không trở lại form cũ; lưu/reload, tải hai định dạng, archived và readiness đạt. |
| Đọc DB/API/giao diện ứng dụng thật | PASS | Sau migration đăng nhập Trọng và `linh` bằng mật khẩu hiện hữu; API trả Trọng admin/Phó phòng, `linh` LV1/LV6; catalog đúng tám mã, mỗi mã một owner. Mở web thật: `linh` có tám textarea, Trọng có bảng tám lựa chọn owner. Không lưu/nộp nội dung kiểm thử vào DB ứng dụng. |
| Regression lỗi/login/readiness | PASS | `test-login-failures.cjs`, `test-error-handling.cjs`, `test-readiness-http.cjs` tiếp tục đạt. |
| Xác nhận nghiệp vụ 13 nguồn cũ | BLOCKED — cần admin đối soát | Không đủ căn cứ tự xác định mã. Bốn nguồn thiếu kỳ cũng chưa thể tổng hợp theo tuần; đã có cảnh báo rõ. Không chặn báo cáo mới đã có mã hợp lệ. |
| Linux PDF / commit / push / deploy | NOT TESTED / N/A | PDF kiểm tra bằng Word trên Windows. Không triển khai server hoặc commit/push trong tác vụ này. |

Ảnh QA ngoài repo:

- `C:/Users/Public/weekly-summary-qa/field-mapping-ui/`: form chuyên viên, cảnh báo trùng, bảng admin và mobile.
- `C:/Users/Public/weekly-summary-qa/field-mapping-live/`: giao diện local với tài khoản thật sau migration, chỉ đọc.

### Cách chạy lại và vận hành

- Test DB thật nhưng tách biệt dữ liệu ứng dụng: `npm run test:fields` trong backend. Cần MongoDB hỗ trợ transaction và quyền tạo/xóa database QA riêng.
- Kiểm kê migration: `npm run mapping:dry-run`; không chạy `--apply` tự động khi startup.
- Admin đối soát nguồn chỉ sửa mã của nội dung đã xem; snapshot lịch sử không lấy lại từ phân công tài khoản hiện tại.
- Không đưa mật khẩu vào log hoặc backup vào Git. Tài khoản đang mở trình duyệt nên tải lại trang để nhận role/phân công vừa thay đổi.
