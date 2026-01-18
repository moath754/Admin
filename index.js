const express = require("express");
const axios = require("axios");
const session = require("express-session");

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const ADMIN_ID = process.env.ADMIN_ID;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: "verify-secret",
  resave: false,
  saveUninitialized: false
}));

let users = [];

app.get("/", (req, res) => {
  res.send("Backend Online");
});

app.get("/login", (req, res) => {
  const url =
    `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=identify email`;
  res.redirect(url);
});

app.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.send("No code");

    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get(
      "https://discord.com/api/users/@me",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const user = {
      id: userRes.data.id,
      username: userRes.data.username,
      email: userRes.data.email
    };

    users = users.filter(u => u.id !== user.id);
    users.push(user);
    req.session.user = user;

    if (user.id === ADMIN_ID) return res.redirect("/admin");
    res.send("Verified");

  } catch (e) {
    res.send("OAuth Error");
  }
});

app.get("/admin", (req, res) => {
  if (!req.session.user || req.session.user.id !== ADMIN_ID)
    return res.send("Access Denied");

  let html = "<h2>Admin Panel</h2>";
  users.forEach(u => {
    html += `<div>${u.username} - ${u.email}</div>`;
  });
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on", PORT));
