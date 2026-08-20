import { UtilsMdDocs } from 'tnp-core/src';

describe('UtilsMdDocs.getRenderImports', () => {
  it('should extract local render without context', () => {
    const md = `
      <!-- @render './my-file' -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './my-file',
        context: undefined,
      },
    ]);
  });

  it('should extract local render with context', () => {
    const md = `
      <!-- @render './my-file' { title: "asdas" } -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './my-file',
        context: {
          title: 'asdas',
        },
      },
    ]);
  });

  it('should support single quotes inside context', () => {
    const md = `
      <!-- @render "./my-file" { title: 'asdas' } -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './my-file',
        context: {
          title: 'asdas',
        },
      },
    ]);
  });

  it('should extract normal npm package', () => {
    const md = `
      <!-- @render 'taon/README.md' -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: 'taon',
        isLocal: false,
        relativePath: 'README.md',
        context: undefined,
      },
    ]);
  });

  it('should extract nested path from normal npm package', () => {
    const md = `
      <!-- @render 'taon/docs/introduction.md' -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: 'taon',
        isLocal: false,
        relativePath: 'docs/introduction.md',
        context: undefined,
      },
    ]);
  });

  it('should extract scoped npm package', () => {
    const md = `
      <!-- @render '@taon-dev/api-workers/docs/introduction.md' -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: '@taon-dev/api-workers',
        isLocal: false,
        relativePath: 'docs/introduction.md',
        context: undefined,
      },
    ]);
  });

  it('should support // @render syntax', () => {
    const md = `
      // @render './my-file' { title: "asdas" }
      // @render "./other-file" { title: 'hello' }
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './my-file',
        context: {
          title: 'asdas',
        },
      },
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './other-file',
        context: {
          title: 'hello',
        },
      },
    ]);
  });

  it('should support multiple context properties', () => {
    const md = `
      <!-- @render './my-file' {
        title: 'Hello',
        count: 123,
        enabled: true
      } -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './my-file',
        context: {
          title: 'Hello',
          count: 123,
          enabled: true,
        },
      },
    ]);
  });

  it('should extract multiple renders from document', () => {
    const md = `
      # Hello

      <!-- @render './header' -->

      Some text.

      <!-- @render 'taon/docs/introduction.md' { title: 'Taon' } -->

      More text.

      <!-- @render '@taon-dev/api-workers/docs/api.md' -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toHaveLength(3);

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './header',
        context: undefined,
      },
      {
        packageName: 'taon',
        isLocal: false,
        relativePath: 'docs/introduction.md',
        context: {
          title: 'Taon',
        },
      },
      {
        packageName: '@taon-dev/api-workers',
        isLocal: false,
        relativePath: 'docs/api.md',
        context: undefined,
      },
    ]);
  });

  it('should throw for invalid context', () => {
    const md = `
      <!-- @render './my-file' { title: } -->
    `;

    expect(() => UtilsMdDocs.getRenderImports(md)).toThrow(
      'Invalid @render context for "./my-file"',
    );
  });
});
