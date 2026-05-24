import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'join/:roomId',
    loadComponent: () =>
      import('./pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'room/:roomId',
    loadComponent: () =>
      import('./pages/room/room.component').then((m) => m.RoomComponent),
  },
  { path: '**', redirectTo: '' },
];
