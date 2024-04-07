const express = require('express');
const app = express();
const connection = require("./connection.js");
const bcrypt = require('bcrypt'); // Import bcrypt module
const saltRounds = 10;

const { promisify } = require('util');

// Promisify the connection.query function
const queryAsync = promisify(connection.query).bind(connection);

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

app.get('/views/register',  (req, res) => {
    res.render('register');
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

// 1. a new user signing up and becoming a member 
app.post('/newmember', (req, res) => {
    const email = req.body.registerEmail;
    const password = req.body.registerPassword;
    const firstname = req.body.registerFirstName;
    const lastname = req.body.registerLastName;

    const checkQuery = 'SELECT * FROM User WHERE user_email = ?';
    connection.query(checkQuery, [email], (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send('Server error');
            return;
        }

        if (rows.length > 0) {
            return res.send('<script>alert("Email already exists. Try logging in."); window.location="/views/login";</script>');
        } else {
            bcrypt.hash(password, saltRounds, (err, hash) => {
                if (err) {
                    console.error('Error hashing password:', err);
                    res.status(500).send('Error hashing password');
                    return;
                }

                console.log('Hashed Password:', hash);

                const insertQuery = 'INSERT INTO User (user_display_name, user_email, user_password, user_first_name, user_last_name, user_role) VALUES (?, ?, ?, ?, ?, ?)';
                const userRole = 'member'; // Default role for new users
                connection.query(insertQuery, [firstname, email, hash, firstname, lastname, userRole], (err) => {
                    if (err) {
                        console.error('Error inserting new user:', err);
                        res.status(500).send('Error inserting new user');
                        return;
                    }

                    res.render('dashboard');
                });
            });
        }
    });
});

 
// 2. Render login page
app.get('/views/login', (req, res) => {
    res.render('login');
});


// 3. the user logs into their account
app.post("/views/login", async (req, res) => {
    const loginEmail = req.body.loginEmail;
    const loginPassword = req.body.loginPassword;

    try {
        const result = await queryAsync("SELECT * FROM User WHERE user_email = ?", [loginEmail]);

        if (result.length > 0) {
            const user = result[0];
            const storedHashedPassword = String(user.user_password);

            // verifying the password
            bcrypt.compare(loginPassword, storedHashedPassword, (err, result) => {
                if (err) {
                    console.error("Error comparing passwords:", err);
                } else {
                    if (result) {
                        res.render("dashboard");
                    } else {
                        res.send("Incorrect Password");
                    }
                }
            });
        } else {
            res.send("User not found");
        }
    } catch (err) {
        console.log(err);
    }
});

//4. show their dashboard
// Show user's dashboard
// Show user's dashboard
app.get('/dashboard', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const userQuery = `SELECT user_display_name FROM User WHERE user_id = ?`;

        db.query(userQuery, [uid], (err, rows) => {
            if (err) {
                console.error("Error fetching user data:", err);
                res.status(500).send("Internal Server Error");
                return;
            }

            if (rows.length > 0) {
                const firstrow = row[0];
            res.render('dashboard', {userdata:firstrow});
            } else {
                res.send("User not found");
            }
        });
    } else {
        res.send("Denied");
    }
});




app.get('*', (req, res) => {
    res.send('404! This is an invalid URL.');
  });

  

app.listen(process.env.PORT || 3001, ()=>{ 
    console.log("server started on: localhost:3001");
});
