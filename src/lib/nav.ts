import { BookOpen, Clapperboard, Film, Flame, Mic, Music, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface StudioTab {
  href: string;
  labelAr: string;
  icon: LucideIcon;
}

export const STUDIO_TABS: StudioTab[] = [
  { href: "/project", labelAr: "المشاهد", icon: Clapperboard },
  { href: "/record", labelAr: "تسجيل المشاهد", icon: Mic },
  { href: "/hook", labelAr: "مقطع الشورتس", icon: Flame },
  { href: "/audio", labelAr: "الموسيقى والصوت", icon: Music },
  { href: "/video", labelAr: "فيديو MP4", icon: Film },
  { href: "/publish", labelAr: "النشر", icon: Upload },
  { href: "/guide", labelAr: "الدليل", icon: BookOpen },
];

