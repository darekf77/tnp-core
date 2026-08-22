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
        rawRenderTagString: `<!-- @render './my-file' -->`,
        magicRenameRules: '',
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
        rawRenderTagString: `<!-- @render './my-file' { title: "asdas" } -->`,
        magicRenameRules: '',
      },
    ]);
  });

  it('should support magic rename rules', () => {
    const md = `
      <!-- @render './my-file' { title: "asdas" } 'tnp -> taon' -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './my-file',
        context: {
          title: 'asdas',
        },
        rawRenderTagString: `<!-- @render './my-file' { title: "asdas" } 'tnp -> taon' -->`,
        magicRenameRules: 'tnp -> taon',
      },
    ]);
  });

  it('should support magic rename rules without context', () => {
    const md = `
      <!-- @render './my-file' 'tnp -> taon' -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './my-file',
        context: undefined,
        rawRenderTagString: `<!-- @render './my-file' 'tnp -> taon' -->`,
        magicRenameRules: 'tnp -> taon',
      },
    ]);
  });

  it('should support double quotes for magic rename rules', () => {
    const md = `
      <!-- @render './my-file' "tnp -> taon" -->
    `;

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './my-file',
        context: undefined,
        rawRenderTagString: `<!-- @render './my-file' "tnp -> taon" -->`,
        magicRenameRules: 'tnp -> taon',
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
        rawRenderTagString: `<!-- @render "./my-file" { title: 'asdas' } -->`,
        magicRenameRules: '',
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
        rawRenderTagString: `<!-- @render 'taon/README.md' -->`,
        magicRenameRules: '',
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
        rawRenderTagString: `<!-- @render 'taon/docs/introduction.md' -->`,
        magicRenameRules: '',
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
        rawRenderTagString: `<!-- @render '@taon-dev/api-workers/docs/introduction.md' -->`,
        magicRenameRules: '',
      },
    ]);
  });

  it('should support // @render syntax', () => {
    const md = [
      `// @render './my-file' { title: "asdas" }`,
      `// @render "./other-file" { title: 'hello' } 'tnp -> taon'`,
    ].join('\n');

    expect(UtilsMdDocs.getRenderImports(md)).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './my-file',
        context: {
          title: 'asdas',
        },
        rawRenderTagString: `// @render './my-file' { title: "asdas" }`,
        magicRenameRules: '',
      },
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './other-file',
        context: {
          title: 'hello',
        },
        rawRenderTagString: `// @render "./other-file" { title: 'hello' } 'tnp -> taon'`,
        magicRenameRules: 'tnp -> taon',
      },
    ]);
  });

  it('should support multiple context properties', () => {
    const md = `
      <!-- @render './my-file' {
        title: 'Hello',
        count: 123,
        enabled: true
      } 'tnp -> taon' -->
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
        rawRenderTagString: `<!-- @render './my-file' {
        title: 'Hello',
        count: 123,
        enabled: true
      } 'tnp -> taon' -->`,
        magicRenameRules: 'tnp -> taon',
      },
    ]);
  });

  it('should extract multiple renders from document', () => {
    const md = `
      # Hello

      <!-- @render './header' -->

      Some text.

      <!-- @render 'taon/docs/introduction.md' { title: 'Taon' } 'tnp -> taon' -->

      More text.

      <!-- @render '@taon-dev/api-workers/docs/api.md' -->
    `;

    const result = UtilsMdDocs.getRenderImports(md);

    expect(result).toHaveLength(3);

    expect(result).toEqual([
      {
        packageName: undefined,
        isLocal: true,
        relativePath: './header',
        context: undefined,
        rawRenderTagString: `<!-- @render './header' -->`,
        magicRenameRules: '',
      },
      {
        packageName: 'taon',
        isLocal: false,
        relativePath: 'docs/introduction.md',
        context: {
          title: 'Taon',
        },
        rawRenderTagString: `<!-- @render 'taon/docs/introduction.md' { title: 'Taon' } 'tnp -> taon' -->`,
        magicRenameRules: 'tnp -> taon',
      },
      {
        packageName: '@taon-dev/api-workers',
        isLocal: false,
        relativePath: 'docs/api.md',
        context: undefined,
        rawRenderTagString: `<!-- @render '@taon-dev/api-workers/docs/api.md' -->`,
        magicRenameRules: '',
      },
    ]);
  });

  it('should preserve original render tag formatting', () => {
    const md = `
Some content

<!--   @render   "./my-file"   { title: 'Hello' }   'tnp -> taon'   -->

More content
`;

    const [result] = UtilsMdDocs.getRenderImports(md);

    expect(result.rawRenderTagString).toBe(
      `<!--   @render   "./my-file"   { title: 'Hello' }   'tnp -> taon'   -->`,
    );

    expect(result.magicRenameRules).toBe('tnp -> taon');
  });

  it('should allow replacing raw render tag in original content', () => {
    const md = `
# Header

<!-- @render './my-file' { title: 'Hello' } 'tnp -> taon' -->

Footer
`;

    const [renderImport] = UtilsMdDocs.getRenderImports(md);

    const replaced = md.replace(
      renderImport.rawRenderTagString,
      'RENDERED FILE CONTENT',
    );

    expect(replaced).toContain('RENDERED FILE CONTENT');
    expect(replaced).not.toContain("@render './my-file'");
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
