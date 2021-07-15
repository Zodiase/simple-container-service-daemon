import process from 'process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createReception } from './Reception';
import { createService } from './Service';

export const run = async (argv: string[]): Promise<void> => {
    await yargs(hideBin(argv))
        .command(
            '$0 <command>',
            false,
            (yargs) => {
                return yargs
                    .option('autoStart', {
                        alias: 'a',
                        type: 'boolean',
                        describe: 'auto start service',
                        default: false,
                    })
                    .option('port', {
                        alias: 'p',
                        type: 'number',
                        describe: 'port to listen to',
                        default: 32366,
                    })
                    .option('cwd', {
                        type: 'string',
                        describe: 'working directory of the command',
                        default: '.',
                    })
                    .positional('command', {
                        describe: 'command to run the server',
                        type: 'string',
                        // Setting default value to make type `string` instead of `string | undefined` since this is a required arg and can not be undefined.
                        default: '',
                    });
            },
            async ({ autoStart, port, cwd, command: commandString }) => {
                console.log('⌥ options', {
                    autoStart,
                    port,
                    cwd,
                    commandString,
                });

                const [command, ...args] = commandString.split(' ');

                const service = createService({
                    cwd,
                    command,
                    args,
                    onStdOut: (chunk) => process.stdout.write(chunk),
                    onStdErr: (chunk) => process.stderr.write(chunk),
                    onError: (error) => {
                        if (error.code === 'ENOENT') {
                            console.error(`Failed to start the service. Command not found: ${command}.`);
                        } else {
                            console.error(`Service encountered an error: ${error.message}`);
                        }
                    },
                    onClose: (code, signal) => {
                        if (code !== null && code !== 0) {
                            console.warn(`Service terminated with exit code ${code}.`);
                        }

                        if (signal !== null) {
                            console.warn(`Service terminated with signal ${signal}.`);
                        }
                    },
                });

                process.on('exit', () => {
                    console.log('👋👋');
                });

                process.on('SIGINT', async () => {
                    console.log('\n🚨 Interrupted, waiting for service to stop...');

                    if (service.isRunning()) {
                        await service.terminate();
                    }

                    console.log('🛬 service stopped');

                    // eslint-disable-next-line no-process-exit
                    process.exit(0);
                });

                if (autoStart) {
                    await service.start();

                    console.log('🛫 service started');
                }

                const reception = createReception({
                    port,
                    onStatus: async () => {
                        return service.isRunning();
                    },
                    onStart: async () => {
                        await service.start();
                    },
                    onStop: async () => {
                        await service.terminate();
                    },
                    onRestart: async () => {
                        if (service.isRunning()) {
                            await service.terminate();
                        }
                        await service.start();
                    },
                });

                await reception.onEnd();
            }
        )
        .help().argv;
};
