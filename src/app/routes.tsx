import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { DashboardScreen } from './screens/DashboardScreen';
import { RouteScreen } from './screens/RouteScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { WhatsAppScreen } from './screens/WhatsAppScreen';
import { LiveTripScreen } from './screens/LiveTripScreen';
import { HelpScreen } from './screens/HelpScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home',      Component: DashboardScreen },
      { path: 'routes',    Component: RouteScreen },
      { path: 'whatsapp',  Component: WhatsAppScreen },
      { path: 'settings',  Component: SettingsScreen },
      { path: 'help',      Component: HelpScreen },
      { path: 'viagem/:viagemId', Component: LiveTripScreen },
    ],
  },
]);
