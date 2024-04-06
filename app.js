const express = require('express');
const app = express();
const connection = require("./connection.js");


app.use(express.static("public"));

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

app.get('/allcards',(req,res) => {
    const pokeseries = `SELECT * FROM series `;
    connection.query(pokeseries, (err, rows) => {
        if(err) throw err;
        res.render('allcards',{title: 'Card Collection;', rowdata: rows});
    });

    //  const seriessql = `SELECT * FROM series LIMIT 6`;
    //db.query(seriessql, (err, rows1) => {
    //    if(err) throw err;
   //     res.render('tv', {series: rows1});
   // });
    
});


// DISPLAY HOME PAGE
app.get('/views/index',  (req, res) => {
    res.render('index');
});

app.post('/fav',  (req, res) => {
    //change global variable favband to the value of the text field
    favband = req.body.favourite;
    res.render('index', {data: favband});
});

app.get('/views/about',  (req, res) => {
    res.render('about');
});

app.get('/views/howtoplay',  (req, res) => {
    res.render('howtoplay');
});

app.get('/views/login',  (req, res) => {
    res.render('login');
});




app.get('/views/signup.ejs',  (req, res) => {
    res.render('signup');
});

app.get('/createblog',  (req, res) => {
    res.render('createblog');
});

app.get('/views/newmember.ejs',  (req, res) => {
    res.render('newmember');
});



  app.get("/select", (req,res) => {
    let readsql = `SELECT * FROM series`;
    connection.query(readsql,(err, rows)=>{
        if(err) throw err;

        res.send(`<h2>My TV</h2><code> ${rows} </code>`);
        // let stringdata = JSON.stringify(rows);
        // res.send(`<h2>My TV</h2> <code>${stringdata}</code>`);

       
    });
});

app.post("/newmember", async (req, res) => {
    // Handling new member creation
});

app.get('*', (req, res) => {
    res.send('404! This is an invalid URL.');
  });

app.listen(process.env.PORT || 3001, ()=>{ 
    console.log("server started on: localhost:3001");
});
