// src/pages/AmpacityTable.tsx
import React from "react";
import { Link } from "react-router-dom";
import { PVC70_DEFAULT } from "../data/ampacity";

export default function AmpacityTable(){
  const TABLE = PVC70_DEFAULT;
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tabela de Capacidade por Secção (PVC 70°C)</h1>
          <p className="text-sm text-zinc-600">Base 30 °C no ar. Confirme com RTIEBT/IEC e catálogos.</p>
        </div>
        <Link to="/" className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100">← Voltar</Link>
      </header>
      <main className="max-w-5xl mx-auto px-4 pb-16">
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-700">
              <tr>
                <th className="text-right px-4 py-3">Secção (mm²)</th>
                <th className="text-right px-4 py-3">I admissível (A)</th>
                <th className="text-right px-4 py-3">Disjuntor sugerido (A)</th>
                <th className="text-right px-4 py-3">P máx @230V (W)</th>
                <th className="text-right px-4 py-3">P máx @400V 3F (W)</th>
              </tr>
            </thead>
            <tbody>
              {TABLE.map((r, i) => {
                const P1F = Math.round(230*r.brk);
                const P3F = Math.round(Math.sqrt(3)*400*r.brk);
                return (
                  <tr key={r.s} className={i%2?"bg-zinc-50":""}>
                    <td className="px-4 py-2 text-right font-medium">{r.s}</td>
                    <td className="px-4 py-2 text-right">{r.Iz}</td>
                    <td className="px-4 py-2 text-right">{r.brk}</td>
                    <td className="px-4 py-2 text-right">{P1F.toLocaleString("pt-PT")}</td>
                    <td className="px-4 py-2 text-right">{P3F.toLocaleString("pt-PT")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-zinc-600">Nota: os fatores k são aplicados na calculadora.</p>
      </main>
    </div>
  );
}
