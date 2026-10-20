import { BookOpen, Clapperboard, Film, Flame, Mic, Music, Sparkles, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface StudioTab {
  href: string;
  labelAr: string;
  icon: LucideIcon;
}

export const STUDIO_TABS: StudioTab[] = [
  { href: "/project", labelAr: "المشاهد", icon: Clapperboard },
  { href: "/hook", labelAr: "فيديو الخطاف", icon: Flame },
  { href: "/record", labelAr: "التسجيل", icon: Mic },
  { href: "/audio", labelAr: "الصوت والموسيقى", icon: Music },
  { href: "/sfx", labelAr: "مكتبة المؤثرات", icon: Sparkles },
  { href: "/video", labelAr: "فيديو MP4", icon: Film },
  { href: "/publish", labelAr: "النشر", icon: Upload },
  { href: "/guide", labelAr: "الدليل", icon: BookOpen },
];
