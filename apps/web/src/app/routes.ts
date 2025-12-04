import { index, route } from '@react-router/dev/routes';

export default [
  index('./screens/landing-page.tsx'),
  route('lobby/:lobbyId', './screens/lobby-page.tsx'),
];
