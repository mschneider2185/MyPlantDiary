import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import AuthButton from "./AuthButton";

type NavBarProps = {
  user: User | null;
};

export default function NavBar({ user }: NavBarProps) {
  return (
    <header className="flex items-center justify-between py-4">
      <Link href="/" className="text-lg font-semibold">
        MyPlantDiary
      </Link>
      <div className="flex items-center gap-6">
        <nav className="flex gap-4 text-sm text-gray-700">
          <Link href="/">Dashboard</Link>
          <Link href="/marketing">About</Link>
        </nav>
        <AuthButton user={user} />
      </div>
    </header>
  );
}
