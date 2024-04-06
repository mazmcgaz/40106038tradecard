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
  
// register
app.post("/newmember", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
    const role = req.body.role;

    try {
        const checkResult = await db.query("SELECT * FROM User WHERE user_email = $1", [email]);

        if (checkResult.rows.length > 0) {
            res.send("Email already exists. Try logging in to your account.");
        } else {
            //hashing the password and saving it in the database
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if (err) {
                    console.error("Error hashing password:", err);
                    res.status(500).send("Error hashing password");
                } else {
                    console.log("Hashed Password:", hash);
                    try {
                        await db.query(
                            "INSERT INTO User (user_display_name, user_email, user_password, user_first_name, user_last_name, user_role) VALUES ($1, $2, $3, $4, $5, $6)",
                            [email, email, hash, firstname, lastname, role]
                        );
                        res.render("secrets.ejs");
                    } catch (insertError) {
                        console.error("Error inserting new user:", insertError);
                        res.status(500).send("Error inserting new user");
                    }
                    
                }
            });
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Server error");
    }
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
