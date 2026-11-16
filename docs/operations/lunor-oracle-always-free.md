# LUNOR Share — Oracle Cloud Always Free (không nâng cấp trả phí)

Bản triển khai thật đã được chuẩn bị trong [LUNOR VPS](./lunor-share-vps.md), sử dụng `deploy/lunor/` và đã có CI production build. Hướng dẫn này chỉ bổ sung **cách lấy máy chủ Oracle Always Free an toàn**; không khẳng định VM, DNS hay HTTPS đã được tạo. LUNOR Share trên Toolpick vẫn chạy độc lập tại https://toolpick.id.vn/lunor-share.

## 1. Điều kiện miễn phí và đăng ký

- Đăng ký chính thức tại https://signup.oraclecloud.com/ hoặc https://www.oracle.com/cloud/free/.
- Đăng ký là thao tác cá nhân: xác minh email, số điện thoại, phương thức thanh toán và CAPTCHA. **Không nhập hoặc gửi số thẻ, OTP, mật khẩu Oracle cho người khác.** Oracle có thể giữ một khoản xác minh tạm thời; không nâng cấp tài khoản sang Pay As You Go.
- Chọn **home region** cẩn thận: Always Free Compute chỉ dùng được tại home region. Không có bảo đảm luôn còn máy trống; `Out of host capacity` nghĩa là phải chọn availability domain khác hoặc thử lại sau, **không chuyển qua shape trả phí**.
- Trong OCI Console, chọn **Compute → Instances → Create Instance**.
- Chọn image **Ubuntu 24.04 aarch64/ARM64** (nếu là Always Free eligible); shape **VM.Standard.A1.Flex**, tổng **2 OCPU, 12 GB RAM**, và boot volume mặc định khoảng **50 GB**. Trước khi bấm Create, phải có nhãn **Always Free eligible** và xác minh tổng usage không vượt quota.
- Chọn VCN + public subnet, public IPv4, SSH key; không mở SSH bằng password. Giới hạn nguồn TCP 22 đến **IP công cộng của chính bạn** nếu có thể.

Theo tài liệu Oracle được kiểm tra ngày 2026-11-16, Always Free Ampere A1 có **1.500 OCPU-hours + 9.000 GB-hours/tháng** — tương đương 2 OCPU/12 GB chạy cả tháng trên tài khoản Always Free, tổng 200 GB boot/block volume miễn phí, và 10 TB/tháng outbound data trong giới hạn chương trình. Kiểm tra nhãn và hạn mức ngay trên Console vì giá/chính sách có thể thay đổi. **Chỉ sử dụng tài nguyên có nhãn Always Free**, không tạo load balancer/bucket/DB trả phí.

Các nguồn chính thức:
- https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- https://docs.oracle.com/en-us/iaas/Content/GSG/Tasks/signingup_topic-Sign_Up_for_Free_Oracle_Cloud_Promotion.htm

**Quan trọng:** Always Free không đảm bảo VM hoạt động liên tục mãi mãi; Oracle có quyền thu hồi VM ít sử dụng theo chính sách idle. Không tạo tải giả nhằm lách giới hạn. Cần sao lưu trước và giám sát VPS.

## 2. Mở tường lửa Oracle đúng loại lưu lượng

Tại **Networking → Virtual Cloud Networks → Security Lists** hoặc **Network Security Groups** của NIC gắn vào máy, chỉ thêm ingress cần thiết:

| Giao thức | Cổng đích | Phạm vi | Mục đích |
| --- | --- | --- | --- |
| TCP | 22 | IP quản trị của bạn (không phải 0.0.0.0/0 nếu tránh được) | SSH |
| TCP | 80 | 0.0.0.0/0 | Caddy cấp/đổi chứng chỉ |
| TCP | 443 | 0.0.0.0/0 | HTTPS/WSS |
| UDP | 3478 | 0.0.0.0/0 | STUN |
| UDP | 7882 | 0.0.0.0/0 | SFU (nếu được bật) |

Không thêm cổng **8787/TCP** vào Internet ingress: Go chỉ được phép truy cập bởi Caddy trong Docker Compose nội bộ.

Trên Ubuntu, kiểm tra **UFW/iptables/nftables** hiện tại và chỉ cấp tương ứng TCP 80/443, UDP 3478/7882. Đừng xóa mọi rule firewall hoặc kích hoạt UFW trước khi chắc chắn SSH 22 còn truy cập được. Khi chặn UDP 7882, SFU sẽ không hoạt động dù Caddy HTTPS vẫn xanh.

## 3. DNS (không cần mua tên miền mới nếu đã quản lý Toolpick)

Sử dụng hai bản ghi A:
- `share.toolpick.id.vn` → **public IPv4 thực** của Oracle VM; chọn **DNS only** trong lần nghiệm thu đầu tiên.
- `stun.toolpick.id.vn` → cùng public IPv4, **luôn DNS only** vì Cloudflare proxy HTTP thường không chuyển tiếp UDP STUN.

DNS cần trỏ đúng trước khi Caddy cấp chứng chỉ. Nếu không có quyền quản trị `toolpick.id.vn`, dùng tên miền khác do bạn sở hữu và thay cả `LUNOR_DOMAIN`, `PUBLIC_BASE_URL`, `STUN_URLS`.

## 4. Chạy LUNOR Share (trên Oracle VM, không phải máy Windows)

Sau khi đăng nhập SSH và cài Docker Engine + Docker Compose plugin cho **Ubuntu ARM64** theo tài liệu chính thức https://docs.docker.com/engine/install/ubuntu/ :

```sh
git clone --branch preview/github-codespaces https://github.com/Gamevalentine/Piik.git lunor-share
cd lunor-share
cp deploy/lunor/.env.example deploy/lunor/.env
chmod 600 deploy/lunor/.env
openssl rand -hex 24
```

Dán mật khẩu ngẫu nhiên vào `SITE_ACCESS_PASSWORD` trong `deploy/lunor/.env` (không gửi vào chat). Kiểm tra ba biến hostname cùng khớp DNS rồi chạy:

```sh
docker compose -f deploy/lunor/compose.yaml config --quiet
docker compose -f deploy/lunor/compose.yaml build
docker compose -f deploy/lunor/compose.yaml run --rm --no-deps lunor-share --check-config
docker compose -f deploy/lunor/compose.yaml up -d
curl -fsS https://share.toolpick.id.vn/healthz
```

Mở https://share.toolpick.id.vn/, nhập mật khẩu Host, tạo phòng và lấy link mời thực. Tại Toolpick → LUNOR Share → máy chủ, nhập `https://share.toolpick.id.vn`; trang Toolpick chỉ chuyển người dùng sang origin thật, **không proxy WebRTC**.

### Bật máy chủ chuyển tiếp media (SFU)

Sau khi xác nhận cổng UDP 7882 đi từ bên ngoài tới máy:
- Thêm `SFU_UDP_PORT=7882` vào `deploy/lunor/.env`.
- Thêm `SFU_PUBLIC_IP=<IPv4 public của Oracle VM>` với **IPv4 thật**, không dùng ví dụ.
- Chạy `docker compose -f deploy/lunor/compose.yaml up -d --force-recreate lunor-share`.

Lúc đó ứng dụng có thể sử dụng tuyến SFU khi phù hợp. Đây **không** phải dịch vụ TURN/TCP; các mạng chặn toàn bộ UDP vẫn có thể xem lỗi. Không tự hứa 20 người xem mượt khi chưa chạy thử Internet thực.

## 5. Các mốc nghiệm thu

- Đúng nhãn Always Free, 2 OCPU/12GB, 50GB boot, không bật gói trả phí.
- Máy ở trạng thái Running, có public IPv4, ingress TCP/UDP chính xác.
- `/healthz` trả `{"status":"ok"}` trên HTTPS.
- Chủ phòng đăng nhập, tạo phòng và gửi link mời; người xem thứ hai ở mạng khác nhận được hình **và tiếng**.
- Kiểm tra ứng dụng tự khởi động lại, Docker volume `rooms` tồn tại qua restart.
- Chỉ sau khi có server public hoạt động mới tiến hành **giai đoạn 5**: thử 20 thiết bị/nhiều nhà mạng, audio sync và độ trễ.

Không bật dịch vụ tính phí, không thay đổi Toolpick và không tự công bố ngày website chính thức hoạt động nếu chưa xác nhận máy đã chạy.
