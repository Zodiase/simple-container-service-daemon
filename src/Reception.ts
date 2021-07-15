/**
 * The `Reception` abstracts the interaction with the ports and network away and allow the caller to
 * simply declare callbacks on specific abstract events.
 */

import express from 'express';

export interface ReceptionOptions {
    port: number;
    /**
     * This is called when a request is received to fetch the status of the service.
     */
    onStatus: () => Promise<boolean>;
    /**
     * This is called when a request is received to start the service.
     * The returned promise should only resolve when the service has been started.
     */
    onStart: () => Promise<void>;
    /**
     * This is called when a request is received to stop the service.
     * The returned promise should only resolve when the service has been stopped.
     */
    onStop: () => Promise<void>;
    /**
     * This is called when a request is received to restart the service.
     * The returned promise should only resolve when the service has been restarted.
     */
    onRestart: () => Promise<void>;
}

export interface Reception {
    onEnd(): Promise<void>;
}

export function createReception({ port, onStatus, onStart, onStop, onRestart }: ReceptionOptions): Reception {
    const app = express();

    app.get('/', async (req, res) => {
        const running = await onStatus();

        if (running) {
            res.send(`
<h1>Service is running</h1>
<form method="post" action="/stop">
    <button type="submit">Stop</button>
</form>
`);
        } else {
            res.send(`
<h1>Service is not running</h1>
<form method="post" action="/start">
    <button type="submit">Start</button>
</form>
`);
        }
    });

    app.post('/start', async (req, res) => {
        try {
            await onStart();
        } catch (error) {
            //! If the service was already running, we'll hit an error. Report the error.
            return;
        }

        res.redirect(303, '/');
    });

    app.post('/stop', async (req, res) => {
        try {
            await onStop();
        } catch (error) {
            //! If the service was not running, we'll hit an error. Report the error.
            return;
        }

        res.redirect(303, '/');
    });

    app.post('/restart', async (req, res) => {
        await onRestart();

        res.redirect(303, '/');
    });

    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`);
    });

    return {
        //! This promise should only resolve when the server is terminated.
        onEnd: () => new Promise(() => {
            // Left empty.
        }),
    };
}
