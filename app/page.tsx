import AuthForm from '@/components/AuthForm';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md p-6 bg-slate-900 rounded-xl border border-slate-800 shadow">
        <h1 className="text-2xl font-semibold mb-4 text-center">KS Chat Login</h1>
        <AuthForm />
      </div>
    </main>
  );
}
