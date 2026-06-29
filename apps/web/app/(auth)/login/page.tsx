"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { forgotPassword, login } from "lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("minh@fpt.edu.vn");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [screen, setScreen] = useState<"login" | "forgot" | "reset-sent">("login");
  const [resetEmail, setResetEmail] = useState("minh@fpt.edu.vn");
  const [resetToken, setResetToken] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get("expired") === "1");
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Login failed. Check email/password and API server.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForgotLoading(true);
    setError("");
    try {
      const response = await forgotPassword(resetEmail);
      setResetToken(response.resetToken ?? "");
      setScreen("reset-sent");
    } catch {
      setError("Chưa gửi được yêu cầu khôi phục. Kiểm tra API server.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      {screen === "login" && (
        <div className="auth-screen-stack">
          <div>
            <h2 className="auth-screen-title">Đăng nhập</h2>
            <p className="auth-screen-subtitle">Chào mừng trở lại, gamer!</p>
          </div>
          {expired && <p className="auth-alert">Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</p>}
          <form className="auth-screen-form" onSubmit={handleSubmit}>
            <label>
              <span>Email</span>
              <input className="auth-form-input" type="email" placeholder="minh@fpt.edu.vn" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              <span>Mật khẩu</span>
              <input className="auth-form-input" type="password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required />
              <button type="button" className="auth-forgot-link" onClick={() => setScreen("forgot")}>Quên mật khẩu?</button>
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-btn-neon" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
          </form>

          <div className="auth-demo-box">
            <p>🔑 Tài khoản Demo</p>
            <code>Email: minh@fpt.edu.vn</code>
            <code>Password: Password123!</code>
          </div>

          <p className="auth-switch-copy">
            Chưa có tài khoản? <a href="/register">Đăng ký ngay</a>
          </p>
        </div>
      )}

      {screen === "forgot" && (
        <div className="auth-screen-stack">
          <button type="button" className="auth-back-link" onClick={() => setScreen("login")}>← Quay lại đăng nhập</button>
          <div>
            <h2 className="auth-screen-title">Quên mật khẩu</h2>
            <p className="auth-screen-subtitle">Nhập email đăng ký, chúng tôi sẽ gửi link khôi phục.</p>
          </div>
          <form className="auth-screen-form" onSubmit={handleForgotSubmit}>
            <label>
              <span>Email</span>
              <input className="auth-form-input" type="email" placeholder="minh@fpt.edu.vn" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-btn-neon" disabled={forgotLoading}>{forgotLoading ? "Đang gửi..." : "Gửi yêu cầu khôi phục"}</button>
          </form>
        </div>
      )}

      {screen === "reset-sent" && (
        <div className="auth-success-state">
          <div className="auth-success-icon">✉️</div>
          <h2 className="auth-screen-title">Kiểm tra hộp thư của bạn</h2>
          <p className="auth-screen-subtitle">
            Chúng tôi đã gửi hướng dẫn khôi phục mật khẩu đến email của bạn.<br />
            {resetToken ? <span>Demo token: {resetToken}</span> : <span>Nếu tài khoản tồn tại, link reset sẽ khả dụng trong 30 phút.</span>}
          </p>
          {resetToken && <a className="auth-btn-neon" href={`/reset-password?token=${resetToken}`}>Đặt lại mật khẩu</a>}
          <button type="button" className="auth-btn-outline" onClick={() => setScreen("login")}>Quay lại đăng nhập</button>
        </div>
      )}
    </>
  );
}
