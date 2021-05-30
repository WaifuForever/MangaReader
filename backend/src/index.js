require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');

const cors = require('cors');
const cookie_parser = require("cookie-parser")

const app = express();
const server = require('http').Server(app);

//const io = require('socket.io')(server);

mongoose.connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0-c09yq.mongodb.net/MangaReader?retryWrites=true&w=majority`, {
useNewUrlParser: true,
useUnifiedTopology: true,
useFindAndModify: false
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/files', express.static('uploads'));

app.use(cookie_parser())
app.use((req, res, next)=>{
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*")
    app.use(cors());
    //req.io = io;
    next();
});



app.use(require('./routes'));
server.listen(parseInt(`${process.env.PORT}`), () => {
    console.log(`Listening on port ${process.env.PORT}`);
});
