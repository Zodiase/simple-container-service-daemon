export interface ControlledPromise<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    /**
     * Returns true if the controlled promise has been resolved.
     */
    resolved(): boolean;
    /**
     * Returns a promise that is resolved when the controlled promise is resolved.
     * If the controlled promise is already resolved, the promise is resolved immediately.
     */
    resolving(): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject: (reason?: any) => void;
    /**
     * Returns true if the controlled promise has been rejected.
     */
    rejected(): boolean;
    /**
     * Returns a promise that is resolved when the controlled promise is rejected.
     * If the controlled promise is already rejected, the promise is resolved immediately.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rejecting(): Promise<void>;
    /**
     * Returns true if the controlled promise has been finalized.
     */
    finalized(): boolean;
    /**
     * Returns a promise that is resolved when the controlled promise is finalized.
     * If the controlled promise is already finalized, the promise is resolved immediately.
     */
    finalizing(): Promise<void>;
}

export function createControlledPromise<T>(): ControlledPromise<T> {
    let resolveRef: (value: T | PromiseLike<T>) => void = NOOP;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectRef: (reason?: any) => void = NOOP;
    let resolved = false;
    let rejected = false;
    let finalized = false;

    const promise = new Promise<T>((resolve, reject) => {
        resolveRef = resolve;
        rejectRef = reject;
    });

    const controlledPromise: ControlledPromise<T> = {
        resolve: (value) => {
            if (finalized) {
                return;
            }

            resolved = true;
            finalized = true;
            resolveRef(value);
        },
        resolved: () => resolved,
        resolving: async () => {
            if (resolved) {
                return;
            }

            return new Promise((resolve) => {
                promise.then(() => resolve(), null);
            });
        },
        reject: (reason) => {
            if (finalized) {
                return;
            }

            rejected = true;
            finalized = true;
            rejectRef(reason);
        },
        rejected: () => rejected,
        rejecting: async () => {
            if (rejected) {
                return;
            }

            return new Promise((resolve) => {
                promise.then(null, () => resolve());
            });
        },
        finalized: () => finalized,
        finalizing: async () => {
            if (finalized) {
                return;
            }

            return new Promise((resolve) => {
                promise.finally(() => resolve());
            });
        },
    };

    return controlledPromise;
}

function NOOP() {
    // Left empty.
}
