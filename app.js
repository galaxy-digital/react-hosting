const express = require('express')
const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const cors = require('cors')
const shrinkRay = require('shrink-ray-current')

const port = Number(process.env.HTTP_PORT || 80)
const portHttps = Number(process.env.HTTPS_PORT || 443)

process.on("uncaughtException", (err) => console.log('exception',err));
process.on("unhandledRejection", (err) => console.log('rejection',err));

(async ()=>{
    const app = express()
    const server = http.createServer(app)
    let httpsServer = null
    const file_key = __dirname+'/certs/ssl.key';
    const file_crt = __dirname+'/certs/ssl.crt';
    const file_ca = __dirname+'/certs/ssl.ca-bundle';
    if (fs.existsSync(file_key) && fs.existsSync(file_crt) && fs.existsSync(file_ca)) {
        const key = fs.readFileSync(file_key, 'utf8')
        const cert = fs.readFileSync(file_crt, 'utf8')
        const caBundle = fs.readFileSync(file_ca, 'utf8')
        const ca = caBundle.split('-----END CERTIFICATE-----\n') .map((cert) => cert +'-----END CERTIFICATE-----\n')
        ca.pop()
        const options = {cert,key,ca}
        httpsServer = https.createServer(options,app)
        initSocket(httpsServer)
    } else {
        console.log("Do not find ssl files, disabled ssl features.")
    }
    app.use(shrinkRay())
    app.use(cors({
        origin: function(origin, callback){
            return callback(null, true)
        }
    }))

    app.use(express.urlencoded())
    app.use(express.json())

    app.use(express.static(path.normalize(__dirname + '/public')))
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, "public", "index.html"));
    })

    let time = +new Date()
    await new Promise(resolve=>server.listen({ port, host:'0.0.0.0' }, ()=>resolve(true)))
    console.log(`Started HTTP service on port ${port}. ${+new Date()-time}ms`)
    if (httpsServer) {
        await new Promise(resolve=>httpsServer.listen({ port:portHttps, host:'0.0.0.0' }, ()=>resolve(true)))
        console.log(`Started HTTPS service on port ${portHttps}. ${+new Date()-time}ms`)
    }
})()