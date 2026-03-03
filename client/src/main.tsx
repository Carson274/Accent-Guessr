import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router'
import { Home } from './pages/Home.tsx'
import '../global.css'

const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { index: true, Component: Home },
    ]
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router}/>
  </StrictMode>,
)
