"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createCoachingRequest, getCoachDetail, submitCoachFeedback } from "lib/api";
import type { CoachDetail } from "lib/types";

const initialDate = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);

export default function CoachDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [coach, setCoach] = useState<CoachDetail | null>(null);
  const [notice, setNotice] = useState("");
  const [hireOpen, setHireOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [hireForm, setHireForm] = useState({ proposedStartAt: initialDate(), durationMinutes: 60, proposedPrice: 150000, message: "Mình muốn được coach để cải thiện kỹ năng và rank." });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });

  const refresh = async () => {
    try { setCoach(await getCoachDetail(id)); } catch { setNotice("Không tìm thấy coach hoặc API chưa sẵn sàng."); }
  };

  useEffect(() => { void refresh(); }, [id]);

  const submitHire = async () => {
    if (!coach) return;
    try {
      await createCoachingRequest({ coachId: coach.id, ...hireForm, proposedPrice: Number(hireForm.proposedPrice), durationMinutes: Number(hireForm.durationMinutes) });
      setHireOpen(false); setNotice("Đã gửi đề xuất thuê coach.");
    } catch { setNotice("Chưa gửi được đề xuất."); }
  };

  const submitReview = async () => {
    if (!coach) return;
    try {
      await submitCoachFeedback(coach.id, { rating: reviewForm.rating, comment: reviewForm.comment });
      setReviewOpen(false); setReviewForm({ rating: 5, comment: "" }); setNotice("Đã gửi đánh giá."); await refresh();
    } catch { setNotice("Chưa gửi được đánh giá."); }
  };

  if (!coach) return <main className="cd-shell"><p className="coach-empty">{notice || "Đang tải..."}</p></main>;

  return (
    <main className="cd-shell">
      <a href="/coaches" className="cd-back">← Quay lại marketplace</a>
      {notice && <p className="coach-notice">{notice}</p>}

      <section className="cd-hero">
        <div className="cd-hero-left">
          <div className="cd-avatar">{coach.displayName[0]}</div>
          <div>
            <div className="cd-name-row">
              <h1>{coach.displayName}</h1>
              {coach.verificationStatus === "Verified" && <span className="cd-badge cd-badge-verified">✓ Verified</span>}
              <span className={`cd-badge cd-badge-${coach.reputationBadge.toLowerCase()}`}>{coach.reputationBadge}</span>
            </div>
            <p className="cd-meta">{coach.game} · {coach.rank}{coach.riotId ? ` · ${coach.riotId}` : ""}</p>
          </div>
        </div>
        <div className="cd-hero-right">
          <div className="cd-stat"><strong>{coach.avgRating || "—"}</strong><small>Rating TB</small></div>
          <div className="cd-stat"><strong>{coach.feedbacks.length}</strong><small>Đánh giá</small></div>
          <div className="cd-stat"><strong>{coach.totalSessions}</strong><small>Buổi đã chốt</small></div>
          <button className="fm-btn-neon" type="button" onClick={() => setHireOpen(true)}>🎓 Thuê coach này</button>
        </div>
      </section>

      <div className="cd-grid">
        <section className="cd-card">
          <h2>Giới thiệu</h2>
          <p className="cd-bio">{coach.bio}</p>
          <h3>Chuyên môn</h3>
          <div className="coach-tags">{coach.specialties.map((s) => <span key={s}>{s}</span>)}</div>
          <h3>Lịch nhận coaching</h3>
          <div className="coach-tags">{coach.availability.map((s) => <span key={s}>{s}</span>)}</div>
          <div className="cd-price-row">
            <span className="cd-price">{coach.hourlyRate.toLocaleString("vi-VN")}đ<small>/giờ</small></span>
          </div>
        </section>

        <aside className="cd-card">
          <div className="cd-section-head">
            <h2>Đánh giá từ người thuê</h2>
            <button className="fm-btn-outline" type="button" onClick={() => setReviewOpen(true)}>Viết đánh giá</button>
          </div>
          {coach.feedbacks.length === 0 && <p className="coach-empty">Chưa có đánh giá nào.</p>}
          {coach.feedbacks.map((fb) => (
            <article key={fb.id} className="cd-feedback">
              <div className="cd-feedback-head">
                <strong>{fb.playerName}</strong>
                <span className="cd-stars">{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</span>
              </div>
              <p>{fb.comment}</p>
              <small>{new Date(fb.createdAt).toLocaleDateString("vi-VN")}</small>
            </article>
          ))}
        </aside>
      </div>

      {hireOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="request-modal coach-modal glass-panel">
            <div className="coach-modal-head"><h2>Thuê {coach.displayName}</h2><button type="button" onClick={() => setHireOpen(false)}>×</button></div>
            <label>Thời gian<input type="datetime-local" value={hireForm.proposedStartAt} onChange={(e) => setHireForm({ ...hireForm, proposedStartAt: e.target.value })} /></label>
            <label>Thời lượng (phút)<input type="number" min="30" step="30" value={hireForm.durationMinutes} onChange={(e) => setHireForm({ ...hireForm, durationMinutes: Number(e.target.value) })} /></label>
            <label>Giá đề xuất (VND)<input type="number" min="0" value={hireForm.proposedPrice} onChange={(e) => setHireForm({ ...hireForm, proposedPrice: Number(e.target.value) })} /></label>
            <label>Lời nhắn<textarea value={hireForm.message} onChange={(e) => setHireForm({ ...hireForm, message: e.target.value })} /></label>
            <button className="fm-btn-neon" type="button" onClick={() => void submitHire()}>Gửi đề xuất</button>
          </div>
        </div>
      )}

      {reviewOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="request-modal coach-modal glass-panel">
            <div className="coach-modal-head"><h2>Đánh giá {coach.displayName}</h2><button type="button" onClick={() => setReviewOpen(false)}>×</button></div>
            <label>Số sao<select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}>{[5,4,3,2,1].map((r) => <option key={r} value={r}>{r} ★</option>)}</select></label>
            <label>Nhận xét<textarea value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} placeholder="Chia sẻ trải nghiệm coaching..." /></label>
            <button className="fm-btn-neon" type="button" onClick={() => void submitReview()}>Gửi đánh giá</button>
          </div>
        </div>
      )}
    </main>
  );
}
