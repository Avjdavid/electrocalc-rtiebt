import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import AmpacityTable from './pages/AmpacityTable'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/electrocalc-rtiebt">
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/tabela" element={<AmpacityTable />} />
        {/* fallback para qualquer rota desconhecida */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
