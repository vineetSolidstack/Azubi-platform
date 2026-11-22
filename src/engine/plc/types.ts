// Shared types of the PLC engine. No UI, no network: pure data and functions.

export type L10n = { de: string; en: string };
export type Value = boolean | number;

/** Static type used by the checker. INT, REAL and TIME (milliseconds) are all numbers. */
export type Ty = 'BOOL' | 'NUM';
export type VarType = 'BOOL' | 'INT' | 'REAL' | 'TIME';
export const tyOf = (t: VarType): Ty => (t === 'BOOL' ? 'BOOL' : 'NUM');

type FbSpec = { in: Record<string, Ty>; out: Record<string, Ty> };

/** Function blocks following IEC 61131-3 naming of inputs and outputs. */
export const FB_SPEC: Record<string, FbSpec> = {
  TON: { in: { IN: 'BOOL', PT: 'NUM' }, out: { Q: 'BOOL', ET: 'NUM' } },
  TOF: { in: { IN: 'BOOL', PT: 'NUM' }, out: { Q: 'BOOL', ET: 'NUM' } },
  TP: { in: { IN: 'BOOL', PT: 'NUM' }, out: { Q: 'BOOL', ET: 'NUM' } },
  CTU: { in: { CU: 'BOOL', R: 'BOOL', PV: 'NUM' }, out: { Q: 'BOOL', CV: 'NUM' } },
  CTD: { in: { CD: 'BOOL', LD: 'BOOL', PV: 'NUM' }, out: { Q: 'BOOL', CV: 'NUM' } },
  CTUD: {
    in: { CU: 'BOOL', CD: 'BOOL', R: 'BOOL', LD: 'BOOL', PV: 'NUM' },
    out: { QU: 'BOOL', QD: 'BOOL', CV: 'NUM' },
  },
  R_TRIG: { in: { CLK: 'BOOL' }, out: { Q: 'BOOL' } },
  F_TRIG: { in: { CLK: 'BOOL' }, out: { Q: 'BOOL' } },
  SR: { in: { S1: 'BOOL', R: 'BOOL' }, out: { Q1: 'BOOL' } },
  RS: { in: { S: 'BOOL', R1: 'BOOL' }, out: { Q1: 'BOOL' } },
};
export type FbType = 'TON' | 'TOF' | 'TP' | 'CTU' | 'CTD' | 'CTUD' | 'R_TRIG' | 'F_TRIG' | 'SR' | 'RS';
export const isFbType = (s: string): s is FbType => Object.hasOwn(FB_SPEC, s);

export interface VarDecl {
  name: string;
  type: VarType | FbType;
  /** in = physical input, out = physical output, mem = internal memory (Merker) */
  dir: 'in' | 'out' | 'mem';
  initial?: Value;
}

export interface Diagnostic {
  line: number;
  msg: L10n;
}
