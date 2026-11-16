# LUNOR Share — máy chủ độc lập (giai đoạn 4)

Đây là cấu hình triển khai VPS **đã chuẩn bị nhưng chưa có máy chủ được cấp phát**. Không coi việc vượt qua GitHub Actions là đã có trang 24/7. Trang Toolpick tại https://toolpick.id.vn/lunor-share là giao diện riêng; khi máy chủ hoạt động, dán địa chỉ HTTPS của máy chủ vào mục kết nối trên Toolpick.

> **Phương án 0đ:** xem [triển khai trên Oracle Cloud Always Free](./lunor-oracle-always-free.md) (2 OCPU / 12 GB ARM trong hạn mức, chỉ chọn Always Free eligible). Tài khoản cloud, xác minh cá nhân và cấp máy thực tế vẫn cần chủ tài khoản thực hiện.

## Hạ tầng

Yêu cầu VPS Linux x64 hoặc ARM64, Docker Engine + Docker Compose v2, IPv4 công khai, tên miền DNS do bạn sở hữu, và quyền mở cổng UDP. Máy chủ chạy một tiến trình Go chứa UI + signaling + STUN + SFU tùy chọn; Caddy cấp HTTPS/WSS và tự gia hạn TLS; SQLite lưu phòng trên volume Docker. Không dùng image Piik upstream, vì thiếu cập nhật thương hiệu và chức năng của fork.

Với tên miền Toolpick, sử dụng ví dụ:
- A share.toolpick.id.vn trỏ tới IPv4 công khai của VPS, phục vụ HTTPS qua Caddy.
- A stun.toolpick.id.vn trỏ tới cùng IPv4, để **DNS only** (đám mây xám trong Cloudflare). Không proxy HTTP cho STUN.

Mở TCP 80/443 và UDP 3478; khi cần SFU, mở thêm UDP 7882. Giữ cổng TCP 8787 **không công khai**. Không dùng nhiều replica vì room/media runtime chỉ thuộc một tiến trình.

## Cài đặt

Trong terminal của VPS, đã cài Docker:

~~~sh
git clone --branch preview/github-codespaces https://github.com/Gamevalentine/Piik.git lunor-share
cd lunor-share
cp deploy/lunor/.env.example deploy/lunor/.env
chmod 600 deploy/lunor/.env
openssl rand -hex 24
~~~

Sửa file deploy/lunor/.env. Điền chuỗi ngẫu nhiên vừa tạo vào SITE_ACCESS_PASSWORD. Chỉnh LUNOR_DOMAIN, PUBLIC_BASE_URL và STUN_URLS nếu dùng tên miền khác. Tuyệt đối không commit file chứa mật khẩu.

~~~sh
docker compose -f deploy/lunor/compose.yaml config --quiet
docker compose -f deploy/lunor/compose.yaml build
docker compose -f deploy/lunor/compose.yaml run --rm --no-deps lunor-share --check-config
docker compose -f deploy/lunor/compose.yaml up -d
docker compose -f deploy/lunor/compose.yaml ps
curl -fsS https://share.toolpick.id.vn/healthz
~~~

Bản đầu P2P-only. STUN UDP 3478 cần truy cập được từ bên ngoài; HTTPS healthcheck một mình không kiểm tra được UDP. Khi đã mở UDP 7882 và xác minh IPv4 công khai, thêm cả hai biến sau vào file môi trường:

~~~dotenv
SFU_UDP_PORT=7882
SFU_PUBLIC_IP=IPv4_CONG_KHAI_CUA_VPS
~~~

Thay IPv4_CONG_KHAI_CUA_VPS bằng địa chỉ thật, không dùng địa chỉ ví dụ. Sau đó chạy lại lệnh docker compose up -d --force-recreate lunor-share. **SFU không phải TURN** và không vượt qua mọi mạng chặn UDP.

## Kiểm tra hoạt động

1. Truy cập URL HTTPS /healthz: phải trả {"status":"ok"} và chứng chỉ hợp lệ.
2. Mở trang, xác thực mật khẩu Host, tạo phòng. Link mời phải dùng HTTPS của máy chủ; người chưa xác thực không được tạo phòng.
3. Trên hai mạng Internet khác nhau, chia sẻ một thẻ Chrome/Edge có âm thanh và xác nhận Viewer thấy khung hình mới, có âm thanh Opus.
4. Chặn một liên kết P2P nếu đã cấu hình SFU, kiểm tra khôi phục hình và tiếng. Đảm bảo UDP 3478/7882 đều tới được VPS.
5. Kiểm tra sau khi khởi động lại: thông tin phòng trong SQLite còn, nhưng các kết nối media hiện tại phải kết nối lại.
6. Theo dõi CPU, RAM, dung lượng và băng thông; sao lưu volume và mật khẩu. Không dùng docker compose down -v vì sẽ xóa dữ liệu phòng.

Kiểm chứng 20 thiết bị, điện thoại, nhiều ISP, độ trễ và đồng bộ âm/hình thuộc **giai đoạn 5**. Giai đoạn 4 chỉ được đánh dấu triển khai thành công sau khi VPS thực sự chạy và kiểm tra public HTTPS/UDP.

## Cập nhật và hoàn tác

Lưu bản sao bảo mật của file .env và volume phòng trước mỗi lần nâng cấp. Kéo nhánh preview/github-codespaces, build lại Docker image, rồi docker compose up -d. Nếu lỗi, quay lại commit trước, build và khôi phục volume tương thích. Không làm gián đoạn hoặc chỉnh sửa Toolpick/Paperclip.

**Trạng thái nhà cung cấp:** Railway của chủ dự án báo trial hết hạn và yêu cầu gói; không tự đăng ký dịch vụ phát sinh chi phí. DigitalOcean có tài khoản nhưng chưa có VPS được xác thực sử dụng và không cấp máy có phí nếu chưa có lựa chọn/giới hạn chi phí rõ ràng.
