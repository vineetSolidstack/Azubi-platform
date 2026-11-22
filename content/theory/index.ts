import type { Lesson } from '../../src/theory/lesson';
import lessonsJson from './lessons.json';

export const lessons = lessonsJson as Lesson[];
export const lessonOf = (module: string) => lessons.find((l) => l.module === module);
