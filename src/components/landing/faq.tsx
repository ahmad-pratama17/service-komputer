const FAQS = [
  {
    question: "Berapa lama proses perbaikan biasanya berlangsung?",
    answer:
      "Lama pengerjaan bervariasi tergantung kerusakan. Perbaikan ringan umumnya selesai dalam 1–3 hari kerja, sedangkan kerusakan yang membutuhkan penggantian komponen bisa lebih lama. Estimasi waktu akan disampaikan setelah proses diagnosa.",
  },
  {
    question: "Apakah ada garansi untuk pengerjaan?",
    answer:
      "Ya. Setiap pengerjaan didukung garansi layanan. Jaminan ini mencakup hasil perbaikan sesuai ketentuan yang berlaku dan akan dijelaskan sebelum pengerjaan dimulai.",
  },
  {
    question: "Bagaimana cara memantau status perbaikan perangkat saya?",
    answer:
      "Setelah membuat pesanan, Anda bisa memantau status perbaikan secara real-time melalui akun Anda. Setiap perubahan status juga akan dikirimkan sebagai notifikasi.",
  },
  {
    question: "Apakah data saya aman selama proses perbaikan?",
    answer:
      "Keamanan data menjadi prioritas kami. Data yang ada di perangkat Anda hanya diakses untuk keperluan diagnosa dan perbaikan, serta tidak akan disebarluaskan ke pihak mana pun.",
  },
  {
    question: "Apakah bisa melakukan konsultasi sebelum servis?",
    answer:
      "Bisa. Anda dapat berkonsultasi terlebih dahulu melalui AI Assistant untuk mendapatkan gambaran masalah dan estimasi sebelum memutuskan untuk melakukan service.",
  },
  {
    question: "Bagaimana cara pembayaran dilakukan?",
    answer:
      "Pembayaran dilakukan setelah perangkat selesai diperbaiki dan diverifikasi, sesuai tagihan (invoice) yang diterbitkan. Detail pembayaran akan diinformasikan bersama invoice Anda.",
  },
];

export function Faq() {
  return (
    <section className="bg-zinc-50 py-20 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Temukan jawaban atas pertanyaan umum seputar layanan kami.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-zinc-900 dark:text-zinc-100">
                {faq.question}
                <span className="text-zinc-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}