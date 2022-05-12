require('./consolelog').config();
import 'dotenv/config';

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
import cookieParser from 'cookie-parser';
import multer from 'multer';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import * as argon from 'argon2';

export interface Site {
    name: string,
    path: string,
    file: string,
    icon?: string,
    hideInList?: boolean,
    adminOnly?: boolean,
    loginRequired?: boolean
}

global.pending = [];
global.emailBlock = [];

global.cooldownEmail = 1000 * 60 * 5;

const mongo = new MongoClient('mongodb://localhost:27017');

async function main() {
    //#region Mongo Setup
    console.log('Connecting to MongoDB...');
    await mongo.connect();
    console.log('Connected to MongoDB');
    
    const web = mongo.db('website');
    global.place = new EasyMongo(web.collection('place'));
    global.users = new EasyMongo(web.collection('users'));
    global.sessions = new EasyMongo(web.collection('sessions'));
    global.chat = new EasyMongo(web.collection('chat'));
    //#endregion

    global.mailer = nodemailer.createTransport({
        host: 'mail.axttom.de',
        port: 465,
        secure: true,
        auth: {
            user: 'noreply@axttom.de',
            pass: process.env.MAIL_PASSWORD
        }
    });

    // Configure HTTPS server
    const app = express()
    .disable('x-powered-by')
    .use(helmet({
        contentSecurityPolicy: false
    }))
    .use(cors())
    .set('view engine', 'ejs')
    .use(express.json())
    .use(cookieParser());
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
        socket.on('chatJoin', (data) => {
            global.chat.getAll().then(async (messages) => {
                let msgs = [];
                for (let msg of messages) {
                    const user = await global.users.get({ _id: msg.user });
                    if (!user) continue;
                    msgs.push({
                        user: user.username,
                        msg: msg.msg
                    });
                }
                socket.emit('chatInit', {
                    messages: msgs
                });
            });


            socket.on('chatMsg', async (data) => {
                if (!data.msg || !data.token) return;

                const session = await global.sessions.get({ token: data.token });
                if (!session) return;
                const user = await global.users.get({ _id: session.user });
                if (!user) return;

                io.emit('chatMsg', {
                    msg: data.msg,
                    user: user.username
                });

                global.chat.insert({
                    msg: data.msg,
                    user: user._id,
                    time: new Date().getTime()
                });
            });
        });
    });

    app.use('/static', express.static('./static'));
    app.use('/downloads', express.static('./downloads'));

    let rawSites: Site[] = [
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
            name: 'Chat',
            path: '/chat',
            file: 'chat.ejs',
            loginRequired: true
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
        },

        {
            name: 'Login',
            path: '/login',
            file: 'login.ejs',
            hideInList: true
        },
        {
            name: 'Register',
            path: '/register',
            file: 'register.ejs',
            hideInList: true
        },
        {
            name: 'Profile',
            path: '/profile',
            file: 'profile.ejs',
            hideInList: true
        },
        {
            name: 'Forgot Password',
            path: '/forgotpassword',
            file: 'forgotpassword.ejs',
            hideInList: true
        },

        {
            name: 'Admin',
            path: '/admin',
            file: 'admin.ejs',
            adminOnly: true
        }
    ];

    app.post('/login', multer().none(), async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            res.send({
                success: false,
                errors: [ 'Missing email or password' ]
            });
            res.end();
        }
        else {
            const user = await global.users.get({ email });

            if (!user) {
                res.send({
                    success: false,
                    errors: [ 'Email not linked to an account' ]
                });
                res.end();
            }
            else {
                if (await argon.verify(user.password, password + email + process.env.PEPPER)) {
                    if (!user.password.startsWith('$argon2')) {
                        res.send({
                            success: false,
                            errors: [ 'Please reset your password' ]
                        });
                    }
                    else {
                        res.send({
                            success: false,
                            errors: [ 'Wrong password' ]
                        });
                    }
                    res.end();
                }
                else {
                    const token = crypto.randomBytes(32).toString('hex');
                    global.sessions.set({ token }, { token, user: user._id, created: Date.now() }).then(() => {
                        res.send({
                            success: true,
                            token
                        });
                        res.end();
                    });
                }
            }
        }
    });
    app.post('/register', multer().none(), async (req, res) => {
        let errors: string[] = [];

        if (!req.body.username || req.body.username == '') errors.push('Username is required');
        if (!req.body.email || req.body.email == '') errors.push('Email is required');
        if (!req.body.password || req.body.password.length != 2 || req.body.password[0] == '') errors.push('Password is required');
        
        if (errors.length > 0) {
            res.send({
                success: false,
                errors
            });
        }
        else {
            if (req.body.username.length < 4) errors.push('Username must be at least 4 characters long');
            if (req.body.username.length > 16) errors.push('Username must be at most 16 characters long');
            if (!req.body.username.match(/^[a-zA-Z0-9_]+$/)) errors.push('Username contains invalid characters');
            if (!req.body.email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
                errors.push('Email is not valid');
            if (req.body.password[0].length < 8) errors.push('Password must be at least 8 characters long');
            if (req.body.password[0].length > 32) errors.push('Password must be at most 32 characters long');
            if (req.body.password[0] !== req.body.password[1]) errors.push('Passwords do not match');
            if (!req.body.password[0].match(/[a-z]/)) errors.push('Password must contain at least one lowercase letter');
            if (!req.body.password[0].match(/[A-Z]/)) errors.push('Password must contain at least one uppercase letter');
            if (!req.body.password[0].match(/[0-9]/)) errors.push('Password must contain at least one number');
            //if (!req.body.password[0].match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)) errors.push('Password must contain at least one special character');
            if (!req.body.password[0].match(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/)) errors.push('Password contains invalid characters');

            if (errors.length > 0) {
                res.send({
                    success: false,
                    errors
                });
            }
            else {
                // Input correct
                if (await global.users.has({ username: req.body.username })) {
                    errors.push('Username is already taken');
                }
                if (await global.users.has({ email: req.body.email })) {
                    errors.push('Email is already used by another account');
                }

                if (errors.length > 0) {
                    res.send({
                        success: false,
                        errors
                    });
                }
                else {
                    const emailBlock = global.emailBlock.find(x => x.email === req.body.email);
                    if (emailBlock.lastUsed + global.cooldownEmail < Date.now()) {
                        global.emailBlock = global.emailBlock.filter(x => x.email !== req.body.email);
                    }
                    else {
                        errors.push('Too many requests. Please try again later.');
                    }

                    if (errors.length > 0) {
                        res.send({
                            success: false,
                            errors
                        });
                    }
                    else {
                        const secret = crypto.randomBytes(20).toString('hex')
                        global.mailer.sendMail({
                            from: '"noreply" <noreply@axttom.de>',
                            to: req.body.email,
                            subject: 'Account activation',
                            text: 'Confirm here: https://axttom.de/activation?secret=' + secret
                        });
                        global.emailBlock.push({ email: req.body.email, lastUsed: Date.now() });
                        global.pending = global.pending.filter(x => x.email !== req.body.email);
                        global.pending.push({
                            username: req.body.username,
                            email: req.body.email,
                            //password: crypto.createHash('sha256').update(req.body.password[0] + req.body.email + process.env.PEPPER).digest('hex'),
                            password: await argon.hash(req.body.password[0] + req.body.email + process.env.PEPPER),
                            secret
                        });
                        res.send({
                            success: true
                        });
                    }
                }
            }
        }

        res.end();
    });
    app.post('/changepassword', multer().none(), async (req, res) => {
        let errors = [];

        const session = req.cookies.token ? await global.sessions.get({ token: req.cookies.token }) : null;
        const user = session ? await global.users.get({ _id: session.user }) : null;

        if (!user) errors.push('Not logged in');

        if (errors.length > 0) {
            res.send({
                success: false,
                errors
            });
            res.end();
            return;
        }

        if (!req.body.oldpassword) errors.push('Password is required');
        if (!req.body.newpassword || !req.body.cnewpassword) errors.push('New password is required');
        else {
            if (req.body.newpassword.length < 8) errors.push('Password must be at least 8 characters long');
            if (req.body.newpassword.length > 32) errors.push('Password must be at most 32 characters long');
            if (req.body.newpassword !== req.body.cnewpassword) errors.push('Passwords do not match');
            if (!req.body.newpassword.match(/[a-z]/)) errors.push('Password must contain at least one lowercase letter');
            if (!req.body.newpassword.match(/[A-Z]/)) errors.push('Password must contain at least one uppercase letter');
            if (!req.body.newpassword.match(/[0-9]/)) errors.push('Password must contain at least one number');
            //if (!req.body.newpassword.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)) errors.push('Password must contain at least one special character');
            if (!req.body.newpassword.match(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/)) errors.push('Password contains invalid characters');
        }

        if (errors.length > 0) {
            res.send({
                success: false
            });
            res.end();
            return;
        }

        //if (crypto.createHash('sha256').update(req.body.oldpassword + user.email + process.env.PEPPER).digest('hex') !== user.password) errors.push('Password is not correct');
        if (!await argon.verify(user.password, req.body.oldpassword + user.email + process.env.PEPPER)) errors.push('Old password is incorrect');

        if (errors.length > 0) {
            res.send({
                success: false,
                errors
            });
            res.end();
            return;
        }

        //const hash = crypto.createHash('sha256').update(req.body.newpassword + user.email + process.env.PEPPER).digest('hex');
        const hash = await argon.hash(req.body.newpassword + user.email + process.env.PEPPER);
        global.users.set({ _id: user._id }, { password: hash }).then(() => {
            res.send({
                success: true,
                errors
            });
            res.end();
        });
        global.sessions.removeAll({ user: user._id });
    });
    app.post('/forgotpassword', multer().none(), async (req, res) => {
        let errors = [];

        if (req.body.type && req.body.type === 'email') {
            if (!req.body.email) errors.push('Email is required');
            else {
                if (!(await global.users.has({ email: req.body.email }))) 
                    errors.push('Email is not registered');
            }

            const emailBlock = global.emailBlock.find(x => x.email === req.body.email);
            if (emailBlock.lastUsed + global.cooldownEmail < Date.now()) {
                global.emailBlock = global.emailBlock.filter(x => x.email !== req.body.email);
            }
            else {
                errors.push('Too many requests. Please try again later.');
            }

            if (errors.length > 0) {
                res.send({
                    success: false,
                    errors
                });
                res.end();
                return;
            }

            const reset = crypto.randomBytes(20).toString('hex')
            global.mailer.sendMail({
                from: '"noreply" <noreply@axttom.de>',
                to: req.body.email,
                subject: 'Reset password',
                text: 'Confirm here: https://axttom.de/forgotpassword?reset=' + reset
            });
            global.emailBlock.push({
                email: req.body.email,
                lastUsed: Date.now()
            });
            global.pending = global.pending.filter(x => x.email !== req.body.email);
            global.pending.push({
                email: req.body.email,
                reset
            });
            res.send({
                success: true
            });
            res.end();
        }
        if (req.body.type && req.body.type === 'password') {
            const { password, cpassword } = req.body;

            if (!password) errors.push('Password is required');
            else {
                if (password.length < 8) errors.push('Password must be at least 8 characters long');
                if (password.length > 32) errors.push('Password must be at most 32 characters long');
                if (password !== cpassword) errors.push('Passwords do not match');
                if (!password.match(/[a-z]/)) errors.push('Password must contain at least one lowercase letter');
                if (!password.match(/[A-Z]/)) errors.push('Password must contain at least one uppercase letter');
                if (!password.match(/[0-9]/)) errors.push('Password must contain at least one number');
                //if (!password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)) errors.push('Password must contain at least one special character');
                if (!password.match(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/)) errors.push('Password contains invalid characters');
            }

            if (!req.body.reset) errors.push('Error resetting password');
            else {
                const pending = global.pending.find(x => x.reset === req.body.reset);
                if (!pending) errors.push('Error resetting password');
                else {
                    const user = await global.users.get({ email: pending.email });
                    global.pending = global.pending.filter(x => x.email !== pending.email);

                    if (!user) errors.push('Error resetting password');
                    else {
                        //const hash = crypto.createHash('sha256').update(password + user.email + process.env.PEPPER).digest('hex');
                        const hash = await argon.hash(password + user.email + process.env.PEPPER);
                        global.users.set({ email: user.email }, { password: hash }).then(() => {
                            res.send({
                                success: true
                            });
                            res.end();
                        });
                        global.sessions.removeAll({ user: user._id });
                    }
                }
            }

            if (errors.length > 0) {
                res.send({
                    success: false,
                    errors
                });
                res.end();
                return;
            }
        }
    });

    app.post('/admin', async (req, res) => {
        if (!req.body.token || !req.body.action) {
            res.send({
                success: false,
                msg: 'Missing parameters'
            });
            res.end();
            return;
        }

        const session = await global.sessions.get({ token: req.body.token });
        if (!session) {
            res.send({
                success: false,
                msg: 'Invalid session'
            });
            res.end();
            return;
        }
        const user = await global.users.get({ _id: session.user });
        if (!user) {
            res.send({
                success: false,
                msg: 'Invalid session'
            });
            res.end();
            return;
        }

        if (!user.admin) {
            res.send({
                success: false,
                msg: 'Not an admin'
            });
            res.end();
            return;
        }

        switch (req.body.action) {
            case 'wipeChat':
                global.chat.removeAll({});
                res.send({
                    success: true,
                    msg: 'Chat wiped'
                });
                break;

            default:
                break;
        }
        res.end();
    });

    app.get('/activation', async (req, res) => {
        if (!req.query.secret) {
            res.send('Activation failed');
            res.end();
            return;
        }
        let user = global.pending.find(x => x.secret == req.query.secret);
	if (user) {
            global.pending = global.pending.filter(x => x.email !== user.email);
            global.users.set({ email: user.email }, { username: user.username, email: user.email, password: user.password }).then(() => {
                res.send('Activation successful');
                res.end();
                return;
            });
        }
        else {
            res.send('Activation failed');
            res.end();
            return;
        }
    });

    app.get('*', async (req, res) => {
        let session = req.cookies.token ? await global.sessions.get({ token: req.cookies.token }) : null;
        if (session.lastUsed + (1000 * 60 * 60 * 24 * 3) < Date.now()) {
            global.sessions.remove({ _id: session._id });
            session = null;
        }
        const user = session ? await global.users.get({ _id: session.user }) : null;
        
        const sites = rawSites.filter(x => !x.adminOnly || (user && user.admin));
        const site = sites.filter(site => site.path === '/' + req.url.split('/').filter(x => x !== '').join('/').split('?')[0])[0];
        
        if (user) {
            global.sessions.set({ _id: session._id }, { lastUsed: Date.now() });
        }
        const html = await ejs.renderFile(__dirname + '/ejs/index.ejs', {
            axios,
            global,
            sites,
            site,
            cookies: req.cookies,
            query: req.query,
            session,
            user
        }, { async: true });
        res.send(html);
        res.end();
    });

    server.listen(8445, process.env.DEBUG  ? '0.0.0.0' : 'localhost', () => {
        console.log('Server running!');
    });

    // Catch all uncaught exceptions
    process.on('uncaughtException', (err) => {
        console.error(err);
    });
}

main();
