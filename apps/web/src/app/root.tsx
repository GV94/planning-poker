import {
  Outlet,
  MetaFunction,
  Scripts,
  Links,
  Meta,
  ScrollRestoration,
} from 'react-router';
import type { Route } from './+types/root.js';
import { ServerStatusProvider } from '../contexts/server-status.jsx';
import { ServerStatusIndicator } from '../components/ui/server-status-indicator.jsx';
import './app.css';

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export const meta: MetaFunction = () => [
  { title: 'Plokr' },
  {
    name: 'viewport',
    content: 'width=device-width,initial-scale=1,viewport-fit=cover',
  },
  {
    name: 'description',
    content: 'Plokr is a platform for creating and managing your projects.',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const p2pBase = (
    import.meta.env.VITE_P2P_BASE as string | undefined
  )?.replace(/\/$/, '');

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
        {/* Splash screen pulse animation */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              '@keyframes splash-pulse{0%,100%{opacity:.4}50%{opacity:1}}',
          }}
        />
        {/* Start health check immediately — before JS bundle loads */}
        {p2pBase && (
          <script
            dangerouslySetInnerHTML={{
              __html: [
                '(function(){',
                `var u=${JSON.stringify(p2pBase + '/health')};`,
                'var p=window.__plokr={start:Date.now()};',
                'p.health=fetch(u).then(function(r){',
                'if(r.ok){p.ok=true;',
                "var s=document.getElementById('splash');",
                "if(s){s.style.transition='opacity .3s';s.style.opacity='0';",
                'setTimeout(function(){s.parentNode&&s.parentNode.removeChild(s)},300)}',
                '}return r.ok',
                '}).catch(function(){return false})',
                '})()',
              ].join(''),
            }}
          />
        )}
        <script
          data-goatcounter="/gc/count"
          async
          src="/gc/count.js"
        ></script>
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-50">
        {/* Splash screen — covers pre-rendered content until server status is known */}
        <div
          id="splash"
          style={{
            position: 'fixed',
            inset: '0',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#020617',
          }}
        >
          <p
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '2rem',
              fontWeight: 600,
              color: '#f8fafc',
              letterSpacing: '-0.025em',
              animation: 'splash-pulse 2s ease-in-out infinite',
              margin: 0,
            }}
          >
            Plokr
          </p>
        </div>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ServerStatusProvider>
      <ServerStatusIndicator />
      <main className="mx-auto flex max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </ServerStatusProvider>
  );
}
