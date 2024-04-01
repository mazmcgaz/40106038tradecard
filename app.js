const express = require('express');
let app = express();

//middleware to use the EJS template engine
app.set('view engine', 'ejs');

//middleware to be able POST <form> data 
app.use(express.urlencoded({extended: true}));

//store favourite band in a global variable
let favband = "not choosen yet";

// DISPLAY HOME PAGE
app.get('/',  (req, res) => {
    res.render('index');
});

// DISPLAY HOME PAGE
app.get('/views/index.ejs',  (req, res) => {
    res.render('index');
});

app.post('/fav',  (req, res) => {
    //change global variable favband to the value of the text field
    favband = req.body.favourite;
    res.render('index', {data: favband});
});

app.get('/views/about.ejs',  (req, res) => {
    res.render('about');
});

app.get('/views/howtoplay.ejs',  (req, res) => {
    res.render('howtoplay');
});

app.get('/views/howtoplay.ejs',  (req, res) => {
    res.render('howtoplay', {data: favband});
});

app.get('/login',  (req, res) => {
    res.render('login');
});

app.get('/signup',  (req, res) => {
    res.render('signup');
});

app.get('/createblog',  (req, res) => {
    res.render('createblog');
});

app.listen(process.env.PORT || 3001, ()=>{ 
    console.log("server started on: localhost:3000/fav");
});