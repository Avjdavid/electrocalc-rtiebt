// src/data/corrections.ts
export const K_TEMP_AIR_30C = [
  { t: 25, k: 1.03 }, { t: 30, k: 1.00 }, { t: 35, k: 0.94 },
  { t: 40, k: 0.87 }, { t: 45, k: 0.79 }, { t: 50, k: 0.71 },
  { t: 55, k: 0.61 }, { t: 60, k: 0.50 },
];
export const K_GROUP = [
  { n: 1, k: 1.00 }, { n: 2, k: 0.80 }, { n: 3, k: 0.70 }, { n: 4, k: 0.65 },
  { n: 5, k: 0.60 }, { n: 6, k: 0.57 }, { n: 7, k: 0.54 }, { n: 8, k: 0.52 }, { n: 9, k: 0.50 },
];
export function kTempAt(tempC: number) {
  const a=[...K_TEMP_AIR_30C].sort((x,y)=>x.t-y.t);
  if (tempC<=a[0].t) return a[0].k; if (tempC>=a[a.length-1].t) return a[a.length-1].k;
  for (let i=0;i<a.length-1;i++){const A=a[i],B=a[i+1]; if(tempC>=A.t&&tempC<=B.t){const r=(tempC-A.t)/(B.t-A.t); return +(A.k+(B.k-A.k)*r).toFixed(3);}}
  return 1.0;
}
export function kGroupFor(n: number){ return (K_GROUP.find(x=>x.n===n)?.k) ?? 0.5; }
