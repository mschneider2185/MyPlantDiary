import { ReactNode } from "react";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-6xl px-6">
      <NavBar user={user} />
      <div className="py-6">{children}</div>
    </div>
  );
}
