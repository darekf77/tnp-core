// import { UtilsImports } from './utils-imports';

// describe('UtilsImports.replaceEsmSyncImports', () => {
//   const packages = ['@angular/compiler'];

//   it('replaces named import', () => {
//     const input = `
// import { parseTemplate } from '@angular/compiler';
// `;

//     expect(UtilsImports.replaceEsmSyncImports(input, packages)).toContain(
//       `const { parseTemplate } = globalThis.__global_imports__['@angular/compiler'];`,
//     );
//   });

//   it('replaces multiline named import', () => {
//     const input = `
// import {
//   AST,
//   Binary,
//   parseTemplate,
//   TmplAstNode,
// } from '@angular/compiler';
// `;

//     expect(UtilsImports.replaceEsmSyncImports(input, packages)).toContain(`
// const {
//   AST,
//   Binary,
//   parseTemplate,
//   TmplAstNode,
// } = globalThis.__global_imports__['@angular/compiler'];`);
//   });

//   it('replaces default import', () => {
//     const input = `
// import compiler from '@angular/compiler';
// `;

//     expect(UtilsImports.replaceEsmSyncImports(input, packages)).toContain(
//       `const compiler = globalThis.__global_imports__['@angular/compiler'].default;`,
//     );
//   });

//   it('replaces namespace import', () => {
//     const input = `
// import * as compiler from '@angular/compiler';
// `;

//     expect(UtilsImports.replaceEsmSyncImports(input, packages)).toContain(
//       `const compiler = globalThis.__global_imports__['@angular/compiler'];`,
//     );
//   });

//   it('replaces default + named import', () => {
//     const input = `
// import compiler, { parseTemplate, AST } from '@angular/compiler';
// `;

//     const output = UtilsImports.replaceEsmSyncImports(input, packages);

//     expect(output).toContain(
//       `const compiler = globalThis.__global_imports__['@angular/compiler'].default;`,
//     );

//     expect(output).toContain(
//       `const { parseTemplate, AST } = globalThis.__global_imports__['@angular/compiler'];`,
//     );
//   });

//   it('replaces multiline default + named import', () => {
//     const input = `
// import compiler, {
//   AST,
//   Binary,
//   parseTemplate,
// } from '@angular/compiler';
// `;

//     const output = UtilsImports.replaceEsmSyncImports(input, packages);

//     expect(output).toContain(
//       `const compiler = globalThis.__global_imports__['@angular/compiler'].default;`,
//     );

//     //     expect(output).toContain(`
//     // const {
//     //   AST,
//     //   Binary,
//     //   parseTemplate,
//     // } = globalThis.__global_imports__['@angular/compiler'];`);
//     //   });

//     expect(output).toContain(
//       `const {
//   AST,
//   Binary,
//   parseTemplate,
// } = globalThis.__global_imports__['@angular/compiler'];`,
//     );
//   });

//   it('does not touch other packages', () => {
//     const input = `
// import { readFileSync } from 'fs';
// `;

//     expect(UtilsImports.replaceEsmSyncImports(input, packages)).toBe(input);
//   });

//   it('replaces only configured package', () => {
//     const input = `
// import { parseTemplate } from '@angular/compiler';
// import { Component } from '@angular/core';
// `;

//     const output = UtilsImports.replaceEsmSyncImports(input, packages);

//     expect(output).toContain(
//       `const { parseTemplate } = globalThis.__global_imports__['@angular/compiler'];`,
//     );

//     expect(output).toContain(`import { Component } from '@angular/core';`);
//   });

//   it('replaces multiple imports in one file', () => {
//     const input = `
// import { parseTemplate } from '@angular/compiler';
// import * as compiler from '@angular/compiler';
// `;

//     const output = UtilsImports.replaceEsmSyncImports(input, packages);

//     expect(output).toContain(
//       `const { parseTemplate } = globalThis.__global_imports__['@angular/compiler'];`,
//     );

//     expect(output).toContain(
//       `const compiler = globalThis.__global_imports__['@angular/compiler'];`,
//     );
//   });

//   it('keeps import aliases', () => {
//     const input = `
// import { parseTemplate as parse, AST as NodeAst } from '@angular/compiler';
// `;

//     const output = UtilsImports.replaceEsmSyncImports(input, packages);

//     expect(output).toContain(
//       `const { parseTemplate as parse, AST as NodeAst } = globalThis.__global_imports__['@angular/compiler'];`,
//     );
//   });
// });
