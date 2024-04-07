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
   secret: "myshows14385899",
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
  







  app.get('/dashboard', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const userQuery = `SELECT * FROM User WHERE user_id = ?`;

        db.query(userQuery, [uid], (err, rows) => {
            if (err) {
                console.error("Error fetching user data:", err);
                res.status(500).send("Internal Server Error");
                return;
            }

            if (rows.length > 0) {
                const userData = rows[0];
                res.render('dashboard', { user: userData });
            } else {
                res.send("User not found");
            }
        });
    } else {
        res.send("Denied");
    }
});



app.listen(3005,()=>{
    console.log('Server on port 3005');
});
