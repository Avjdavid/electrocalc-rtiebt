import React from "react";
import { Link } from "react-router-dom";

// Tabela simplificada (cobre, PVC 70°C) — referência genérica.
// Confirmação no RTIEBT/IEC e catálogos do fabricante.
const CABLE_TABLE = [
  { s: 1.5, I: 16 },
  { s: 2.5, I: 21 },
  { s: 4, I: 28 },
  { s: 6, I: 36 },
  { s: 10, I: 50 },
  { s: 16, I: 68 },
  { s: 25, I: 89 },
  { s: 35, I: 110 },
  { s: 50, I: 140 },
  { s: 70, I: 175 },
  { s: 95, I: 210 },
  { s: 120, I: 245 },
];

const BREAKERS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100];

function pickBreakerByCurrent(I: number) {
  for (const b of BREAKERS) if (b >= I) return b;
  return BREAKERS[BREAKERS.length - 1];
}

export default function AmpacityTable() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tabela de Capacidade por Secção</h1>
          <p className="text-sm text-zinc-600">
            Valores aproximados (cobre, 70°C). Confirme no RTIEBT/IEC e fabricante.
          </p>
        </div>
        <Link
          to="/"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100"
        >
          ← Voltar à ElectroCalc
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-16">
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-700">
              <tr>
                <th className="text-left px-4 py-3">Secção (mm²)</th>
                <th className="text-left px-4 py-3">I admissível (A)</th>
                <th className="text-left px-4 py-3">Disjuntor sugerido (A)</th>
                <th className="text-left px-4 py-3">P máx @230V (W)</th>
                <th className="text-left px-4 py-3">P máx @400V 3F (W)</th>
              </tr>
            </thead>
            <tbody>
              {CABLE_TABLE.map((r, idx) => {
                const brk = pickBreakerByCurrent(r.I);
                const P1F = Math.floor(230 * r.I);
                const P3F = Math.floor(Math.sqrt(3) * 400 * r.I);
                return (
                  <tr key={r.s} className={idx % 2 ? "bg-zinc-50" : ""}>
                    <td className="px-4 py-2 font-medium">{r.s}</td>
                    <td className="px-4 py-2">{r.I}</td>
                    <td className="px-4 py-2">{brk}</td>
                    <td className="px-4 py-2">{P1F.toLocaleString("pt-PT")}</td>
                    <td className="px-4 py-2">{P3F.toLocaleString("pt-PT")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-zinc-600">
          Notas: sem fatores de correção (temperatura, agrupamento, método).
          Para circuitos longos, verifique queda de tensão.
        </p>
      </main>
    </div>
  );
}
