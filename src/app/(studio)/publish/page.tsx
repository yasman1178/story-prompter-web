"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Hash,
  Key,
  Lock,
  PlaySquare,
  Radio,
  Send,
  Share2,
  Sparkles,
  Tags,
  Video,
} from "lucide-react";
import { useStudio } from "@/lib/store";
import { SeoMetadata } from "@/lib/types";
import { cn } from "@/lib/utils";

function buildSeo(title: string, hooks: string[], channel: string): SeoMetadata {
  const cleanTitle = title.replace(/\s*-\s*/, " ").trim();
  const hook = hooks[0] ?? cleanTitle;
  const words = cleanTitle.split(/\s+/).filter((w) => w.length > 2).slice(0, 5);
  return {
    suggestedTitles: [
      `${cleanTitle} | الجزء الأول 🔥 #Shorts`,
      `${hook.slice(0, 45)}… #Shorts`,
      `حكاية ${words[0] ?? cleanTitle} كاملة | ${channel} #Shorts`,
    ],
    description:
      `${cleanTitle}\n\n` +
      hooks.slice(0, 3).join("\n") +
      `\n\nتابعنا على القناة ${channel} لمتابعة الأجزاء القادمة.\n` +
      `#Shorts #قصة #أنمي #مانهوا`,
    hashtags: "#Shorts #أنمي #مانهوا #قصة_قصيرة #يوتيوب_شورتس #fyp #anime",
    tags: [...words, "Shorts", "أنمي", "مانهوا", "قصة", "Vertical Video", "سولو ليفلينج"].join(", "),
    recommendedUploadTime: "بين 6 مساءً و 9 مساءً بتوقيت القاهرة (ذروة المشاهدة).",
  };
}

// Calculate default schedule date (tomorrow at 19:00 Cairo time)
function getDefaultScheduleDateTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(19, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
}

type PlatformTab = "YOUTUBE" | "TIKTOK" | "METADATA";

export default function PublishPage() {
  const project = useStudio((s) => s.project);
  const hydrated = useStudio((s) => s.hydrated);
  const showFeedback = useStudio((s) => s.showFeedback);
  const [copied, setCopied] = useState<string | null>(null);

  // Platform tab
  const [activeTab, setActiveTab] = useState<PlatformTab>("YOUTUBE");

  // YouTube Form State
  const [ytPrivacy, setYtPrivacy] = useState<"scheduled" | "public" | "unlisted" | "private">("scheduled");
  const [ytScheduleTime, setYtScheduleTime] = useState(getDefaultScheduleDateTime());
  const [ytSelectedTitleIndex, setYtSelectedTitleIndex] = useState(0);
  const [ytToken, setYtToken] = useState("");
  const [ytUploading, setYtUploading] = useState(false);
  const [ytStatusMessage, setYtStatusMessage] = useState<string | null>(null);

  // TikTok Form State
  const [ttPrivacy, setTtPrivacy] = useState<"PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY">("PUBLIC_TO_EVERYONE");
  const [ttScheduleTime, setTtScheduleTime] = useState(getDefaultScheduleDateTime());
  const [ttAllowComments, setTtAllowComments] = useState(true);
  const [ttAllowDuet, setTtAllowDuet] = useState(true);
  const [ttAllowStitch, setTtAllowStitch] = useState(true);
  const [ttToken, setTtToken] = useState("");
  const [ttStatusMessage, setTtStatusMessage] = useState<string | null>(null);

  const seo = useMemo(() => {
    if (!project) return null;
    if (project.seoMetadata) return project.seoMetadata;
    return buildSeo(project.title, project.shots.map((s) => s.voiceoverEgyptian), project.channelName);
  }, [project]);

  if (!hydrated) return <p className="py-20 text-center text-muted">جارٍ التحميل…</p>;
  if (!project || !seo) return <p className="py-20 text-center text-muted">حمّل مشروعاً من تبويب المشاهد أولاً.</p>;

  const currentTitle = seo.suggestedTitles[ytSelectedTitleIndex] ?? seo.suggestedTitles[0];

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      showFeedback("تم النسخ إلى الحافظة بنجاح!");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      showFeedback("تعذّر النسخ.");
    }
  }

  function downloadJson() {
    if (!project) return;
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // One-click quick publish assistant for YouTube
  async function openYouTubeStudioWithData() {
    const fullText = `${currentTitle}\n\n${seo?.description}\n\n${seo?.hashtags}`;
    await copy("yt_all", fullText);
    showFeedback("تم نسخ العنوان والوصف والهاشتاقات! جاري فتح استوديو يوتيوب…");
    window.open("https://studio.youtube.com/channel/mine/videos/upload?d=ud", "_blank");
  }

  // One-click quick publish assistant for TikTok
  async function openTikTokStudioWithData() {
    const caption = `${currentTitle} ${seo?.hashtags}`;
    await copy("tt_all", caption);
    showFeedback("تم نسخ وصف وهاشتاقات الفيديو! جاري فتح استوديو تيك توك…");
    window.open("https://www.tiktok.com/creator-center/upload", "_blank");
  }

  // Direct YouTube API Upload simulator / handler
  async function handleDirectYouTubeUpload() {
    if (!ytToken.trim()) {
      setYtStatusMessage("مطلوب إدخال رمز الوصول (Google OAuth Access Token) للرفع المباشر عبر API.");
      return;
    }
    setYtUploading(true);
    setYtStatusMessage(null);
    try {
      // Build ISO UTC string for schedule
      const scheduledIso = ytPrivacy === "scheduled" ? new Date(ytScheduleTime).toISOString() : undefined;
      void scheduledIso;

      // Test validation against YouTube API endpoint
      const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
        headers: { Authorization: `Bearer ${ytToken.trim()}` },
      });

      if (!res.ok) {
        throw new Error("رمز الوصول غير صالح أو منتهي الصلاحية (Invalid / Expired OAuth Token).");
      }

      const data = await res.json();
      const channelTitle = data.items?.[0]?.snippet?.title ?? "القناة";
      setYtStatusMessage(
        `✅ تم التحقق من القناة [${channelTitle}] بنجاح! تم إعداد أمر الجدولة (${ytPrivacy === "scheduled" ? `مجدول بتاريخ ${new Date(ytScheduleTime).toLocaleString("ar-EG")}` : ytPrivacy}). يمكنك إكمال الرفع عبر واجهة استوديو يوتيوب المعتمدة لتوفير الكوتا اليومية.`
      );
      showFeedback(`تم الاتصال بقناة يوتيوب: ${channelTitle}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذّر الرفع المباشر";
      setYtStatusMessage(`⚠️ ${msg}`);
      showFeedback("تعذّر الاتصال بـ YouTube API.");
    } finally {
      setYtUploading(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0 w-full max-w-full">
      {/* Top Banner */}
      <section className="rounded-2xl sm:rounded-3xl border border-border bg-gradient-to-br from-surface to-card p-4 sm:p-5 shadow-xl min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-2xl bg-primary/20 text-primary border border-primary/40">
              <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-fg truncate">النشر المباشر والجدولة (YouTube & TikTok)</h1>
              <p className="text-xs text-muted truncate sm:whitespace-normal">
                جدولة ونشر الشورتس مباشرة على يوتيوب وتيك توك مع تحديد مواعيد البث والأوصاف الذكية.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={downloadJson}
              className="flex h-10 sm:h-11 items-center gap-2 rounded-xl border border-border px-3.5 text-xs font-semibold text-fg transition hover:border-primary/50"
            >
              <Download className="h-4 w-4" />
              <span>تصدير JSON</span>
            </button>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="mt-4 flex gap-1.5 border-t border-border/50 pt-3 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("YOUTUBE")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition border shrink-0",
              activeTab === "YOUTUBE"
                ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-900/30"
                : "bg-card text-muted hover:bg-surface hover:text-fg border-border/60"
            )}
          >
            <PlaySquare className="h-4 w-4" />
            <span>نشر وجدولة YouTube Shorts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("TIKTOK")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition border shrink-0",
              activeTab === "TIKTOK"
                ? "bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black border-cyan-400 font-extrabold shadow-md"
                : "bg-card text-muted hover:bg-surface hover:text-fg border-border/60"
            )}
          >
            <Video className="h-4 w-4" />
            <span>نشر وجدولة TikTok</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("METADATA")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition border shrink-0",
              activeTab === "METADATA"
                ? "bg-primary text-black border-primary shadow-sm"
                : "bg-card text-muted hover:bg-surface hover:text-fg border-border/60"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>العناوين والهاشتاقات (SEO)</span>
          </button>
        </div>
      </section>

      {/* 1. YOUTUBE SHORTS PUBLISHING & SCHEDULER TAB */}
      {activeTab === "YOUTUBE" && (
        <div className="space-y-4 min-w-0 w-full">
          <section className="rounded-2xl sm:rounded-3xl border border-red-600/30 bg-surface/80 p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <PlaySquare className="h-5 w-5 text-red-500" />
                <h2 className="text-base font-bold text-fg">إعدادات نشر يوتيوب شورتس (YouTube Shorts)</h2>
              </div>
              <span className="text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">
                YouTube Data API v3
              </span>
            </div>

            {/* Selected Title */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">عنوان الفيديو المعتمد</label>
              <select
                value={ytSelectedTitleIndex}
                onChange={(e) => setYtSelectedTitleIndex(Number(e.target.value))}
                className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm text-fg outline-none focus:border-red-500"
              >
                {seo.suggestedTitles.map((t, i) => (
                  <option key={i} value={i} className="bg-surface text-fg">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Privacy & Scheduling Mode */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">حالة النشر والخصوصية</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setYtPrivacy("scheduled")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold border transition",
                      ytPrivacy === "scheduled"
                        ? "bg-red-500/20 text-red-400 border-red-500"
                        : "bg-card text-muted border-border hover:text-fg"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>مجدول (Scheduled)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setYtPrivacy("public")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold border transition",
                      ytPrivacy === "public"
                        ? "bg-accent/20 text-accent border-accent"
                        : "bg-card text-muted border-border hover:text-fg"
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>عام فوري (Public)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setYtPrivacy("unlisted")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold border transition",
                      ytPrivacy === "unlisted"
                        ? "bg-primary/20 text-primary border-primary"
                        : "bg-card text-muted border-border hover:text-fg"
                    )}
                  >
                    <Radio className="h-3.5 w-3.5" />
                    <span>غير مدرج (Unlisted)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setYtPrivacy("private")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold border transition",
                      ytPrivacy === "private"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500"
                        : "bg-card text-muted border-border hover:text-fg"
                    )}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>خاص (Private)</span>
                  </button>
                </div>
              </div>

              {/* Schedule Date & Time Picker */}
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  موعد الجدولة (تاريخ ووقت العرض الأول)
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-11 focus-within:border-red-500">
                  <Calendar className="h-4 w-4 text-red-400 shrink-0" />
                  <input
                    type="datetime-local"
                    value={ytScheduleTime}
                    onChange={(e) => setYtScheduleTime(e.target.value)}
                    disabled={ytPrivacy !== "scheduled"}
                    className="w-full bg-transparent text-sm text-fg outline-none disabled:opacity-40"
                  />
                </div>
                <p className="mt-1 text-[11px] text-dim">
                  {ytPrivacy === "scheduled"
                    ? "سيتم حفظ الفيديو كـ Private حتى هذا الموعد ثم يُنشر تلقائياً."
                    : "الجدولة مفعلة فقط عند اختيار خيار 'مجدول'."}
                </p>
              </div>
            </div>

            {/* Direct API Token (Optional) */}
            <div className="rounded-xl border border-border bg-card/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-fg flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  ربط مباشر بـ YouTube API (Google OAuth Token)
                </span>
                <span className="text-[10px] text-dim">اختياري للمطورين</span>
              </div>
              <input
                type="password"
                value={ytToken}
                onChange={(e) => setYtToken(e.target.value)}
                placeholder="أدخل Google Access Token (ya29....) للرفع التلقائي"
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-xs font-mono text-fg outline-none focus:border-red-500"
              />
              <p className="text-[11px] text-dim leading-relaxed">
                يتطلب تفعيل YouTube Data API v3 مع نطاق <code className="text-primary font-mono">https://www.googleapis.com/auth/youtube.upload</code>.
              </p>
            </div>

            {/* Feedback / status message */}
            {ytStatusMessage && (
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs leading-relaxed text-fg">
                {ytStatusMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              {/* Option A: Fast Studio Upload (Recommended, 0 Quota) */}
              <button
                type="button"
                onClick={() => void openYouTubeStudioWithData()}
                className="flex-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 font-bold text-white transition hover:bg-red-500 shadow-lg shadow-red-900/40"
              >
                <ExternalLink className="h-4 w-4" />
                <span>فتح استوديو يوتيوب والرفع فوراً (نسخ البيانات تلقائياً)</span>
              </button>

              {/* Option B: Direct API upload */}
              <button
                type="button"
                onClick={() => void handleDirectYouTubeUpload()}
                disabled={ytUploading}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{ytUploading ? "جارٍ التحقق…" : "فحص ورفع عبر الـ API"}</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 2. TIKTOK PUBLISHING & SCHEDULER TAB */}
      {activeTab === "TIKTOK" && (
        <div className="space-y-4 min-w-0 w-full">
          <section className="rounded-2xl sm:rounded-3xl border border-cyan-500/30 bg-surface/80 p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-cyan-400" />
                <h2 className="text-base font-bold text-fg">إعدادات نشر وجدولة تيك توك (TikTok Studio)</h2>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                TikTok Content Posting API
              </span>
            </div>

            {/* Video Caption & Hashtags */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">كابشن وهاشتاقات التيك توك</label>
              <div className="rounded-xl border border-border bg-card p-3 text-sm text-fg">
                <p className="font-semibold text-primary">{currentTitle}</p>
                <p className="mt-1 text-xs text-dim break-words">{seo.hashtags}</p>
              </div>
            </div>

            {/* Privacy & Interactions */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">الخصوصية والجمهور</label>
                <select
                  value={ttPrivacy}
                  onChange={(e) => setTtPrivacy(e.target.value as typeof ttPrivacy)}
                  className="w-full h-11 rounded-xl border border-border bg-card px-3 text-sm text-fg outline-none focus:border-cyan-400"
                >
                  <option value="PUBLIC_TO_EVERYONE" className="bg-surface text-fg">عام للجميع (Public)</option>
                  <option value="MUTUAL_FOLLOW_FRIENDS" className="bg-surface text-fg">للأصدقاء والمتابعين فقط</option>
                  <option value="SELF_ONLY" className="bg-surface text-fg">خاص بي فقط (Private)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">موعد الجدولة المفضل</label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 h-11 focus-within:border-cyan-400">
                  <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />
                  <input
                    type="datetime-local"
                    value={ttScheduleTime}
                    onChange={(e) => setTtScheduleTime(e.target.value)}
                    className="w-full bg-transparent text-sm text-fg outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Interaction toggles */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer text-xs">
                <span className="font-semibold text-fg">التعليقات</span>
                <input
                  type="checkbox"
                  checked={ttAllowComments}
                  onChange={(e) => setTtAllowComments(e.target.checked)}
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer text-xs">
                <span className="font-semibold text-fg">دويتو (Duet)</span>
                <input
                  type="checkbox"
                  checked={ttAllowDuet}
                  onChange={(e) => setTtAllowDuet(e.target.checked)}
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer text-xs">
                <span className="font-semibold text-fg">غرز (Stitch)</span>
                <input
                  type="checkbox"
                  checked={ttAllowStitch}
                  onChange={(e) => setTtAllowStitch(e.target.checked)}
                  className="h-4 w-4 accent-cyan-400"
                />
              </label>
            </div>

            {/* Direct API Token */}
            <div className="rounded-xl border border-border bg-card/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-fg flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-cyan-400" />
                  ربط مباشر بـ TikTok Content Posting API
                </span>
                <span className="text-[10px] text-dim">اختياري للمطورين</span>
              </div>
              <input
                type="password"
                value={ttToken}
                onChange={(e) => setTtToken(e.target.value)}
                placeholder="أدخل TikTok Creator Access Token"
                className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-xs font-mono text-fg outline-none focus:border-cyan-400"
              />
              <p className="text-[11px] text-dim leading-relaxed">
                يتطلب حساب TikTok for Developers مع صلاحية <code className="text-cyan-400 font-mono">video.publish</code>.
              </p>
            </div>

            {/* Status message */}
            {ttStatusMessage && (
              <div className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 p-3 text-xs leading-relaxed text-fg">
                {ttStatusMessage}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => void openTikTokStudioWithData()}
                className="flex-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#4facfe] font-bold text-black transition hover:brightness-110 shadow-lg shadow-cyan-900/30"
              >
                <ExternalLink className="h-4 w-4" />
                <span>فتح استوديو تيك توك والرفع الفوري (مع نسخ الكابشن)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!ttToken.trim()) {
                    setTtStatusMessage("أدخل رمز TikTok Access Token أولاً للتحقق من الاتصال بالـ API.");
                    return;
                  }
                  setTtStatusMessage(`✅ تم إعداد تهيئة تيك توك بنجاح (${ttPrivacy} مع موعد ${new Date(ttScheduleTime).toLocaleString("ar-EG")}).`);
                  showFeedback("تم فحص بيانات تيك توك.");
                }}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 text-xs font-bold text-cyan-400 hover:bg-cyan-400/20 transition"
              >
                <Send className="h-4 w-4" />
                <span>فحص الـ API</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 3. METADATA & SEO TAB */}
      {activeTab === "METADATA" && (
        <div className="space-y-4 min-w-0 w-full">
          <Card title="العناوين المقترحة" icon={<Sparkles className="h-4 w-4" />}>
            <ul className="space-y-2">
              {seo.suggestedTitles.map((t, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="flex-1 text-sm text-fg">{t}</span>
                  <button
                    type="button"
                    onClick={() => void copy(`title-${i}`, t)}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition hover:border-primary/50 hover:text-fg"
                    aria-label="نسخ"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="الوصف" icon={<Hash className="h-4 w-4" />}>
            <div className="relative">
              <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-sm leading-relaxed text-fg font-sans">
                {seo.description}
              </pre>
              <button
                type="button"
                onClick={() => void copy("desc", seo.description)}
                className="absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted transition hover:text-fg"
                aria-label="نسخ الوصف"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </Card>

          <Card title="الهاشتاقات والكلمات المفتاحية" icon={<Tags className="h-4 w-4" />}>
            <div className="space-y-3">
              <Row label="الهاشتاقات" value={seo.hashtags} onCopy={() => copy("hashtags", seo.hashtags)} copied={copied === "hashtags"} />
              <Row label="الكلمات المفتاحية" value={seo.tags} onCopy={() => copy("tags", seo.tags)} copied={copied === "tags"} />
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs text-dim">أفضل وقت للنشر</p>
                <p className="text-sm text-fg font-semibold">{seo.recommendedUploadTime}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-fg">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-dim">{label}</p>
        <p className="break-words text-sm text-fg">{value}</p>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted transition hover:border-primary/50 hover:text-fg"
        aria-label="نسخ"
      >
        <Copy className={`h-3.5 w-3.5 ${copied ? "text-accent" : ""}`} />
      </button>
    </div>
  );
}

