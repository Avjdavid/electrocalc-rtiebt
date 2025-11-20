// src/App.tsx
import { useMemo, useState } from "react";

/** ------------------------
 *  Tabelas simplificadas (Cu, 70°C, instalação doméstica típica)
 *  NOTA: valores aproximados para protótipo. Para obra real,
 *  valide com RTIEBT/IEC e tabelas do fabricante do cabo.
 *  ------------------------ */

// Disjuntores padrão (Portugal/IEC)
const BREAKERS = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100] as const;

// Secções padrão (mm²)
const CABLES = [1.5, 2.5, 4, 6, 10, 16, 25, 35] as const;

// Ampacidade (A) por secção — simplificado (Cu 70°C, referência comum residencial)
const AMPACITY_BY_CABLE: Record<number, number> = {
  1.5: 16,
  2.5: 20,
  4: 32,
  6: 40,
  10: 63,
  16: 80,
  25: 100,
  35: 125,
};

// Resistividade do cobre a 20°C (mΩ·mm²/m). Usamos 0.0181 Ω·mm²/m => 18.1 mΩ·mm²/m
const RHO_MILLI_OHM = 18.1;

/** Queda de tensão aproximada (monofásico) */
function voltageDropMono(iA: number, length_m: number, section_mm2: number) {
  // ΔV ≈ 2 * ρ * L * I / S  (ρ em Ω·mm²/m) -> usamos mΩ, então dividir por 1000
  const dV = (2 * (RHO_MILLI_OHM / 1000) * length_m * iA) / section_mm2;
  return dV; // volts
}

/** Queda de tensão aproximada (trifásico) */
function voltageDropTri(iA: number, length_m: number, section_mm2: number) {
  // ΔV ≈ √3 * ρ * L * I / S
  const dV = ((Math.sqrt(3) * (RHO_MILLI_OHM / 1000) * length_m * iA) / section_mm2);
  return dV; // volts
}

function nextBreakerUp(iA: number) {
  for (const b of BREAKERS) if (b >= iA) return b;
  return BREAKERS[BREAKERS.length - 1];
}

function minCableForCurrent(iA: number) {
  for (const s of CABLES) {
    if (AMPACITY_BY_CABLE[s] >= iA) return s;
  }
  return CABLES[CABLES.length - 1];
}

function limitationText(okAmp: boolean, okDrop: boolean) {
  if (okAmp && okDrop) return "cumpre ampacidade e queda.";
  if (!okAmp && okDrop) return "NÃO cumpre ampacidade.";
  if (okAmp && !okDrop) return "NÃO cumpre queda de tensão.";
  return "NÃO cumpre ampacidade nem queda.";
}

export default function App() {
  const [tab, setTab] = useState<"breaker" | "cable" | "power">("breaker");

  // Comuns
  const [voltage, setVoltage] = useState<230 | 400>(230);
  const [isTri, setIsTri] = useState(false); // false=monofásico, true=trifásico
  const [length, setLength] = useState(10);  // distância (m)
  const maxDropPct = 3; // alvo simples (3%) para uso geral

  // Pelo Disjuntor
  const [breakerSel, setBreakerSel] = useState<number>(32);

  // Pelo Cabo
  const [cableSel, setCableSel] = useState<number>(4);

  // Pela Potência
  const [powerW, setPowerW] = useState(4000);

  // Cálculos
  const resultBreaker = useMemo(() => {
    const Ib = breakerSel; // A (corrente de projeto aproximada pelo disjuntor)
    const Smin = minCableForCurrent(Ib);
    const ampOk = AMPACITY_BY_CABLE[Smin] >= Ib;

    const dV = isTri
      ? voltageDropTri(Ib, length, Smin)
      : voltageDropMono(Ib, length, Smin);
    const dropPct = (dV / voltage) * 100;
    const dropOk = dropPct <= maxDropPct;

    // Se a queda reprovar, tenta aumentar a secção até passar
    let Sused = Smin;
    let dVused = dV;
    let dropPctUsed = dropPct;
    if (!dropOk) {
      for (const s of CABLES) {
        if (s < Smin) continue;
        const dVtry = isTri
          ? voltageDropTri(Ib, length, s)
          : voltageDropMono(Ib, length, s);
        const pct = (dVtry / voltage) * 100;
        if (pct <= maxDropPct) {
          Sused = s;
          dVused = dVtry;
          dropPctUsed = pct;
          break;
        }
      }
    }

    return {
      Sused,
      ampacity: AMPACITY_BY_CABLE[Sused],
      dropPct: dropPctUsed,
      okText: limitationText(AMPACITY_BY_CABLE[Sused] >= Ib, dropPctUsed <= maxDropPct),
    };
  }, [breakerSel, isTri, length, voltage]);

  const resultCable = useMemo(() => {
    const S = cableSel;
    const IbMax = AMPACITY_BY_CABLE[S] ?? 0;
    const breaker = BREAKERS.reduce((acc, b) => (b <= IbMax ? b : acc), BREAKERS[0]);

    const dV = isTri
      ? voltageDropTri(IbMax, length, S)
      : voltageDropMono(IbMax, length, S);
    const dropPct = (dV / voltage) * 100;

    return {
      breaker,
      IbMax,
      dropPct,
      okText: limitationText(true, dropPct <= maxDropPct),
    };
  }, [cableSel, isTri, length, voltage]);

  const resultPower = useMemo(() => {
    const P = powerW; // W
    // Corrente:
    // monofásico: I = P / (V * pf)   (pf≈1 simplificado)
    // trifásico : I = P / (√3 * V * pf)
    const I = isTri ? P / (Math.sqrt(3) * voltage) : P / voltage;

    const suggestedBreaker = nextBreakerUp(I);
    const Smin = minCableForCurrent(suggestedBreaker);

    const dV = isTri
      ? voltageDropTri(I, length, Smin)
      : voltageDropMono(I, length, Smin);
    const dropPct = (dV / voltage) * 100;

    // Aumenta secção se queda reprovar
    let Sused = Smin;
    let dropPctUsed = dropPct;
    if (dropPct > maxDropPct) {
      for (const s of CABLES) {
        if (s < Smin) continue;
        const dVtry = isTri
          ? voltageDropTri(I, length, s)
          : voltageDropMono(I, length, s);
        const pct = (dVtry / voltage) * 100;
        if (pct <= maxDropPct) {
          Sused = s;
          dropPctUsed = pct;
          break;
        }
      }
    }

    return {
      I,
      suggestedBreaker,
      Sused,
      ampacity: AMPACITY_BY_CABLE[Sused],
      dropPct: dropPctUsed,
      okText: limitationText(AMPACITY_BY_CABLE[Sused] >= suggestedBreaker, dropPctUsed <= maxDropPct),
    };
  }, [powerW, isTri, length, voltage]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-3">ElectroCalc RTIEBT</h1>
        <p className="text-sm mb-6">
          Protótipo de dimensionamento (RTIEBT/IEC). Valores aproximados — valide sempre com as tabelas oficiais.
        </p>

        {/* Configurações comuns */}
        <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl shadow mb-6">
          <label className="text-sm">
            Tensão
            <select
              className="mt-1 w-full border rounded-md p-2"
              value={voltage}
              onChange={(e) => setVoltage(Number(e.target.value) as 230 | 400)}
            >
              <option value={230}>230 V</option>
              <option value={400}>400 V</option>
            </select>
          </label>

          <label className="text-sm">
            Sistema
            <select
              className="mt-1 w-full border rounded-md p-2"
              value={isTri ? "tri" : "mono"}
              onChange={(e) => setIsTri(e.target.value === "tri")}
            >
              <option value="mono">Monofásico</option>
              <option value="tri">Trifásico</option>
            </select>
          </label>

          <label className="text-sm">
            Distância (m)
            <input
              type="number"
              min={1}
              className="mt-1 w-full border rounded-md p-2"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
            />
          </label>

          <label className="text-sm">
            Limite de queda (%)
            <input
              type="number"
              min={1}
              step={0.5}
              className="mt-1 w-full border rounded-md p-2"
              value={maxDropPct}
              onChange={() => {}}
              disabled
              title="Fixo em 3% para simplificar"
            />
          </label>
        </div>

        {/* Tabs simples */}
        <div className="flex gap-2 mb-4">
          <button
            className={`px-3 py-2 rounded-md border ${tab === "breaker" ? "bg-slate-900 text-white" : "bg-white"}`}
            onClick={() => setTab("breaker")}
          >
            Pelo Disjuntor
          </button>
          <button
            className={`px-3 py-2 rounded-md border ${tab === "cable" ? "bg-slate-900 text-white" : "bg-white"}`}
            onClick={() => setTab("cable")}
          >
            Pelo Cabo
          </button>
          <button
            className={`px-3 py-2 rounded-md border ${tab === "power" ? "bg-slate-900 text-white" : "bg-white"}`}
            onClick={() => setTab("power")}
          >
            Pela Potência
          </button>
        </div>

        {/* Conteúdo */}
        {tab === "breaker" && (
          <section className="bg-white p-4 rounded-xl shadow">
            <h2 className="font-semibold mb-3">Pelo Disjuntor</h2>
            <div className="flex items-end gap-3 mb-4">
              <label className="text-sm">
                Disjuntor (A)
                <select
                  className="mt-1 w-40 border rounded-md p-2"
                  value={breakerSel}
                  onChange={(e) => setBreakerSel(Number(e.target.value))}
                >
                  {BREAKERS.map((b) => (
                    <option key={b} value={b}>{b} A</option>
                  ))}
                </select>
              </label>
              <span className="text-xs text-slate-500">Secções avaliadas: {CABLES.join(", ")} mm²</span>
            </div>

            <div className="bg-slate-50 rounded-md p-3">
              <ul className="list-disc pl-5 text-sm">
                <li>Secção mínima que cumpre: <b>{resultBreaker.Sused} mm²</b></li>
                <li>Ampacidade dessa secção: <b>{resultBreaker.ampacity} A</b></li>
                <li>Queda estimada: <b>{resultBreaker.dropPct.toFixed(2)}%</b></li>
                <li>Limitação: <b>{resultBreaker.okText}</b></li>
              </ul>
            </div>
          </section>
        )}

        {tab === "cable" && (
          <section className="bg-white p-4 rounded-xl shadow">
            <h2 className="font-semibold mb-3">Pelo Cabo</h2>
            <div className="flex items-end gap-3 mb-4">
              <label className="text-sm">
                Secção (mm²)
                <select
                  className="mt-1 w-40 border rounded-md p-2"
                  value={cableSel}
                  onChange={(e) => setCableSel(Number(e.target.value))}
                >
                  {CABLES.map((s) => (
                    <option key={s} value={s}>{s} mm²</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="bg-slate-50 rounded-md p-3">
              <ul className="list-disc pl-5 text-sm">
                <li>Disjuntor máximo seguro: <b>{resultCable.breaker} A</b></li>
                <li>Ampacidade: <b>{resultCable.IbMax} A</b></li>
                <li>Queda estimada a IbMax: <b>{resultCable.dropPct.toFixed(2)}%</b></li>
                <li>Limitação: <b>{resultCable.okText}</b></li>
              </ul>
            </div>
          </section>
        )}

        {tab === "power" && (
          <section className="bg-white p-4 rounded-xl shadow">
            <h2 className="font-semibold mb-3">Pela Potência</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="text-sm">
                Potência (W)
                <input
                  className="mt-1 w-full border rounded-md p-2"
                  type="number"
                  min={1}
                  value={powerW}
                  onChange={(e) => setPowerW(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="bg-slate-50 rounded-md p-3">
              <ul className="list-disc pl-5 text-sm">
                <li>Corrente estimada: <b>{resultPower.I.toFixed(1)} A</b></li>
                <li>Disjuntor sugerido: <b>{resultPower.suggestedBreaker} A</b></li>
                <li>Secção recomendada: <b>{resultPower.Sused} mm²</b></li>
                <li>Ampacidade da secção: <b>{resultPower.ampacity} A</b></li>
                <li>Queda estimada: <b>{resultPower.dropPct.toFixed(2)}%</b></li>
                <li>Limitação: <b>{resultPower.okText}</b></li>
              </ul>
            </div>
          </section>
        )}

        <p className="text-xs text-slate-500 mt-6">
          Aviso: cálculo simplificado (protótipo). Ajuste fatores de correção conforme método de instalação, temperatura, agrupamento, etc., para cumprir RTIEBT.
        </p>
      </div>
    </div>
  );
}
