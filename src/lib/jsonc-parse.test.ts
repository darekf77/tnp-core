// update-jsonc-content.spec.ts
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse, type ParseError } from 'jsonc-parser';
import { UtilsOs } from 'tnp-core/src';

import { updateJsoncContent, type JsonValue } from './jsonc-parser';

describe('updateJsoncContent', () => {
  let testTempFolder: string;

  beforeAll(() => {
    testTempFolder = UtilsOs.getTempFolder({
      prefix: 'update-jsonc-content-tests',
      deleteAfterDays: 1,
    });
  });

  afterAll(() => {
    rmSync(testTempFolder, {
      recursive: true,
      force: true,
    });
  });

  function updateJsoncFile(
    fileName: string,
    existingContent: string,
    input: JsonValue,
  ): {
    filePath: string;
    content: string;
    value: JsonValue;
  } {
    const filePath = join(testTempFolder, fileName);

    writeFileSync(filePath, existingContent, 'utf8');

    const updatedContent = updateJsoncContent(
      readFileSync(filePath, 'utf8'),
      input,
    );

    writeFileSync(filePath, updatedContent, 'utf8');

    const content = readFileSync(filePath, 'utf8');
    const errors: ParseError[] = [];

    const value = parse(content, errors, {
      allowTrailingComma: true,
      disallowComments: false,
      allowEmptyContent: true,
    }) as JsonValue;

    expect(errors).toEqual([]);

    return {
      filePath,
      content,
      value,
    };
  }

  it('creates an object from empty content', () => {
    const result = updateJsoncFile('empty-object.jsonc', '', {
      name: 'Taon',
      enabled: true,
      port: 3000,
    });

    expect(result.value).toEqual({
      name: 'Taon',
      enabled: true,
      port: 3000,
    });

    expect(result.content).toBe(
      `{
  "name": "Taon",
  "enabled": true,
  "port": 3000
}
`,
    );
  });

  it('creates an array from empty content', () => {
    const result = updateJsoncFile('empty-array.jsonc', '', [
      'one',
      'two',
      'three',
    ]);

    expect(result.value).toEqual(['one', 'two', 'three']);

    expect(result.content).toBe(
      `[
  "one",
  "two",
  "three"
]
`,
    );
  });

  it('updates existing primitive properties', () => {
    const existingContent = `{
  "name": "Old name",
  "enabled": false,
  "port": 1000
}
`;

    const result = updateJsoncFile('update-primitives.jsonc', existingContent, {
      name: 'New name',
      enabled: true,
      port: 4200,
    });

    expect(result.value).toEqual({
      name: 'New name',
      enabled: true,
      port: 4200,
    });
  });

  it('adds new object properties', () => {
    const existingContent = `{
  "name": "Taon"
}
`;

    const result = updateJsoncFile('add-properties.jsonc', existingContent, {
      name: 'Taon',
      version: 21,
      production: false,
    });

    expect(result.value).toEqual({
      name: 'Taon',
      version: 21,
      production: false,
    });

    expect(result.content).toContain('"version": 21');
    expect(result.content).toContain('"production": false');
  });

  it('removes properties missing from the input object', () => {
    const existingContent = `{
  "name": "Taon",
  "obsolete": true,
  "port": 3000
}
`;

    const result = updateJsoncFile('remove-properties.jsonc', existingContent, {
      name: 'Taon',
      port: 3000,
    });

    expect(result.value).toEqual({
      name: 'Taon',
      port: 3000,
    });

    expect(result.content).not.toContain('"obsolete"');
  });

  it('updates nested objects recursively', () => {
    const existingContent = `{
  "server": {
    "host": "localhost",
    "port": 3000,
    "legacy": true
  }
}
`;

    const result = updateJsoncFile('nested-object.jsonc', existingContent, {
      server: {
        host: '127.0.0.1',
        port: 4200,
        secure: true,
      },
    });

    expect(result.value).toEqual({
      server: {
        host: '127.0.0.1',
        port: 4200,
        secure: true,
      },
    });

    expect(result.content).not.toContain('"legacy"');
  });

  it('preserves comments belonging to unchanged properties', () => {
    const existingContent = `{
  // Application name
  "name": "Taon",

  // Server configuration
  "server": {
    // HTTP port
    "port": 3000
  }
}
`;

    const result = updateJsoncFile('preserve-comments.jsonc', existingContent, {
      name: 'Taon',
      server: {
        port: 4200,
      },
    });

    expect(result.value).toEqual({
      name: 'Taon',
      server: {
        port: 4200,
      },
    });

    expect(result.content).toContain('// Application name');
    expect(result.content).toContain('// Server configuration');
    expect(result.content).toContain('// HTTP port');
  });

  it('accepts trailing commas', () => {
    const existingContent = `{
  "name": "Taon",
  "items": [
    "one",
    "two",
  ],
}
`;

    const result = updateJsoncFile('trailing-commas.jsonc', existingContent, {
      name: 'Taon',
      items: ['one', 'two', 'three'],
    });

    expect(result.value).toEqual({
      name: 'Taon',
      items: ['one', 'two', 'three'],
    });
  });

  it('updates existing array elements', () => {
    const existingContent = `{
  "items": [
    "one",
    "two",
    "three"
  ]
}
`;

    const result = updateJsoncFile('update-array.jsonc', existingContent, {
      items: ['one', 'changed', 'three'],
    });

    expect(result.value).toEqual({
      items: ['one', 'changed', 'three'],
    });
  });

  it('appends new array elements', () => {
    const existingContent = `{
  "items": [
    "one"
  ]
}
`;

    const result = updateJsoncFile('append-array.jsonc', existingContent, {
      items: ['one', 'two', 'three'],
    });

    expect(result.value).toEqual({
      items: ['one', 'two', 'three'],
    });
  });

  it('removes extra array elements', () => {
    const existingContent = `{
  "items": [
    "one",
    "two",
    "three",
    "four"
  ]
}
`;

    const result = updateJsoncFile('shrink-array.jsonc', existingContent, {
      items: ['one', 'two'],
    });

    expect(result.value).toEqual({
      items: ['one', 'two'],
    });

    expect(result.content).not.toContain('"three"');
    expect(result.content).not.toContain('"four"');
  });

  it('synchronizes objects nested inside arrays', () => {
    const existingContent = `{
  "workers": [
    {
      "name": "worker-one",
      "enabled": false,
      "obsolete": true
    },
    {
      "name": "worker-two",
      "enabled": true
    }
  ]
}
`;

    const result = updateJsoncFile(
      'objects-inside-array.jsonc',
      existingContent,
      {
        workers: [
          {
            name: 'worker-one',
            enabled: true,
          },
          {
            name: 'worker-two-renamed',
            enabled: true,
          },
          {
            name: 'worker-three',
            enabled: false,
          },
        ],
      },
    );

    expect(result.value).toEqual({
      workers: [
        {
          name: 'worker-one',
          enabled: true,
        },
        {
          name: 'worker-two-renamed',
          enabled: true,
        },
        {
          name: 'worker-three',
          enabled: false,
        },
      ],
    });
  });

  it('replaces an object with an array', () => {
    const existingContent = `{
  "value": {
    "nested": true
  }
}
`;

    const result = updateJsoncFile('object-to-array.jsonc', existingContent, {
      value: ['one', 'two'],
    });

    expect(result.value).toEqual({
      value: ['one', 'two'],
    });
  });

  it('replaces an array with an object', () => {
    const existingContent = `{
  "value": [
    "one",
    "two"
  ]
}
`;

    const result = updateJsoncFile('array-to-object.jsonc', existingContent, {
      value: {
        first: 'one',
        second: 'two',
      },
    });

    expect(result.value).toEqual({
      value: {
        first: 'one',
        second: 'two',
      },
    });
  });

  it('supports null values', () => {
    const existingContent = `{
  "value": "something"
}
`;

    const result = updateJsoncFile('null-value.jsonc', existingContent, {
      value: null,
    });

    expect(result.value).toEqual({
      value: null,
    });
  });

  it('replaces the root object with a root array', () => {
    const existingContent = `{
  "name": "Taon"
}
`;

    const result = updateJsoncFile(
      'root-object-to-array.jsonc',
      existingContent,
      ['one', 'two'],
    );

    expect(result.value).toEqual(['one', 'two']);
  });

  it('replaces the root array with a root object', () => {
    const existingContent = `[
  "one",
  "two"
]
`;

    const result = updateJsoncFile(
      'root-array-to-object.jsonc',
      existingContent,
      {
        first: 'one',
        second: 'two',
      },
    );

    expect(result.value).toEqual({
      first: 'one',
      second: 'two',
    });
  });

  it('does not modify semantically identical content', () => {
    const existingContent = `{
  // This comment should remain exactly where it is.
  "name": "Taon",
  "config": {
    "enabled": true
  }
}
`;

    const updatedContent = updateJsoncContent(existingContent, {
      name: 'Taon',
      config: {
        enabled: true,
      },
    });

    expect(updatedContent).toBe(existingContent);
  });

  it('always returns content ending with a newline', () => {
    const updatedContent = updateJsoncContent('{"name":"Taon"}', {
      name: 'Taon',
    });

    expect(updatedContent.endsWith('\n')).toBe(true);
  });

  it('throws for invalid JSONC content', () => {
    const invalidContent = `{
  "name": "Taon",
  "broken":
}
`;

    expect(() =>
      updateJsoncContent(invalidContent, {
        name: 'Taon',
      }),
    ).toThrowError(/^Invalid JSONC:/);
  });

  it('includes parser error details in the thrown error', () => {
    const invalidContent = `{
  "name": "Taon"
  "port": 3000
}
`;

    expect(() =>
      updateJsoncContent(invalidContent, {
        name: 'Taon',
      }),
    ).toThrowError(/Invalid JSONC: .* at offset \d+/);
  });

  it('uses two-space formatting for newly inserted nested values', () => {
    const existingContent = `{
  "name": "Taon"
}
`;

    const result = updateJsoncFile('formatting.jsonc', existingContent, {
      name: 'Taon',
      build: {
        target: 'node',
        options: {
          minify: true,
        },
      },
    });

    expect(result.content).toContain(
      `  "build": {
    "target": "node",
    "options": {
      "minify": true
    }
  }`,
    );
  });

  it('can be called repeatedly without changing the result', () => {
    const input: JsonValue = {
      name: 'Taon',
      workers: [
        {
          name: 'worker-one',
          enabled: true,
        },
      ],
    };

    const firstResult = updateJsoncContent(
      `{
  // Framework configuration
  "name": "Old name",
  "workers": []
}
`,
      input,
    );

    const secondResult = updateJsoncContent(firstResult, input);

    expect(secondResult).toBe(firstResult);
  });
});
