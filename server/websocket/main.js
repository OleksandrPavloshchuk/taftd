const ws = require('ws');
const https = require('https');

const utils = require('../utils');

var users = {};

// entry point:
exports.server = https.createServer(utils.getSSLOptions());

new ws.Server({server: exports.server}).on( 'connection', connection => {
    log('new connection:', connection._socket.remoteAddress);

    connection.on('message', message => {
        log('message:', message);
        try {
            const data = JSON.parse(message);
            getHandler(data)(connection, data);
        } catch (ex) {
            logError('invalid JSON', message);
        }
    });

    connection.on('close', () => {
        if (connection.name) {
            delete users[connection.name];
            if (connection.otherName) {
                var conn = users[connection.otherName];
                if (conn) {
                    log('Disconnecting from:', conn.name);
                    conn.otherName = null;
                    sendTo(conn, {type: 'disconnect'});
                }
            }
        }
    });
    
});

//---

function getHandler(data) {
    switch (data.type) {
        case 'login':
            return onLogin;
        case 'logout':
            return onLogout;
        case 'call':
        case 'call-cancel':            
        case 'call-accepted':
        case 'call-rejected':
        case 'message':
        case 'transfer-file':
        case 'transfer-file-last':
            return onForward;
        case 'disconnect':
            return onDisconnect;
        default:
            return onDefault;
    }    
}

function onDefault(connection, data) {
    sendTo(connection, {
        type: 'error',
        message: 'unexpected command type: ' + data.type
    }); 
}

function onLogin(connection, data) {
    log('Try to login:', data.from);
    if (users[data.from]) {
        // Already logged:
        sendTo(connection, {type: 'login-rejected'});
    } else {
        // Log in:
        users[data.from] = connection;
        connection.name = data.from;
        sendTo(connection, {type: 'login-accepted'});              
    }
}

function onLogout(connection, data) {
    log('Logout:', data.from);
    if (users[data.from]) {
        delete users[data.from];
    }
}

function onForward(connection, data) {
    log('Forwardind message to:', data.to);
    const conn = users[data.to];
    if (conn) {
        connection.otherName = data.to;
        sendTo(conn, data);
    } else {
        sendTo(connection, {type: 'disconnect', to: data.from, from: data.to});
    }
}

function onDisconnect(connection, data) {
    log('Disconnecting:', data.from, data.to);    
    const conn = users[data.to];
    if (conn) {
        conn.otherName = null;
        sendTo(conn, data);
    }
}

function sendTo(connection, data) {
    log('Send message:', data);
    connection.send(JSON.stringify(data));
}

function log(...arguments) {
    console.log("[WS]", ...arguments);
}

function logError(...arguments) {
    console.error("[WS]", ...arguments);
}

