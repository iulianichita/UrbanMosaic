import { WebSocketServer } from "ws";
import { spawn } from "child_process";

const wss = new WebSocketServer({ port: 8080 });

// de schimbat cu calea catre Pd pe sistemul tau
const PD_PATH = '/Applications/Pd-0.56-2.app/Contents/Resources/bin/pd';

const FUNDAL_PATCH =
'/Users/emmamaciuca/Desktop/Facultate/TNM/UrbanMosaic/PD/fundal.pd';

const CAMERA2_PATCH =
'/Users/emmamaciuca/Desktop/Facultate/TNM/UrbanMosaic/PD/camera2.pd';

let fundalProcess = null;
let camera2Process = null;

function pornestePatch(calePatch) {
    return spawn(PD_PATH, [
        '-nogui',
        '-noadc',
        '-channels', '2',
        '-r', '44100',
        '-audiobuf', '100',
        '-send', 'pd dsp 1',
        calePatch
    ]);
}

function pornesteFundal() {
    if (fundalProcess) return;

    fundalProcess = pornestePatch(FUNDAL_PATCH);

    fundalProcess.on('close', () => {
        fundalProcess = null;
    });

    console.log('fundal pornit');
}

function opresteFundal() {
    if (!fundalProcess) return;

    fundalProcess.kill();
    fundalProcess = null;

    console.log('fundal oprit');
}

function pornesteCamera2() {
    if (camera2Process) return;

    camera2Process = pornestePatch(CAMERA2_PATCH);

    camera2Process.on('close', () => {
        camera2Process = null;
    });

    console.log('camera2 pornit');
}

function opresteCamera2() {
    if (!camera2Process) return;

    camera2Process.kill();
    camera2Process = null;

    console.log('camera2 oprit');
}

wss.on('connection', ws => {
    console.log('Browser conectat');

    ws.on('message', message => {
        const comanda = message.toString();

        if (comanda === 'START_BACKGROUND') {
            opresteCamera2();
            pornesteFundal();
        }

        if (comanda === 'ENTER_ROOM') {
            opresteFundal();
            pornesteCamera2();
        }

        if (comanda === 'EXIT_ROOM') {
            opresteCamera2();
            pornesteFundal();
        }
    });

});

//pornesteFundal();

console.log('Audio server activ pe ws://localhost:8080');