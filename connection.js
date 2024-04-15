const express = require('express');
const app = express();
const mysql  = require('mysql2');
const bcrypt = require("bcrypt");
const saltRounds = 10;


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'tradecard_project',  //change to your DB name
    port: '8889'
});

module.exports = db;


// adding in SESSIONS *********************************
const cookieParser = require('cookie-parser');
const sessions = require('express-session');

const oneHour = 1000 * 60 * 60 * 1;

app.use(cookieParser());

app.use(sessions({
   secret: "qubpokemon40106038",
   saveUninitialized: true,
   cookie: { maxAge: oneHour },
   resave: false
}));
// session **********************************************



db.connect((err)=> {
    if(err) throw err;
});

app.set('view engine', 'ejs');

app.get('/',(req,res) => {

    res.render('login');
    
});

app.use(express.urlencoded({extended: true}));

app.post('/', (req, res) => {
    const useremail = req.body.emailField;
    const password = req.body.passwordField;
    const checkUser = `SELECT * FROM User WHERE user_email = "${useremail}" AND user_password = "${password}"`;
    
    db.query(checkUser, (err, rows) => {
        if (err) throw err;
        const numRows = rows.length;
        if (numRows > 0) {
            const sessionobj = req.session;  
            sessionobj.authen = rows[0].user_id;
            res.redirect('/dashboard');
        } else {
            // Send alert message and redirect to login page
            res.send('<script>alert("Incorrect log in details. Please try again."); window.location="/";</script>');
        }
    });
});


app.get("/newmember", (req, res) => {
    res.render("newmember.ejs");
  });
  
  
app.listen(3009,()=>{
    console.log('Server on port 3009');
});
