import { useCopy } from "../../ui/copy";

type Role = "host" | "viewer";

// Presentation only: the room and media owners remain HostPage/ViewerPage.
export function LunorCinemaIntro({ role }: { role: Role }) {
  const { lang } = useCopy();
  const content = {
    vi: role === "host"
      ? ["PHÒNG CHIẾU CỦA BẠN", "Một bộ phim. Cả nhóm cùng xem.", "Chọn màn hình hoặc thẻ phim, bật âm thanh và gửi liên kết mời cho bạn bè.", "Tối đa 20 người", "Phòng riêng"]
      : ["BẠN ĐÃ VÀO PHÒNG CHIẾU", "Cùng nhau tận hưởng từng khung hình.", "Chờ chủ phòng phát phim. Bạn có thể mở toàn màn hình và trò chuyện với mọi người.", "Xem trên trình duyệt", "Kết nối riêng"],
    en: role === "host"
      ? ["YOUR PRIVATE CINEMA", "One movie. Everyone together.", "Share a screen or movie tab with audio, then invite your friends.", "Up to 20 viewers", "Private room"]
      : ["WELCOME TO THE SCREENING", "Enjoy every frame together.", "Wait for the host to start sharing. Watch fullscreen and chat with friends.", "Watch in browser", "Private connection"],
    zh: role === "host"
      ? ["你的私人放映室", "一部电影，一起观看。", "分享屏幕或电影标签页和声音，然后邀请朋友。", "最多 20 位观众", "私人房间"]
      : ["欢迎来到放映室", "和朋友一起欣赏每一帧。", "等待房主开始分享，可全屏观看和聊天。", "浏览器观看", "私密连接"],
  }[lang];

  return (
    <section className="ls-cinema-intro" aria-label={content[0]}>
      <div className="ls-cinema-intro__body">
        <span className="ls-cinema-intro__eyebrow"><span aria-hidden="true" className="ls-live-dot" /> LUNOR SHARE · {content[0]}</span>
        <h2>{content[1]}</h2>
        <p>{content[2]}</p>
      </div>
      <div className="ls-cinema-intro__details" aria-label={content[0]}>
        <span>{content[3]}</span><span>{content[4]}</span>
      </div>
    </section>
  );
}
