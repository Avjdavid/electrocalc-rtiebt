import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import AmpacityTable from './pages/AmpacityTable'
import './index.css'

const router = createBrowserRouter(
  [
    { path: '/', element: <App /> },
    { path: '/tabela', element: <AmpacityTable /> },
  ],
  { basename: import.meta.env.BASE_URL }   // <- ESSENCIAL no GH Pages
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
