const nodemailer = require('nodemailer');
const pug =  require('pug');
const {convert} = require('html-to-text');
const { model } = require('mongoose');

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email;
         this.firstName = user.name.split(' ')[0];
         this.url = url;
         this.from = `Tonny Tei <${process.env.GMAIL_USERNAME}>`;
    }

    newTransport(){
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USERNAME,
                pass: process.env.GMAIL_PASSWORD
            },
        });
    }

    async send (template, subject){
        const html = pug.renderFile(`${__dirname}`)
    }
}