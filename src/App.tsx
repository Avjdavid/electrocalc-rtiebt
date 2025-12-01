import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/**
 * ElectroCalc RTIEBT v2.1 (PT-PT Edition)
 * - Terminologia PT-PT
 * - Fatores de correção por método (A/B/C) e agrupamento
 * - Verificação de queda (3%/5%)
 */

type PhaseMode = "1F" | "3F";

const V_BY_MODE: Record<PhaseMode, number> = { "1F": 230, "3F": 400 };

// Resistividade do cobre (Ω·mm²/m)
const RHO_CU = 0.0175;

/** Tabela base (PVC 70°C) – valores aproximados */
const CABLE_TABLE = [
  { s: 1.5,  I: 16  },
  { s: 2.5,  I: 21  },
  { s: 4,    I: 28  },
  { s: 6,    I: 36  },
  { s: 10,   I: 50  },
  { s: 16,   I: 68  },
  { s: 25,   I: 89  },
  { s: 35,   I: 110 },
  { s: 50,   I: 140 },
  { s: 70,   I: 175 },
  { s: 95,   I: 210 },
  { s: 120,  I: 245 },
];

const BREAKERS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200];

// ---------- Utils ----------
function round(x: number, p = 1) {
  const f = Math.pow(10, p);
  return Math.round(x * f) / f;
}

/** Escolhe secção tal que Iz*k_corr >= In */
function pickCableByCurrent(I_target: number, k_corr: number) {
  const I_norm = I_target / k_corr;
  return CABLE_TABLE.find(r => r.I >= I_norm) ?? CABLE_TABLE[CABLE_TABLE.length - 1];
}

function pickBreakerByCurrent(I: number) {
  for (const b of BREAKERS) if (b >= I) return b;
  return BREAKERS[BREAKERS.length - 1];
}

/** Queda de tensão em % */
function voltageDropPercent({ mode, I, L, S, V }: { mode: PhaseMode; I: number; L: number; S: number; V: number; }) {
  const R_per_m = RHO_CU / S;
  const k = mode === "1F" ? 2 : Math.sqrt(3);
  const dV = k * I * L * R_per_m;
  return (dV / V) * 100;
}

/** Sobe secção até cumprir a queda */
function autoCableForDrop({ mode, I, L, V, limitPct, baseS }:
  { mode: PhaseMode; I: number; L: number; V: number; limitPct: number; baseS: number }) {
  const start = CABLE_TABLE.findIndex(c => c.s === baseS);
  const space = start >= 0 ? CABLE_TABLE.slice(start) : CABLE_TABLE;
  for (const r of space) {
    const drop = voltageDropPercent({ mode, I, L, S: r.s, V });
    if (drop <= limitPct) return { s: r.s, drop };
  }
  const last = CABLE_TABLE[CABLE_TABLE.length - 1];
  return { s: last.s, drop: voltageDropPercent({ mode, I, L, S: last.s, V }) };
}

// ---------- UI ----------
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) =>
  <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm p-5 ${className}`}>{children}</div>;

const Label = ({ children }: { children: React.ReactNode }) =>
  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">{children}</label>;

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) =>
  <input {...props} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />;

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) =>
  <select {...props} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all" />;

const ResultRow = ({ label, value, sub, status }:
  { label: string; value: React.ReactNode; sub?: string; status?: "ok" | "warn" | "error" }) => {
  const color =
    status === "ok" ? "text-green-600" :
    status === "warn" ? "text-amber-600" :
    status === "error" ? "text-red-600" : "text-zinc-900";
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

// ---------- App ----------
export default function App() {
  const [activeTab, setActiveTab] = useState<"breaker" | "cable" | "power">("breaker");

  // Config
  const [mode, setMode] = useState<PhaseMode>("1F");
  const [dropLimit, setDropLimit] = useState<number>(3);
  const [kCorr, setKCorr] = useState<number>(1.0);

  const V = V_BY_MODE[mode];

  // Estados por aba
  const [brk, setBrk] = useState<number>(16);
  const [lenA, setLenA] = useState<number>(15);

  const [cableS, setCableS] = useState<number>(2.5);
  const [lenB, setLenB] = useState<number>(15);

  const [powerW, setPowerW] = useState<number>(3680);
  const [cosPhi, setCosPhi] = useState<number>(1.0);
  const [lenC, setLenC] = useState<number>(15);

  // ---- Cálculos ----
  const resByBreaker = useMemo(() => {
    const base = pickCableByCurrent(brk, kCorr);
    const Iz_real = base.I * kCorr;

    const best = autoCableForDrop({ mode, I: brk, L: lenA, V, limitPct: dropLimit, baseS: base.s });
    const finalS = Math.max(base.s, best.s);
    const finalDrop = voltageDropPercent({ mode, I: brk, L: lenA, S: finalS, V });

    return {
      baseS: base.s,
      finalS,
      finalDrop: round(finalDrop, 2),
      isUpsized: finalS > base.s,
      Iz_real: round(Iz_real, 1)
    };
  }, [brk, lenA, mode, V, dropLimit, kCorr]);

  const resByCable = useMemo(() => {
    const row = CABLE_TABLE.find(r => r.s === cableS) ?? CABLE_TABLE[0];
    const Iz_corr = row.I * kCorr;

    const k_geo = mode === "1F" ? 2 : Math.sqrt(3);
    const R_per_m = RHO_CU / cableS;
    const I_max_drop = (dropLimit * V) / (100 * k_geo * lenB * R_per_m);

    const I_limit = Math.min(Iz_corr, I_max_drop);
    const limitReason = I_limit === Iz_corr ? "Ampacidade (Iz)" : "Queda de Tensão";

    const possible = BREAKERS.filter(b => b <= I_limit);
    const safeBreaker = possible.length ? possible[possible.length - 1] : 0;

    const P = mode === "1F" ? V * safeBreaker : Math.sqrt(3) * 400 * safeBreaker;

    return {
      Iz_corrected: round(Iz_corr),
      I_max_drop: round(I_max_drop),
      I_limit: round(I_limit),
      limitReason,
      safeBreaker,
      powerMax: Math.floor(P),
      dropAtBreaker: round(voltageDropPercent({ mode, I: safeBreaker, L: lenB, S: cableS, V }), 2)
    };
  }, [cableS, lenB, mode, V, dropLimit, kCorr]);

  const resByPower = useMemo(() => {
    const denom = mode === "1F" ? (V * cosPhi) : (Math.sqrt(3) * 400 * cosPhi);
    const I_calc = powerW / denom;

    const suggestedBreaker = pickBreakerByCurrent(I_calc);

    const base = pickCableByCurrent(suggestedBreaker, kCorr);
    const best = autoCableForDrop({ mode, I: suggestedBreaker, L: lenC, V, limitPct: dropLimit, baseS: base.s });

    const finalS = Math.max(base.s, best.s);
    const finalDrop = voltageDropPercent({ mode, I: suggestedBreaker, L: lenC, S: finalS, V });

    return {
      I_calc: round(I_calc, 1),
      suggestedBreaker,
      finalS,
      finalDrop: round(finalDrop, 2),
      baseS: base.s
    };
  }, [powerW, cosPhi, lenC, mode, V, dropLimit, kCorr]);

  // ---- Render ----
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-10 font-sans">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
              ElectroCalc RTIEBT
            </h1>
            <p className="text-xs text-zinc-500">Ferramenta de bolso para Instalações em Portugal</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/tabela"
              className="text-xs rounded-md border border-zinc-300 px-2.5 py-1.5 hover:bg-zinc-100"
            >
              Tabela de Capacidade →
            </Link>
            <span className="text-xs font-mono bg-zinc-100 px-2 py-1 rounded">v2.1</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Configurações */}
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
              <Label>Modo de Instalação (Quadro 52-C)</Label>
              <Select value={kCorr} onChange={e => setKCorr(Number(e.target.value))}>
                <option value="1.0">Ref C – À vista / Caleira</option>
                <option value="0.8">Ref B – Embutido em alvenaria</option>
                <option value="0.7">Ref A – Em isolamento</option>
                <option value="0.7">Fator 0.7 (Agrupamento 3+)</option>
                <option value="0.5">Fator 0.5 (Agrupamento denso)</option>
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
              {tab === "breaker" && "Por Disjuntor"}
              {tab === "cable" && "Por Cabo"}
              {tab === "power" && "Por Potência"}
            </button>
          ))}
        </div>

        {/* Por Disjuntor */}
        {activeTab === "breaker" && (
          <div className="space-y-4">
            <Card>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Disjuntor (In)</Label>
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
              <h3 className="text-lg font-bold mb-4">Resultado de Dimensionamento</h3>
              <div className="p-4 bg-zinc-50 rounded-lg text-center">
                <span className="block text-zinc-500 text-xs uppercase mb-1">Secção Comercial</span>
                <span className="block text-4xl font-black text-green-700">
                  {resByBreaker.finalS} <span className="text-lg text-zinc-400">mm²</span>
                </span>
                {resByBreaker.isUpsized && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                    Aumentado por Queda de Tensão
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1">
                <ResultRow label="Queda Estimada" value={`${resByBreaker.finalDrop}%`} status={resByBreaker.finalDrop > dropLimit ? "error" : "ok"} />
                <ResultRow label="Corrente Admissível (Iz)" value={`${resByBreaker.Iz_real} A`} sub={`Condição: In (${brk}A) ≤ Iz (${resByBreaker.Iz_real}A)`} />
                <ResultRow label="Secção Mínima Térmica" value={`${resByBreaker.baseS} mm²`} />
              </div>
            </Card>
          </div>
        )}

        {/* Por Cabo */}
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
              <h3 className="text-lg font-bold mb-4">Diagnóstico do Circuito</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <span className="text-xs text-zinc-500 block">Limite do Cabo</span>
                  <span className="text-xl font-bold">{resByCable.I_limit} A</span>
                  <span className="text-[10px] text-red-500 block mt-1 truncate">{resByCable.limitReason}</span>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <span className="text-xs text-green-700 block">Disjuntor Máx.</span>
                  <span className="text-xl font-bold text-green-800">{resByCable.safeBreaker > 0 ? `${resByCable.safeBreaker} A` : "Nenhum"}</span>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <ResultRow label="Queda no limite" value={`${resByCable.dropAtBreaker}%`} status={resByCable.dropAtBreaker > dropLimit ? "error" : "ok"} />
                <ResultRow label="Potência Disponível" value={`${resByCable.powerMax} W`} />
              </div>
            </Card>
          </div>
        )}

        {/* Por Potência */}
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
              <h3 className="text-lg font-bold mb-4">Sugestão de Projeto</h3>
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
                <ResultRow label="Corrente de Serviço (Ib)" value={`${resByPower.I_calc} A`} />
                <ResultRow label="Queda Estimada" value={`${resByPower.finalDrop}%`} status={resByPower.finalDrop > dropLimit ? "warn" : "ok"} />
              </div>
            </Card>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-zinc-400 max-w-md mx-auto px-6 pb-6">
        <p className="mb-2">⚠️ <strong>Atenção:</strong> valores aproximados.</p>
        <p>RTIEBT (Portaria n.º 949-A/2006): validar I₂ ≤ 1.45·Iz, curto-circuito e demais condições de proteção.</p>
      </footer>
    </div>
  );
}
