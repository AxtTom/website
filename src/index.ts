require('./consolelog').config();

import * as http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import * as fs from 'fs';
import * as socketio from 'socket.io';
import { MongoClient } from 'mongodb';
import { EasyMongo } from './easymongo';
import * as ejs from 'ejs';
import axios from 'axios';

export interface Site {
    name: string,
    path: string,
    hideInList?: boolean,
    file: string
}

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
    .use(cors())
    .set('view engine', 'ejs');
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

    let sites: Site[] = [
        {
            name: 'Home',
            path: '/',
            file: 'home.ejs'
        },
        {
            name: 'Modpack',
            path: '/modpack',
            file: 'modpack.ejs'
        },
        {
            name: 'Place',
            path: '/place',
            file: 'place.ejs',
            hideInList: true
        },
        {
            name: 'Imprint',
            path: '/imprint',
            file: 'imprint.ejs',
            hideInList: true
        },
        {
            name: 'Privacy',
            path: '/privacy',
            file: 'privacy.ejs',
            hideInList: true
        }
    ];

    app.get('*', async (req, res) => {
        const site = sites.filter(site => site.path === '/' + req.url.split('/').filter(x => x !== '').join('/').split('?')[0])[0];
        const html = await ejs.renderFile(__dirname + '/ejs/index.ejs', {
            axios,
            sites,
            site,
            placeTime: global.placeTime
        }, { async: true });
        res.send(html);
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