"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("minh@fpt.edu.vn");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <>
      <p className="eyebrow">FPT EsportHub</p>
      <h2 className="auth-title">Đăng nhập</h2>
      <p className="auth-subtitle">Chào mừng trở lại command center.</p>
      {expired && <p className="hint">Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" placeholder="you@fpt.edu.vn" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error && <p className="hint">{error}</p>}
        <button type="submit" className="primary-action full" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
      </form>
      <div className="demo-credential">Demo: <code>minh@fpt.edu.vn / Password123!</code></div>
      <p className="auth-alt">
        Chưa có tài khoản? <a href="/register">Đăng ký</a>
      </p>
    </>
  );
}
