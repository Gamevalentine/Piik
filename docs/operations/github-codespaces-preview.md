# Piik: thử nghiệm HTTPS trên GitHub Codespaces

Đây là **môi trường thử nghiệm tạm thời**, không phải dịch vụ production hoặc hosting 24/7. Mục tiêu: có thể mở Piik trên HTTPS, tạo phòng và thử chia sẻ màn hình trên trình duyệt, hoàn toàn không cần CMD/PowerShell trên Windows.

## Khởi tạo một lần bằng giao diện GitHub

1. Mở [tạo Codespace trên nhánh thử nghiệm](https://codespaces.new/Gamevalentine/Piik/tree/preview/github-codespaces).
2. Nếu GitHub hỏi cấu hình máy, ưu tiên **2-core** để tiết kiệm hạn mức; xác nhận **Create codespace** khi bạn chấp nhận sử dụng hạn mức Codespaces.
3. Đợi GitHub tự chuẩn bị công cụ, biên dịch Piik và chạy server. Có thể mất vài phút, đặc biệt ở lần đầu. Bạn không cần gõ lệnh nào vào CMD/PowerShell trên máy.
4. Trong giao diện Codespaces, mở thẻ **PORTS**, tìm **8787 – Piik — HTTPS browser preview**, chọn biểu tượng mở trong trình duyệt. GitHub cung cấp URL dạng `https://<tên-codespace>-8787.app.github.dev`.
5. Để vào Piik với quyền tạo phòng, mở file **`build/codespaces/host-password.txt`** bằng File Explorer của Codespaces, sao chép mật khẩu và nhập vào trang khi được yêu cầu. Mật khẩu này được tạo tự động và **không được commit lên GitHub**.

## Sửa lỗi 403 do GitHub Codespaces chuyển đổi Origin

Một số yêu cầu POST đến Piik qua địa chỉ `https://<codespace>-8787.app.github.dev` có thể bị GitHub đổi header `Origin` thành `http://localhost:8787`. Piik yêu cầu Origin có trong danh sách cho phép, nên bản cấu hình cũ có thể báo **The server does not allow this address (403)** khi nhập mật khẩu.

Bản cấu hình hiện tại chấp nhận **chính xác hai Origin**: địa chỉ HTTPS của Codespace và `http://localhost:8787` do proxy đổi. Origin khác vẫn bị từ chối; cơ chế xác thực bằng mật khẩu vẫn giữ nguyên.

**Đối với Codespace đã tạo trước khi có bản sửa:**

1. Trong tab GitHub Codespaces đang mở, dùng **Source Control** (biểu tượng nhánh bên trái) → menu **⋯** → **Pull** để lấy commit mới của nhánh `preview/github-codespaces`. Nếu có thay đổi local, kiểm tra trước khi đồng bộ.
2. Mở menu điều khiển Codespace bằng cách nhấp **Codespaces: <tên>** ở góc trái phía dưới VS Code, rồi chọn **Rebuild Container** (hoặc mở Command Palette và tìm **Codespaces: Rebuild Container**). Không cần sử dụng CMD hoặc PowerShell trên Windows.
3. Đợi quá trình build + khởi động lại hoàn tất. Mở lại URL ở thẻ **PORTS** và tải lại trang. Thông tin mật khẩu thử nghiệm vẫn ở `build/codespaces/host-password.txt`; không chia sẻ mật khẩu trong ảnh/chát.

Nếu vẫn gặp 403, hãy kiểm tra đường dẫn thực tế trong thẻ PORTS và đảm bảo nó khớp với URL Codespace hiện hành. Không đổi cổng sang HTTPS backend và không tắt bảo mật Origin.

## Mời thiết bị thứ hai

Theo mặc định, cổng chuyển tiếp GitHub là **Private**, chỉ tài khoản của bạn truy cập được. Để người khác xem (ví dụ điện thoại không đăng nhập GitHub), tại **PORTS**, nhấp chuột phải cổng 8787 → **Port Visibility → Public**. Sau đó mới gửi link mời phòng từ Piik sang thiết bị thứ hai.

**Chỉ chuyển Public khi thực sự cần thử nghiệm.** Bất kỳ ai có URL công khai đều có thể truy cập trang; mật khẩu site vẫn bắt buộc để tạo phòng nhưng link mời phòng phải được giữ riêng. Kết thúc thử nghiệm, đổi cổng về Private hoặc dừng Codespace.

Lưu ý: chọn **Port Visibility → Public**, KHÔNG đổi **Port Protocol** từ HTTP sang HTTPS. Codespaces đã cung cấp HTTPS ở đường dẫn `app.github.dev`; dịch vụ nội bộ vẫn là HTTP trên cổng 8787. Đổi Port Protocol sang HTTPS khi backend chỉ hỗ trợ HTTP sẽ làm kết nối lỗi.

## Phạm vi và giới hạn

- Bản test có 1 Host, tối đa **2 người xem/phòng**; nội dung video/âm thanh ưu tiên WebRTC P2P.
- Dùng máy chủ STUN công khai để giúp tìm đường ngang hàng; **không có TURN/SFU**, nên mạng NAT nghiêm ngặt hoặc bị chặn UDP có thể không xem được.
- Các cổng UDP của STUN/SFU **không được GitHub Codespaces forward**. GitHub chỉ forward cổng TCP 8787 cho HTTPS/WebSocket, nên không được coi đây là hệ thống sản xuất đủ kết nối mọi loại mạng.
- Cơ sở dữ liệu phòng dùng **bộ nhớ tiến trình** (`:memory:`), phòng sẽ mất khi Codespace dừng hoặc Piik khởi động lại.
- URL có thể thay đổi giữa các Codespaces. Nếu server không thấy đã chạy, vào mục **View → Output** hoặc tệp `build/codespaces/piik-server.log` để xem lỗi.
- Giữ Codespace đang chạy khi có người xem. Khi không dùng nữa, **Stop codespace** từ https://github.com/codespaces để tiết kiệm hạn mức. Tài khoản cá nhân có hạn mức miễn phí nhất định; việc sử dụng vượt hạn mức có thể bị giới hạn hoặc phát sinh phí nếu bật thanh toán.
- Tất cả mã nguồn/thay đổi nằm trên nhánh `preview/github-codespaces`. Không ảnh hưởng `main`, LUNOR OS hay máy tính của bạn.

## Kiểm thử và quản lý

- Kiểm tra server: mở `https://<tên-codespace>-8787.app.github.dev/healthz` và tìm phản hồi `{"status":"ok"}`.
- Khi tạo phòng, Piik dùng chính HTTPS origin phía GitHub để tạo lời mời, không dùng `localhost`.
- Khi thử trên hai mạng khác nhau, cần cho trình duyệt quyền chia sẻ màn hình và tùy chọn audio đúng nguồn được hỗ trợ.
- Nếu muốn dùng online lâu dài, cần triển khai backend Go lên hosting độc lập có WebSocket/HTTPS và chuẩn bị giải pháp STUN/TURN/SFU phù hợp. Codespaces không thay thế phần đó.

Bạn **không cần tải artifact Linux xuống máy Windows** để thử kiểu này.
