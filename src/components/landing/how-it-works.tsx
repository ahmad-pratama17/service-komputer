import {
  ClipboardList,
  Hammer,
  PartyPopper,
  Search,
  ThumbsUp,
} from "lucide-react";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Buat Order",
    description: "Ajukan permintaan service dengan deskripsi masalah perangkat.",
  },
  {
    icon: Search,
    title: "Diagnosa",
    description: "Teknisi memeriksa perangkat dan menentukan penyebab kerusakan.",
  },
  {
    icon: ThumbsUp,
    title: "Persetujuan",
    description: "Anda menyetujui rencana perbaikan dan estimasi biaya.",
  },
  {
    icon: Hammer,
    title: "Pengerjaan",
    description: "Perbaikan dikerjakan dengan pantauan status secara online.",
  },
  {
    icon: PartyPopper,
    title: "Selesai",
    description: "Perangkat siap diambil, lengkap dengan garansi layanan.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-zinc-200 py-20 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Bagaimana Cara Kerjanya?
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Proses sederhana dari pengajuan hingga perangkat kembali ke tangan
            Anda.
          </p>
        </div>

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
                <step.icon className="h-6 w-6" aria-hidden />
              </span>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
                Langkah {index + 1}
              </p>
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-100">
                {step.title}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}