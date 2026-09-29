import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { queryClient } from './api/queryClient';
import { router } from './app/router';
import './styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster theme="dark" position="top-center" richColors closeButton toastOptions={{ className: 'font-sans' }} />
    </QueryClientProvider>
  </StrictMode>,
);
