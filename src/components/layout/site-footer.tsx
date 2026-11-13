import Link from "next/link";
import { Clock, Mail, MapPin, Phone, Wrench } from "lucide-react";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  CONTACT,
} from "@/lib/constants";

const NAV_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/services", label: "Layanan" },
  { href: "/#about", label: "Tentang" },
  { href: "/#contact", label: "Kontak" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
              <Wrench className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {APP_NAME}
            </span>
          </div>
          <p className="mt-3 text-sm text-zinc-500">{APP_TAGLINE}</p>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            {APP_DESCRIPTION}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
            Navigasi
          </h3>
          <ul className="space-y-2 text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
            Kontak
          </h3>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{CONTACT.address}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" aria-hidden />
              <a
                href={`tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`}
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {CONTACT.phone}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              <a
                href={`mailto:${CONTACT.email}`}
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {CONTACT.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{CONTACT.hours}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-200 py-6 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-zinc-500 sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Hak cipta dilindungi.
          </p>
          <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Masuk
          </Link>
        </div>
      </div>
    </footer>
  );
}