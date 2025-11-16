import Link from "next/link";
import Image from "next/image";
import AuthButton from "@/components/AuthButton";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Image src="/logo.svg" alt="MyPlantDiary" width={48} height={48} />
          <h1 className="text-3xl font-bold">MyPlantDiary</h1>
        </div>
        <AuthButton user={user} />
      </div>
      <p className="mt-4 text-lg text-gray-700">
        Snap a photo to identify plants, learn how to care for them, and keep a journal as they grow.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="rounded-xl bg-brand-600 px-4 py-2 font-medium text-white">
          Launch App
        </Link>
        <a
          href="https://github.com/yourname/my-plant-diary"
          className="rounded-xl border px-4 py-2 text-gray-700"
        >
          GitHub
        </a>
      </div>
    </main>
  );
}
