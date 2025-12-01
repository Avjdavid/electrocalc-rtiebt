// src/data/ampacity.ts
export type Method = "E" | "F" | "G";

export interface AmpacityRow { s: number; Iz: number; brk: number; }

/** Fallback (PVC 70 °C @30°C) — teus valores */
export const PVC70_DEFAULT: AmpacityRow[] = [
  { s: 1.5,  Iz: 16,  brk: 16  },
  { s: 2.5,  Iz: 21,  brk: 20  },
  { s: 4,    Iz: 28,  brk: 25  },
  { s: 6,    Iz: 36,  brk: 32  },
  { s: 10,   Iz: 50,  brk: 50  },
  { s: 16,   Iz: 68,  brk: 63  },
  { s: 25,   Iz: 89,  brk: 80  },
  { s: 35,   Iz: 110, brk: 100 },
  { s: 50,   Iz: 140, brk: 125 },
  { s: 70,   Iz: 175, brk: 160 },
  { s: 95,   Iz: 210, brk: 200 },
  { s: 120,  Iz: 245, brk: 200 },
];

/** Preparado para quando preencheres com os quadros do RTIEBT/IEC */
export const METHOD_E_COL1 = PVC70_DEFAULT.map(x => ({ ...x })); // TODO: trocar Iz pelos da norma
export const METHOD_F_COL1 = PVC70_DEFAULT.map(x => ({ ...x })); // TODO
export const METHOD_G_COL1 = PVC70_DEFAULT.map(x => ({ ...x })); // TODO

export function getAmpacityTable(method: Method, column = 1) {
  switch (method) {
    case "E": return METHOD_E_COL1.length ? METHOD_E_COL1 : PVC70_DEFAULT;
    case "F": return METHOD_F_COL1.length ? METHOD_F_COL1 : PVC70_DEFAULT;
    case "G": return METHOD_G_COL1.length ? METHOD_G_COL1 : PVC70_DEFAULT;
    default:  return PVC70_DEFAULT;
  }
}
