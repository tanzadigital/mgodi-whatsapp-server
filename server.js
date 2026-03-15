const express = require("express")
const fs = require("fs")
const QRCode = require("qrcode")
const pino = require("pino")

const {
 default: makeWASocket,
 useMultiFileAuthState,
 DisconnectReason
} = require("@whiskeysockets/baileys")

const app = express()

const sessions = {}

if (!fs.existsSync("./sessions")) {
 fs.mkdirSync("./sessions")
}

/*
HEALTH CHECK
*/
app.get("/", (req, res) => {
 res.send("Mgodi WhatsApp Server Running")
})

async function startSession(userId) {

 const { state, saveCreds } = await useMultiFileAuthState("./sessions/" + userId)

 const sock = makeWASocket({
  auth: state,
  logger: pino({ level: "silent" }),
  printQRInTerminal: true
 })

 sessions[userId] = {
  sock,
  qr: null,
  connected: false
 }

 sock.ev.on("creds.update", saveCreds)

 sock.ev.on("connection.update", async (update) => {

  const { connection, qr, lastDisconnect } = update

  if (qr) {
   sessions[userId].qr = await QRCode.toDataURL(qr)
   console.log("QR generated for", userId)
  }

  if (connection === "open") {
   sessions[userId].connected = true
   sessions[userId].qr = null
   console.log("WhatsApp connected:", userId)
  }

  if (connection === "close") {

   const shouldReconnect =
    lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

   if (shouldReconnect) {
    console.log("Reconnecting session:", userId)
    startSession(userId)
   }

  }

 })

}

app.get("/qr/:userId", async (req, res) => {

 const userId = req.params.userId

 if (!sessions[userId]) {
  await startSession(userId)
 }

 const session = sessions[userId]

 let attempts = 0

 const interval = setInterval(() => {

  if (session.qr) {

   clearInterval(interval)

   return res.json({
    qr: session.qr,
    connected: session.connected
   })

  }

  attempts++

  if (attempts > 15) {

   clearInterval(interval)

   return res.json({
    connected: session.connected
   })

  }

 }, 1000)

})

const PORT = process.env.PORT || 8080

app.listen(PORT, () => {
 console.log("Server running on port", PORT)
})
