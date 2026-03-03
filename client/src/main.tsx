import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router'
import { Home } from './pages/Home.tsx'
import '../global.css'
import { Error } from './pages/Error.tsx'
import { Modes } from './pages/Modes.tsx'
import { Play } from './pages/Play.tsx'

const router = createBrowserRouter([
  {
    path: "/",
    ErrorBoundary: Error,
    children: [
      { index: true, Component: Home },
      { path: "modes", Component: Modes },
      { path: "play", Component: Play}
    ]
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
