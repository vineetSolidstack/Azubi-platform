// Plant models of the stations. Pure functions: plant state + outputs + dt -> next plant state.
// Deliberately simple and deterministic so that the same model runs in the browser and in the grader.

import { Task } from './task';
import { Value } from './types';

export interface Plant {
  /** position 0..1: conveyor part (0 = left end) or cylinder rod (0 = retracted) */
  pos: number;
  /** conveyor: both directions were switched on at the same time */
  fault: boolean;
}

export const CONVEYOR_TRAVEL_MS = 4000;
export const CYLINDER_TRAVEL_MS = 1000;
const NEAR = 0.02;

const roleVar = (task: Task, role: string) => task.variables.find((v) => v.role === role)?.name;

export function plantInit(task: Task): Plant {
  return { pos: task.stationOptions?.startPos ?? 0, fault: false };
}

/** Sensor signals produced by the plant, keyed by variable name. */
export function plantSensors(task: Task, plant: Plant): Record<string, Value> {
  const out: Record<string, Value> = {};
  const put = (role: string, value: boolean) => {
    const name = roleVar(task, role);
    if (name) out[name] = value;
  };
  if (task.station === 'conveyor') {
    put('limitLeft', plant.pos <= NEAR);
    put('limitRight', plant.pos >= 1 - NEAR);
  } else if (task.station === 'cylinder') {
    put('sensorIn', plant.pos <= NEAR);
    put('sensorOut', plant.pos >= 1 - NEAR);
  }
  return out;
}

export function plantStep(task: Task, plant: Plant, image: Record<string, Value>, dtMs: number): Plant {
  const on = (role: string) => {
    const name = roleVar(task, role);
    return !!name && image[name] === true;
  };
  if (task.station === 'conveyor') {
    const right = on('motorRight');
    const left = on('motorLeft');
    if (right && left) return { ...plant, fault: true };
    let pos = plant.pos + ((right ? 1 : 0) - (left ? 1 : 0)) * (dtMs / CONVEYOR_TRAVEL_MS);
    if (task.stationOptions?.wrap) pos = ((pos % 1) + 1) % 1;
    else pos = Math.min(1, Math.max(0, pos));
    return { ...plant, pos };
  }
  if (task.station === 'cylinder') {
    const dir = on('valveExtend') ? 1 : -1;
    return { ...plant, pos: Math.min(1, Math.max(0, plant.pos + dir * (dtMs / CYLINDER_TRAVEL_MS))) };
  }
  return plant;
}
