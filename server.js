const express = require("express")
const QRCode = require("qrcode")
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")

const app = express()

const sessions = {}

async function startSession(userId) {

 const { state, saveCreds } = await useMultiFileAuthState(`sessions/${userId}`)

 const sock = makeWASocket({ auth: state })

 sock.ev.on("creds.update", saveCreds)

 sock.ev.on("connection.update", async ({ qr, connection }) => {

  if (qr) {
   sessions[userId].qr = await QRCode.toDataURL(qr)
  }

  if (connection === "open") {
   sessions[userId].connected = true
  }

 })

 sessions[userId] = { sock, connected: false }

}

app.get("/qr/:userId", async (req, res) => {

 const userId = req.params.userId

 if (!sessions[userId]) {
  await startSession(userId)
 }

 res.json({
  qr: sessions[userId].qr,
  connected: sessions[userId].connected
 })

})

app.listen(3000, () => {
 console.log("WhatsApp server running")
})
