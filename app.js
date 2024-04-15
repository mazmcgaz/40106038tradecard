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



//store favourite band in a global variable
let favband = "not choosen yet";

// DISPLAY HOME PAGE
app.get('/',  (req, res) => {
    res.render('index');
});





// show the all the cards in the database
app.get('/allcards', (req, res) => {
    const cardsQuery = `SELECT card_id, card_name, image_url, price_market, price_low FROM card`;
    connection.query(cardsQuery, (err, rows) => {
        if (err) throw err;
        res.render('allcards', { title: 'All Cards:', rowdata: rows });
    });
});




// Route to fetch card details and render the card details page with modal
app.get('/views/carddetailspage/:id', (req, res) => {
    const cardId = req.params.id;
    const cardQuery = `
        SELECT 
            card.card_id,
            card.card_name,
            card.image_url,
            card.price_market,
            card.price_low,
            card.price_mid,
            card.price_high,
            card.attack_1,
            card.attack_1_img_1,
            card.attack_1_img_2,
            card.attack_2,
            card.attack_2_img_1,
            card.attack_2_img_2,
            card.hit_points_id,
            weakness.weakness_type,
            card.weakness_number,
            card_condition.card_condition_type,
            illustrator.illustrator_first_name,
            illustrator.illustrator_last_name,
            expansion.expansion_name,
            rarity.rarity_type

        FROM 
            CARD card
        JOIN 
            weakness ON card.weakness_id = weakness.weakness_id
        JOIN 
            card_condition ON card.card_condition_id = card_condition.card_condition_id

         JOIN 
            illustrator ON card.illustrator_id = illustrator.illustrator_id
         JOIN 
            expansion ON card.expansion_id = expansion.expansion_id
         JOIN 
            rarity ON card.rarity_id = rarity.rarity_id
      
      
            WHERE 
            card.card_id = ?`;
    connection.query(cardQuery, [cardId], (err, rows) => {
        if (err) {
            console.error('Error fetching card details:', err);
            res.status(500).send('Error fetching card details');
            return;
        }
        
        if (rows.length === 0) {
            res.status(404).send('Card not found');
            return;
        }

        const cardData = rows[0];
        res.render('carddetailspage', { card: cardData });
    });
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

app.get('/views/account',  (req, res) => {
    res.render('account');
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

app.get('/views/carddetailspage',  (req, res) => {
    res.render('carddetailspage');
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
                        res.send("<script>alert('Incorrect password'); window.location='/views/login';</script>");
                        //res.send("Incorrect Password");
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




// 5. Display account page with User details
app.get('/views/account', (req, res) => {
    const userId = req.session.authen; // Assuming you store user ID in session
    const userQuery = 'SELECT * FROM User WHERE user_id = ?';
    connection.query(userQuery, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching user details:', err);
            res.status(500).send('Error fetching user details');
            return;
        }
        
        if (result.length === 0) {
            res.status(404).send('User not found');
            return;
        }

        const userData = result[0];
        res.render('account', { userData }); // Pass userData to the template
    });
});

// 6. Update user's display name
app.post('/updateUser', (req, res) => {
    const newDisplayName = req.body.newDisplayName;
    const userId = req.session.authen; // Assuming you store user ID in session

    const updateQuery = 'UPDATE User SET user_display_name = ? WHERE user_id = ?';
    connection.query(updateQuery, [newDisplayName, userId], (err, result) => {
        if (err) {
            console.error('Error updating user display name:', err);
            res.status(500).send('Error updating user display name');
            return;
        }
        
        res.redirect('/views/account'); // Redirect back to the account page after updating
    });
});



app.get('*', (req, res) => {
    res.send('404! This is an invalid URL.');
  });

  

app.listen(process.env.PORT || 3001, ()=>{ 
    console.log("server started on: localhost:3001");
});
