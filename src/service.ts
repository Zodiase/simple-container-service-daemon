/**
 * A `Service` is defined with a command that runs indefinitely.
 * With interface `Service`, this module allows the the service to be started and terminated at will.
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { versions } from 'process';
import { gte as verGte } from 'semver';

export interface ServiceOptions {
    cwd: string;
    command: string;
    args?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onStdOut?: (chunk: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onStdErr?: (chunk: any) => void;
    onError: (
        error: Error & {
            code: string;
        }
    ) => void;
    onClose: (code: null | number, signal: null | NodeJS.Signals) => void;
}

export interface Service {
    isRunning(): boolean;
    start(): Promise<void>;
    terminate(): Promise<void>;
}

export function createService({
    cwd,
    command,
    args = [],
    onStdOut = NOOP,
    onStdErr = NOOP,
    onError,
    onClose,
}: ServiceOptions): Service {
    let process: null | ChildProcessWithoutNullStreams = null;

    return {
        isRunning: (): boolean => process !== null,
        start: async () => {
            if (process !== null) {
                throw new Error('Service already running.');
            }

            const starting = createControlledPromise<void>();

            process = spawn(command, args, {
                cwd,
                // The child process should absolutely die when the parent process exits.
                detached: false,
                //! Add spawn options here.
            });

            process.stdout.on('data', onStdOut);
            process.stderr.on('data', onStdErr);
            process.on('error', onError);
            process.on('close', onClose);

            if (verGte(versions.node, '15.1.0')) {
                // Event 'spawn' is added in: v15.1.0.
                process.on('spawn', () => {
                    starting.resolve();
                });
            } else {
                starting.resolve();
            }

            await starting.promise;
        },
        terminate: async () => {
            if (process === null) {
                throw new Error('Service not running.');
            }

            const terminating = createControlledPromise<{
                code: null | number;
                signal: null | NodeJS.Signals;
            }>();

            process.on('exit', (code, signal) => {
                terminating.resolve({
                    code,
                    signal,
                });
            });

            process.kill();

            await terminating.promise;

            process = null;
        },
    };
}

function NOOP() {
    // Left empty.
}

interface ControlledPromise<T> {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject: (reason?: any) => void;
}

function createControlledPromise<T>(): ControlledPromise<T> {
    let resolveRef: (value: T | PromiseLike<T>) => void = NOOP;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectRef: (reason?: any) => void = NOOP;

    const promise = new Promise<T>((resolve, reject) => {
        resolveRef = resolve;
        rejectRef = reject;
    });

    return {
        promise,
        resolve: resolveRef,
        reject: rejectRef,
    };
}
