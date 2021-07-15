import { resolve as resolvePath } from 'path';
import { createService, Service, ServiceOptions } from './service';

const waitTimeForShell = 10;
//! node takes a bit longer to run.
const waitTimeForNode = 100;

describe('Service', () => {
    /**
     * Save services here so in case a test fails and didn't stop the service, the service won't go on forever.
     */
    const servicesToCancel: Service[] = [];
    const createHandledService = (options: ServiceOptions): Service => {
        const service = createService(options);

        servicesToCancel.push(service);

        return service;
    };
    afterEach(() => {
        while (servicesToCancel.length > 0) {
            const service = servicesToCancel.pop();

            if (service?.isRunning()) {
                service.terminate();
            }
        }
    });

    it('can be created', async () => {
        const onStdOut = jest.fn();
        const onStdErr = jest.fn();
        const onError = jest.fn();
        const onClose = jest.fn((code: null | number, signal: null | NodeJS.Signals) => {
            console.log('onClose', { code, signal });
        });

        const service = createHandledService({
            cwd: resolvePath(__dirname, '..'),
            command: 'pwd',
            onStdOut,
            onStdErr,
            onError,
            onClose,
        });

        // Not running yet.
        expect(service.isRunning()).toBe(false);

        await delay(waitTimeForShell);

        // Still not running.
        expect(service.isRunning()).toBe(false);
        expect(onStdOut).not.toBeCalled();
        expect(onStdErr).not.toBeCalled();
        expect(onError).not.toBeCalled();
        expect(onClose).not.toBeCalled();
    });

    it('can be started', async () => {
        const onStdOut = jest.fn((chunk: any): void => {
            // Left empty.
        });
        const onStdErr = jest.fn();
        const onError = jest.fn();
        const onClose = jest.fn();

        const cwd = resolvePath(__dirname, '..');

        const service = createHandledService({
            cwd,
            command: 'pwd',
            onStdOut,
            onStdErr,
            onError,
            onClose,
        });

        // First start.
        await expect(service.start()).resolves.toBeUndefined();
        expect(service.isRunning()).toBe(true);
        await delay(waitTimeForShell);
        expect(onStdOut).toBeCalledWith(Buffer.from(`${cwd}\n`));
        expect(onStdErr).not.toBeCalled();
        expect(onError).not.toBeCalled();
        // This one ends itself.
        expect(onClose).toBeCalled();
    });

    it('can be started with arguments', async () => {
        const onStdOut = jest.fn((chunk: any): void => {
            // Left empty.
        });
        const onStdErr = jest.fn();
        const onError = jest.fn();
        const onClose = jest.fn();

        const service = createHandledService({
            cwd: resolvePath(__dirname, '..'),
            command: 'echo',
            args: ['1', '2', '3'],
            onStdOut,
            onStdErr,
            onError,
            onClose,
        });

        // First start.
        await expect(service.start()).resolves.toBeUndefined();
        expect(service.isRunning()).toBe(true);
        await delay(waitTimeForShell);
        expect(onStdOut).toBeCalledWith(Buffer.from(`1 2 3\n`));
        expect(onStdErr).not.toBeCalled();
        expect(onError).not.toBeCalled();
        // This one ends itself.
        expect(onClose).toBeCalled();
    });

    it('can receive output from stderr', async () => {
        const onStdOut = jest.fn();
        const onStdErr = jest.fn((chunk: any): void => {
            // Left empty.
        });
        const onError = jest.fn();
        const onClose = jest.fn();

        const service = createHandledService({
            cwd: resolvePath(__dirname, '..'),
            command: 'node',
            args: ['-e', 'console.error("error")'],
            onStdOut,
            onStdErr,
            onError,
            onClose,
        });

        // First start.
        await expect(service.start()).resolves.toBeUndefined();
        expect(service.isRunning()).toBe(true);
        await delay(waitTimeForNode);
        expect(onStdOut).not.toBeCalled();
        expect(onStdErr).toBeCalledWith(Buffer.from(`error\n`));
        expect(onError).not.toBeCalled();
        // This one ends itself.
        expect(onClose).toBeCalled();
    });

    describe('status report', () => {
        it('should handle a crashing service (shell)', async () => {
            const onError = jest.fn();
            const onClose = jest.fn();

            const service = createHandledService({
                cwd: resolvePath(__dirname, '..'),
                command: 'bash',
                args: ['./test/test-servers/crash.sh'],
                onError,
                onClose,
            });

            // Not running yet.
            expect(service.isRunning()).toBe(false);

            // First start.
            await expect(service.start()).resolves.toBeUndefined();
            expect(service.isRunning()).toBe(true);
            expect(onError).not.toBeCalled();
            expect(onClose).not.toBeCalled();
            await delay(waitTimeForShell);
            expect(onError).not.toBeCalled();
            // This one ends itself.
            expect(onClose).toBeCalled();
            expect(service.isRunning()).toBe(false);

            [onError, onClose].map((mock) => mock.mockClear());

            // Second start.
            await expect(service.start()).resolves.toBeUndefined();
            expect(service.isRunning()).toBe(true);
            expect(onError).not.toBeCalled();
            expect(onClose).not.toBeCalled();
            await delay(waitTimeForNode);
            expect(onError).not.toBeCalled();
            // This one ends itself.
            expect(onClose).toBeCalled();
            expect(service.isRunning()).toBe(false);
        });

        it('should handle a crashing service (node)', async () => {
            const onError = jest.fn();
            const onClose = jest.fn();

            const service = createHandledService({
                cwd: resolvePath(__dirname, '..'),
                command: 'node',
                args: ['./test/test-servers/crash.js'],
                onError,
                onClose,
            });

            // Not running yet.
            expect(service.isRunning()).toBe(false);

            // First start.
            await expect(service.start()).resolves.toBeUndefined();
            expect(service.isRunning()).toBe(true);
            expect(onError).not.toBeCalled();
            expect(onClose).not.toBeCalled();
            await delay(waitTimeForNode);
            expect(onError).not.toBeCalled();
            // This one ends itself.
            expect(onClose).toBeCalled();
            expect(service.isRunning()).toBe(false);

            [onError, onClose].map((mock) => mock.mockClear());

            // Second start.
            await expect(service.start()).resolves.toBeUndefined();
            expect(service.isRunning()).toBe(true);
            expect(onError).not.toBeCalled();
            expect(onClose).not.toBeCalled();
            await delay(waitTimeForNode);
            expect(onError).not.toBeCalled();
            // This one ends itself.
            expect(onClose).toBeCalled();
            expect(service.isRunning()).toBe(false);
        });

        it('should handle command error (invalid command)', async () => {
            const onError = jest.fn();
            const onClose = jest.fn();

            const service = createHandledService({
                cwd: resolvePath(__dirname, '..'),
                command: 'bash-wut-on-earth',
                args: ['./test/test-servers/count-down.sh'],
                onError,
                onClose,
            });

            // Not running yet.
            expect(service.isRunning()).toBe(false);

            // First start.
            await expect(service.start()).resolves.toBeUndefined();
            expect(service.isRunning()).toBe(true);
            expect(onError).not.toBeCalled();
            expect(onClose).not.toBeCalled();
            await delay(waitTimeForShell);
            // This one crashes.
            expect(onError).toBeCalled();
            expect(onClose).toBeCalled();
            expect(service.isRunning()).toBe(false);

            [onError, onClose].map((mock) => mock.mockClear());

            // Second start.
            await expect(service.start()).resolves.toBeUndefined();
            expect(service.isRunning()).toBe(true);
            expect(onError).not.toBeCalled();
            expect(onClose).not.toBeCalled();
            await delay(waitTimeForShell);
            // This one crashes.
            expect(onError).toBeCalled();
            expect(onClose).toBeCalled();
            expect(service.isRunning()).toBe(false);
        });

        it('should handle command error (invalid argument)', async () => {
            const onError = jest.fn();
            const onClose = jest.fn();

            const service = createHandledService({
                cwd: resolvePath(__dirname, '..'),
                command: 'bash',
                args: ['./test/test-servers/not-found'],
                onError,
                onClose,
            });

            // Not running yet.
            expect(service.isRunning()).toBe(false);

            // First start.
            await expect(service.start()).resolves.toBeUndefined();
            expect(service.isRunning()).toBe(true);
            expect(onError).not.toBeCalled();
            expect(onClose).not.toBeCalled();
            await delay(waitTimeForShell);
            expect(onError).not.toBeCalled();
            // This one ends itself.
            expect(onClose).toBeCalled();
            expect(service.isRunning()).toBe(false);
        });
    });

    it('can be terminated', async () => {
        const onStdOut = jest.fn((chunk: any): void => {
            // Left empty.
        });
        const onStdErr = jest.fn();
        const onError = jest.fn();
        const onClose = jest.fn();

        const service = createHandledService({
            cwd: resolvePath(__dirname, '..'),
            command: 'node',
            args: ['./test/test-servers/clock.js'],
            onStdOut,
            onStdErr,
            onError,
            onClose,
        });

        // Not running yet.
        expect(service.isRunning()).toBe(false);

        // First start.
        await expect(service.start()).resolves.toBeUndefined();
        expect(service.isRunning()).toBe(true);
        expect(onError).not.toBeCalled();
        expect(onClose).not.toBeCalled();
        await delay(waitTimeForNode);
        expect(onStdOut).toBeCalledTimes(1);
        expect(onStdErr).not.toBeCalled();
        expect(onError).not.toBeCalled();
        expect(onClose).not.toBeCalled();
        expect(service.isRunning()).toBe(true);

        [onStdOut, onStdErr, onError, onClose].map((mock) => mock.mockClear());

        // First terminate.
        await expect(service.terminate()).resolves.toBeUndefined();
        expect(service.isRunning()).toBe(false);
        expect(onStdOut).not.toBeCalled();
        expect(onStdErr).not.toBeCalled();
        expect(onError).not.toBeCalled();
        expect(onClose).toBeCalled();
    });

    it('can be restarted', async () => {
        const onStdOut = jest.fn((chunk: any): void => {
            // Left empty.
        });
        const onStdErr = jest.fn();
        const onError = jest.fn();
        const onClose = jest.fn();

        const service = createHandledService({
            cwd: resolvePath(__dirname, '..'),
            command: 'node',
            args: ['./test/test-servers/clock.js'],
            onStdOut,
            onStdErr,
            onError,
            onClose,
        });

        // Not running yet.
        expect(service.isRunning()).toBe(false);

        // First start.
        await expect(service.start()).resolves.toBeUndefined();
        expect(service.isRunning()).toBe(true);
        expect(onError).not.toBeCalled();
        expect(onClose).not.toBeCalled();
        await delay(waitTimeForNode);
        expect(onStdOut).toBeCalledTimes(1);
        expect(onStdErr).not.toBeCalled();
        expect(onError).not.toBeCalled();
        expect(onClose).not.toBeCalled();
        expect(service.isRunning()).toBe(true);

        [onStdOut, onStdErr, onError, onClose].map((mock) => mock.mockClear());

        // First terminate.
        await expect(service.terminate()).resolves.toBeUndefined();
        expect(service.isRunning()).toBe(false);
        expect(onStdOut).not.toBeCalled();
        expect(onStdErr).not.toBeCalled();
        expect(onError).not.toBeCalled();
        expect(onClose).toBeCalled();

        [onStdOut, onStdErr, onError, onClose].map((mock) => mock.mockClear());

        // Second start.
        await expect(service.start()).resolves.toBeUndefined();
        expect(service.isRunning()).toBe(true);
        expect(onError).not.toBeCalled();
        expect(onClose).not.toBeCalled();
        await delay(waitTimeForNode);
        expect(onStdOut).toBeCalledTimes(1);
        expect(onStdErr).not.toBeCalled();
        expect(onError).not.toBeCalled();
        expect(onClose).not.toBeCalled();
        expect(service.isRunning()).toBe(true);

        [onStdOut, onStdErr, onError, onClose].map((mock) => mock.mockClear());

        // Second terminate.
        await expect(service.terminate()).resolves.toBeUndefined();
        expect(service.isRunning()).toBe(false);
        expect(onStdOut).not.toBeCalled();
        expect(onStdErr).not.toBeCalled();
        expect(onError).not.toBeCalled();
        expect(onClose).toBeCalled();
    });
});

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
