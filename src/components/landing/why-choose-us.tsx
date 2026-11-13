import { BadgeCheck, Eye, ShieldCheck, Zap } from "lucide-react";

const ITEMS = [
  {
    icon: BadgeCheck,
    title: "Teknisi Berpengalaman",
    description:
      "Ditangani teknisi bersertifikat dengan pengalaman menangani ratusan perangkat setiap tahunnya.",
  },
  {
    icon: Eye,
    title: "Transparan",
    description:
      "Diagnosa jelas, biaya disampaikan sebelum pengerjaan, tanpa biaya tersembunyi.",
  },
  {
    icon: Zap,
    title: "Cepat",
    description:
      "Proses booking mudah dan perbaikan dikerjakan secepat mungkin tanpa mengorbankan kualitas.",
  },
  {
    icon: ShieldCheck,
    title: "Bergaransi",
    description:
      "Setiap pengerjaan didukung garansi layanan untuk ketenangan Anda.",
  },
];

export function WhyChooseUs() {
  return (
    <section id="about" className="scroll-mt-16 bg-zinc-50 py-20 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Kenapa Memilih Kami?
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Kami menggabungkan keahlian teknis dan layanan pelanggan untuk
            pengalaman service yang nyaman.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <item.icon className="mb-4 h-8 w-8 text-blue-600" aria-hidden />
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">
                {item.title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}