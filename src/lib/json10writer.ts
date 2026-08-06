// //#region @backend
// const jscodeshift: import('jscodeshift') =
//   require('jscodeshift').default ?? require('jscodeshift');
// //#endregion

// /**
//  * @deprecated
//  */
// export function loadJsonC(src) {
//   //#region @backendFunc
//   const ast = toAst(src);
//   const root = ast.nodes()[0].program.body[0].expression;

//   // @param {Object|Array} value
//   const write = value => {
//     root.right = writeValue(root.right, value);
//   };

//   const toSource = (options = {} as any) => {
//     // set default options
//     options = Object.assign(
//       {
//         quote: 'single',
//         trailingComma: true,
//       },
//       options,
//     );

//     const sourceAst =
//       options.quoteKeys === undefined
//         ? ast // @ts-ignore
//         : setKeyQuoteUsage(ast, options.quoteKeys);

//     // strip the "x=" prefix
//     return sourceAst.toSource(options).replace(/^x=([{\[])/m, '$1');
//   };

//   const toJSON = (options = {}) => {
//     return toSource(
//       Object.assign(
//         {
//           quote: 'double',
//           trailingComma: false,
//           quoteKeys: true,
//         },
//         options,
//       ),
//     );
//   };

//   return { write, toSource, toJSON, ast: jscodeshift(root.right) };
//   //#endregion
// }

// function toAst(src) {
//   //#region @backendFunc
//   // find the start of the outermost array or object
//   const expressionStart = src.match(/^\s*[{\[]/m);
//   if (expressionStart) {
//     // hackily insert "x=" so the JSON5 becomes valid JavaScript
//     const astSrc = src.replace(/^\s*([{\[])/m, 'x=$1');
//     return jscodeshift(astSrc);
//   }

//   // no array or object exist in the JSON5
//   return jscodeshift('x={}');
//   //#endregion
// }

// export function setKeyQuoteUsage(ast, enabled) {
//   //#region @backendFunc
//   return jscodeshift(ast.toSource())
//     .find(jscodeshift.ObjectExpression)
//     .forEach(path => {
//       path.value.properties.forEach(prop => {
//         if (enabled) {
//           quoteKey(prop);
//         } else {
//           unquoteKey(prop);
//         }
//       });
//     });
//   //#endregion
// }

// function quoteKey(prop) {
//   //#region @backend
//   if (prop.key.type === 'Identifier') {
//     prop.key = jscodeshift.literal(prop.key.name);
//   }
//   //#endregion
// }

// function unquoteKey(prop) {
//   //#region @backend
//   if (prop.key.type === 'Literal') {
//     prop.key = jscodeshift.identifier(prop.key.value);
//   }
//   //#endregion
// }

// // @param {j.ObjectExpression|j.ArrayExpression|j.Literal} node
// export function writeValue(node, value) {
//   //#region @backendFunc
//   if (value === undefined) return node;

//   node = nodeTypeMatchesValue(node, value) ? node : createEmptyNode(value);

//   if (node.type === 'ArrayExpression') {
//     writeArray(node, value);
//   } else if (node.type === 'ObjectExpression') {
//     writeObj(node, value);
//   } else if (node.type === 'Literal') {
//     node.value = value;
//   }
//   return node;
//   //#endregion
// }

// function nodeTypeMatchesValue(node, value) {
//   //#region @backendFunc
//   if (value === undefined || node === undefined) return false;
//   if (isArray(value)) return node.type === 'ArrayExpression';
//   if (value === null) return node.type === 'Literal';
//   if (isObject(value)) return node.type === 'ObjectExpression';
//   return node.type === 'Literal';
//   //#endregion
// }

// function createEmptyNode(value) {
//   //#region @backendFunc
//   if (isArray(value)) {
//     return jscodeshift.arrayExpression([]);
//   }
//   if (isObject(value)) {
//     return jscodeshift.objectExpression([]);
//   }
//   return jscodeshift.literal('');
//   //#endregion
// }

// function writeArray(node, array) {
//   //#region @backendFunc
//   array.forEach((value, index) => {
//     const existingElement = node.elements[index];
//     node.elements[index] = writeValue(existingElement, value);
//   });
//   node.elements.length = array.length;
//   //#endregion
// }

// function writeObj(node, obj) {
//   //#region @backendFunc
//   const newProperties = [];
//   Object.keys(obj).forEach((key, index) => {
//     const existingProperty = findPropertyByKey(node.properties, key);
//     if (existingProperty) {
//       existingProperty.value = writeValue(existingProperty.value, obj[key]);
//       newProperties.push(existingProperty);
//     } else {
//       if (obj[key] === undefined) return;
//       const newKey = getNewPropertyKey(node.properties, key);
//       const newValue = writeValue(undefined, obj[key]);
//       const newProperty = jscodeshift.property('init', newKey, newValue);
//       newProperties.push(newProperty);
//     }
//   });
//   node.properties = newProperties;
//   //#endregion
// }

// function findPropertyByKey(properties, key) {
//   return properties.find(p => (p.key.name || p.key.value) === key);
// }

// function getNewPropertyKey(properties, key) {
//   //#region @backendFunc
//   // if the key has invalid characters, it has to be a string literal
//   if (key.match(/[^a-zA-Z0-9_]/)) {
//     return jscodeshift.literal(key);
//   }

//   // infer whether to use a literal or identifier by looking at the other keys
//   const useIdentifier =
//     properties.length === 0 ||
//     properties.some(p => p.key.type === 'Identifier');
//   return useIdentifier ? jscodeshift.identifier(key) : jscodeshift.literal(key);
//   //#endregion
// }

// function isObject(value) {
//   return typeof value === 'object' && !isArray(value);
// }

// function isArray(value) {
//   return Array.isArray(value);
// }
