/**
 * A `Service` is defined with a command that runs indefinitely.
 * With interface `Service`, this module allows the the service to be started and terminated at will.
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { versions } from 'process';
import { gte as verGte } from 'semver';
import { ControlledPromise, createControlledPromise } from './ControlledPromise';

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
    onError: onErrorCallback,
    onClose: onCloseCallback,
}: ServiceOptions): Service {
    let process: null | ChildProcessWithoutNullStreams = null;

    /**
     * This Promise indicates the status of the starting phase.
     * If it's resolved, then the starting phase had ended.
     * If it's pending, then the starting phase is ongoing.
     * If it's null, then starting phase is not started yet.
     */
    let starting: null | ControlledPromise<void> = null;
    /**
     * This Promise indicates the status of the terminating phase.
     * If it's resolved, then the terminating phase had ended.
     * If it's pending, then the terminating phase is ongoing.
     * If it's null, then terminating phase is not started yet.
     */
    let terminating: null | ControlledPromise<{
        code: null | number;
        signal: null | NodeJS.Signals;
    }> = null;

    /**
     * State of the service:
     * 1. Not started: starting: null, terminating: null,
     * 2. Starting: starting: pending, terminating: null,
     * 3. Started: starting: resolved, terminating: null,
     * 4. Terminating: starting: resolved, terminating: pending,
     * 5. Terminated: starting: resolved, terminating: resolved,
     * (5 immediately transitions to 1.)
     * (Any state other than 1 is considered "running".)
     */

    const isServiceRunning = (): boolean => !(starting === null && terminating === null);

    /**
     * This resets all state-tracking variables.
     * This is usually called in the 'close' event.
     * Don't bother checking `process.exitCode` as it seems the value is only updated after the 'close' event.
     */
    const resetService = () => {
        process = null;
        starting = null;
        terminating = null;
    };

    /**
     * Callback when the process connection had an error such as:
     * 1. The process could not be spawned, or
     * 2. The process could not be killed, or
     * 3. Sending a message to the child process failed.
     * @param error
     */
    const onProcessError = (
        error: Error & {
            code: string;
        }
    ): void => {
        onErrorCallback(error);

        //! Do we do anything here?
    };

    /**
     * Callback when the process connection had been closed.
     * This always happens after 'error' or 'exit'.
     * @param code
     * @param signal
     */
    const onProcessClosed = (code: null | number, signal: null | NodeJS.Signals): void => {
        //! Do anything about `starting`?

        terminating?.resolve({
            code,
            signal,
        });

        resetService();

        onCloseCallback(code, signal);
    };

    return {
        isRunning: isServiceRunning,
        start: async () => {
            if (starting !== null) {
                throw new Error('Service already running.');
            }

            starting = createControlledPromise<void>();

            if (process !== null) {
                throw new Error('Unexpected Error. Process is not null.');
            }

            process = spawn(command, args, {
                cwd,
                // The child process should absolutely die when the parent process exits.
                detached: false,
                //! Add spawn options here.
            });

            process.stdout.on('data', onStdOut);
            process.stderr.on('data', onStdErr);
            process.on('error', onProcessError);
            process.on('close', onProcessClosed);

            if (verGte(versions.node, '15.1.0')) {
                // Event 'spawn' is added in: v15.1.0.
                process.on('spawn', () => {
                    starting?.resolve();
                });
            } else {
                starting.resolve();
            }

            await starting.resolving();
        },
        terminate: async () => {
            if (starting === null) {
                throw new Error('Service not running.');
            }

            if (terminating !== null) {
                throw new Error('Service already shutting down.');
            }

            terminating = createControlledPromise<{
                code: null | number;
                signal: null | NodeJS.Signals;
            }>();

            if (process === null) {
                throw new Error('Unexpected Error. Process is null.');
            }

            if (!process.killed) {
                const killed = process.kill();

                if (!killed) {
                    throw new Error('Unexpected Error. Failed to kill the service.');
                }
            }

            await terminating.resolving();
        },
    };
}

function NOOP() {
    // Left empty.
}
