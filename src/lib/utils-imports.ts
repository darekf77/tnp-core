// /**
//  * @deprecated
//  */
// export namespace UtilsCjsEsmReplaceImports {
//   export function replaceEsmSyncImports(
//     content: string,
//     esmPackages: string[],
//   ): string {
//     //#region @backendFunc
//     console.log('REplacing for ', esmPackages);
//     for (const pkg of esmPackages) {
//       content = replacePackageImport(content, pkg);
//     }
//     return content;
//     //#endregion
//   }

//   function replacePackageImport(content: string, pkg: string): string {
//     //#region @backendFunc
//     const escapedPkg = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//     return content.replace(
//       new RegExp(
//         String.raw`import\s+([\s\S]*?)\s+from\s+['"]${escapedPkg}['"]\s*;?`,
//         'g',
//       ),
//       (wholeMatch: string, importPartRaw: string) => {
//         const importPart = importPartRaw.trim();
//         const globalPkg = `globalThis.__global_imports__['${pkg}']`;

//         const namespaceMatch = importPart.match(
//           /^\*\s+as\s+([A-Za-z_$][\w$]*)$/,
//         );
//         if (namespaceMatch) {
//           return `const ${namespaceMatch[1]} = ${globalPkg};`;
//         }

//         if (importPart.startsWith('{')) {
//           return `const ${importPart} = ${globalPkg};`;
//         }

//         const defaultNamedMatch = importPart.match(
//           /^([A-Za-z_$][\w$]*)\s*,\s*(\{[\s\S]*\})$/,
//         );
//         if (defaultNamedMatch) {
//           const defaultName = defaultNamedMatch[1];
//           const namedPart = defaultNamedMatch[2];

//           return `const ${defaultName} = ${globalPkg}.default; const ${namedPart} = ${globalPkg};`;
//         }

//         const defaultOnlyMatch = importPart.match(/^([A-Za-z_$][\w$]*)$/);
//         if (defaultOnlyMatch) {
//           return `const ${defaultOnlyMatch[1]} = ${globalPkg}.default;`;
//         }

//         return wholeMatch;
//       },
//     );
//     //#endregion
//   }

//   export async function resolveEsmSyncImport(
//     packages: string[],
//   ): Promise<void> {
//     //#region @backendFunc
//     globalThis.__global_imports__ ??= {};
//     console.log('Resovling esm for ', packages);
//     await Promise.all(
//       packages.map(async pkg => {
//         console.log(`awaiting import for ${pkg}`);
//         globalThis.__global_imports__[pkg] ??= await import(pkg);
//       }),
//     );
//     //#endregion
//   }
// }
