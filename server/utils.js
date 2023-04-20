const os = require('os');
const fs = require('fs');

exports.getHost = () => {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    throw "No host address";
}

exports.getPort = (envVar, defaultValue) => {
    return process.env[envVar] ? parseInt(process.env[envVar]) : defaultValue;
}

exports.getWebSocketPort = () => exports.getPort("WS_PORT", 9443);

exports.getSSLOptions = () => {
    const sslDir = __dirname + "/../ssl/";
    return {
        key: fs.readFileSync(sslDir + "key.pem"),
        cert: fs.readFileSync(sslDir + "cert.pem")
    };
}
