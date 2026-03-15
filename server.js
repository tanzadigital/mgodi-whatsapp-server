const express = require("express")
const fs = require("fs")
const QRCode = require("qrcode")

const {
 default: makeWASocket,
 useMultiFileAuthState
} = require("@whiskeysockets/baileys")

const app = express()

const sessions = {}

// ensure sessions folder exists
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
START SESSION
*/
async function startSession(userId) {

 if (sessions[userId]) return sessions[userId]

 const { state, saveCreds } = await useMultiFileAuthState("./sessions/" + userId)

 const sock = makeWASocket({
  auth: state
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

 return sessions[userId]

}

/*
QR ENDPOINT
*/
app.get("/qr/:userId", async (req, res) => {

 const userId = req.params.userId

 const session = await startSession(userId)

 if (session.qr) {
  return res.json({
   qr: session.qr
  })
 }

 return res.json({
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
