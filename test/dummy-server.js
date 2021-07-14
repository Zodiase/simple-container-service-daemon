const failureRate = 0.3;
const emulateFailures = false;

(async () => {
    console.log('hello world!');

    // eslint-disable-next-line no-constant-condition
    while (true) {
        await delay(1000);

        if (emulateFailures && Math.random() < failureRate) {
            throw new Error('random error');
        }

        console.log(`${new Date()}`);
    }
})();

async function delay(duration) {
    return new Promise((resolve) => {
        setTimeout(resolve, duration);
    });
}

process.on('exit', () => console.log('dummy server exiting'));
process.on('SIGINT', () => console.log('SIGINT'));
process.on('uncaughtException', () => console.log('uncaughtException'));
process.on('unhandledRejection', () => console.log('unhandledRejection'));
