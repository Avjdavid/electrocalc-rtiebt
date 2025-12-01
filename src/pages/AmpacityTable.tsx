import React from "react";
import { Link } from "react-router-dom";

// Tabela fixa (cobre, PVC 70°C) com disjuntor sugerido e potências já calculadas.
const TABLE = [
  { s: 1.5,  I: 16,  brk: 16,  P1F: 3680,  P3F: 11085 },
  { s: 2.5,  I: 21,  brk: 20,  P1F: 4600,  P3F: 13856 },
  { s: 4,    I: 28,  brk: 25,  P1F: 5750,  P3F: 17321 },
  { s: 6,    I: 36,  brk: 32,  P1F: 7360,  P3F: 22170 },
  { s: 10,   I: 50,  brk: 50,  P1F: 11500, P3F: 34641 },
  { s: 16,   I: 68,  brk: 63,  P1F: 14490, P3F: 43648 },
  { s: 25,   I: 89,  brk: 80,  P1F: 18400, P3F: 55426 },
  { s: 35,   I: 110, brk: 100, P1F: 23000, P3F: 69282 },
  { s: 50,   I: 140, brk: 125, P1F: 28750, P3F: 86603 },
  { s: 70,   I: 175, brk: 160, P1F: 36800, P3F: 110851 },
  { s: 95,   I: 210, brk: 200, P1F: 46000, P3F: 138564 },
  { s: 120,  I: 245, brk: 200, P1F: 46000, P3F: 138564 },
];

export default function AmpacityTable() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tabela de Capacidade por Secção</h1>
          <p className="text-sm text-zinc-600">
            Valores de referência (cobre, 70°C). Confirme no RTIEBT/IEC e catálogos do fabricante.
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
                <th className="text-right px-4 py-3">Secção (mm²)</th>
                <th className="text-right px-4 py-3">I admissível (A)</th>
                <th className="text-right px-4 py-3">Disjuntor sugerido (A)</th>
                <th className="text-right px-4 py-3">P máx @230V (W)</th>
                <th className="text-right px-4 py-3">P máx @400V 3F (W)</th>
              </tr>
            </thead>
            <tbody>
              {TABLE.map((r, idx) => (
                <tr key={r.s} className={idx % 2 ? "bg-zinc-50" : ""}>
                  <td className="px-4 py-2 text-right font-medium">{r.s}</td>
                  <td className="px-4 py-2 text-right">{r.I}</td>
                  <td className="px-4 py-2 text-right">{r.brk}</td>
                  <td className="px-4 py-2 text-right">{r.P1F.toLocaleString("pt-PT")}</td>
                  <td className="px-4 py-2 text-right">{r.P3F.toLocaleString("pt-PT")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-zinc-600">
          Nota: estes valores não incluem fatores de correção (temperatura ambiente, agrupamento, método de
          instalação) nem verificações de queda de tensão. Use a calculadora principal para esses efeitos.
        </p>
      </main>
    </div>
  );
}
