import { writeValue } from './writeValue'; // @backend
import { setKeyQuoteUsage } from './setKeyQuoteUsage'; // @backend

//#region @backend
const jscodeshift: import('jscodeshift') =
  require('jscodeshift').default ?? require('jscodeshift');
//#endregion

export function load(src) {
  //#region @backendFunc
  const ast = toAst(src);
  const root = ast.nodes()[0].program.body[0].expression;

  // @param {Object|Array} value
  const write = value => {
    root.right = writeValue(root.right, value);
  };

  const toSource = (options = {} as any) => {
    // set default options
    options = Object.assign(
      {
        quote: 'single',
        trailingComma: true,
      },
      options,
    );

    const sourceAst =
      options.quoteKeys === undefined
        ? ast // @ts-ignore
        : setKeyQuoteUsage(ast, options.quoteKeys);

    // strip the "x=" prefix
    return sourceAst.toSource(options).replace(/^x=([{\[])/m, '$1');
  };

  const toJSON = (options = {}) => {
    return toSource(
      Object.assign(
        {
          quote: 'double',
          trailingComma: false,
          quoteKeys: true,
        },
        options,
      ),
    );
  };

  return { write, toSource, toJSON, ast: jscodeshift(root.right) };
  //#endregion
}

function toAst(src) {
  //#region @backendFunc
  // find the start of the outermost array or object
  const expressionStart = src.match(/^\s*[{\[]/m);
  if (expressionStart) {
    // hackily insert "x=" so the JSON5 becomes valid JavaScript
    const astSrc = src.replace(/^\s*([{\[])/m, 'x=$1');
    return jscodeshift(astSrc);
  }

  // no array or object exist in the JSON5
  return jscodeshift('x={}');
  //#endregion
}
