require('./consolelog').config();

import * as http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Site } from './site';
import * as fs from 'fs';
import * as socketio from 'socket.io';
import { MongoClient } from 'mongodb';
import { EasyMongo } from './easymongo';

const mongo = new MongoClient('mongodb://localhost:27017');

async function main() {
    //#region Mongo Setup
    await mongo.connect();
    console.log('Connected to MongoDB');
    
    const web = mongo.db('website');
    global.place = new EasyMongo(web.collection('place'));
    //#endregion

    // Configure HTTPS server
    const app = express()
    .disable('x-powered-by')
    .use(helmet({
        contentSecurityPolicy: false
    }))
    .use(cors());
    const server = http.createServer(app);
    const io = new socketio.Server(server);

    global.placeTime = 5;

    let place = '';
    const countdown = new Map();
    for (let x = 0; x < 100; x++) {
        for (let y = 0; y < 100; y++) {
            place += '0';
        }
    }
    if (fs.existsSync('place.txt')) {
        place = fs.readFileSync('place.txt', 'utf8');
    }
    setInterval(() => {
        fs.writeFileSync('place.txt', place);
    }, 1000);
    io.on('connection', (socket) => {
        console.log(socket.id);
        socket.emit('placeAll', place);
        socket.on('place', async (data) => {
            data.x = Math.round(data.x);
            data.y = Math.round(data.y);
            console.log(data);
            if (!data.secret || !(await global.place.has({ secret: data.secret }))) return;
            if (countdown.get(data.secret) && countdown.get(data.secret) > Date.now()) {

            }
            else {
                if (data.x >= 0 && data.x < 100 && data.y >= 0 && data.y < 100 && parseInt(data.color, 16) >= 0 && parseInt(data.color, 16) < 16) {
                    place = place.substr(0, data.y * 100 + data.x) + data.color + place.substr(data.y * 100 + data.x + 1);
                    io.emit('place', {
                        x: data.x,
                        y: data.y,
                        color: data.color,
                        id: data.id
                    });
                    countdown.set(data.secret, Date.now() + 1000 * global.placeTime);
                }
            }
        });
    });

    app.use('/static', express.static('./static'));
    app.use('/downloads', express.static('./downloads'));

    let sites: Site[] = [];
    fs.readdirSync(__dirname + '/sites').filter(x => x.endsWith('.ts')).forEach((site) => {
        sites.push(require(__dirname + '/sites/' + site).site);
    });
    const list = sites.map((site) => site.hideInList ? '' : `<a href="${site.path}"><li>${site.name}</li></a>`).join('');

    app.get('*', async (req, res) => {
        const site = sites.filter(site => site.path === '/' + req.url.split('/').filter(x => x !== '').join('/').split('?')[0])[0];
        res.send(`<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="icon" type="image/x-icon" href="/static/favicon.ico">
            <link href="/static/index.css" rel="stylesheet"></style>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" integrity="sha512-894YE6QWD5I59HgZOGReFYm4dnWc1Qt5NtvYSaNcOP+u1T9qYdvdihz0PPSiiqn/+/3e7Jo4EaG7TubfWGUrMQ==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
            <title>${site ? site.name: '404'} | AxtTom</title>
            <script>
            $(document).ready(() => {
                $('#menu #button').on('click', () => {
                    console.log('test')
                    $('#menu #open').css('display', $('#menu #open').css('display') === 'none' ? 'block' : 'none');
                    $('#menu #button img').attr('src', $('#menu #button img').attr('src') === '/static/svg/menu.svg' ? '/static/svg/close.svg' : '/static/svg/menu.svg');
                });
            });
            </script>
        </head>
        <body>
            <div id="header-left"></div>
            <div id="header">AxtTom's Website</div>
            <div id="header-right"></div>
            <div id="main">${site ? await site.render(req, res) : '<h1 style="text-align: center;">Not Found</h1>'}</div>
            <div id="sidebar">
                <div id="Sidebar">
                    <ul id="top">
                        ${list}
                    </ul>
                    <ul id="bottom">
                        <a href="/imprint"><li>Imprint</li></a>
                        <a href="/privacy"><li>Privacy</li></a>
                    </ul>
                </div>
            </div>
            <div id="menu">
                <div id="open" style="display: none;"> 
                    <ul id="top">
                        ${list}
                    </ul>
                    <ul id="bottom">
                        <a href="/imprint"><li>Imprint</li></a>
                        <a href="/privacy"><li>Privacy</li></a>
                    </ul>
                </div>
                <div id="button">
                    <img src="/static/svg/menu.svg">
                </div>
            </div>
        </body>
        </html>`);
        res.end();
    });

    server.listen(8445, 'localhost', () => {
        console.log('Server running!');
    });

    // Catch all uncaught exceptions
    process.on('uncaughtException', (err) => {
        console.error(err);
    });
}

main();