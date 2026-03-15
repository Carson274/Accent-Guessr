import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router'
import { Provider } from "react-redux";
import { store } from "./store/store";
import { Home } from './pages/Home.tsx'
import '../global.css'
import { Error } from './pages/Error.tsx'
import { Modes } from './pages/Modes.tsx'
import { Play } from './pages/Play.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const router = createBrowserRouter([
  {
    path: "/",
    ErrorBoundary: Error,
    children: [
      { index: true, Component: Home },
      { path: "modes", Component: Modes },
      { path: "play", Component: Play },
      { path: "play/:roomCode", Component: Play }
    ]
  }
]);

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
)
