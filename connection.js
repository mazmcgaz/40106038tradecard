const express = require('express');
const app = express();
const mysql  = require('mysql2');

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




const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'tradecard_project',  //change to your DB name
    port: '8889'
});

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







app.get('/shows',(req,res) => {

    const seriessql = `SELECT * FROM series LIMIT 6`;
    
    db.query(seriessql, (err, rows1) => {
        if(err) throw err;
        res.render('tv', {series: rows1});
    });
    
});


app.get('/dashboard', (req,res) => {
    const sessionobj = req.session;
    if(sessionobj.authen){

        const uid = sessionobj.authen;
        const user = `SELECT * FROM User WHERE user_id = "${uid}" `;
        
        db.query(user, (err, row)=>{ 
            const firstrow = row[0];
            res.render('dashboard', {userdata:firstrow});
        });



    }else{
        res.send("denied");
    } 
});


app.listen(3005,()=>{
    console.log('Server on port 3005');
});