"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCoachProfile, createCoachingRequest, getCoaches, getCoachingRequests, updateCoachingRequest } from "lib/api";
import type { Coach, CoachingRequest } from "lib/types";

const initialDate = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);

export default function CoachesPage() {
  const router = useRouter();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [requests, setRequests] = useState<CoachingRequest[]>([]);
  const [target, setTarget] = useState<Coach | null>(null);
  const [counterTarget, setCounterTarget] = useState<CoachingRequest | null>(null);
  const [coachFormOpen, setCoachFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [requestForm, setRequestForm] = useState({ proposedStartAt: initialDate(), durationMinutes: 60, proposedPrice: 150000, message: "Mình muốn được coach để cải thiện kỹ năng và rank." });
  const [coachForm, setCoachForm] = useState({ game: "VALORANT", specialties: "Aim, VOD review", hourlyRate: 200000, bio: "Coach cho người chơi muốn luyện tập có mục tiêu.", availability: "Tối T3, T5, T7" });

  const refresh = async () => {
    try {
      const [nextCoaches, nextRequests] = await Promise.all([getCoaches(), getCoachingRequests()]);
      setCoaches(nextCoaches);
      setRequests(nextRequests);
    } catch { setNotice("Không tải được marketplace. Hãy kiểm tra API và đăng nhập."); }
  };

  useEffect(() => { void refresh(); }, []);

  const submitHire = async () => {
    if (!target) return;
    try {
      await createCoachingRequest({ coachId: target.id, ...requestForm, proposedPrice: Number(requestForm.proposedPrice), durationMinutes: Number(requestForm.durationMinutes) });
      setTarget(null); setNotice("Đã gửi đề xuất thuê coach. Coach có thể xác nhận hoặc gửi mức lịch/giá khác."); await refresh();
    } catch { setNotice("Chưa gửi được đề xuất. Kiểm tra lại thông tin và API."); }
  };

  const submitCoachProfile = async () => {
    try {
      await createCoachProfile({ game: coachForm.game, specialties: coachForm.specialties.split(",").map((item) => item.trim()).filter(Boolean), hourlyRate: Number(coachForm.hourlyRate), bio: coachForm.bio, availability: coachForm.availability.split(",").map((item) => item.trim()).filter(Boolean) });
      setCoachFormOpen(false); setNotice("Hồ sơ coach đã được công khai trên marketplace."); await refresh();
    } catch { setNotice("Chưa lưu được hồ sơ coach."); }
  };

  const settle = async (request: CoachingRequest, action: "agree" | "counter" | "cancel") => {
    try {
      await updateCoachingRequest(request.id, action, action === "counter" ? { ...requestForm, durationMinutes: Number(requestForm.durationMinutes), proposedPrice: Number(requestForm.proposedPrice) } : undefined);
      setCounterTarget(null); setNotice(action === "agree" ? "Đã chốt lịch và giá coaching." : action === "counter" ? "Đã gửi đề xuất lịch/giá mới." : "Đã hủy yêu cầu thuê coach."); await refresh();
    } catch { setNotice("Thao tác chưa hoàn tất. Đề xuất hiện tại có thể cần bên còn lại xác nhận."); }
  };

  return <main className="coach-shell">
    <section className="coach-hero">
      <div><p className="coach-kicker">SKILL MARKETPLACE</p><h1>Thuê coach, nâng trình có lộ trình.</h1><p>Kết nối người chơi kỹ năng cao với người cần luyện tập. Hai bên chốt lịch và giá ngay trên từng request.</p></div>
      <button className="fm-btn-neon" type="button" onClick={() => setCoachFormOpen(true)}>🎓 Đăng ký làm coach</button>
    </section>
    {notice && <p className="coach-notice">{notice}</p>}
    <section><div className="coach-section-head"><h2>Coach đang nhận lịch</h2><span>{coaches.length} coach</span></div><div className="coach-grid">
      {coaches.map((coach) => <article className="coach-card" key={coach.id}><div className="coach-avatar">{coach.displayName[0]}</div><div className="coach-card-top"><div><h3>{coach.displayName} <small>✓</small></h3><p>{coach.game} · {coach.rank}</p></div><strong>{coach.hourlyRate.toLocaleString("vi-VN")}đ<small>/giờ</small></strong></div><p className="coach-bio">{coach.bio}</p><div className="coach-tags">{coach.specialties.map((item) => <span key={item}>{item}</span>)}</div><p className="coach-time">🕒 {coach.availability.join(" · ")}</p><div className="coach-card-btns"><button className="fm-btn-outline" type="button" onClick={() => router.push(`/coaches/${coach.id}`)}>Chi tiết</button><button className="fm-btn-neon" type="button" onClick={() => { setTarget(coach); setRequestForm((form) => ({ ...form, proposedPrice: coach.hourlyRate })); }}>Gửi request thuê</button></div></article>)}
      {coaches.length === 0 && <p className="coach-empty">Chưa có coach nào. Hãy là người đầu tiên mở hồ sơ coach.</p>}
    </div></section>
    <section className="coach-requests"><div className="coach-section-head"><h2>Yêu cầu coaching của bạn</h2><span>{requests.length} request</span></div>{requests.map((request) => <article className="coach-request" key={request.id}><div><p className={`coach-status ${request.status}`}>{request.status === "agreed" ? "Đã chốt" : request.status === "countered" ? "Có đề xuất mới" : request.status === "cancelled" ? "Đã hủy" : "Đang chờ"}</p><h3>{request.coachName} <small>với {request.playerName}</small></h3><p>{new Date(request.proposedStartAt).toLocaleString("vi-VN")} · {request.durationMinutes} phút · <strong>{request.proposedPrice.toLocaleString("vi-VN")}đ</strong></p><blockquote>“{request.message}”</blockquote></div><div className="coach-request-actions">{(request.status === "pending" || request.status === "countered") && <><button className="fm-btn-neon" type="button" onClick={() => void settle(request, "agree")}>Xác nhận chốt</button><button className="fm-btn-outline" type="button" onClick={() => { setRequestForm({ proposedStartAt: request.proposedStartAt.slice(0, 16), durationMinutes: request.durationMinutes, proposedPrice: request.proposedPrice, message: request.message }); setCounterTarget(request); }}>Đề xuất lại</button><button className="coach-cancel" type="button" onClick={() => void settle(request, "cancel")}>Hủy</button></>}</div></article>)}{requests.length === 0 && <p className="coach-empty">Chưa có request. Chọn một coach để bắt đầu.</p>}</section>
    {target && <Modal title={`Thuê ${target.displayName}`} onClose={() => setTarget(null)}><RequestFields form={requestForm} setForm={setRequestForm} /><button className="fm-btn-neon" type="button" onClick={() => void submitHire()}>Gửi đề xuất</button></Modal>}
    {counterTarget && <Modal title={`Đề xuất lại với ${counterTarget.coachName}`} onClose={() => setCounterTarget(null)}><RequestFields form={requestForm} setForm={setRequestForm} /><button className="fm-btn-neon" type="button" onClick={() => void settle(counterTarget, "counter")}>Gửi đề xuất mới</button></Modal>}
    {coachFormOpen && <Modal title="Đăng ký làm coach" onClose={() => setCoachFormOpen(false)}><label>Game<select value={coachForm.game} onChange={(e) => setCoachForm({ ...coachForm, game: e.target.value })}><option value="VALORANT">Valorant</option><option value="LEAGUE_OF_LEGENDS">League of Legends</option></select></label><label>Chuyên môn<input value={coachForm.specialties} onChange={(e) => setCoachForm({ ...coachForm, specialties: e.target.value })} /></label><label>Giá mỗi giờ<input type="number" value={coachForm.hourlyRate} onChange={(e) => setCoachForm({ ...coachForm, hourlyRate: Number(e.target.value) })} /></label><label>Giới thiệu<textarea value={coachForm.bio} onChange={(e) => setCoachForm({ ...coachForm, bio: e.target.value })} /></label><label>Khung giờ nhận lịch<input value={coachForm.availability} onChange={(e) => setCoachForm({ ...coachForm, availability: e.target.value })} /></label><button className="fm-btn-neon" type="button" onClick={() => void submitCoachProfile()}>Công khai hồ sơ</button></Modal>}
  </main>;
}

function RequestFields({ form, setForm }: { form: { proposedStartAt: string; durationMinutes: number; proposedPrice: number; message: string }; setForm: (form: any) => void }) { return <><label>Thời gian<input type="datetime-local" value={form.proposedStartAt} onChange={(e) => setForm({ ...form, proposedStartAt: e.target.value })} /></label><label>Thời lượng (phút)<input type="number" min="30" step="30" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></label><label>Giá đề xuất (VND)<input type="number" min="0" value={form.proposedPrice} onChange={(e) => setForm({ ...form, proposedPrice: Number(e.target.value) })} /></label><label>Lời nhắn<textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label></>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="request-modal coach-modal glass-panel"><div className="coach-modal-head"><h2>{title}</h2><button type="button" onClick={onClose}>×</button></div>{children}</div></div>; }
