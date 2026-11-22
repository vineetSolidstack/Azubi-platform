import type { Exercise } from '../../src/exercises/exercise';
import m01 from './m01.json';

export const exercises = [...m01] as unknown as Exercise[];
export const exercisesOf = (module: string) => exercises.filter((e) => e.module === module);
export const exerciseById = (id: string) => exercises.find((e) => e.id === id);
