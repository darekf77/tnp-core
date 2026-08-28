import { UtilsJson } from 'tnp-core/src';

describe('UtilsJson.UtilsJson.validateLodashPath', () => {
  describe('valid paths', () => {
    it.each([
      ['foo', 'foo'],
      ['foo.bar', 'foo.bar'],
      ['foo.bar.baz', 'foo.bar.baz'],
      ['foo[0]', 'foo[0]'],
      ['foo[0].bar', 'foo[0].bar'],
      ['foo.bar[123].baz', 'foo.bar[123].baz'],
      ['foo[0][1].bar', 'foo[0][1].bar'],
      ['_foo.bar', '_foo.bar'],
      ['$foo.bar', '$foo.bar'],
      ['foo.bar_123', 'foo.bar_123'],
      ['  foo.bar  ', 'foo.bar'],
    ])('accepts %s', (input, expected) => {
      expect(UtilsJson.validateLodashPath(input)).toBe(expected);
    });

    it('accepts path passed as array', () => {
      expect(UtilsJson.validateLodashPath(['foo', 'bar', 'baz'])).toBe(
        'foo.bar.baz',
      );
    });
  });

  describe('invalid paths', () => {
    it.each([
      '',
      '   ',
      '.foo',
      'foo.',
      'foo..bar',
      'foo...',
      'foo[]',
      'foo[abc]',
      'foo[asd].bar',
      'foo[-1]',
      'foo[1.2]',
      'foo.[0]',
      'foo..bar[0]',
      'foo[0]..bar',
      'foo bar',
      'foo/bar',
      'foo\\.bar',
    ])('rejects malformed path "%s"', path => {
      expect(() => UtilsJson.validateLodashPath(path)).toThrow(
        /Invalid lodash path/,
      );
    });

    it('rejects empty array path', () => {
      expect(() => UtilsJson.validateLodashPath([])).toThrow(
        /Invalid lodash path/,
      );
    });

    it('rejects non-string values', () => {
      expect(() => UtilsJson.validateLodashPath(null as any)).toThrow(
        /Invalid lodash path/,
      );

      expect(() => UtilsJson.validateLodashPath(undefined as any)).toThrow(
        /Invalid lodash path/,
      );

      expect(() => UtilsJson.validateLodashPath(123 as any)).toThrow(
        /Invalid lodash path/,
      );
    });
  });

  describe('prototype pollution protection', () => {
    it.each([
      '__proto__',
      '__proto__.foo',
      'foo.__proto__',
      'foo.__proto__.bar',

      'prototype',
      'foo.prototype',
      'foo.prototype.bar',

      'constructor',
      'foo.constructor',
      'foo.constructor.prototype',
      'foo.constructor.prototype.polluted',
    ])('rejects forbidden key "%s"', path => {
      expect(() => UtilsJson.validateLodashPath(path)).toThrow(
        /forbidden key/i,
      );
    });
  });
});
