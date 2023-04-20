const utils = require('./utils');
const httpsServer = require('./https/main');
const wsServer = require('./websocket/main');

const host = utils.getHost();
const httpsPort = utils.getPort('HTTPS_PORT', 8443);
const wsPort = utils.getWebSocketPort();

if (httpsPort==wsPort) {
    console.error('HTTPS and WS ports should be different')
} else {
    console.log("*** Text And File Transfer Demo Chat ***");
    httpsServer.server.listen(httpsPort, host, ()=>{
        console.log(`HTTPS Server is listening on ${host}:${httpsPort}`);
    });
    wsServer.server.listen(wsPort, () => {
        console.log(`WebSocket Server is listening on ${host}:${wsPort}`);
    });
}