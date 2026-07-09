import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav, BottomNav } from "@/components/dashboard/nav";
import { ToastProvider } from "@/components/ui/toast";
import { WalletHeaderBadge } from "@/components/dashboard/wallet-header-badge";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <div className="min-h-screen flex">
        <SidebarNav />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[var(--border)]">
            <div className="font-mono-board text-sm tracking-widest text-[var(--amber)] md:hidden">
              NUMLYSMS
            </div>
            <div className="hidden md:block" />
            <WalletHeaderBadge />
          </header>
          <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-6">{children}</main>
        </div>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
