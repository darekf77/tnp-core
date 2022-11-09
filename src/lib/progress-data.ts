import { Helpers } from '.';
import { _ } from './core-imports';
import { PROGRESS_DATA_TYPE } from './core-models';

//#region @backend
declare const global: any;
//#endregion

export interface IPROGRESS_DATA {
  /**
   * How man percent of
   */
  value?: number;
  msg?: string;
  type?: PROGRESS_DATA_TYPE;
  date?: Date;
}

export class PROGRESS_DATA implements IPROGRESS_DATA {

  public static log(log: IPROGRESS_DATA) {
    //#region @backend
    if (global.tnpShowProgress) {
      Helpers.log(`[[[${JSON.stringify({ value: log.value, msg: log.msg, date: new Date() } as IPROGRESS_DATA)}]]]`, 1)
    }
    //#endregion
  }


  public static resolveFrom(chunk: string,
    callbackOnFounded?: (json: PROGRESS_DATA) => any, checkSplit = true): PROGRESS_DATA[] {

    let progress;
    let res: PROGRESS_DATA[] = [];
    if (!_.isString(chunk)) {
      return [];
    }
    chunk = chunk.trim();

    if (checkSplit) {
      const split = chunk.split(/\r\n|\n|\r/);
      if (split.length > 1) {
        // console.log('split founded', split)
        split.forEach(s => {
          res = res.concat(this.resolveFrom(s, callbackOnFounded, false));
        });
        return res;
      }
    }

    if (/\[\[\[.*\]\]\]/g.test(chunk)) {
      chunk = chunk.replace(/^\[\[\[/g, '').replace(/\]\]\]$/g, '');
      progress = chunk;
    }
    if (!_.isUndefined(progress)) {
      try {
        const p = JSON.parse(progress);
        const single = _.merge(new PROGRESS_DATA(), p);
        res = res.concat([single])
        if (_.isFunction(callbackOnFounded)) {
          callbackOnFounded(single);
        }
      } catch (err) {
        Helpers.error(err, true, true)
        Helpers.error(`ProgresssBarData: fail to parse "${progress}"`, true, true)
      }
    }
    return res;
  }

  public value?: number;
  public msg?: string;

  public type: PROGRESS_DATA_TYPE = 'event'

  public date?: Date;


}
