import { BehaviorSubject } from 'rxjs';

type HandlerFn = (opt?: {
  //  spinningType;
  // TODO
}) => void;

class GlobalSpinnerClass {
  private static instance: GlobalSpinnerClass;

  private constructor() {}

  static getInstance(): GlobalSpinnerClass {
    if (!this.instance) {
      this.instance = new GlobalSpinnerClass();
    }
    return this.instance;
  }

  private startHandlers = new Set<HandlerFn>();

  private stopHandlers = new Set<HandlerFn>();

  private startHandlersMap = new Map<string, HandlerFn>();

  private stopHandlersMap = new Map<string, HandlerFn>();

  //#region is spinning
  private isSpinningSrc$ = new BehaviorSubject<boolean>(false);

  public isSpinning$ = this.isSpinningSrc$.asObservable();

  private _isSpinning = false;

  public get isSpinning(): boolean {
    return this._isSpinning;
  }

  private set isSpinning(v: boolean) {
    this._isSpinning = v;
    this.isSpinningSrc$.next(v);
  }
  //#endregion

  /**
   * Provide taskCallbackFn() and
   * start(), stop() will trigger
   * automatically
   */
  public async task(taskCallbackFn: () => {}): Promise<void> {
    this.start();
    try {
      await taskCallbackFn();
    } catch (error) {
      this.stop();
      throw error;
    }
    this.stop();
  }

  public start(): void {
    this.isSpinning = true;
    [...this.startHandlers].forEach(handlerFn => {
      handlerFn({});
    });
  }

  public stop(): void {
    this.isSpinning = false;
    [...this.stopHandlers].forEach(handlerFn => {
      handlerFn({});
    });
  }

  public removeHandler(handlerId: string): void {
    const fnStart = this.startHandlersMap.get(handlerId);
    const fnStop = this.startHandlersMap.get(handlerId);
    if (!fnStart || !fnStart) {
      console.warn(`Can't remove unexisted handler`);
      return;
    }
    fnStop({});
    this.startHandlers.delete(fnStart);
    this.startHandlersMap.delete(handlerId);
    this.stopHandlers.delete(fnStop);
    this.stopHandlersMap.delete(handlerId);
  }

  public addSpinningEventListener(
    handleStartSpinFn: HandlerFn,
    handleStopSpinFn: HandlerFn,
    handlerId: string,
  ): void {
    this.startHandlers.add(handleStartSpinFn);
    this.stopHandlers.add(handleStopSpinFn);
    this.startHandlersMap.set(handlerId, handleStartSpinFn);
    this.stopHandlersMap.set(handlerId, handleStopSpinFn);
  }
}

export const GlobalSpinner = GlobalSpinnerClass.getInstance();
