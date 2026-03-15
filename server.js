const express = require("express")
const fs = require("fs")
const QRCode = require("qrcode")

const {
 default: makeWASocket,
 useMultiFileAuthState,
 DisconnectReason
} = require("@whiskeysockets/baileys")

const app = express()

const sessions = {}

// create sessions folder if not exists
if (!fs.existsSync("./sessions")) {
 fs.mkdirSync("./sessions")
}

/*
HEALTH CHECK
*/

app.get("/", (req, res) => {
 res.send("Mgodi WhatsApp Server Running")
})

/*
START WHATSAPP SESSION
*/

async function startSession(userId) {

 const { state, saveCreds } = await useMultiFileAuthState("./sessions/" + userId)

 const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false
 })

 sessions[userId] = {
  sock,
  qr: null,
  connected: false
 }

 sock.ev.on("creds.update", saveCreds)

 sock.ev.on("connection.update", async (update) => {

  const { connection, qr } = update

  if (qr) {
   const qrImage = await QRCode.toDataURL(qr)
   sessions[userId].qr = qrImage
   console.log("QR generated for", userId)
  }

  if (connection === "open") {
   sessions[userId].connected = true
   sessions[userId].qr = null
   console.log("WhatsApp connected:", userId)
  }

  if (connection === "close") {
   sessions[userId].connected = false
   console.log("Connection closed:", userId)
  }

 })

}

/*
QR ROUTE
*/

app.get("/qr/:userId", async (req, res) => {

 const userId = req.params.userId

 if (!sessions[userId]) {
  await startSession(userId)
 }

 const session = sessions[userId]

 if (!session.qr) {
  return res.json({
   connected: session.connected
  })
 }

 res.json({
  qr: session.qr,
  connected: session.connected
 })

})

/*
PORT
*/

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
 console.log("Server running on port", PORT)
})
