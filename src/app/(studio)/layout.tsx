import { AppShell } from "@/components/app-shell";
import { FeedbackToast } from "@/components/feedback-toast";
import { StudioProvider } from "@/components/studio-provider";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudioProvider>
      <AppShell>{children}</AppShell>
      <FeedbackToast />
    </StudioProvider>
  );
}
