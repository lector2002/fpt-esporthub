"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "lib/api";

export function DemoAccountButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDemo = async () => {
    setLoading(true);
    setError("");
    try {
      await login("minh@fpt.edu.vn", "Password123!");
      router.push("/dashboard");
    } catch {
      setError("Không vào được demo. Kiểm tra API server.");
      setLoading(false);
    }
  };

  return (
    <span className="demo-action-wrap">
      <button type="button" className="landing-btn landing-btn-outline landing-btn-large" onClick={handleDemo} disabled={loading}>
        {loading ? "Đang vào demo..." : "Dùng Demo Account"}
      </button>
      {error && <span className="demo-action-error">{error}</span>}
    </span>
  );
}
