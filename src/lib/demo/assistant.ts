import { formatCurrency } from "@/lib/utils";

/**
 * Penjawab AI mode demo: aturan kata kunci di atas katalog demo.
 *
 * Ini BUKAN model bahasa — tidak ada pemanggilan API, tidak ada key, dan
 * jawabannya deterministik. Untuk pengujian alur chat (kirim, riwayat,
 * hapus, rate limit UI) perilakunya sama seperti AI asli; untuk kualitas
 * jawaban, tetap butuh OpenAI/NVIDIA.
 */

export type AssistantServiceInfo = {
  name: string;
  description: string | null;
  category: string;
  startingPrice: number;
  estimatedDuration: number;
};

type Rule = {
  test: RegExp;
  reply: (services: AssistantServiceInfo[]) => string;
};

function serviceLine(service: AssistantServiceInfo): string {
  return `- ${service.name} (mulai ${formatCurrency(service.startingPrice)}, ±${service.estimatedDuration} jam)`;
}

function catalogBlock(services: AssistantServiceInfo[]): string {
  return services.slice(0, 7).map(serviceLine).join("\n");
}

const RULES: Rule[] = [
  {
    test: /lambat|lemot|lelet|freeze|hang|restart|blue\s?screen|bsod|mati total|tidak (bisa |dapat )?menyala|tidak hidup/i,
    reply: (services) => {
      const recovery = services.find((service) =>
        service.name.toLowerCase().includes("data"),
      );
      return [
        "Gejala seperti itu paling sering berasal dari tiga hal: penyimpanan yang mulai lambat, sistem operasi yang corrupt, atau overheat.",
        "",
        "Yang bisa Anda cek sendiri dulu:",
        "1. Dengarkan apakah kipas berputar kencang atau perangkat panas berlebih.",
        "2. Coba masuk Safe Mode — kalau lancar di Safe Mode, kemungkinan besar masalah software.",
        recovery
          ? `3. Kalau ada file penting yang belum di-backup, amankan dulu. Kami punya layanan ${recovery.name} mulai ${formatCurrency(recovery.startingPrice)}.`
          : "3. Kalau ada file penting yang belum di-backup, amankan dulu.",
        "",
        "Kalau butuh pemeriksaan teknisi, buat service order dan ceritakan gejalanya di sana. Ini gambaran umum, bukan diagnosis pasti.",
      ].join("\n");
    },
  },
  {
    test: /internet|wifi|wi-fi|jaringan|network|koneksi|router|putus|sinyal/i,
    reply: (services) => {
      const network = services.filter((service) =>
        service.name.toLowerCase().includes("jaringan"),
      );
      return [
        "Koneksi putus-nyambung biasanya berasal dari posisi router, interferensi kanal WiFi, atau router yang sudah kepanasan.",
        "",
        "Yang bisa Anda coba:",
        "1. Restart router dan tunggu 2 menit sampai lampu stabil.",
        "2. Dekatkan satu perangkat ke router untuk memastikan masalahnya di sinyal atau di perangkat.",
        "3. Kalau hanya terjadi di jam tertentu, kemungkinan interferensi dari tetangga — ganti kanal WiFi di pengaturan router.",
        network.length > 0
          ? `\nLayanan yang cocok:\n${network.map(serviceLine).join("\n")}`
          : "",
        "",
        "Kalau tetap bermasalah setelah itu, buat service order agar teknisi memeriksa langsung. Ini gambaran umum, bukan diagnosis pasti.",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  {
    test: /keyboard|tuts|tombol|layar|screen|monitor|baterai|batre|charger|cas|suara|speaker|kamera|webcam/i,
    reply: () => [
      "Untuk kerusakan komponen seperti itu, langkah amannya: catat persis bagian mana yang bermasalah dan sejak kapan, lalu jangan bongkar sendiri kalau perangkat masih garansi.",
      "",
      "Saat membuat service order, tulis merek, model, dan gejala sedetail mungkin — semakin detail, semakin cepat teknisi mendiagnosa. Foto bagian yang rusak juga sangat membantu.",
      "",
      "Ini gambaran umum, bukan diagnosis pasti.",
    ].join("\n"),
  },
  {
    test: /hard\s?disk|hdd|ssd|data|recovery|hilang|terhapus|tidak terbaca|bad sector/i,
    reply: (services) => {
      const recovery = services.find((service) =>
        service.name.toLowerCase().includes("data"),
      );
      return [
        "Kalau penyimpanan tidak terbaca, hal terpenting: segera berhenti memakai perangkat itu. Setiap tulis baru berisiko menimpa data yang masih bisa diselamatkan.",
        "",
        "Jangan jalankan format, partisi ulang, atau software recovery abal-abal sebelum berkonsultasi.",
        recovery
          ? `\nKami punya layanan ${recovery.name} mulai ${formatCurrency(recovery.startingPrice)} dengan estimasi ±${recovery.estimatedDuration} jam. Buat service order dan pilih layanan itu.`
          : "",
        "",
        "Ini gambaran umum, bukan diagnosis pasti.",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  {
    test: /biaya|harga|berapa|tarif|bayar|mahal|murah|estimasi|ongkos/i,
    reply: (services) => [
      "Berikut harga mulai layanan kami:",
      "",
      catalogBlock(services),
      "",
      "Harga final ditentukan setelah diagnosa teknisi dan selalu menunggu persetujuan Anda dulu — tidak ada pengerjaan tanpa Anda setuju.",
    ].join("\n"),
  },
  {
    test: /layanan|service|jasa|bisa apa|katalog|daftar/i,
    reply: (services) => [
      "Kami melayani:",
      "",
      catalogBlock(services),
      "",
      "Ceritakan masalah perangkat Anda, nanti saya arahkan ke layanan yang paling cocok. Atau langsung buat service order kalau sudah yakin.",
    ].join("\n"),
  },
  {
    test: /halo|hai|hei|pagi|siang|sore|malam|assalamu|makasih|terima kasih|thanks|oke|ok\b/i,
    reply: () =>
      "Halo! Saya asisten demo ServiceKomputer. Ceritakan masalah perangkat Anda — misalnya laptop lambat, WiFi putus, atau tanya harga layanan — nanti saya bantu mengarahkan. Kalau sudah yakin, Anda juga bisa langsung buat service order dari dashboard.",
  },
];

/** Jawaban demo untuk satu pesan user. Deterministik, tanpa API. */
export function demoAssistantReply(
  message: string,
  services: AssistantServiceInfo[],
): string {
  const text = message.trim();
  for (const rule of RULES) {
    if (rule.test.test(text)) {
      return rule.reply(services);
    }
  }

  return [
    "Terima kasih atas pesannya. Supaya saya bisa mengarahkan dengan tepat, ceritakan sedikit lagi: perangkat apa (laptop/PC/router), dan gejalanya seperti apa?",
    "",
    "Atau kalau mau langsung ditangani teknisi, buat service order dari dashboard dan tulis gejalanya di sana — foto masalahnya juga boleh dilampirkan.",
    "",
    "Catatan: saya asisten demo lokal, jadi jawaban saya mengikuti aturan sederhana. Ini gambaran umum, bukan diagnosis pasti.",
  ].join("\n");
}
