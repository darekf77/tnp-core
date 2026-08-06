import {
  applyEdits,
  modify,
  parse,
  printParseErrorCode,
  type FormattingOptions,
  type ParseError,
} from 'jsonc-parser';

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const jsoncFormattingOptions: FormattingOptions = {
  insertSpaces: true,
  tabSize: 2,
  eol: '\n',
};

export function updateJsoncContent(
  existingContent: string,
  input: JsonValue,
): string {
  let content = existingContent.trim()
    ? existingContent
    : Array.isArray(input)
      ? '[]'
      : '{}';

  const errors: ParseError[] = [];

  const currentValue = parse(content, errors, {
    allowTrailingComma: true,
    disallowComments: false,
    allowEmptyContent: true,
  }) as JsonValue | undefined;

  if (errors.length > 0) {
    const details = errors
      .map(
        error =>
          `${printParseErrorCode(error.error)} at offset ${error.offset}`,
      )
      .join(', ');

    throw new Error(`Invalid JSONC: ${details}`);
  }

  const applyModification = (
    path: (string | number)[],
    value: JsonValue | undefined,
  ): void => {
    const edits = modify(content, path, value, {
      formattingOptions: jsoncFormattingOptions,
    });

    content = applyEdits(content, edits);
  };

  const synchronize = (
    current: JsonValue | undefined,
    next: JsonValue,
    path: (string | number)[],
  ): void => {
    if (isPlainObject(current) && isPlainObject(next)) {
      // Remove properties that no longer exist.
      for (const key of Object.keys(current)) {
        if (!Object.prototype.hasOwnProperty.call(next, key)) {
          applyModification([...path, key], undefined);
        }
      }

      // Update existing properties and add new ones.
      for (const key of Object.keys(next)) {
        synchronize(current[key], next[key], [...path, key]);
      }

      return;
    }

    if (Array.isArray(current) && Array.isArray(next)) {
      const sharedLength = Math.min(current.length, next.length);

      for (let index = 0; index < sharedLength; index++) {
        synchronize(current[index], next[index], [...path, index]);
      }

      // Remove backwards so indexes remain valid.
      for (let index = current.length - 1; index >= next.length; index--) {
        applyModification([...path, index], undefined);
      }

      // Append new values.
      for (let index = current.length; index < next.length; index++) {
        applyModification([...path, index], next[index]);
      }

      return;
    }

    if (!deepEqual(current, next)) {
      applyModification(path, next);
    }
  };

  synchronize(currentValue, input, []);

  return content.endsWith('\n') ? content : `${content}\n`;
}

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => deepEqual(value, right[index]))
    );
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        key =>
          Object.prototype.hasOwnProperty.call(right, key) &&
          deepEqual(left[key], right[key]),
      )
    );
  }

  return false;
}
