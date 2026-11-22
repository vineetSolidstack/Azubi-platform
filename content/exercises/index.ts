import type { Exercise } from '../../src/exercises/exercise';
import m01 from './m01.json';
import m09 from './m09.json';
import m10 from './m10.json';
import m14 from './m14.json';
import m15 from './m15.json';
import m16 from './m16.json';

export const exercises = [...m01, ...m16, ...m14, ...m15, ...m09, ...m10] as unknown as Exercise[];
export const exercisesOf = (module: string) => exercises.filter((e) => e.module === module);
export const exerciseById = (id: string) => exercises.find((e) => e.id === id);
