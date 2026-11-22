import type { Question } from '../../src/quiz/quiz';
import m05 from './m05.json';
import m06 from './m06.json';
import m07 from './m07.json';
import m08 from './m08.json';

export const questions = [...m05, ...m06, ...m07, ...m08] as unknown as Question[];
export const questionsOf = (module: string) => questions.filter((q) => q.module === module);
