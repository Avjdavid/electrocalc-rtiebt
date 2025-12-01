import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * ElectroCalc RTIEBT — v2.2 (PT-PT)
 * - Tabela base alinhada com a página /tabela (cobre 70°C)
 * - Disjuntores padrão expandidos até 200 A
 * - Em “Por Cabo”, o disjuntor máximo fica limitado ao sugerido da tabela
 */

type PhaseMode = "1F" | "3F";
const V_BY_MODE: Record<PhaseMode, number> = { "1F": 230, "3F": 400 };

// Resistividade prática do cobre (Ω·mm²/m)
const RHO_CU = 0.0175;

// === TABELA BASE (mesmos valores da página /tabela) ===
const CABLE_TABLE: { s: number; I: number; brk: number }[] = [
  { s: 1.5,   I: 16,  brk: 16  },
  { s: 2.5,   I: 21,  brk: 20  },
  { s: 4,     I: 28,  brk: 25  },
  { s: 6,     I: 36,  brk: 32  },
  { s: 10,    I: 50,  brk: 50  },
  { s: 16,    I: 68,  brk: 63  },
  { s: 25,    I: 89,  brk: 80  },
  { s: 35,    I: 110, brk: 100 },
  { s: 50,    I: 140, brk: 125 },
  { s: 70,    I: 175, brk: 160 },
  { s: 95,    I: 210, brk: 200 },
  { s: 120,   I: 245, brk: 200 },
];

// Disjuntores comerciais disponíveis
const BREAKERS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200];

// ===== Utilitários =====
function round(x: number, p = 1) { const f = 10 ** p; return Math.round(x * f) / f; }

function pickBreakerByCurrent(I: number) {
  for (const b of BREAKERS) if (b >= I) return b;
  return BREAKERS[BREAKERS.length - 1];
}

/** Escolhe secção cuja Iz*k >= In (critério térmico) */
function pickCableByCurrent(In: number, k: number) {
  const need = In / k;
  return CABLE_TABLE.find(r => r.I >= need) ?? CABLE_TABLE[CABLE_TABLE.length - 1];
}

/** Queda de tensão (%) */
function voltageDropPercent(mode: PhaseMode, I: number, L: number, S: number, V: number) {
  const Rm = RHO_CU / S;
  const k = mode === "1F" ? 2 : Math.sqrt(3);
  const dV = k * I * L * Rm;
  return (dV / V) * 100;
}

/** Sobe secção até cumprir queda de tensão */
function autoCableForDrop(mode: PhaseMode, I: number, L: number, V: number, limitPct: number, baseS: number) {
  const start = CABLE_TABLE.findIndex(c => c.s === baseS);
  const space = start >= 0 ? CABLE_TABLE.slice(start) : CABLE_TABLE;
  for (const row of space) {
    const drop = voltageDropPercent(mode, I, L, row.s, V);
    if (drop <= limitPct) return { s: row.s, drop };
  }
  const last = CABLE_TABLE[CABLE_TABLE.length - 1];
  return { s: last.s, drop: voltageDropPercent(mode, I, L, last.s, V) };
}

// ===== UI pequenos =====
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) =>
  <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm p-5 ${className}`}>{children}</div>;

const Label = ({ children }: { children: React.ReactNode }) =>
  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">{children}</label>;

const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) =>
  <input {...p} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />;

const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) =>
  <select {...p} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all" />;

const ResultRow = ({ label, value, sub, status }: { label: string; value: React.ReactNode; sub?: string; status?: "ok" | "warn" | "error" }) => {
  const color = status === "ok" ? "text-green-600" : status === "warn" ? "text-amber-600" : status === "error" ? "text-red-600" : "text-zinc-900";
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
      <span className="text-zinc-600 text-sm">{label}</span>
      <div className="text-right">
        <div className={`font-bold ${color}`}>{value}</div>
        {sub && <div className="text-xs text-zinc-400">{sub}</div>}
      </div>
    </div>
  );
};

// ===== APP =====
export default function App() {
  const [activeTab, setActiveTab] = useState<"breaker" | "cable" | "power">("breaker");

  // Globais
  const [mode, setMode] = useState<PhaseMode>("1F");
  const [dropLimit, setDropLimit] = useState<number>(3);
  const [kCorr, setKCorr] = useState<number>(1.0);
  const V = V_BY_MODE[mode];

  // Por disjuntor
  const [brk, setBrk] = useState<number>(16);
  const [lenA, setLenA] = useState<number>(15);

  // Por cabo
  const [cableS, setCableS] = useState<number>(2.5);
  const [lenB, setLenB] = useState<number>(15);

  // Por potência
  const [powerW, setPowerW] = useState<number>(3680);
  const [cosPhi, setCosPhi] = useState<number>(1.0);
  const [lenC, setLenC] = useState<number>(15);

  // ===== Cálculos =====

  // Por disjuntor
  const resByBreaker = useMemo(() => {
    const base = pickCableByCurrent(brk, kCorr);          // térmico
    const best = autoCableForDrop(mode, brk, lenA, V, dropLimit, base.s); // queda
    const finalS = Math.max(base.s, best.s);
    const Iz_real = (CABLE_TABLE.find(r => r.s === base.s)!.I) * kCorr;
    const finalDrop = voltageDropPercent(mode, brk, lenA, finalS, V);

    return {
      baseS: base.s,
      finalS,
      finalDrop: round(finalDrop, 2),
      isUpsized: finalS > base.s,
      Iz_real: round(Iz_real, 1),
    };
  }, [brk, lenA, mode, V, dropLimit, kCorr]);

  // Por cabo (com teto do disjuntor sugerido)
  const resByCable = useMemo(() => {
    const row = CABLE_TABLE.find(r => r.s === cableS) ?? CABLE_TABLE[0];
    const Iz_corrected = row.I * kCorr;

    // Limite por queda
    const kGeo = mode === "1F" ? 2 : Math.sqrt(3);
    const Rm = RHO_CU / cableS;
    const I_max_drop = (dropLimit * V) / (100 * kGeo * lenB * Rm);

    // Corrente limite do circuito
    const I_limit = Math.min(Iz_corrected, I_max_drop);

    // Disjuntor dado pela corrente
    let candidate = 0;
    for (const b of BREAKERS) if (b <= I_limit) candidate = b;

    // Teto: disjuntor sugerido da tabela para a secção escolhida
    const safeBreaker = Math.min(candidate, row.brk);

    const powerMax = mode === "1F"
      ? Math.floor(V * safeBreaker)
      : Math.floor(Math.sqrt(3) * 400 * safeBreaker);

    const dropAtBreaker = safeBreaker > 0
      ? round(voltageDropPercent(mode, safeBreaker, lenB, cableS, V), 2)
      : round(voltageDropPercent(mode, I_limit, lenB, cableS, V), 2);

    const limitReason =
      I_limit === Iz_corrected ? "Ampacidade (Iz*k)" :
      I_limit === I_max_drop ? "Queda de Tensão" : "Limite combinado";

    return {
      Iz_corrected: round(Iz_corrected),
      I_max_drop: round(I_max_drop),
      I_limit: round(I_limit),
      limitReason,
      safeBreaker,
      powerMax,
      dropAtBreaker,
      brkSuggested: row.brk,
    };
  }, [cableS, lenB, mode, V, dropLimit, kCorr]);

  // Por potência
  const resByPower = useMemo(() => {
    const denom = mode === "1F" ? (V * cosPhi) : (Math.sqrt(3) * 400 * cosPhi);
    const I_calc = powerW / denom;
    const suggestedBreaker = pickBreakerByCurrent(I_calc);

    const base = pickCableByCurrent(suggestedBreaker, kCorr);
    const best = autoCableForDrop(mode, suggestedBreaker, lenC, V, dropLimit, base.s);
    const finalS = Math.max(base.s, best.s);
    const finalDrop = voltageDropPercent(mode, suggestedBreaker, lenC, finalS, V);

    return {
      I_calc: round(I_calc, 1),
      suggestedBreaker,
      finalS,
      finalDrop: round(finalDrop, 2),
      baseS: base.s
    };
  }, [powerW, cosPhi, lenC, mode, V, dropLimit, kCorr]);

  // ===== Render =====
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-10 font-sans">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
              ElectroCalc RTIEBT
            </h1>
            <p className="text-xs text-zinc-500">Ferramenta de bolso para Instalações em Portugal</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/tabela" className="text-xs rounded-md border px-2 py-1 hover:bg-zinc-100">
              Tabela de Secções
            </Link>
            <span className="text-xs font-mono bg-zinc-100 px-2 py-1 rounded">v2.2</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Configurações globais */}
        <Card className="bg-green-50/50 border-green-100">
          <h2 className="text-sm font-bold text-green-800 mb-3">⚙️ Dados da Instalação</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label>Sistema</Label>
              <Select value={mode} onChange={e => setMode(e.target.value as PhaseMode)}>
                <option value="1F">Monofásico (230V)</option>
                <option value="3F">Trifásico (400V)</option>
              </Select>
            </div>
            <div>
              <Label>Queda Máx (%)</Label>
              <Input type="number" step="0.5" min="0.5" max="10" value={dropLimit} onChange={e => setDropLimit(Number(e.target.value))} />
              <span className="text-[10px] text-zinc-400">3% Luz / 5% Outros</span>
            </div>
            <div className="col-span-2">
              <Label>Modo / Fator de Correção</Label>
              <Select value={kCorr} onChange={e => setKCorr(Number(e.target.value))}>
                <option value="1.0">Ref C — à vista / caleira (k=1.0)</option>
                <option value="0.8">Ref B — embutido (k≈0.8)</option>
                <option value="0.7">Ref A — isolamento / agrup. (k≈0.7)</option>
                <option value="0.5">Agrupamento denso (k≈0.5)</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Abas */}
        <div className="flex p-1 bg-zinc-200/60 rounded-xl overflow-hidden">
          {(["breaker", "cable", "power"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                activeTab === tab ? "bg-white text-green-700 shadow-sm" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {tab === "breaker" ? "Por Disjuntor" : tab === "cable" ? "Por Cabo" : "Por Potência"}
            </button>
          ))}
        </div>

        {/* Conteúdo — Por Disjuntor */}
        {activeTab === "breaker" && (
          <div className="space-y-4">
            <Card>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Disjuntor (A)</Label>
                  <Select value={brk} onChange={e => setBrk(Number(e.target.value))}>
                    {BREAKERS.map(b => <option key={b} value={b}>{b} A</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Comprimento (m)</Label>
                  <Input type="number" min="1" value={lenA} onChange={e => setLenA(Number(e.target.value))} />
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <h3 className="text-lg font-bold text-zinc-800 mb-4">Resultado</h3>
              <div className="p-4 bg-zinc-50 rounded-lg text-center">
                <span className="block text-zinc-500 text-xs uppercase mb-1">Secção Comercial</span>
                <span className="block text-4xl font-black text-green-700">
                  {resByBreaker.finalS} <span className="text-lg text-zinc-400">mm²</span>
                </span>
              </div>
              <div className="mt-3 space-y-1">
                <ResultRow label="Queda Estimada" value={`${resByBreaker.finalDrop}%`} status={resByBreaker.finalDrop > dropLimit ? "error" : "ok"} />
                <ResultRow label="Iz (com k)" value={`${resByBreaker.Iz_real} A`} sub={`Condição: In (${brk}A) ≤ Iz`} />
                <ResultRow label="Secção térmica mínima" value={`${resByBreaker.baseS} mm²`} />
              </div>
            </Card>
          </div>
        )}

        {/* Conteúdo — Por Cabo */}
        {activeTab === "cable" && (
          <div className="space-y-4">
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Secção (mm²)</Label>
                  <Select value={cableS} onChange={e => setCableS(Number(e.target.value))}>
                    {CABLE_TABLE.map(r => <option key={r.s} value={r.s}>{r.s} mm²</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Comprimento (m)</Label>
                  <Input type="number" min="1" value={lenB} onChange={e => setLenB(Number(e.target.value))} />
                </div>
              </div>
            </Card>

            <Card className={resByCable.safeBreaker > 0 ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"}>
              <h3 className="text-lg font-bold text-zinc-800 mb-4">Diagnóstico</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <span className="text-xs text-zinc-500 block">Limite de Corrente</span>
                  <span className="text-xl font-bold text-zinc-800">{resByCable.I_limit} A</span>
                  <span className="text-[10px] text-zinc-500 block mt-1">{resByCable.limitReason}</span>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <span className="text-xs text-green-700 block">Disjuntor Máx.</span>
                  <span className="text-xl font-bold text-green-800">
                    {resByCable.safeBreaker > 0 ? `${resByCable.safeBreaker} A` : "—"}
                  </span>
                  <span className="text-[10px] text-green-700 block mt-1">
                    Teto da secção: {resByCable.brkSuggested} A
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <ResultRow label="Queda com disjuntor" value={`${resByCable.dropAtBreaker}%`} status={resByCable.dropAtBreaker > dropLimit ? "error" : "ok"} />
                <ResultRow label="Potência disponível" value={`${resByCable.powerMax.toLocaleString("pt-PT")} W`} />
              </div>
            </Card>
          </div>
        )}

        {/* Conteúdo — Por Potência */}
        {activeTab === "power" && (
          <div className="space-y-4">
            <Card>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="col-span-2 sm:col-span-1">
                  <Label>Potência (W)</Label>
                  <Input type="number" min="0" step="100" value={powerW} onChange={e => setPowerW(Number(e.target.value))} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <Label>Comprimento (m)</Label>
                  <Input type="number" min="1" value={lenC} onChange={e => setLenC(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <Label>Fator de Potência (cos φ)</Label>
                <input
                  type="range" min="0.5" max="1.0" step="0.05"
                  value={cosPhi} onChange={e => setCosPhi(Number(e.target.value))}
                  className="w-full mb-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>0.5 (Motor)</span>
                  <span className="font-bold text-green-600">{cosPhi}</span>
                  <span>1.0 (Resistivo)</span>
                </div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <h3 className="text-lg font-bold text-zinc-800 mb-4">Sugestão</h3>
              <div className="flex items-center justify-between bg-purple-50 p-4 rounded-lg mb-4">
                <div>
                  <div className="text-xs text-purple-700 uppercase font-semibold">Secção</div>
                  <div className="text-3xl font-black text-purple-900">{resByPower.finalS} mm²</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-purple-700 uppercase font-semibold">Proteção</div>
                  <div className="text-2xl font-bold text-purple-900">{resByPower.suggestedBreaker} A</div>
                </div>
              </div>

              <div className="space-y-1">
                <ResultRow label="Ib (estimada)" value={`${resByPower.I_calc} A`} />
                <ResultRow label="Queda estimada" value={`${resByPower.finalDrop}%`} status={resByPower.finalDrop > dropLimit ? "warn" : "ok"} />
              </div>
            </Card>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-zinc-400 max-w-md mx-auto px-6 pb-6">
        <p className="mb-2">⚠️ <strong>Atenção:</strong> valores aproximados. </p>
        <p>Valide com o <strong>RTIEBT</strong> e catálogos do fabricante. Verificar sobrecarga (I₂ ≤ 1.45·Iz), curto-circuito e queda de tensão.</p>
      </footer>
    </div>
  );
}
