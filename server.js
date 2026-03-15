const express = require("express")
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const QRCode = require("qrcode")

const app = express()

const sessions = {}

async function startSession(userId) {

 const { state, saveCreds } = await useMultiFileAuthState("./sessions/" + userId)

 const sock = makeWASocket({
  auth: state,
  printQRInTerminal: true
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
   sessions[userId].qr = await QRCode.toDataURL(qr)
  }

  if (connection === "open") {
   sessions[userId].connected = true
   sessions[userId].qr = null
   console.log("WhatsApp connected for", userId)
  }

  if (connection === "close") {

   const shouldReconnect = true

   if (shouldReconnect) {
    startSession(userId)
   }
  }

 })

}

app.get("/", (req,res)=>{
 res.send("Mgodi WhatsApp Server Running")
})

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

app.listen(3000, () => {
 console.log("Mgodi WhatsApp Server running on port 3000")
})

