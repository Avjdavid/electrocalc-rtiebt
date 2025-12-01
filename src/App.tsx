// src/App.tsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

// importa o logo (agora com alias funcionando)
import logo from "@/assets/logo-electrocalc.png";

// …(mantenha aqui os seus imports de dados/lib: getAmpacityTable, BREAKERS, etc.)

export default function App() {
  // …(mantenha aqui todos os seus useState/useMemo já existentes)

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-10 font-sans">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="ElectroCalc"
              className="h-8 w-8 rounded-md"
              decoding="async"
              loading="eager"
            />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
                ElectroCalc RTIEBT
              </h1>
              <p className="text-xs text-zinc-500">Cálculo RTIEBT + IEC (PVC 70 °C)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/tabela" className="text-xs rounded-md border px-2 py-1 hover:bg-zinc-100">
              Tabela de Secções
            </Link>
            <span className="text-xs font-mono bg-zinc-100 px-2 py-1 rounded">v2.3</span>
          </div>
        </div>
      </header>

import { Link } from "react-router-dom";
import { getAmpacityTable, Method } from "./data/ampacity";
import { kGroupFor, kTempAt } from "./data/corrections";
import {
  BREAKERS, PhaseMode, V_BY_MODE, RHO_CU, round,
  pickBreakerByCurrent, pickSectionByIn, raiseForDrop,
  voltageDropPercent, checkCoordination, tAdmissible
} from "./lib/electro";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) =>
  <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm p-5 ${className}`}>{children}</div>;
const Label = ({ children }: { children: React.ReactNode }) =>
  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">{children}</label>;
const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) =>
  <input {...p} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />;
const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) =>
  <select {...p} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all" />;

const ResultRow = ({ label, value, sub, status }: { label: string; value: React.ReactNode; sub?: string; status?: "ok" | "warn" | "error" }) => {
  const color = status==="ok"?"text-green-600":status==="warn"?"text-amber-600":status==="error"?"text-red-600":"text-zinc-900";
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

export default function App() {
  // Globais
  const [mode, setMode] = useState<PhaseMode>("1F");
  const [method, setMethod] = useState<Method>("E");
  const [column, setColumn] = useState<number>(1);
  const [temp, setTemp] = useState<number>(30);
  const [nCircuits, setNCircuits] = useState<number>(1);
  const [dropLimit, setDropLimit] = useState<number>(3);

  const [brk, setBrk] = useState<number>(16);
  const [lenA, setLenA] = useState<number>(15);

  const [cableS, setCableS] = useState<number>(2.5);
  const [lenB, setLenB] = useState<number>(15);

  const [powerW, setPowerW] = useState<number>(3680);
  const [cosPhi, setCosPhi] = useState<number>(1.0);
  const [lenC, setLenC] = useState<number>(15);

  // Curto-circuito
  const [Icc, setIcc] = useState<number>(6000); // A no ponto
  const [tDevice, setTDevice] = useState<number>(0.2); // s (tempo de corte max do disjuntor)

  const V = V_BY_MODE[mode];
  const TABLE = getAmpacityTable(method, column);
  const kT = kTempAt(temp);
  const kG = kGroupFor(nCircuits);
  const kTotal = Number((kT * kG).toFixed(3));

  // === Por Disjuntor ===
  const resByBreaker = useMemo(() => {
    const base = pickSectionByIn(brk, kTotal, TABLE);
    const best = raiseForDrop(mode, brk, lenA, V, dropLimit, base.s, TABLE);
    const finalS = Math.max(base.s, best.s);
    const Iz_base = TABLE.find(r=>r.s===finalS)?.Iz ?? TABLE[TABLE.length-1].Iz;
    const Iz_corr = Iz_base * kTotal;
    const finalDrop = voltageDropPercent(mode, brk, lenA, finalS, V);
    const coord = checkCoordination(brk, brk, Iz_corr);

    return {
      baseS: base.s,
      finalS,
      Iz_corr: round(Iz_corr),
      finalDrop: round(finalDrop,2),
      coord
    };
  }, [brk,lenA,mode,V,dropLimit,kTotal,TABLE]);

  // === Por Cabo ===
  const resByCable = useMemo(()=>{
    const row = TABLE.find(r=>r.s===cableS) ?? TABLE[0];
    const Iz_corr = row.Iz * kTotal;

    // Limite por queda
    const kGeo = mode==="1F" ? 2 : Math.sqrt(3);
    const Rm = RHO_CU / cableS;
    const I_max_drop = (dropLimit * V) / (100 * kGeo * lenB * Rm);

    const I_limit = Math.min(Iz_corr, I_max_drop);

    // Disjuntor pela corrente e teto por brk sugerido da tabela
    let candidate = 0;
    for (const b of BREAKERS) if (b <= I_limit) candidate = b;
    const safeBreaker = Math.min(candidate, row.brk);

    const Pdisp = mode==="1F" ? Math.floor(V * safeBreaker) : Math.floor(Math.sqrt(3)*400*safeBreaker);
    const dropAtBreaker = safeBreaker>0
      ? round(voltageDropPercent(mode, safeBreaker, lenB, cableS, V),2)
      : round(voltageDropPercent(mode, I_limit, lenB, cableS, V),2);

    const coord = checkCoordination(safeBreaker, safeBreaker, Iz_corr);

    return {
      Iz_corr: round(Iz_corr),
      I_max_drop: round(I_max_drop),
      I_limit: round(I_limit),
      safeBreaker,
      brkSuggested: row.brk,
      powerMax: Pdisp,
      dropAtBreaker,
      coord
    };
  }, [TABLE,cableS,kTotal,mode,V,dropLimit,lenB]);

  // === Por Potência ===
  const resByPower = useMemo(()=>{
    const denom = mode==="1F" ? (V*cosPhi) : (Math.sqrt(3)*400*cosPhi);
    const Ib = powerW / denom; // corrente de serviço
    const brkSug = pickBreakerByCurrent(Ib);
    const base = pickSectionByIn(brkSug, kTotal, TABLE);
    const best = raiseForDrop(mode, brkSug, lenC, V, dropLimit, base.s, TABLE);
    const finalS = Math.max(base.s, best.s);
    const Iz_corr = (TABLE.find(r=>r.s===finalS)?.Iz ?? TABLE[TABLE.length-1].Iz) * kTotal;
    const dV = voltageDropPercent(mode, brkSug, lenC, finalS, V);
    const coord = checkCoordination(Ib, brkSug, Iz_corr);

    return {
      Ib: round(Ib,2),
      brkSug,
      finalS,
      dV: round(dV,2),
      Iz_corr: round(Iz_corr),
      coord
    };
  }, [mode,V,cosPhi,powerW,kTotal,TABLE,lenC,dropLimit]);

  // === Curto-circuito (adiabático) para a secção escolhida em cada modo ===
  const scByCable = useMemo(()=>{
    const tAdm = tAdmissible(cableS, Icc); // s
    const ok = tAdm >= tDevice;
    return { tAdm: round(tAdm,3), ok };
  }, [cableS,Icc,tDevice]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pb-10 font-sans">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-700 to-green-500 bg-clip-text text-transparent">
              ElectroCalc RTIEBT
            </h1>
            <p className="text-xs text-zinc-500">Cálculo RTIEBT + IEC (PVC 70 °C)</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/tabela" className="text-xs rounded-md border px-2 py-1 hover:bg-zinc-100">Tabela de Secções</Link>
            <span className="text-xs font-mono bg-zinc-100 px-2 py-1 rounded">v2.3</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Painel de Configuração (método, temperatura, agrupamento) */}
        <Card className="bg-green-50/50 border-green-100">
          <h2 className="text-sm font-bold text-green-800 mb-3">⚙️ Parâmetros do Cenário</h2>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="col-span-2">
              <Label>Método</Label>
              <Select value={method} onChange={e=>setMethod(e.target.value as Method)}>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
              </Select>
            </div>
            <div>
              <Label>Config. (col.)</Label>
              <Select value={column} onChange={e=>setColumn(Number(e.target.value))}>
                <option value="1">1</option>
              </Select>
            </div>
            <div>
              <Label>Sistema</Label>
              <Select value={mode} onChange={e=>setMode(e.target.value as PhaseMode)}>
                <option value="1F">1F (230V)</option>
                <option value="3F">3F (400V)</option>
              </Select>
            </div>
            <div>
              <Label>Temp. (°C)</Label>
              <Input type="number" min="0" max="60" value={temp} onChange={e=>setTemp(Number(e.target.value))}/>
            </div>
            <div>
              <Label>Agrup. (nº circ)</Label>
              <Input type="number" min="1" max="9" value={nCircuits} onChange={e=>setNCircuits(Number(e.target.value))}/>
            </div>
            <div>
              <Label>Queda máx (%)</Label>
              <Input type="number" step="0.5" min="0.5" max="10" value={dropLimit} onChange={e=>setDropLimit(Number(e.target.value))}/>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-zinc-600 bg-white rounded-md border px-2 py-2">
                <div><b>kT</b>={kT} · <b>kG</b>={kG} → <b>kTotal</b>= {kTotal}</div>
                <div className="text-[10px]">Iz_corr = Iz_quadro × kT × kG</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Por Disjuntor */}
        <Card>
          <h3 className="font-bold mb-3">Por Disjuntor</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Disjuntor (A)</Label>
              <Select value={brk} onChange={e=>setBrk(Number(e.target.value))}>
                {BREAKERS.map(b => <option key={b} value={b}>{b} A</option>)}
              </Select>
            </div>
            <div>
              <Label>Comprimento (m)</Label>
              <Input type="number" min="1" value={lenA} onChange={e=>setLenA(Number(e.target.value))}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-zinc-50 rounded-lg text-center">
              <div className="text-xs text-zinc-500">Secção Comercial</div>
              <div className="text-3xl font-black text-green-700">{resByBreaker.finalS} mm²</div>
            </div>
            <div className="p-3 bg-zinc-50 rounded-lg">
              <ResultRow label="Iz (corrigida)" value={`${resByBreaker.Iz_corr} A`} />
              <ResultRow label="Queda estimada" value={`${resByBreaker.finalDrop}%`} status={resByBreaker.finalDrop>dropLimit?"error":"ok"} />
            </div>
          </div>
          <div className="mt-2">
            <ResultRow label="Coordenação (IB≤In≤Iz)" value={resByBreaker.coord.ok1 ? "OK" : "NOK"} status={resByBreaker.coord.ok1?"ok":"error"} />
            <ResultRow label="I₂ ≤ 1,45·Iz" value={resByBreaker.coord.ok2 ? "OK" : "NOK"} status={resByBreaker.coord.ok2?"ok":"error"} sub={`I₂≈${round(resByBreaker.coord.I2)} A`} />
          </div>
        </Card>

        {/* Por Cabo */}
        <Card>
          <h3 className="font-bold mb-3">Por Cabo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Secção (mm²)</Label>
              <Select value={cableS} onChange={e=>setCableS(Number(e.target.value))}>
                {TABLE.map(r => <option key={r.s} value={r.s}>{r.s} mm²</option>)}
              </Select>
            </div>
            <div>
              <Label>Comprimento (m)</Label>
              <Input type="number" min="1" value={lenB} onChange={e=>setLenB(Number(e.target.value))}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <span className="text-xs text-green-700 block">Disjuntor Máx.</span>
              <span className="text-xl font-bold text-green-800">
                {resByCable.safeBreaker>0 ? `${resByCable.safeBreaker} A` : "—"}
              </span>
              <span className="text-[10px] text-green-700 block mt-1">Teto da secção: {resByCable.brkSuggested} A</span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-lg">
              <ResultRow label="Iz (corrigida)" value={`${resByCable.Iz_corr} A`} />
              <ResultRow label="Queda @disjuntor" value={`${resByCable.dropAtBreaker}%`} status={resByCable.dropAtBreaker>dropLimit?"error":"ok"} />
              <ResultRow label="Potência disponível" value={`${resByCable.powerMax.toLocaleString("pt-PT")} W`} />
            </div>
          </div>
          <div className="mt-2">
            <ResultRow label="Coordenação (IB≤In≤Iz)" value={resByCable.coord.ok1 ? "OK" : "NOK"} status={resByCable.coord.ok1?"ok":"error"} />
            <ResultRow label="I₂ ≤ 1,45·Iz" value={resByCable.coord.ok2 ? "OK" : "NOK"} status={resByCable.coord.ok2?"ok":"error"} />
          </div>
          <div className="mt-3 p-3 rounded-lg border">
            <div className="font-semibold text-sm mb-1">Curto-circuito (adiabático)</div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Icc (A)</Label><Input type="number" value={Icc} onChange={e=>setIcc(Number(e.target.value))}/></div>
              <div><Label>t disjuntor (s)</Label><Input type="number" step="0.01" value={tDevice} onChange={e=>setTDevice(Number(e.target.value))}/></div>
              <div className="flex items-end">
                <div className="w-full text-sm">
                  <div>t<sub>adm</sub> do cabo: <b>{scByCable.tAdm}s</b></div>
                  <div className={scByCable.ok?"text-green-700":"text-red-600"}>{scByCable.ok?"OK":"NOK"} (t<sub>adm</sub> ≥ t<sub>disj</sub>)</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Por Potência */}
        <Card>
          <h3 className="font-bold mb-3">Por Potência</h3>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="col-span-2 sm:col-span-1">
              <Label>Potência (W)</Label>
              <Input type="number" min="0" step="100" value={powerW} onChange={e=>setPowerW(Number(e.target.value))}/>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Comprimento (m)</Label>
              <Input type="number" min="1" value={lenC} onChange={e=>setLenC(Number(e.target.value))}/>
            </div>
          </div>
          <div>
            <Label>Fator de Potência (cos φ)</Label>
            <input type="range" min="0.5" max="1.0" step="0.05" value={cosPhi} onChange={e=>setCosPhi(Number(e.target.value))} className="w-full mb-1 h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"/>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>0.5 (motor)</span><span className="font-bold text-green-600">{cosPhi}</span><span>1.0 (resistivo)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-xs text-purple-700 uppercase font-semibold">Secção</div>
              <div className="text-3xl font-black text-purple-900">{resByPower.finalS} mm²</div>
            </div>
            <div className="p-3 bg-zinc-50 rounded-lg">
              <ResultRow label="Ib (estimada)" value={`${resByPower.Ib} A`} />
              <ResultRow label="Queda estimada" value={`${resByPower.dV}%`} status={resByPower.dV>dropLimit?"warn":"ok"} />
              <ResultRow label="Iz (corrigida)" value={`${resByPower.Iz_corr} A`} />
              <ResultRow label="Coordenação (IB≤In≤Iz)" value={resByPower.coord.ok1 ? "OK" : "NOK"} status={resByPower.coord.ok1?"ok":"error"} />
              <ResultRow label="I₂ ≤ 1,45·Iz" value={resByPower.coord.ok2 ? "OK" : "NOK"} status={resByPower.coord.ok2?"ok":"error"} />
            </div>
          </div>
        </Card>
      </main>

      <footer className="text-center text-xs text-zinc-400 max-w-md mx-auto px-6 pb-6">
        <p className="mb-2">⚠️ Esta ferramenta aproxima valores. Valide com o RTIEBT.</p>
        <p>Regras aplicadas: IB≤In≤Iz_corr, I₂≤1,45·Iz_corr, verificação adiabática S–I–t e queda de tensão.</p>
      </footer>
    </div>
  );
}
