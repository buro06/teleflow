const express = require('express');
const fs = require('fs');
const path = require('path');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const app = express();
const server = createServer(app);
const io = new Server(server);

var config = require('./config/config.json');
var package = require('./package.json');

//Setup console for application
console.clear();
console.log("TeleFlow Server " + package.version + "");

//Use HTTP auth
app.use(authentication);
app.use(express.static(path.join(__dirname, 'public')));

//Update client accessable server info
setServerInfo()


io.on('connection', (socket) => {
    console.log('Client Connected: ' + socket.id);
    socket.on('controlPosition', (data, callback) => {
        console.log('Received position ' + data.controlScrollTop + '/' + data.controlScrollMax + ' from controller')
        callback(updateClientPosition(data));
    });
    socket.on('upload', (data, callback) => {
        callback(writeScript(data));
    });
    socket.on('disconnect', () => {
        console.log('Client Disconnected: ' + socket.id);
    });
});

server.listen(config.port, () => {
    console.log('Listening on *:' + config.port + '\n\n');
});

function authentication(req, res, next) {
    const authHeader = req.headers.authorization;
    const reqIp = req.ip;
    const reqPath = req.path;

    if (!authHeader) {
        let err = new Error('You are not authenticated! IP Logged: ' + reqIp);
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        err.stack = '';
        return next(err);
    }

    const auth = new Buffer.from(authHeader.split(' ')[1], 'base64')
        .toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user == config.user && pass == config.secret) {
        console.log("Client " + reqIp + " Authenticated " + reqPath);
        next();
    } else {
        let err = new Error('The authorization header does not match the config! IP Logged: ' + reqIp);
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        err.stack = '';
        return next(err);
    }
}

function updateClientPosition(scroll) {
    console.log('Updating clients position');
    io.emit('payload', scroll);
}

function writeScript(data) {
    //Fix line break on URLS;
    //var script = data.replace(/([/.])(?=\S)/g, '$1\u200B');
    var script = data;

    fs.writeFile('./public/script.txt', script, err => {
        if (err) {
            console.error(err);
            return err;
        } else {
            console.log("Script written");
            return "The script was written to the server OK";
        }
    });
}

function setServerInfo() {
    var obj = {
        serverInfo: []
    };
    obj.serverInfo.push({
        version: package.version,
        updateIntervalSecs: config.updateIntervalSecs,
        scrollMethod: config.scrollMethod
    })
    var json = JSON.stringify(obj);
    fs.writeFile('./public/serverInfo.json', json, err => {
        if (err) {
            console.error(err);
            return err;
        }
    });
}