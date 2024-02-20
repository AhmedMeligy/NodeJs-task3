const express = require('express');
const bodyParser = require("body-parser");
const mongodb = require('mongodb');
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require('uuid');

const app = express();
app.set("view engine", "ejs");

const jsonParser = bodyParser.json();
app.use(jsonParser);
app.use(cookieParser());

const uri = 'mongodb://localhost:27017';
const client = new mongodb.MongoClient(uri);
let dbo = null;

async function dbInit() {
    await client.connect();
    dbo = client.db("ITI");
    app.listen(5000, function() {
        console.log('Server Started');
    });
}

dbInit();

async function authenticate(req, res, next) {
    if (req.cookies.sid) {
        const user = await dbo.collection("users").findOne({ sid: req.cookies.sid });
        if (user) {
            req.user = user;
            next();
        } else {
            res.status(401).send({ msg: "Error: Not Authenticated User" });
        }
    } else {
        res.status(401).send({ msg: "Error: Not Authenticated User" });
    }
}

app.get('/login', function(req, res) {
    res.render('login.ejs');
});

app.post('/login', async function(req, res) {
    const data = req.body;
    if (data.username && data.password.length >= 8) {
        const user = await dbo.collection("users").findOne({ username: data.username, password: data.password });
        if (user) {
            const uuid = uuidv4();
            await dbo.collection("users").updateOne({ _id: user._id }, { $set: { sid: uuid } });
            res.cookie("sid", uuid);
            res.send({ msg: "Success" });
        } else {
            res.status(401).send({ msg: "User Not Found" });
        }
    } else {
        res.status(400).send({ msg: "Invalid Username or Password" });
    }
});

app.get("/", async function(req, res) {
    res.send({ msg: "Welcome" });
});

app.get("/index", function(req, res) {
    res.render("index.ejs");
});

app.get("/currentuser", authenticate, async function(req, res) {
    res.send(req.user);
});

app.get("/logout", authenticate, async function(req, res) {
    await dbo.collection("users").updateOne({ _id: req.user._id }, { $set: { sid: "" } });
    res.clearCookie("sid");
    res.send({ msg: "Logout Success" });
});
