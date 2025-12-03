import { createBrowserRouter } from 'react-router-dom';
import { App } from './app.js';
import { LandingPage } from './screens/landing-page.js';
import { LobbyPage } from './screens/lobby-page.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'lobby/:lobbyId',
        element: <LobbyPage />,
      },
    ],
  },
]);
