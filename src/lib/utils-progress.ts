import { _ } from './core-imports';

//#region @backend
declare const global: any;
//#endregion

export namespace UtilsProgress {
  const PROGRESS_PREFIX = '[[[';
  const PROGRESS_SUFFIX = ']]]';

  export type TaonProgressType = 'info' | 'warning' | 'error' | 'event';

  //#region taon progress event
  export interface TaonProgressEvent {
    /**
     * Absolute progress value from 0 to 100.
     */
    value?: number;

    message?: string;
    type?: TaonProgressType;

    /**
     * ISO date string.
     */
    date?: string;
  }
  //#endregion

  //#region resolve options
  export interface ResolveProgressOptions {
    callbackOnFounded?: (event: TaonProgressEvent) => void;

    /**
     * When enabled, malformed progress messages are logged.
     */
    logParseErrors?: boolean;
  }
  //#endregion

  //#region emit progress
  export function emitProgress(
    event: TaonProgressEvent,
    forceShow = false,
  ): void {
    const normalizedEvent: TaonProgressEvent = {
      ...event,
      value: normalizeProgressValue(event.value),
      date: event.date ?? new Date().toISOString(),
    };

    const dataToWrite =
      `${PROGRESS_PREFIX}` +
      `${JSON.stringify(normalizedEvent)}` +
      `${PROGRESS_SUFFIX}`;

    //#region @backend
    if (forceShow || global.taonNonInteractive) {
      process.stdout.write(`${dataToWrite}\n`);
    }

    return;
    //#endregion

    //#region @browser
    if (forceShow || globalThis.taonNonInteractive) {
      console.log(dataToWrite);
    }
    //#endregion
  }
  //#endregion

  //#region resolve from
  export function resolveFrom(
    chunk: string,
    options: ResolveProgressOptions = {},
    checkSplit = true,
  ): TaonProgressEvent[] {
    options = options || {};
    if (!_.isString(chunk)) {
      return [];
    }

    if (_.isNil(checkSplit)) {
      checkSplit = true;
    }

    if (checkSplit) {
      const lines = chunk.split(/\r\n|\n|\r/);

      if (lines.length > 1) {
        return lines.flatMap(line => resolveFrom(line, options, false));
      }
    }

    const result: TaonProgressEvent[] = [];
    const trimmedChunk = chunk.trim();

    if (!trimmedChunk) {
      return result;
    }

    /*
     * A line may contain one or multiple progress events:
     *
     * [[[{"value":10}]]]
     *
     * or:
     *
     * normal log [[[{"value":10}]]] another log
     */
    const progressJsonParts = extractProgressJsonParts(trimmedChunk);

    for (const progressJson of progressJsonParts) {
      const event = parseTaonProgressJson(progressJson, options);

      if (!event) {
        continue;
      }

      result.push(event);
      options.callbackOnFounded?.(event);
    }

    return result;
  }
  //#endregion

  //#region has progress event
  export function hasProgressEvent(chunk: string): boolean {
    return resolveFrom(chunk).length > 0;
  }
  //#endregion

  //#region parse taon progress line
  export function parseTaonProgressLine(
    line: string,
  ): TaonProgressEvent | undefined {
    if (!_.isString(line)) {
      return undefined;
    }

    const trimmed = line.trim();

    if (
      !trimmed.startsWith(PROGRESS_PREFIX) ||
      !trimmed.endsWith(PROGRESS_SUFFIX)
    ) {
      return undefined;
    }

    const json = trimmed.slice(PROGRESS_PREFIX.length, -PROGRESS_SUFFIX.length);

    return parseTaonProgressJson(json);
  }
  //#endregion

  //#region extract progress json parts
  function extractProgressJsonParts(chunk: string): string[] {
    const result: string[] = [];

    let searchIndex = 0;

    while (searchIndex < chunk.length) {
      const prefixIndex = chunk.indexOf(PROGRESS_PREFIX, searchIndex);

      if (prefixIndex === -1) {
        break;
      }

      const jsonStart = prefixIndex + PROGRESS_PREFIX.length;

      const suffixIndex = chunk.indexOf(PROGRESS_SUFFIX, jsonStart);

      if (suffixIndex === -1) {
        break;
      }

      result.push(chunk.slice(jsonStart, suffixIndex));

      searchIndex = suffixIndex + PROGRESS_SUFFIX.length;
    }

    return result;
  }
  //#endregion

  //#region parse progress json
  function parseTaonProgressJson(
    json: string,
    options: ResolveProgressOptions = {},
  ): TaonProgressEvent | undefined {
    try {
      const parsed: unknown = JSON.parse(json);

      if (!isTaonProgressEvent(parsed)) {
        if (options.logParseErrors) {
          console.error(`Invalid Taon progress event: ${json}`);
        }

        return undefined;
      }

      return {
        ...parsed,
        value: normalizeProgressValue(parsed.value),
      };
    } catch (error) {
      if (options.logParseErrors) {
        console.error(`Cannot parse Taon progress event: ${json}`, error);
      }

      return undefined;
    }
  }
  //#endregion

  //#region normalize progress value
  function normalizeProgressValue(
    value: number | undefined,
  ): number | undefined {
    if (typeof value !== 'number') {
      return undefined;
    }

    if (!Number.isFinite(value)) {
      return undefined;
    }

    return Math.max(0, Math.min(100, value));
  }
  //#endregion

  //#region is taon progress event
  function isTaonProgressEvent(value: unknown): value is TaonProgressEvent {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const event = value as Record<string, unknown>;

    return (
      isOptionalFiniteNumber(event.value) &&
      isOptionalString(event.message) &&
      isOptionalProgressType(event.type) &&
      isOptionalIsoDateString(event.date)
    );
  }
  //#endregion

  //#region validators
  function isOptionalFiniteNumber(value: unknown): boolean {
    return (
      value === undefined ||
      (typeof value === 'number' && Number.isFinite(value))
    );
  }

  function isOptionalString(value: unknown): boolean {
    return value === undefined || typeof value === 'string';
  }

  function isOptionalProgressType(
    value: unknown,
  ): value is TaonProgressType | undefined {
    return (
      value === undefined ||
      value === 'info' ||
      value === 'warning' ||
      value === 'error' ||
      value === 'event'
    );
  }

  function isOptionalIsoDateString(value: unknown): boolean {
    if (value === undefined) {
      return true;
    }

    if (typeof value !== 'string') {
      return false;
    }

    return !Number.isNaN(Date.parse(value));
  }
  //#endregion
}
