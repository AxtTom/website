import { EasyMongo } from './easymongo';
import * as nodemailer from 'nodemailer';

declare global {
    var placeTime: number;

    var place: EasyMongo;
    var users: EasyMongo;

    var mailer: nodemailer.Transporter;

    var pending: {
        username: string,
        email: string,
        password: string,
        secret: string
    }[];
}

export {};