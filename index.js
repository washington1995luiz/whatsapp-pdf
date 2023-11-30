const express = require("express");
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const cors = require('cors');
const fs = require('fs');
var qrImage = require('qr-image');

const PORT = 8080;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
(async function connection() {
    let connected = false;
    try {
        const client = new Client({
           // authStrategy: new LocalAuth({ clientId: "WHATSAPP-PDFf" })
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

        app.get('/connected', ( req, res ) => {
            if(connected){
                res.status(200).json({ response: true })
            }else {
                res.status(200).json({ response: false })
            }
        })

        app.get('/qrcode', (req, res) => {
            client.on('qr', qr => {
                try {
                    //qrcode.generate(qr, { small: true });
                    /*var qr_svg = qrImage.image(qr, { type: 'svg' });
                    qr_svg.pipe(require('fs').createWriteStream('qrcode.svg'));*/
                    var svg_string = qrImage.imageSync(qr, { type: 'svg' });
                    res.status(200).json({ response: svg_string })
    
                } catch (e) {
                    console.log(e);
                    res.status(300).json({ response: e })
                }
            });
        })

        

        client.on('ready', async () => {
            console.log('Client is ready!');
            connected = true;
        })
        client.on('disconnected', () => {
            console.log('Disconnected!');
            connected = false;
        })

        app.post("/sendMessage", upload.array("files"), async (req, res) => {
            fs.renameSync(`${req.files[0].destination}${req.files[0].filename}`, `${req.files[0].destination}${req.files[0].originalname}`);
            const media = MessageMedia.fromFilePath(`${req.files[0].destination}${req.files[0].originalname}`);
            let number = req.body.number
            let numberCheck = number.toString().split('');
            if (numberCheck.length > 10) {
                numberCheck.splice(2, 1);
                number = numberCheck.join('')
            }
            client.sendMessage(`55${number}@c.us`, media);
            fs.rmSync(`${req.files[0].destination}${req.files[0].originalname}`);
            res.status(200).json({ message: "Mensagem Enviada!" })
        })


    } catch (err) {
        console.log(err);
    }
})()

app.listen(PORT, () => {
    console.log('Running on port: ', PORT);
})
