import {
  Outlet,
  MetaFunction,
  Scripts,
  Links,
  Meta,
  ScrollRestoration,
} from 'react-router';
import type { Route } from './+types/root.js';
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
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
        <script
          data-goatcounter="https://plokr-app.goatcounter.com/count"
          async
          src="//gc.zgo.at/count.js"
        ></script>
      </head>
      <body className={`min-h-screen bg-slate-950 text-slate-50`}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-1 px-4 py-6">
      <Outlet />
    </main>
  );
}
