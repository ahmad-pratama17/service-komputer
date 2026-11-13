import Link from "next/link";
import { ArrowRight, MessageSquareText } from "lucide-react";

const STATS = [
  { value: "500+", label: "Perangkat Ditangani" },
  { value: "10+", label: "Tahun Pengalaman" },
  { value: "4.9/5", label: "Rating Pelanggan" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-zinc-950 to-zinc-900 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.25),transparent_55%)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-200">
            Service Komputer & IT Profesional
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Solusi Perbaikan Komputer &amp; Layanan IT, Cepat dan Terjamin
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300">
            Diagnosa akurat, harga transparan, dan garansi di setiap pengerjaan.
            Pesan service, pantau progres perbaikan, dan konsultasi dengan AI
            Assistant langsung dari satu platform.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-6 text-base font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
            >
              Pesan Service
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link
              href="/dashboard/ai"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-zinc-500/50 bg-transparent px-6 text-base font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              <MessageSquareText className="h-5 w-5" aria-hidden />
              Konsultasi dengan AI
            </Link>
          </div>
        </div>

        <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 text-center sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="text-3xl font-bold text-white">{stat.value}</dt>
              <dd className="mt-1 text-sm text-zinc-400">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}