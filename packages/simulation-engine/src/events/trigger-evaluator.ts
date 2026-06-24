import type {
  EventCondition,
  EventContext,
  EventTrigger,
} from '@football-life/shared';

function resolveField(
  context: EventContext,
  field: string,
): number | string | boolean | undefined {
  const value = (context as unknown as Record<string, unknown>)[field];
  if (
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  return undefined;
}

export function evaluateCondition(
  condition: EventCondition,
  context: EventContext,
): boolean {
  const actual = resolveField(context, condition.field);
  if (actual === undefined) return false;

  const { op, value } = condition;
  if (op === 'eq') return actual === value;
  if (op === 'neq') return actual !== value;

  if (typeof actual !== 'number' || typeof value !== 'number') {
    return false;
  }
  switch (op) {
    case 'lt':
      return actual < value;
    case 'lte':
      return actual <= value;
    case 'gt':
      return actual > value;
    case 'gte':
      return actual >= value;
    default:
      return false;
  }
}

/** True when all `all` conditions hold and at least one `any` condition holds. */
export function evaluateTrigger(
  trigger: EventTrigger,
  context: EventContext,
): boolean {
  if (
    trigger.all &&
    !trigger.all.every((condition) => evaluateCondition(condition, context))
  ) {
    return false;
  }
  if (
    trigger.any &&
    trigger.any.length > 0 &&
    !trigger.any.some((condition) => evaluateCondition(condition, context))
  ) {
    return false;
  }
  return true;
}
