import {
  ModuleConstraint,
  ModuleParameterSpec,
  ModuleValues,
  ParameterValidation,
} from '../interfaces/module-parameters.interface';

const EPSILON = 1e-9;

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : `${value}`;
}

function numericError(label: string, value: any, validation: ParameterValidation): string | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return `${label} must be a number.`;
  }
  if (validation.min !== null && validation.min !== undefined) {
    const minimum = formatNumber(validation.min);
    if (validation.exclusive_min ? value <= validation.min : value < validation.min) {
      return `${label} must be ${validation.exclusive_min ? 'greater than' : 'greater than or equal to'} ${minimum}.`;
    }
  }
  if (validation.max !== null && validation.max !== undefined) {
    const maximum = formatNumber(validation.max);
    if (validation.exclusive_max ? value >= validation.max : value > validation.max) {
      return `${label} must be ${validation.exclusive_max ? 'less than' : 'less than or equal to'} ${maximum}.`;
    }
  }
  if (validation.step) {
    const quotient = value / validation.step;
    if (Math.abs(quotient - Math.round(quotient)) > EPSILON) {
      return `${label} must be a multiple of ${formatNumber(validation.step)}.`;
    }
  }
  return null;
}

function stringError(label: string, value: any, validation: ParameterValidation): string | null {
  if (typeof value !== 'string') {
    return `${label} must be a string.`;
  }
  if (validation.min_length !== null && validation.min_length !== undefined && value.length < validation.min_length) {
    return `${label} must be at least ${validation.min_length} character(s) long.`;
  }
  if (validation.max_length !== null && validation.max_length !== undefined && value.length > validation.max_length) {
    return `${label} must be at most ${validation.max_length} character(s) long.`;
  }
  if (validation.pattern) {
    let matches = true;
    try {
      matches = new RegExp(`^(?:${validation.pattern})$`).test(value);
    } catch {
      matches = true;
    }
    if (!matches) {
      return `${label} must match the pattern ${validation.pattern}.`;
    }
  }
  return null;
}

function listError(label: string, value: any, validation: ParameterValidation): string | null {
  if (!Array.isArray(value)) {
    return `${label} must be a list.`;
  }
  if (validation.min_items !== null && validation.min_items !== undefined && value.length < validation.min_items) {
    return `${label} must contain at least ${validation.min_items} item(s).`;
  }
  if (validation.max_items !== null && validation.max_items !== undefined && value.length > validation.max_items) {
    return `${label} must contain at most ${validation.max_items} item(s).`;
  }
  if (validation.unique && new Set(value).size !== value.length) {
    return `${label} must not contain duplicates.`;
  }
  if (validation.sorted && value.length > 1) {
    const pairs = value.slice(0, -1).map((item, index) => [item, value[index + 1]]);
    if (validation.sorted === 'ascending' && !pairs.every(([a, b]) => a < b)) {
      return `${label} must be in ascending order.`;
    }
    if (validation.sorted === 'descending' && !pairs.every(([a, b]) => a > b)) {
      return `${label} must be in descending order.`;
    }
  }
  if (validation.item) {
    for (let index = 0; index < value.length; index += 1) {
      const error = numericError(`${label}[${index}]`, value[index], validation.item);
      if (error) {
        return error;
      }
    }
  }
  return null;
}

/**
 * Returns a human-readable message when `param.value` violates its manifest
 * validation, or null when the value is valid/absent.
 */
export function parameterError(param: ModuleParameterSpec | null | undefined): string | null {
  if (!param || param.value === null || param.value === undefined || !param.validation) {
    return null;
  }

  const validation = param.validation;
  switch (param.type) {
    case 'int':
    case 'float':
      return numericError(param.name, param.value, validation);
    case 'str':
      return stringError(param.name, param.value, validation);
    case 'list_int':
      return listError(param.name, param.value, validation);
    case 'dict_str_list_int': {
      if (typeof param.value !== 'object' || Array.isArray(param.value)) {
        return `${param.name} must be a mapping.`;
      }
      for (const key of Object.keys(param.value)) {
        const error = listError(`${param.name}.${key}`, param.value[key], validation);
        if (error) {
          return error;
        }
      }
      return null;
    }
    default:
      return null;
  }
}

function sameKeySet(expected: string[], actual: string[]): boolean {
  if (expected.length !== actual.length) {
    return false;
  }
  const actualSet = new Set(actual);
  return expected.every((key) => actualSet.has(key));
}

/**
 * Evaluates the module-level relational constraints against the module's
 * `{ settingName: value }` map.
 */
export function moduleConstraintErrors(
  values: ModuleValues,
  constraints: ModuleConstraint[] | null | undefined,
): string[] {
  const errors: string[] = [];

  for (const constraint of constraints ?? []) {
    const setting = values[constraint.setting];
    const related = constraint.related_setting ? values[constraint.related_setting] : undefined;
    const fallback = constraint.related_setting
      ? `${constraint.setting} and ${constraint.related_setting} are inconsistent.`
      : `${constraint.setting} is invalid.`;
    const message = constraint.message || fallback;

    switch (constraint.type) {
      case 'less_than':
        if (typeof setting === 'number' && typeof related === 'number' && !(setting < related)) {
          errors.push(message);
        }
        break;
      case 'length_relation':
        if (
          Array.isArray(setting) &&
          Array.isArray(related) &&
          setting.length !== related.length + (constraint.offset ?? 0)
        ) {
          errors.push(message);
        }
        break;
      case 'keys_match': {
        if (!setting || typeof setting !== 'object' || Array.isArray(setting)) {
          break;
        }
        const keys = Object.keys(setting);
        if (constraint.allowed_key_sets && !constraint.allowed_key_sets.some((keySet) => sameKeySet(keySet, keys))) {
          errors.push(message);
        }
        if (
          related &&
          typeof related === 'object' &&
          !Array.isArray(related) &&
          Object.keys(related).length > 0 &&
          !sameKeySet(Object.keys(related), keys)
        ) {
          errors.push(message);
        }
        break;
      }
      case 'per_key_length_relation': {
        if (
          !setting ||
          !related ||
          typeof setting !== 'object' ||
          typeof related !== 'object' ||
          Array.isArray(setting) ||
          Array.isArray(related)
        ) {
          break;
        }
        for (const key of Object.keys(setting)) {
          const settingItems = setting[key];
          const relatedItems = related[key];
          if (
            Array.isArray(settingItems) &&
            Array.isArray(relatedItems) &&
            settingItems.length !== relatedItems.length + (constraint.offset ?? 0)
          ) {
            errors.push(message);
            break;
          }
        }
        break;
      }
    }
  }

  return errors;
}
