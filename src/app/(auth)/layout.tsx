import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="mb-6 text-center">
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {APP_NAME}
        </p>
        <p className="text-sm text-zinc-500">
          Computer &amp; IT Services
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}