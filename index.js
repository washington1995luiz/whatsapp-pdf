const express = require("express");
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const cors = require('cors');
const fs = require('fs');

const PORT = 8080;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
(async function connection() {
    try {
        const client = new Client({
            authStrategy: new LocalAuth({ clientId: "WHATSAPP-PDF" })
        })
        client.initialize();

        client.on('loading_screen', (percent, message) => {
            console.log('LOADING SCREEN', percent, message);
        })

        client.on('authenticated', () => {
            console.log('AUTHENTICATED')
        })

        client.on('auth_failure', msg => {
            console.log("AUTHENTICATION FAILURE", msg);
        })

        client.on('qr', qr => {
            try {
                qrcode.generate(qr, { small: true });

            } catch (e) {
                console.log(e);
            }
        });

        client.on('ready', async () => {
            console.log('Client is ready!');
        })
        
        app.post("/sendMessage", upload.array("files"), async (req, res) => {
            fs.renameSync(`${req.files[0].destination}${req.files[0].filename}`, `${req.files[0].destination}${req.files[0].originalname}`);
            const media =  MessageMedia.fromFilePath(`${req.files[0].destination}${req.files[0].originalname}`);
            let number = req.body.number
            let numberCheck = number.toString().split('');
            if(numberCheck.length > 10){
                numberCheck.splice(2,1);
                number = numberCheck.join('')
            }
            client.sendMessage(`55${number}@c.us`, media);
            fs.rmSync(`${req.files[0].destination}${req.files[0].originalname}`);
            res.status(200).json({ message: "Mensagem Enviada!"})
        })
        

    }catch(err){
        console.log(err);
    }
    })()

app.listen(PORT, () => {
    console.log('Running on port: ', PORT);
})
