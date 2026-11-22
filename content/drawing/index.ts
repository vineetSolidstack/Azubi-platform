import type { Solid } from '../../src/engine/drawing/views';
import solidsJson from './solids.json';

export const solids = solidsJson as Solid[];
export const solidById = (id: string) => solids.find((s) => s.id === id);
