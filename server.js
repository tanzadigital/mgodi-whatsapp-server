const express = require("express")
const fs = require("fs")
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const QRCode = require("qrcode")

const app = express()

// kuhakikisha sessions folder ipo
if (!fs.existsSync("sessions")) {
 fs.mkdirSync("sessions")
}

const sessions = {}

async function startSession(userId) {

 const { state, saveCreds } = await useMultiFileAuthState("sessions/" + userId)

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

  // QR ikitoka
  if (qr) {
   sessions[userId].qr = await QRCode.toDataURL(qr)
   console.log("QR generated for user:", userId)
  }

  // connection ikifanikiwa
  if (connection === "open") {
   sessions[userId].connected = true
   sessions[userId].qr = null
   console.log("WhatsApp connected:", userId)
  }

  // connection ikikatika
  if (connection === "close") {
   console.log("Connection closed:", userId)

   // restart session
   setTimeout(() => {
    startSession(userId)
   }, 3000)
  }

 })

}

// test route
app.get("/", (req,res)=>{
 res.send("Mgodi WhatsApp Server Running")
})

// QR route
app.get("/qr/:userId", async (req, res) => {

 const userId = req.params.userId

 // kama session haipo ianzishwe
 if (!sessions[userId]) {
  await startSession(userId)
 }

 const session = sessions[userId]

 // kama QR bado haijatoka
 if (!session.qr) {
  return res.json({
   connected: session.connected
  })
 }

 // rudisha QR
 res.json({
  qr: session.qr,
  connected: session.connected
 })

})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
 console.log("Mgodi WhatsApp Server running on port", PORT)
})

