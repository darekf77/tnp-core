import { BehaviorSubject, map, Observable } from 'rxjs';

import { _ } from './lodash.namespace';

export type JsPrimitive =
  | string
  | number
  | boolean
  | null
  | undefined
  | bigint
  | symbol;

export class TaonStateMachine<T extends JsPrimitive = JsPrimitive> {
  private _currentValue: T;

  private readonly currentStateSubject: BehaviorSubject<{
    currentState: T;
    previousState: T;
  }>;

  public readonly currentState$: Observable<{
    currentState: T;
    previousState: T;
  }>;

  constructor(
    private readonly config: {
      debugMode?: boolean;
      defaultValue: T;
      allowedStateMap?: Map<T, T[]>;
      modifyStateBeforeSetting?: (
        nextState: T,
        currentState: T,
        debugMode: boolean,
      ) => T;
      effect?: (
        nextState: T,
        previousState: T,
        debugMode: boolean,
      ) => void | Promise<void>;
      throwOnInvalidTransition?: boolean;
    },
  ) {
    this._currentValue = config.defaultValue;

    this.currentStateSubject = new BehaviorSubject({
      previousState: config.defaultValue,
      currentState: config.defaultValue,
    });

    this.currentState$ = this.currentStateSubject.asObservable();
  }

  public get debugMode(): boolean {
    return !!this.config?.debugMode;
  }

  get currentValue(): T {
    return this._currentValue;
  }

  canSet(nextStateRaw: T): boolean {
    const nextState =
      this.config.modifyStateBeforeSetting?.(
        nextStateRaw,
        this._currentValue,
        this.debugMode,
      ) ?? nextStateRaw;

    if (!_.isMap(this.config.allowedStateMap)) {
      return true;
    }

    const allowed = this.config.allowedStateMap.get(this._currentValue) ?? [];

    return allowed.includes(nextState);
  }

  set(nextStateRaw: T): boolean {
    const previousState = this._currentValue;

    const nextState =
      this.config.modifyStateBeforeSetting?.(
        nextStateRaw,
        previousState,
        this.debugMode,
      ) ?? nextStateRaw;

    if (_.isMap(this.config.allowedStateMap)) {
      const allowed = this.config.allowedStateMap.get(previousState) ?? [];

      if (!allowed.includes(nextState)) {
        const message =
          `Invalid state transition: ` +
          `${String(previousState)} -> ${String(nextState)}`;

        if (this.config.throwOnInvalidTransition) {
          throw new Error(message);
        }

        this.debugMode && console.warn(message);

        return false;
      }
    }

    this._currentValue = nextState;

    // Notify observers only after successful transition.
    this.currentStateSubject.next({ previousState, currentState: nextState });

    void this.config.effect?.(nextState, previousState, this.debugMode);

    return true;
  }
}
