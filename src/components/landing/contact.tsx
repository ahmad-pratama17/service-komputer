import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { CONTACT } from "@/lib/constants";

const ITEMS = [
  {
    icon: Phone,
    label: "Telepon",
    value: CONTACT.phone,
    href: `tel:${CONTACT.phone.replace(/[^+\d]/g, "")}`,
  },
  {
    icon: Mail,
    label: "Email",
    value: CONTACT.email,
    href: `mailto:${CONTACT.email}`,
  },
  {
    icon: MapPin,
    label: "Alamat",
    value: CONTACT.address,
  },
  {
    icon: Clock,
    label: "Jam Operasional",
    value: CONTACT.hours,
  },
];

export function Contact() {
  return (
    <section id="contact" className="scroll-mt-16 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Hubungi Kami
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Ada pertanyaan atau butuh bantuan? Tim kami siap membantu Anda.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <item.icon className="mb-4 h-8 w-8 text-blue-600" aria-hidden />
              <p className="mb-1 text-sm text-zinc-500">{item.label}</p>
              {item.href ? (
                <a
                  href={item.href}
                  className="font-medium text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
                >
                  {item.value}
                </a>
              ) : (
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {item.value}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href={`https://wa.me/${CONTACT.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-green-600 px-6 text-base font-medium text-white transition-colors hover:bg-green-700"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            Chat via WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}