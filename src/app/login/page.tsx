import { LoginForm } from "./login-form";

export default async function LoginPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const raw = searchParams.next;
  const nextPath = typeof raw === "string" && raw.startsWith("/") ? raw : "/project";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/10 blur-[120px]"
      />
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
