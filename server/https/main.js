const https = require('https');
const fs = require('fs');
const utils = require('../utils');

// entry point:
const host = utils.getHost();
const wsPort = utils.getWebSocketPort();
const wsURL = `wss://${host}:${wsPort}`;

exports.server = https.createServer(utils.getSSLOptions(), (request, response) => {
    const filePath = getFilePath(request);
    switch( filePath ) {
        case '/VIRTUAL/websocket-url.js':
            sendWebSocketUrl(response);
            break;
        default:
            sendStaticFile(filePath, response);            
    }
});

function sendStaticFile(filePath, response) {
    fs.readFile(`${__dirname}/../../webapp/${filePath}`, (error, data) => {
        if (error) {
            response.statusCode = 404;
            response.end(JSON.stringify(error));
        } else {
            response.statusCode = 200;
            response.end(data);
        }
    });
}

function sendWebSocketUrl(response) {
    response.statusCode = 200;
    response.end(`//GENERATED {{\nconst signalsUrl = "${wsURL}";\n//}}GENERATED\n`);
}

function getFilePath(request) {
    const p = request.url;
    return p && p!="" && p!="/" ? p : "index.html";
}

