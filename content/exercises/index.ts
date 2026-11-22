import type { Exercise } from '../../src/exercises/exercise';
import m01 from './m01.json';
import m02 from './m02.json';
import m03 from './m03.json';
import m04 from './m04.json';
import m06 from './m06.json';
import m08 from './m08.json';
import m09 from './m09.json';
import m10 from './m10.json';
import m11 from './m11.json';
import m12 from './m12.json';
import m14 from './m14.json';
import m15 from './m15.json';
import m16 from './m16.json';

// modules in teaching order; inside a module the exercises are sorted from easy to very hard
const all = [m01, m02, m03, m04, m16, m06, m08, m11, m12, m14, m15, m09, m10] as unknown as Exercise[][];
export const exercises = all.flatMap((list) => [...list].sort((a, b) => a.difficulty - b.difficulty));
export const exercisesOf = (module: string) => exercises.filter((e) => e.module === module);
export const exerciseById = (id: string) => exercises.find((e) => e.id === id);
