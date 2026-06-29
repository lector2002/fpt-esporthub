"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("");
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setStatus("Đã đặt lại mật khẩu. Đang chuyển về đăng nhập...");
      setTimeout(() => router.push("/login"), 900);
    } catch {
      setError("Token không hợp lệ/hết hạn hoặc mật khẩu chưa đạt yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen-stack">
      <div>
        <h2 className="auth-screen-title">Đặt lại mật khẩu</h2>
        <p className="auth-screen-subtitle">Nhập mật khẩu mới cho tài khoản FPT EsportHub.</p>
      </div>
      <form className="auth-screen-form" onSubmit={handleSubmit}>
        <label>
          <span>Reset token</span>
          <input className="auth-form-input" value={token} onChange={(event) => setToken(event.target.value)} required />
        </label>
        <label>
          <span>Mật khẩu mới</span>
          <input className="auth-form-input" type="password" placeholder="Tối thiểu 8 ký tự" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
        </label>
        <label>
          <span>Xác nhận mật khẩu</span>
          <input className="auth-form-input" type="password" placeholder="••••••••" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />
        </label>
        {error && <p className="auth-error">{error}</p>}
        {status && <p className="auth-alert">{status}</p>}
        <button type="submit" className="auth-btn-neon" disabled={loading}>{loading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}</button>
      </form>
      <p className="auth-switch-copy"><a href="/login">Quay lại đăng nhập</a></p>
    </div>
  );
}
