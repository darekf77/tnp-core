import { TaonStateMachine } from './taon-state-machine';

enum State {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

describe('TaonStateMachine', () => {
  it('should start with default value', () => {
    const machine = new TaonStateMachine<State>({
      defaultValue: State.IDLE,
    });

    expect(machine.currentValue).toBe(State.IDLE);
  });

  it('should allow any transition when allowedStateMap is not provided', () => {
    const machine = new TaonStateMachine<State>({
      defaultValue: State.IDLE,
    });

    expect(machine.set(State.SUCCESS)).toBe(true);
    expect(machine.currentValue).toBe(State.SUCCESS);
  });

  it('should allow configured transition', () => {
    const machine = new TaonStateMachine<State>({
      defaultValue: State.IDLE,
      allowedStateMap: new Map([
        [State.IDLE, [State.LOADING]],
        [State.LOADING, [State.SUCCESS, State.ERROR]],
      ]),
    });

    expect(machine.set(State.LOADING)).toBe(true);
    expect(machine.currentValue).toBe(State.LOADING);

    expect(machine.set(State.SUCCESS)).toBe(true);
    expect(machine.currentValue).toBe(State.SUCCESS);
  });

  it('should reject invalid transition and keep previous state', () => {
    const machine = new TaonStateMachine<State>({
      defaultValue: State.IDLE,
      allowedStateMap: new Map([[State.IDLE, [State.LOADING]]]),
    });

    expect(machine.set(State.SUCCESS)).toBe(false);
    expect(machine.currentValue).toBe(State.IDLE);
  });

  it('should throw on invalid transition when throwOnInvalidTransition=true', () => {
    const machine = new TaonStateMachine<State>({
      defaultValue: State.IDLE,
      throwOnInvalidTransition: true,
      allowedStateMap: new Map([[State.IDLE, [State.LOADING]]]),
    });

    expect(() => machine.set(State.SUCCESS)).toThrow(
      'Invalid state transition: IDLE -> SUCCESS',
    );

    expect(machine.currentValue).toBe(State.IDLE);
  });

  describe('canSet()', () => {
    it('should return true for allowed transition without changing state', () => {
      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
        allowedStateMap: new Map([[State.IDLE, [State.LOADING]]]),
      });

      expect(machine.canSet(State.LOADING)).toBe(true);
      expect(machine.currentValue).toBe(State.IDLE);
    });

    it('should return false for invalid transition', () => {
      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
        allowedStateMap: new Map([[State.IDLE, [State.LOADING]]]),
      });

      expect(machine.canSet(State.SUCCESS)).toBe(false);
      expect(machine.currentValue).toBe(State.IDLE);
    });

    it('should always return true without allowedStateMap', () => {
      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
      });

      expect(machine.canSet(State.SUCCESS)).toBe(true);
    });
  });

  describe('modifyStateBeforeSetting', () => {
    it('should modify state before setting it', () => {
      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,

        modifyStateBeforeSetting: nextState => {
          if (nextState === State.ERROR) {
            return State.SUCCESS;
          }

          return nextState;
        },
      });

      expect(machine.set(State.ERROR)).toBe(true);
      expect(machine.currentValue).toBe(State.SUCCESS);
    });

    it('should validate modified state against allowedStateMap', () => {
      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,

        allowedStateMap: new Map([[State.IDLE, [State.SUCCESS]]]),

        modifyStateBeforeSetting: nextState => {
          if (nextState === State.ERROR) {
            return State.SUCCESS;
          }

          return nextState;
        },
      });

      expect(machine.set(State.ERROR)).toBe(true);
      expect(machine.currentValue).toBe(State.SUCCESS);
    });

    it('should use modified state also in canSet()', () => {
      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,

        allowedStateMap: new Map([[State.IDLE, [State.SUCCESS]]]),

        modifyStateBeforeSetting: nextState => {
          if (nextState === State.ERROR) {
            return State.SUCCESS;
          }

          return nextState;
        },
      });

      expect(machine.canSet(State.ERROR)).toBe(true);
      expect(machine.currentValue).toBe(State.IDLE);
    });

    it('should receive current state and debugMode', () => {
      const modify = vi.fn((nextState: State) => nextState);

      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
        debugMode: true,
        modifyStateBeforeSetting: modify,
      });

      machine.set(State.LOADING);

      expect(modify).toHaveBeenCalledWith(State.LOADING, State.IDLE, true);
    });
  });

  describe('effect', () => {
    it('should execute effect after successful transition', () => {
      const effect = vi.fn();

      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
        effect,
      });

      machine.set(State.LOADING);

      expect(effect).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledWith(State.LOADING, State.IDLE, false);

      // Important: state is already changed when effect executes.
      expect(machine.currentValue).toBe(State.LOADING);
    });

    it('should not execute effect for invalid transition', () => {
      const effect = vi.fn();

      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
        allowedStateMap: new Map([[State.IDLE, [State.LOADING]]]),
        effect,
      });

      machine.set(State.SUCCESS);

      expect(effect).not.toHaveBeenCalled();
    });

    it('should support async effect', async () => {
      const effect = vi.fn(async () => {
        await Promise.resolve();
      });

      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
        effect,
      });

      expect(machine.set(State.LOADING)).toBe(true);

      // set() intentionally does not await the effect
      await vi.waitFor(() => {
        expect(effect).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('debugMode', () => {
    it('should expose debugMode', () => {
      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
        debugMode: true,
      });

      expect(machine.debugMode).toBe(true);
    });

    it('should default debugMode to false', () => {
      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
      });

      expect(machine.debugMode).toBe(false);
    });

    it('should warn about invalid transition in debug mode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
        debugMode: true,
        allowedStateMap: new Map([[State.IDLE, [State.LOADING]]]),
      });

      machine.set(State.SUCCESS);

      expect(warnSpy).toHaveBeenCalledWith(
        'Invalid state transition: IDLE -> SUCCESS',
      );

      warnSpy.mockRestore();
    });

    it('should not warn in non-debug mode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const machine = new TaonStateMachine<State>({
        defaultValue: State.IDLE,
        allowedStateMap: new Map([[State.IDLE, [State.LOADING]]]),
      });

      machine.set(State.SUCCESS);

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  it('should treat missing current-state entry in allowedStateMap as no allowed transitions', () => {
    const machine = new TaonStateMachine<State>({
      defaultValue: State.IDLE,
      allowedStateMap: new Map([[State.LOADING, [State.SUCCESS]]]),
    });

    expect(machine.canSet(State.LOADING)).toBe(false);
    expect(machine.set(State.LOADING)).toBe(false);
    expect(machine.currentValue).toBe(State.IDLE);
  });

  it('should support transition to the same state when explicitly allowed', () => {
    const machine = new TaonStateMachine<State>({
      defaultValue: State.IDLE,
      allowedStateMap: new Map([[State.IDLE, [State.IDLE]]]),
    });

    expect(machine.set(State.IDLE)).toBe(true);
    expect(machine.currentValue).toBe(State.IDLE);
  });
});
