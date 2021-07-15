import { createControlledPromise } from './ControlledPromise';

describe('ControlledPromise', () => {
    it('can be created', () => {
        const action = createControlledPromise();

        expect(typeof action).toBe('object');
        expect(typeof action.promise).toBe('function');
        expect(typeof action.resolve).toBe('function');
        expect(typeof action.resolved).toBe('function');
        expect(typeof action.reject).toBe('function');
        expect(typeof action.rejected).toBe('function');
        expect(typeof action.finalized).toBe('function');
    });

    it('can be resolved', async () => {
        const action = createControlledPromise();

        const onResolve = jest.fn();
        const onReject = jest.fn();
        const onFinalize = jest.fn();

        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(false);

        action.promise().then(onResolve, onReject).finally(onFinalize);

        expect(onResolve).not.toBeCalled();
        expect(onReject).not.toBeCalled();
        expect(onFinalize).not.toBeCalled();
        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(false);

        action.resolve('secret');

        await delay(0);

        expect(onResolve).toBeCalledWith('secret');
        expect(onReject).not.toBeCalled();
        expect(onFinalize).toBeCalled();
        expect(action.resolved()).toBe(true);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(true);
    });

    it('can be rejected', async () => {
        const action = createControlledPromise();

        const onResolve = jest.fn();
        const onReject = jest.fn();
        const onFinalize = jest.fn();

        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(false);

        action.promise().then(onResolve, onReject).finally(onFinalize);

        expect(onResolve).not.toBeCalled();
        expect(onReject).not.toBeCalled();
        expect(onFinalize).not.toBeCalled();
        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(false);

        action.reject('reason');

        await delay(0);

        expect(onResolve).not.toBeCalled();
        expect(onReject).toBeCalledWith('reason');
        expect(onFinalize).toBeCalled();
        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(true);
        expect(action.finalized()).toBe(true);
    });

    it('will throw if not handling reject', async () => {
        const action = createControlledPromise();

        const onResolve = jest.fn();

        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(false);

        expect(async () => {
            const value = await action.promise();

            onResolve(value);
        }).rejects.toBe('reason');

        expect(onResolve).not.toBeCalled();
        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(false);

        action.reject('reason');

        await delay(0);

        expect(onResolve).not.toBeCalled();
        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(true);
        expect(action.finalized()).toBe(true);
    });

    it('can not be rejected after being resolved', async () => {
        const action = createControlledPromise();

        const onResolve = jest.fn();
        const onReject = jest.fn();
        const onFinalize = jest.fn();

        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(false);

        action.promise().then(onResolve, onReject).finally(onFinalize);

        action.resolve('secret');

        await delay(0);

        expect(onResolve).toBeCalledTimes(1);
        expect(onReject).not.toBeCalled();
        expect(onFinalize).toBeCalledTimes(1);
        expect(action.resolved()).toBe(true);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(true);

        action.reject('reason');

        await delay(0);

        expect(onResolve).toBeCalledTimes(1);
        expect(onReject).not.toBeCalled();
        expect(onFinalize).toBeCalledTimes(1);
        expect(action.resolved()).toBe(true);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(true);
    });

    it('can not be resolved after being rejected', async () => {
        const action = createControlledPromise();

        const onResolve = jest.fn();
        const onReject = jest.fn();
        const onFinalize = jest.fn();

        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(false);
        expect(action.finalized()).toBe(false);

        action.promise().then(onResolve, onReject).finally(onFinalize);

        action.reject('reason');

        await delay(0);

        expect(onResolve).not.toBeCalled();
        expect(onReject).toBeCalledTimes(1);
        expect(onFinalize).toBeCalledTimes(1);
        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(true);
        expect(action.finalized()).toBe(true);

        action.resolve('secret');

        await delay(0);

        expect(onResolve).not.toBeCalled();
        expect(onReject).toBeCalledTimes(1);
        expect(onFinalize).toBeCalledTimes(1);
        expect(action.resolved()).toBe(false);
        expect(action.rejected()).toBe(true);
        expect(action.finalized()).toBe(true);
    });
});

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
