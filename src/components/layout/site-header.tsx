import Link from "next/link";
import { Wrench } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { getCurrentUser, homePathFor } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/logout-button";

const NAV_ITEMS = [
  { href: "/", label: "Beranda" },
  { href: "/services", label: "Layanan" },
  { href: "/#about", label: "Tentang" },
  { href: "/#contact", label: "Kontak" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
              <Wrench className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {APP_NAME}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <Link
                href={homePathFor(user.role)}
                className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 sm:inline-block"
              >
                Dasbor
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 sm:inline-block"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Pesan Service
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}