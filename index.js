const express = require("express");
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const cors = require('cors');
const fs = require('fs');
const qrImage = require('qr-image');
const helmet = require("helmet");

const PORT = 8080;
const app = express();
const WebSocket = require('ws');


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'http://127.0.0.1:8080', 'ws://localhost:8080/', 'wss://localhost:8080/']
      }
    }
  }));
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ noServer: true })

app.get("/teste", (req, res) => {
    return res.status(200).json({ response: "working" })
})

;(async function connection() {
    let connected = false;
    let destroySession = false;
    wss.on('connection', function connection(ws) {
        
    try {
        let client = new Client({
           authStrategy: new LocalAuth({ clientId: "WHATSAPP-PDF" })
           //authStrategy: new LocalAuth({ clientId: "WHATSAPP-PDF-Developer" })
        })
        client.initialize();
        
        client.on('loading_screen', (percent, message) => {
            ws.send("connecting")
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

        app.get('/qrcode',  (req, res) => {
            console.log('get qrcode')
            if(destroySession){
                client.initialize();
            }
            client.on('qr',async qr => {   
                try {
                    console.log("Trying generate new qr code")
                    var svg_string = qrImage.imageSync(qr, { type: 'svg' });
                    res.status(200).json({ response: svg_string })
                    return
                } catch (e) {
                    console.log(e);
                }
            });
        })

        

        client.on('ready', async () => {
            console.log('Client is ready!');
            ws.send("ready")
            client.sendMessage(client.info.wid._serialized, 'Conectado!')
            connected = true;
        })
        client.on('disconnected', async () => {
            console.log('Disconnected!');
            connected = false;
            destroySession = true;
            
        })

        app.post("/sendMessage", upload.array("files"), async (req, res) => {
            fs.renameSync(`${req.files[0].destination}${req.files[0].filename}`, `${req.files[0].destination}${req.files[0].originalname}`);
            const media = MessageMedia.fromFilePath(`${req.files[0].destination}${req.files[0].originalname}`);
            let number = req.body.number
            let numberId = await client.getNumberId('55'+number);
            if(numberId == null){
                res.status(400).json({ error: "Este não é um whatsapp válido.\nVerifique o número e tente novamente!" })
                return 
            }
            client.sendMessage(numberId._serialized, media);
            fs.rmSync(`${req.files[0].destination}${req.files[0].originalname}`);
            res.status(200).json({ message: "Arquivo Enviado!" })
            return
        })


    } catch (err) {
        console.log(err);
    }
   
});
})()

app.listen(PORT, () => {
    console.log('Running on port: ', PORT);
})
