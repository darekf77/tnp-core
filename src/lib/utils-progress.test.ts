import { UtilsProgress } from 'tnp-core/src';

describe('UtilsProgress', () => {
  const originalTaonNonInteractive = (globalThis as any).taonNonInteractive;

  beforeEach(() => {
    (globalThis as any).taonNonInteractive = false;
  });

  afterEach(() => {
    (globalThis as any).taonNonInteractive = originalTaonNonInteractive;

    vi.restoreAllMocks();
  });

  describe('emitProgress', () => {
    it('emits a serialized progress event', () => {
      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      UtilsProgress.emitProgress(
        {
          value: 25,
          message: 'Downloading model',
          type: 'info',
          date: '2026-07-27T10:00:00.000Z',
        },
        true,
      );

      expect(writeSpy).toHaveBeenCalledOnce();
      expect(writeSpy).toHaveBeenCalledWith(
        '[[[{"value":25,"message":"Downloading model","type":"info","date":"2026-07-27T10:00:00.000Z"}]]]\n',
      );
    });

    it('adds an ISO date when date is missing', () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2026-07-27T12:30:00.000Z'));

      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      UtilsProgress.emitProgress(
        {
          value: 50,
          message: 'Loading AI',
        },
        true,
      );

      expect(writeSpy).toHaveBeenCalledWith(
        '[[[{"value":50,"message":"Loading AI","date":"2026-07-27T12:30:00.000Z"}]]]\n',
      );

      vi.useRealTimers();
    });

    it('does not emit without forceShow or non-interactive mode', () => {
      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      UtilsProgress.emitProgress({
        value: 10,
        message: 'Hidden progress',
      });

      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('emits when taonNonInteractive is enabled', () => {
      (globalThis as any).taonNonInteractive = true;

      const writeSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);

      UtilsProgress.emitProgress({
        value: 75,
        message: 'Working',
      });

      expect(writeSpy).toHaveBeenCalledOnce();
    });
  });

  describe('resolveFrom', () => {
    it('resolves a valid progress event', () => {
      const result = UtilsProgress.resolveFrom(
        '[[[{"value":42,"message":"Translating","type":"event","date":"2026-07-27T10:00:00.000Z"}]]]',
        {},
      );

      expect(result).toEqual([
        {
          value: 42,
          message: 'Translating',
          type: 'event',
          date: '2026-07-27T10:00:00.000Z',
        },
      ]);
    });

    it('resolves multiple events from multiple lines', () => {
      const chunk = [
        '[[[{"value":10,"message":"Starting"}]]]',
        'ordinary output',
        '[[[{"value":80,"message":"Almost done"}]]]',
      ].join('\n');

      const result = UtilsProgress.resolveFrom(chunk, {});

      expect(result).toEqual([
        {
          value: 10,
          message: 'Starting',
        },
        {
          value: 80,
          message: 'Almost done',
        },
      ]);
    });

    it('resolves an event embedded in ordinary output', () => {
      const result = UtilsProgress.resolveFrom(
        'Loading... [[[{"value":50,"message":"Halfway"}]]] please wait',
        {},
      );

      expect(result).toEqual([
        {
          value: 50,
          message: 'Halfway',
        },
      ]);
    });

    it('resolves multiple events from one line', () => {
      const result = UtilsProgress.resolveFrom(
        [
          '[[[{"value":10,"message":"First"}]]]',
          ' some output ',
          '[[[{"value":20,"message":"Second"}]]]',
        ].join(''),
        {},
      );

      expect(result).toEqual([
        {
          value: 10,
          message: 'First',
        },
        {
          value: 20,
          message: 'Second',
        },
      ]);
    });

    it('calls callbackOnFounded for every resolved event', () => {
      const callback = vi.fn();

      UtilsProgress.resolveFrom(
        [
          '[[[{"value":10,"message":"First"}]]]',
          '[[[{"value":20,"message":"Second"}]]]',
        ].join('\n'),
        {
          callbackOnFounded: callback,
        },
      );

      expect(callback).toHaveBeenCalledTimes(2);

      expect(callback).toHaveBeenNthCalledWith(1, {
        value: 10,
        message: 'First',
      });

      expect(callback).toHaveBeenNthCalledWith(2, {
        value: 20,
        message: 'Second',
      });
    });

    it('returns an empty array for ordinary output', () => {
      expect(
        UtilsProgress.resolveFrom('This is an ordinary console message', {}),
      ).toEqual([]);
    });

    it('returns an empty array for malformed JSON', () => {
      expect(
        UtilsProgress.resolveFrom('[[[{"value":50,invalid-json}]]]', {}),
      ).toEqual([]);
    });

    it('returns an empty array for an invalid event shape', () => {
      expect(
        UtilsProgress.resolveFrom(
          '[[[{"value":"not-a-number","message":123}]]]',
          {},
        ),
      ).toEqual([]);
    });

    it.each([
      ['invalid type', { type: 'success' }],
      ['invalid date', { date: 123 }],
      ['array', []],
      ['null', null],
      ['primitive', 'progress'],
    ])('rejects %s', (_name, data) => {
      const chunk = `[[[${JSON.stringify(data)}]]]`;

      expect(UtilsProgress.resolveFrom(chunk, {})).toEqual([]);
    });

    it('ignores an unfinished progress event', () => {
      expect(
        UtilsProgress.resolveFrom('[[[{"value":50,"message":"Incomplete"}', {}),
      ).toEqual([]);
    });

    it('handles Windows line endings', () => {
      const chunk =
        '[[[{"value":10,"message":"First"}]]]\r\n' +
        '[[[{"value":20,"message":"Second"}]]]\r\n';

      expect(UtilsProgress.resolveFrom(chunk, {})).toHaveLength(2);
    });

    it('handles empty input', () => {
      expect(UtilsProgress.resolveFrom('', {})).toEqual([]);

      expect(UtilsProgress.resolveFrom('   \n  ', {})).toEqual([]);
    });
  });

  describe('parseTaonProgressLine', () => {
    it('parses a complete progress-only line', () => {
      expect(
        UtilsProgress.parseTaonProgressLine(
          '  [[[{"value":33,"message":"Processing"}]]]  ',
        ),
      ).toEqual({
        value: 33,
        message: 'Processing',
      });
    });

    it('does not parse an embedded event as a complete line', () => {
      expect(
        UtilsProgress.parseTaonProgressLine('log [[[{"value":33}]]] output'),
      ).toBeUndefined();
    });

    it('returns undefined for malformed JSON', () => {
      expect(
        UtilsProgress.parseTaonProgressLine('[[[{invalid-json}]]]'),
      ).toBeUndefined();
    });

    it('returns undefined for unsupported event types', () => {
      expect(
        UtilsProgress.parseTaonProgressLine('[[[{"type":"success"}]]]'),
      ).toBeUndefined();
    });
  });

  describe('hasProgressEvent', () => {
    it('returns true when progress is present', () => {
      expect(
        UtilsProgress.hasProgressEvent('log [[[{"value":50}]]] text'),
      ).toBe(true);
    });

    it('returns false when progress is absent', () => {
      expect(UtilsProgress.hasProgressEvent('ordinary output')).toBe(false);
    });
  });
});
