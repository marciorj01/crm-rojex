import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/ui/sidebar';
import { Navbar } from '@/components/ui/navbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar de Navegação */}
      <Sidebar />

      {/* Área Principal de Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
