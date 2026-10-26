# Plan mã lĩnh vực, phân công chuyên viên và tổng hợp tuần

Trạng thái: **CHỜ NGƯỜI DÙNG ĐỌC VÀ DUYỆT PLAN**.

Tài liệu này mô tả công việc tiếp theo. Chưa triển khai mapping, chưa thay đổi phân công/role hoặc ghi database theo plan này. Các checkbox bên dưới đều là việc chưa thực hiện.

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

- [ ] Đọc lại tài khoản hiện hữu; kiểm tra username, `_id`, role, trạng thái và phân công nếu đã có.
- [ ] Tạo script dry-run chỉ in thay đổi dự kiến: LV1–LV8 cho đúng bảy chuyên viên; Trọng → admin / Phó phòng; giữ admin hiện có.
- [ ] Kiểm tra người thiếu/thừa, username không tìm thấy và xung đột. Không tự tạo người hoặc đoán thay thế.
- [ ] Lưu bản sao các bản ghi sẽ sửa trước khi áp dụng; file chứa dữ liệu tài khoản đặt ngoài Git, không xuất hash/mật khẩu vào log.
- [ ] Áp dụng đúng thay đổi đã duyệt, có kiểm tra trạng thái trước cập nhật để tránh ghi đè sửa đổi phát sinh.
- [ ] Đọc lại từ DB sau cập nhật để xác nhận đủ tám lĩnh vực, Vũ Linh có hai mã, Trọng là admin và mật khẩu không bị thay đổi.
- [ ] Đối soát báo cáo lịch sử riêng: chỉ gán mã khi xác định chắc chắn, không lấy phân công mới để đoán lịch sử.

Chưa chạy script cập nhật trong bước viết plan này. Không bulk-delete tài khoản/báo cáo, không reset mật khẩu, không deploy.

## 8. Thứ tự triển khai

1. **Danh mục và contract:** LV1–LV8, API phân công, cấu trúc nhiều lĩnh vực trong một báo cáo và lỗi xung đột.
2. **Backend:** kiểm tra phân công, chống chọn trùng đồng thời, snapshot báo cáo, quyền sửa và audit.
3. **Quản lý tài khoản:** gán nhiều lĩnh vực, cảnh báo trùng, thao tác admin chuyển giao; Trọng hiển thị role/chức danh đúng.
4. **Form chuyên viên:** bỏ nhập tên tự do; hiện một bộ bốn mục cho mỗi lĩnh vực được gán; lưu/nộp nguyên tử theo tuần.
5. **Tổng hợp admin:** lấy mã trên từng phần báo cáo để điền đúng 16 ô; giữ nguyên editor và xuất Word/PDF đã chốt.
6. **Dry-run và cập nhật DB đã duyệt:** phân công đúng tài khoản, đối soát snapshot kỳ mở và dữ liệu lịch sử.
7. **Kiểm tra và ghi kết quả:** không báo PASS khi mới đọc code hoặc khi API chỉ trả HTTP 200.

## 9. Checklist nghiệm thu

- [ ] Danh mục có đúng LV1–LV8; tên và thứ tự khớp mẫu PDF.
- [ ] Đọc lại DB: đúng bảng phân công; `linh` có LV1/LV6; `Ngọc Linh` có LV3; Trọng là admin/Phó phòng; giữ admin hiện có.
- [ ] Staff không lưu được phân công rỗng hoặc mã sai. Tài khoản admin không bị ép chọn lĩnh vực.
- [ ] Chuyên viên chọn mã của người khác bị chặn với đúng thông báo; phân công cũ không bị thay đổi khi request thất bại.
- [ ] Hai người đồng thời chọn một lĩnh vực chỉ một người thành công; admin nhìn thấy xung đột hiện hữu và chuyển giao đúng, có audit.
- [ ] Đổi vai trò/kích hoạt lại tài khoản kiểm tra đầy đủ ràng buộc phân công.
- [ ] Chuyên viên một lĩnh vực có bốn mục; Vũ Linh có hai bộ bốn mục độc lập. Không còn ô nhập lĩnh vực tự do.
- [ ] Lưu rồi đọc lại báo cáo đúng từng mã; không chỉ dựa vào toast.
- [ ] Chỉ nguồn đã nộp/được duyệt của tuần chọn vào tổng hợp; không trộn draft, báo cáo tháng hoặc tuần khác.
- [ ] Kết quả LVx vào I.x; nhiệm vụ LVx vào II.x. Khó khăn/kiến nghị còn nguyên trong báo cáo chuyên viên, không tạo ô admin riêng.
- [ ] Đổi lĩnh vực sau khi nộp không làm báo cáo lịch sử chuyển nhóm; admin không tự mất nội dung đã chỉnh tay.
- [ ] Thống kê đúng số người và số lĩnh vực; một người hai lĩnh vực không bị đếm hai lần.
- [ ] Admin vẫn có đúng 16 textarea, tuần tự tính; không xuất hiện lại form/cảnh báo chuyển đổi cũ.
- [ ] Word/PDF lấy đúng bản đã lưu, đúng mã/thứ tự/nội dung, số báo cáo để trống và ngày xuất tự tính.
- [ ] Build, test backend, kiểm thử phân quyền và browser desktop/mobile; ghi PASS/FAIL/BLOCKED/NOT TESTED cùng expected/actual và bằng chứng.

## 10. Cách đọc trạng thái

- **USER CONFIRMED:** bảng phân công, Trọng thành admin, staff ít nhất một lĩnh vực, cảnh báo/chặn chuyên viên chọn trùng, admin xử lý, chuyên viên bốn mục và admin 16 ô.
- **SUGGESTED:** cách trình bày nhiều lĩnh vực bằng khối/tab, cách xử lý nguồn lịch sử xung đột, phạm vi tài khoản hoạt động và cơ chế chuyển giao nguyên tử. Đây là lựa chọn triển khai trong plan để người dùng duyệt.
- **UNVERIFIED:** DB tại thời điểm triển khai có còn khớp danh sách đã đọc; báo cáo cũ có đủ thông tin xác định LV hay không; MongoDB hiện tại hỗ trợ cách cập nhật nguyên tử được chọn ra sao.
- **NOT TESTED:** toàn bộ thay đổi mapping trong plan này; hiện chưa triển khai.
