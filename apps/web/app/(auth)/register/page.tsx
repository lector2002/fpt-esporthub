"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
      router.push("/onboarding");
    } catch {
      setError("Registration failed. Use a valid new email and password with at least 8 characters.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-screen-stack">
        <div>
          <h2 className="auth-screen-title">Tạo tài khoản</h2>
          <p className="auth-screen-subtitle">Tham gia cộng đồng esports FPT</p>
        </div>
        <form className="auth-screen-form" onSubmit={handleSubmit}>
          <label>
            <span>Tên hiển thị</span>
            <input className="auth-form-input" type="text" placeholder="MinhZz" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} />
            <small>Đây là tên sẽ hiển thị trên Player Card của bạn.</small>
          </label>
          <label>
            <span>Email</span>
            <input className="auth-form-input" type="email" placeholder="minh@fpt.edu.vn" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            <span>Mật khẩu</span>
            <input className="auth-form-input" type="password" placeholder="Tối thiểu 8 ký tự" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          </label>
          <label>
            <span>Xác nhận mật khẩu</span>
            <input className="auth-form-input" type="password" placeholder="••••••••" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />
          </label>

          <label className="auth-terms-row">
            <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} required />
            <span>Tôi đồng ý với <a href="/">Điều khoản dịch vụ</a> và <a href="/">Chính sách bảo mật</a>.</span>
          </label>

          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-btn-neon" disabled={loading || !acceptedTerms}>{loading ? "Đang tạo..." : "Tiếp tục"}</button>
        </form>
        <p className="auth-switch-copy">
          Đã có tài khoản? <a href="/login">Đăng nhập</a>
        </p>
      </div>
    </>
  );
}
