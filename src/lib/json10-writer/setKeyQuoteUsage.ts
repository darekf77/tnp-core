//#region @backend
const jscodeshift: import('jscodeshift') =
  require('jscodeshift').default ?? require('jscodeshift');
//#endregion

export function setKeyQuoteUsage(ast, enabled) {
  //#region @backendFunc
  return jscodeshift(ast.toSource())
    .find(jscodeshift.ObjectExpression)
    .forEach(path => {
      path.value.properties.forEach(prop => {
        if (enabled) {
          quoteKey(prop);
        } else {
          unquoteKey(prop);
        }
      });
    });
  //#endregion
}

function quoteKey(prop) {
  //#region @backend
  if (prop.key.type === 'Identifier') {
    prop.key = jscodeshift.literal(prop.key.name);
  }
  //#endregion
}

function unquoteKey(prop) {
  //#region @backend
  if (prop.key.type === 'Literal') {
    prop.key = jscodeshift.identifier(prop.key.value);
  }
  //#endregion
}
