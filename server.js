const express = require("express")
const QRCode = require("qrcode")
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")

const app = express()
app.use(express.json())

// kuhifadhi sessions za users
const sessions = {}

// function ya kuanzisha WhatsApp session
async function startSession(userId) {

 const { state, saveCreds } = await useMultiFileAuthState(`sessions/${userId}`)

 const sock = makeWASocket({
  auth: state
 })

 sock.ev.on("creds.update", saveCreds)

 sock.ev.on("connection.update", async ({ qr, connection }) => {

  if (qr) {
   sessions[userId].qr = await QRCode.toDataURL(qr)
  }

  if (connection === "open") {
   sessions[userId].connected = true
   console.log("WhatsApp connected for user:", userId)
  }

  if (connection === "close") {
   sessions[userId].connected = false
   console.log("WhatsApp disconnected for user:", userId)
  }

 })

 sessions[userId] = {
  sock,
  connected: false,
  qr: null
 }

}

// endpoint ya kupata QR
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

// endpoint ya kutuma message
app.post("/send", async (req, res) => {

 const { userId, to, message } = req.body

 const session = sessions[userId]

 if (!session) {
  return res.json({ error: "session not found" })
 }

 try {

  await session.sock.sendMessage(to, { text: message })

  res.json({
   status: "sent"
  })

 } catch (err) {

  res.json({
   error: "failed to send message"
  })

 }

})

// server start
app.listen(3000, () => {
 console.log("Mgodi WhatsApp Server running on port 3000")
})

