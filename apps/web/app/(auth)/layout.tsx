export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <nav className="auth-topbar glass-panel">
        <a href="/" className="nav-brand neon-brand"><span className="brand-mark">🎮</span> FPT EsportHub</a>
        <a href="/login" className="primary-action">Đăng nhập</a>
      </nav>
      <div className="auth-card">{children}</div>
    </div>
  );
}
