export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-split-shell auth-grid-bg">
      <aside className="auth-split-visual">
        <div className="auth-split-overlay" />
        <div className="auth-split-visual-inner">
          <a href="/" className="auth-split-brand">
            <span className="auth-split-brand-mark">F</span>
            <span>FPT EsportHub</span>
          </a>

          <div className="auth-split-copy">
            <h1>
              Vào thế trận cùng <br /><span>Squad của bạn</span>
            </h1>
            <p>Nền tảng tìm đồng đội esports thông minh cho sinh viên FPT. Kết nối ngay hôm nay.</p>
            <div className="auth-split-feature-list">
              <div><span className="cyan">🎯</span>Smart Matchmaking theo Rank & Role</div>
              <div><span className="purple">🛡️</span>Môi trường an toàn, Verification rõ ràng</div>
              <div><span className="blue">⚡</span>Giao tiếp squad nhanh chóng</div>
            </div>
          </div>

          <p className="auth-split-footnote">© 2025 FPT EsportHub · Not affiliated with Riot Games</p>
        </div>
      </aside>

      <section className="auth-split-form-side">
        <a href="/" className="auth-split-mobile-brand">
          <span className="auth-split-brand-mark">F</span>
          <span>FPT EsportHub</span>
        </a>
        <div className="auth-split-card">{children}</div>
      </section>
    </div>
  );
}
