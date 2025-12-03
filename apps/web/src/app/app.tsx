import { Outlet, Link } from 'react-router-dom';

export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            Planning Poker
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
