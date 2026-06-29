import { DemoAccountButton } from "./demo-account-button";

const features = [
  ["🎯", "Match theo Rank & Role", "Tìm player cùng rank range, role bổ trợ cho squad.", "purple"],
  ["🕒", "Lịch chơi khớp nhau", "Không còn cảnh hẹn rồi không online. Match theo khung giờ.", "blue"],
  ["🎙️", "Communication Style", "Discord VC, text only, hay competitive comms — chọn phong cách phù hợp.", "cyan"],
  ["🏆", "Mục tiêu chung", "Climb rank, scrim, hay thi đấu giải — match theo goal.", "green"],
  ["🛡️", "Reputation & Verification", "Badge rõ ràng: New, Verified, Trusted. Biết ai đáng tin.", "orange"],
  ["💬", "Squad Comms", "Chat 1:1 nhanh chóng ngay trên nền tảng.", "pink"],
];

const loopSteps = [
  ["📝", "1. Đăng ký", "Tạo tài khoản nhanh"],
  ["🎮", "2. Onboarding", "Build player card"],
  ["🔍", "3. Find Match", "Xem gợi ý phù hợp"],
  ["📤", "4. Send Request", "Mời player phù hợp"],
  ["💬", "5. Chat & Scrim", "Bắt đầu chơi chung"],
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <header className="landing-nav glass-panel">
        <a href="/" className="landing-brand">
          <span className="landing-brand-mark">F</span>
          <span>FPT EsportHub</span>
        </a>
        <nav className="landing-nav-links" aria-label="Landing sections">
          <a href="#features">Tính năng</a>
          <a href="#loop">Cách hoạt động</a>
          <a href="#games">Game</a>
        </nav>
        <div className="landing-nav-actions">
          <a href="/login" className="landing-btn landing-btn-outline">Đăng nhập</a>
          <a href="/register" className="landing-btn landing-btn-neon hide-mobile">Bắt đầu</a>
        </div>
      </header>

      <section className="landing-hero landing-grid-bg">
        <div className="landing-hero-overlay" />
        <div className="landing-container landing-hero-content">
          <div className="landing-phase-pill">
            <span className="landing-status-dot" />
            <span>Phase 1: Smart Team Finding MVP</span>
          </div>

          <h1 className="landing-title">
            Tìm squad phù hợp cho<br />
            <span>Valorant &amp; League of Legends</span>
          </h1>

          <p className="landing-copy">
            Nền tảng giúp sinh viên FPT tìm đồng đội chơi game phù hợp theo rank, role,
            lịch chơi, mục tiêu và communication style. Không còn solo queue mệt mỏi.
          </p>

          <div className="landing-actions">
            <a href="/register" className="landing-btn landing-btn-neon landing-btn-large">⚡ Bắt đầu tìm squad</a>
            <a href="/login" className="landing-btn landing-btn-outline landing-btn-large">Đăng nhập</a>
            <DemoAccountButton />
          </div>

          <p className="landing-demo-copy">Demo: minh@fpt.edu.vn / Password123!</p>

          <div className="landing-match-card gradient-border-card">
            <div className="landing-match-header">
              <div className="landing-avatar">🦊</div>
              <div>
                <h3>MinhZz</h3>
                <p>Diamond 2 · Duelist</p>
              </div>
              <div className="landing-score">
                <strong>92%</strong>
                <span>match score</span>
              </div>
            </div>
            <div className="landing-pill-row">
              <span className="landing-pill pill-goal">📈 Cùng mục tiêu leo rank</span>
              <span className="landing-pill pill-comm">🎙️ Cùng shotcaller</span>
              <span className="landing-pill pill-schedule">🕒 Khung giờ trùng nhau</span>
            </div>
            <a href="/register" className="landing-btn landing-btn-neon full">Gửi lời mời</a>
          </div>
        </div>
      </section>

      <section id="games" className="landing-section">
        <div className="landing-container narrow">
          <LandingSectionTitle title="Game được hỗ trợ" subtitle="Tập trung vào 2 game competitive phổ biến nhất" />
          <div className="landing-games-grid">
            <div className="landing-game-card gradient-border-card">
              <div className="landing-game-icon valorant">🔫</div>
              <h3>Valorant</h3>
              <p>5v5 Tactical Shooter</p>
              <div className="landing-pill-row centered">
                {['Duelist', 'Initiator', 'Sentinel', 'Controller'].map((role) => <span className="landing-pill pill-goal" key={role}>{role}</span>)}
              </div>
            </div>
            <div className="landing-game-card gradient-border-card">
              <div className="landing-game-icon lol">⚔️</div>
              <h3>League of Legends</h3>
              <p>5v5 MOBA</p>
              <div className="landing-pill-row centered">
                {['Top', 'Jungle', 'Mid', 'ADC', 'Support'].map((role) => <span className="landing-pill pill-comm" key={role}>{role}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section landing-grid-bg">
        <div className="landing-container">
          <LandingSectionTitle title="Smart Matchmaking" subtitle="Không random. Mỗi match đều có lý do rõ ràng." />
          <div className="landing-feature-grid">
            {features.map(([icon, title, description, tone]) => (
              <div className="landing-feature-card" key={title}>
                <div className={`landing-feature-icon ${tone}`}>{icon}</div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="loop" className="landing-section">
        <div className="landing-container narrow">
          <LandingSectionTitle title="Cách hoạt động" subtitle="5 bước từ solo đến squad" />
          <div className="landing-loop-grid">
            <div className="landing-loop-line" />
            {loopSteps.map(([icon, title, description]) => (
              <div className="landing-loop-step" key={title}>
                <div className="landing-loop-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-final-cta landing-grid-bg">
        <div className="landing-hero-overlay" />
        <div className="landing-container narrow">
          <div className="landing-bolt">⚡</div>
          <h2>Sẵn sàng tìm squad?</h2>
          <p>Tham gia FPT EsportHub hôm nay. Không còn solo queue mệt mỏi.</p>
          <a href="/register" className="landing-btn landing-btn-neon landing-btn-large">Bắt đầu miễn phí</a>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div className="landing-footer-brand">
            <span className="landing-brand-mark small">F</span>
            <span>FPT EsportHub © 2025</span>
          </div>
          <div className="landing-footer-notes">
            <span>UI-only MVP Prototype</span>
            <span>•</span>
            <span>Not affiliated with Riot Games</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function LandingSectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="landing-section-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}
