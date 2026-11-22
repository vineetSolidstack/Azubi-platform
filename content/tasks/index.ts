// All PLC tasks in teaching order. Task files are plain JSON data.
import type { Task } from '../../src/engine/plc';
import t001 from './m07/001-lampe-taster.json';
import t002 from './m07/002-und-oder.json';
import t003 from './m07/003-selbsthaltung.json';
import t004 from './m07/004-verriegelung.json';
import t005 from './m07/005-band-links-rechts.json';
import t006 from './m07/006-zylinder.json';
import t007 from './m07/007-einschaltverzoegerung.json';
import t008 from './m07/008-treppenlicht.json';
import t009 from './m07/009-ampel.json';
import t010 from './m07/010-teilezaehler.json';

export const tasks = [t001, t002, t003, t004, t005, t006, t007, t008, t009, t010] as unknown as Task[];
export const taskById = (id: string) => tasks.find((t) => t.id === id);
