'use client';

export default function DashboardError({ reset }: { reset: () => void }) {
  return <div className="glass-panel p-6 space-y-4">
    <h1 className="text-xl font-bold">Não foi possível carregar os dados</h1>
    <p className="text-slate-300">Tente novamente. Se o problema continuar, confira a conexão e a configuração do sistema.</p>
    <button onClick={reset} className="rounded-xl bg-sky-600 px-4 py-2">Tentar novamente</button>
  </div>;
}
