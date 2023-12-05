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


app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", 'http://127.0.0.1:8080', 'ws://localhost:8080/', 'wss://localhost:8080/']
        }
    }
}));
let connected = false;
let initialized = false;
let svgToSend = '';
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server: server })
wss.on('connection', function connection(ws) {
    if(svgToSend !== ''){
        ws.send(svgToSend)
    }
});
wss.broadcast = function (data) {
    wss.clients.forEach(client => client.send(data));
};
; (async function connection() {
    try {
        let client = new Client({
            authStrategy: new LocalAuth({ clientId: "WHATSAPP-PDF" })
            //authStrategy: new LocalAuth({ clientId: "WHATSAPP-PDF-Developer" })
        })
        if (initialized == false) {
            console.log('Iniciando sessão!');
            client.initialize()
            console.log('Sessão iniciada!');
            initialized = true;
        }

        client.on('loading_screen', (percent, message) => {
            svgToSend = '';
            wss.broadcast("connecting")

            console.log('LOADING SCREEN', percent, message);
        })

        client.on('authenticated', () => {
            console.log('AUTHENTICATED')
        })

        client.on('auth_failure', msg => {
            console.log("AUTHENTICATION FAILURE", msg);
        })

        app.get('/connected', (req, res) => {
            if (connected) {
                res.status(200).json({ response: true })
            } else {
                res.status(200).json({ response: false })
            }
        })

        client.on('qr', async qr => {
            try {
                console.log("QRCODE")
                var svg_string = qrImage.imageSync(qr, { type: 'svg' });
                svgToSend = svg_string;
                wss.broadcast(svg_string);
            } catch (e) {
                console.log(e);
            }
        });


        client.on('ready', async () => {
            console.log('Client is ready!');
            wss.broadcast("ready")
            client.sendMessage(client.info.wid._serialized, 'Conectado!')
            connected = true;
        })
        client.on('disconnected', async () => {
            console.log('Disconnected!');
            connected = false;
            console.log('Destruindo sessão!');
            client.destroy()
            console.log('Sessão destruida!');
            console.log('Iniciando sessão!');
            client.initialize()
            console.log('Sessão iniciada!');
            wss.broadcast("disconnected")

        })

        app.post("/sendFile", upload.array("files"), async (req, res) => {
            if(req.files == undefined || req.files.length == 0){
                return res.status(400).json({ error: "Nenhum arquivo encontrado!" })
            }
            fs.renameSync(`${req.files[0].destination}${req.files[0].filename}`, `${req.files[0].destination}${req.files[0].originalname}`);
            const media = MessageMedia.fromFilePath(`${req.files[0].destination}${req.files[0].originalname}`);
            let number = req.body.number
            let numberId = await client.getNumberId('55' + number);
            if (numberId == null) {
                res.status(400).json({ error: "Este não é um whatsapp válido.\nVerifique o número e tente novamente!" })
                return
            }
            client.sendMessage(numberId._serialized, media);
            fs.rmSync(`${req.files[0].destination}${req.files[0].originalname}`);
            res.status(200).json({ message: "Arquivo Enviado!" })
            return
        })
        app.post("/sendTextFile", upload.array("files"), async (req, res) => {
            let { number, text } = req.body
            if(req.files == undefined || req.files.length == 0 || text == '' || text == undefined){
                return res.status(400).json({ error: "Nenhum arquivo ou texto encontrado!" })
            }
            fs.renameSync(`${req.files[0].destination}${req.files[0].filename}`, `${req.files[0].destination}${req.files[0].originalname}`);
            const media = MessageMedia.fromFilePath(`${req.files[0].destination}${req.files[0].originalname}`);
            let numberId = await client.getNumberId('55' + number);
            if (numberId == null) {
                res.status(400).json({ error: "Este não é um whatsapp válido.\nVerifique o número e tente novamente!" })
                return
            }
            client.sendMessage(numberId._serialized, media, { caption: text });
            fs.rmSync(`${req.files[0].destination}${req.files[0].originalname}`);
            res.status(200).json({ message: "Arquivo e texto Enviado!" })
            return
        })
        app.post("/sendText", upload.none(), async ( req, res ) => {
            let { number, text } = req.body;
            if(text == '' || text == undefined){
                return res.status(400).json({ error: "Nenhum texto encontrado!" })
            }

            let numberId = await client.getNumberId('55' + number);
            if (numberId == null) {
                res.status(400).json({ error: "Este não é um whatsapp válido.\nVerifique o número e tente novamente!" })
                return
            }
            client.sendMessage( numberId._serialized, text );
            res.status(200).json({ message: "Texto Enviado!" })
            return
        })


    } catch (err) {
        console.log(err);
    }
})()

server.listen(PORT, () => {
    console.log('Running on port: ', PORT);
})
