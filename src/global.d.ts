import { EasyMongo } from './easymongo';
import * as nodemailer from 'nodemailer';

declare global {
    var placeTime: number;

    var place: EasyMongo;
    var users: EasyMongo;
    var sessions: EasyMongo;

    var mailer: nodemailer.Transporter;

    var pending: any[];
}

export {};