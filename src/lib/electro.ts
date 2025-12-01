// src/lib/electro.ts
import { AmpacityRow } from "../data/ampacity";
export type PhaseMode = "1F" | "3F";
export const V_BY_MODE: Record<PhaseMode, number> = { "1F": 230, "3F": 400 };
export const RHO_CU = 0.0175;                 // Ω·mm²/m
export const K_ADIABATIC_CU_PVC = 115;        // IEC (aprox.)
export const BREAKERS = [6,10,16,20,25,32,40,50,63,80,100,125,160,200];
export function round(x:number,p=1){const f=10**p;return Math.round(x*f)/f;}
export function pickBreakerByCurrent(I:number){ for(const b of BREAKERS) if(b>=I) return b; return BREAKERS.at(-1)!; }
export function voltageDropPercent(mode:PhaseMode,I:number,L:number,S:number,V:number){
  const Rm=RHO_CU/S; const k=mode==="1F"?2:Math.sqrt(3); const dV=k*I*L*Rm; return (dV/V)*100;
}
export function pickSectionByIn(In:number,k:number,table:AmpacityRow[]){const need=In/k; return table.find(r=>r.Iz>=need) ?? table.at(-1)!;}
export function raiseForDrop(mode:PhaseMode,I:number,L:number,V:number,limitPct:number,baseS:number,table:AmpacityRow[]){
  const start=Math.max(0, table.findIndex(r=>r.s===baseS)); for(let i=start;i<table.length;i++){const s=table[i].s; const drop=voltageDropPercent(mode,I,L,s,V); if(drop<=limitPct) return {s,drop};}
  const last=table.at(-1)!.s; return {s:last, drop:voltageDropPercent(mode,I,L,last,V)};
}
export function checkCoordination(IB:number,In:number,IzCorr:number){
  const I2=1.45*In; const ok1 = IB <= In && In <= IzCorr; const ok2 = I2 <= 1.45*IzCorr; return { ok1, ok2, I2 };
}
export function tAdmissible(S:number,Icc:number,k=K_ADIABATIC_CU_PVC){ return (k*S/Icc)**2; }
