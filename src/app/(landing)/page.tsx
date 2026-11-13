import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { ServiceCatalog } from "@/components/landing/service-catalog";
import { WhyChooseUs } from "@/components/landing/why-choose-us";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Faq } from "@/components/landing/faq";
import { Contact } from "@/components/landing/contact";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Service Komputer & IT Profesional",
};

export default function HomePage() {
  return (
    <>
      <Hero />

      <section
        id="services"
        className="scroll-mt-16 border-b border-zinc-200 py-20 dark:border-zinc-800"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Layanan Kami
            </h2>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              Dari perbaikan perangkat hingga solusi IT lengkap, pilih layanan
              yang sesuai kebutuhan Anda.
            </p>
          </div>
          <ServiceCatalog limit={6} />
        </div>
      </section>

      <WhyChooseUs />
      <HowItWorks />

      <section className="border-t border-zinc-200 bg-gradient-to-r from-blue-600 to-indigo-600 py-20 dark:border-zinc-800">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Siap Memperbaiki Perangkat Anda?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-blue-100">
            Buat pesanan service sekarang dan pantau progres perbaikannya
            secara online.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-6 text-base font-medium text-blue-700 transition-colors hover:bg-blue-50"
          >
            Pesan Service Sekarang
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </section>

      <Faq />
      <Contact />
    </>
  );
}