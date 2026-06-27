"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
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
      <p className="eyebrow">FPT EsportHub</p>
      <h2 className="auth-title">Tạo tài khoản</h2>
      <p className="auth-subtitle">Tham gia cộng đồng esports FPT.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" placeholder="you@fpt.edu.vn" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Tên hiển thị
          <input type="text" placeholder="Tên in-game của bạn" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} />
        </label>
        <label>
          Mật khẩu
          <input type="password" placeholder="Ít nhất 8 ký tự" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
        </label>
        {error && <p className="hint">{error}</p>}
        <button type="submit" className="primary-action full" disabled={loading}>{loading ? "Đang tạo..." : "Tạo tài khoản"}</button>
      </form>
      <p className="auth-alt">
        Đã có tài khoản? <a href="/login">Đăng nhập</a>
      </p>
    </>
  );
}
