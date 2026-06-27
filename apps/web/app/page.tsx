export default function HomePage() {
  return (
    <main className="glm-auth-layout">
      <nav className="glm-auth-nav glass-panel">
        <a href="/" className="glm-brand">
          <span className="glm-brand-mark">🎮</span>
          <span>FPT EsportHub</span>
        </a>
        <a href="/login" className="glm-btn-neon">Đăng nhập</a>
      </nav>

      <section className="glm-landing-hero">
        <div className="glm-phase-pill">✨ Phase 1: Smart Team Finding MVP</div>
        <h1>
          Tìm squad phù hợp cho<br />
          <span>Valorant &amp; League of Legends</span>
        </h1>
        <p>
          Nền tảng giúp sinh viên FPT tìm đồng đội chơi game phù hợp theo rank,
          role, lịch chơi và mục tiêu.
        </p>
        <div className="glm-landing-actions">
          <a href="/register" className="glm-btn-neon large">⚡ Bắt đầu tìm squad</a>
          <a href="/login" className="glm-btn-outline large">Dùng Demo Account</a>
        </div>
      </section>
    </main>
  );
}
