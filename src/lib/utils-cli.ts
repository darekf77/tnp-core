import { CoreModels } from './core-models';
import { _ } from './lodash.namespace';

export namespace UtilsCli {
  //#region get time from this scli script start
  /**
   * Taon CLI specyfic mehtod for mesuring script execution time:
   * from beginning of script to this moment.
   */
  export const getTimeFromThisCLIScriptStart = (): {
    ms: string;
    sec: string;
    min: string;
  } => {
    //#region @backendFunc
    if (!global.currentTaonScriptStartDateTime) {
      throw 'CLI did not mark start point.';
    }
    const start = global.currentTaonScriptStartDateTime;
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    const sec = ms / 1000;
    const min = sec / 60;
    return {
      min: min.toFixed(2),
      sec: sec.toFixed(2),
      ms: ms.toFixed(3),
    };
    //#endregion
  };
  //#endregion
}

/**
 * Easy way to connect CLI commands to cli class methods.
 *
 * Example:
 * in clic class
 *
 * $FirstCli {
 *   static [UtilsCliClassMethod.staticClassNameProperty] = '$FirstCli';
 *
 *   @UtilsCliClassMethod.decoratorMethod('doSomething')
 *   doSomething() {
 *     console.log('doing something');
 *   }
 * }
 *
 * UtilsCliClassMethod.getFrom($FirstCli.prototype.doSomething) // "firstcli:dosomething"
 *
 */
export namespace UtilsCliClassMethod {
  const CLI_METHOD_KEY = Symbol('cliMethod');
  const unknowClass = 'unknownclass';

  //#region decorator method
  // does not work
  // export const decoratorClass = (className: string) => {
  //   return function (target: Function) {
  //     // console.log(target);
  //     // console.log('Decorating class with CLI name:', className);
  //     // debugger;
  //     // const classFn = (target?.constructor || {}) as Function;
  //     target[CoreModels.ClassNameStaticProperty] = className;
  //     return target;
  //   };
  // };

  export const decoratorMethod = (methodName: string): MethodDecorator => {
    return (target, propertyKey, descriptor) => {
      //#region @backendFunc
      // If name not given, fallback to property key
      const classFnConstructor = (target?.constructor || {}) as Function;
      const className =
        target[CoreModels.ClassNameStaticProperty] ||
        classFnConstructor[CoreModels.ClassNameStaticProperty] ||
        unknowClass;

      if (!className || className === unknowClass) {
        // debugger;
      }
      Reflect.defineMetadata(
        CLI_METHOD_KEY,
        `${_.camelCase(className).toLowerCase()}` +
          `:${_.camelCase(
            (methodName as string) ?? (propertyKey as string),
          ).toLowerCase()}`,
        descriptor.value!,
      );
      //#endregion
    };
  };
  //#endregion

  //#region get from
  export const getFrom = <ARGS_TO_PARSE extends object = any>(
    ClassPrototypeMethodFnHere: Function,
    options?: {
      globalMethod?: boolean;
      /**
       * arguments to parse into CLI format
       * Example: { projectName: "myproj", envName: "prod" } => "--projectName=myproj --envName=prod"
       * TODO @LAST add support for DEEP args parsing with lodash-walk-object
       */
      argsToParse?: ARGS_TO_PARSE;
    },
  ): string => {
    //#region @backendFunc
    options = options || {};
    const fullCliMethodName = Reflect.getMetadata(
      CLI_METHOD_KEY,
      ClassPrototypeMethodFnHere,
    ) as string;
    if (!fullCliMethodName) {
      console.log('prototype: ', ClassPrototypeMethodFnHere);
      throw new Error(
        `No CLI method metadata found. Did you forget to add @UtilsCliClassMethod.decoratorMethod('methodName')?`,
      );
    }

    // TODO move load walk to tnp-core
    // import { walk } from 'lodash-walk-object';

    // TODO @LAST move stuff
    // walk.Object(options.argsToParse || {}, (key, value) => {
    //   if (value === undefined || value === null) {
    //     delete options.argsToParse[key];
    //   }
    // });

    const argsToParse = options.argsToParse
      ? Object.keys(options.argsToParse)
          .map(key => `--${key}=${options.argsToParse}`)
          .join(' ')
      : '';

    if (options.globalMethod) {
      return fullCliMethodName.split(':')[1] + ` ${argsToParse}`;
    }
    if (
      !options.globalMethod &&
      fullCliMethodName.startsWith(`${unknowClass}:`)
    ) {
      throw new Error(
        `Cannot get CLI method for unknown class. Did you forget to add @CLASS.NAME('ClassName') to the class?`,
      );
    }
    return fullCliMethodName + ` ${argsToParse}`;
    //#endregion
  };
  //#endregion
}
