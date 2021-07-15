export enum ControlledPromiseStatus {
    Pending = 0b00,
    Resolved = 0b01,
    Rejected = 0b11,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ControlledPromiseState<TValue, TReason = any> =
    | {
          status: ControlledPromiseStatus.Pending;
      }
    | {
          status: ControlledPromiseStatus.Resolved;
          value: TValue;
      }
    | {
          status: ControlledPromiseStatus.Rejected;
          reason: TReason;
      };

export interface ControlledPromise<T> {
    /**
     * Returns a promise that is finalized when the controlled promise is finalized.
     * If the controlled promise is already finalized, the promise is finalized immediately.
     */
    promise(): Promise<T>;
    resolve: (value: T) => void;
    /**
     * Returns true if the controlled promise has been resolved.
     */
    resolved(): boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject: (reason?: any) => void;
    /**
     * Returns true if the controlled promise has been rejected.
     */
    rejected(): boolean;
    /**
     * Returns true if the controlled promise has been finalized.
     */
    finalized(): boolean;
}

export function createControlledPromise<T>(): ControlledPromise<T> {
    let resolveRef: (value: T | PromiseLike<T>) => void = NOOP;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectRef: (reason?: any) => void = NOOP;
    let state: ControlledPromiseState<T> = {
        status: ControlledPromiseStatus.Pending,
    };

    const promise = new Promise<T>((resolve, reject) => {
        resolveRef = resolve;
        rejectRef = reject;
    });

    const controlledPromise: ControlledPromise<T> = {
        promise: async () => {
            if (state.status === ControlledPromiseStatus.Resolved) {
                return state.value;
            }

            if (state.status === ControlledPromiseStatus.Rejected) {
                throw state.reason;
            }

            return await promise;
        },
        resolve: (value) => {
            if (state.status !== ControlledPromiseStatus.Pending) {
                return;
            }

            state = {
                status: ControlledPromiseStatus.Resolved,
                value,
            };

            resolveRef(value);
        },
        resolved: () => state.status === ControlledPromiseStatus.Resolved,
        reject: (reason) => {
            if (state.status !== ControlledPromiseStatus.Pending) {
                return;
            }

            state = {
                status: ControlledPromiseStatus.Rejected,
                reason,
            };

            rejectRef(reason);
        },
        rejected: () => state.status === ControlledPromiseStatus.Rejected,
        finalized: () => state.status !== ControlledPromiseStatus.Pending,
    };

    return controlledPromise;
}

function NOOP() {
    // Left empty.
}
