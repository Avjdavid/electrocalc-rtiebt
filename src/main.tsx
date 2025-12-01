import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import AmpacityTable from './pages/AmpacityTable'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* o BASE_URL vem do vite.config.ts -> base: '/electrocalc-rtiebt/' */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/tabela" element={<AmpacityTable />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
