const express = require('express');
const app = express();
const path = require('path');
const mysql  = require('mysql2');
const connection = require("./connection.js");
const bcrypt = require('bcrypt'); // Import bcrypt module
const saltRounds = 10;
const methodOverride = require('method-override');


// middleware to override _method in updating data (put / post) 
app.use(methodOverride('_method'));

// adding in SESSIONS *********************************
const cookieParser = require('cookie-parser');
const sessions = require('express-session');

const oneHour = 1000 * 60 * 60 * 1;

app.use(cookieParser());



// middleware to config sesssion data
app.use(sessions({
   secret: "qubpokemon40106038",
   saveUninitialized: true,
   cookie: { maxAge: oneHour },
   resave: false
}));

//middleware to use the EJS template engine
app.set('view engine', 'ejs');

//middleware to be able POST <form> data 
app.use(express.urlencoded({extended: true}));

// session **********************************************

const { promisify } = require('util');

// Promisify the connection.query function
const queryAsync = promisify(connection.query).bind(connection);


const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));



// Middleware to determine if the user is logged in
const userLoggedIn = (req, res, next) => {
    req.userLoggedIn = req.session.authen ? true : false;
    next();
};

// Pass userLoggedIn to all views
//app.use(userLoggedIn);
app.use((req, res, next) => {
    res.locals.userLoggedIn = req.userLoggedIn;
    next();
});



// DISPLAY HOME PAGE
app.get('/',  (req, res) => {
   // Set the userLoggedIn variable based on whether the user is logged in or not
   const userLoggedIn = req.session.authen ? true : false;
   res.render('index', { userLoggedIn: userLoggedIn });
});


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






// show the all the cards in the database
app.get('/views/allcards', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    // Fetch all the cards from the database
    const cardsQuery = `SELECT card_id, card_name, image_url, price_market, price_low FROM card`;
    connection.query(cardsQuery, (err, rows) => {
        if (err) {
            console.error("Error fetching cards:", err);
            res.status(500).send("Internal Server Error");
            return;
        }

        // Render different navigation bars based on user login status
        if (userLoggedIn) {
            // If the user is logged in, render the navigation bar for logged-in users
            res.render('allcards', { title: 'All Cards:', rowdata: rows, userLoggedIn: true });
        } else {
            // If the user is not logged in, render the navigation bar for logged-out users
            res.render('allcards', { title: 'All Cards:', rowdata: rows, userLoggedIn: false });
        }
    });
});





// Route to fetch card details and render the card details page 
app.get('/views/carddetailspage/:id', (req, res) => {
    const cardId = req.params.id;

    // Fetch card details
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
            card.attack_1_img_3,
            card.attack_2,
            card.attack_2_img_1,
            card.attack_2_img_2,
            card.attack_2_img_3,
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
        const userLoggedIn = req.session.authen ? true : false;
        
        if (userLoggedIn) {
            const userId = req.session.authen; // Use req.session.authen to retrieve user ID
            const collectionsQuery = `SELECT * FROM collection WHERE user_id = ?`;
            connection.query(collectionsQuery, [userId], (err, collections) => {
                if (err) {
                    console.error('Error fetching user collections:', err);
                    res.status(500).send('Error fetching user collections');
                    return;
                }
                
                console.log('Collections:', collections); // Log fetched collections
                res.render('carddetailspage', { card: cardData, userLoggedIn: userLoggedIn, collections: collections });
            });
        } else {
            res.render('carddetailspage', { card: cardData, userLoggedIn: userLoggedIn, collections: [] });
        }
    });
});


// view all the cards in each individual collection belonging to a user
app.get('/views/collectiondetails/:id', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    const collectionId = req.params.id;
    const collectionQuery = `
    SELECT card.card_id, card.card_name, card.image_url
    FROM card
    JOIN collection_card ON card.card_id = collection_card.card_id
    WHERE collection_card.collection_id =  ?`;

    connection.query(collectionQuery, [collectionId], (err, rows) => {
        if (err) {
            console.error('Error fetching card details:', err);
            res.status(500).send('Error fetching card details');
            return;
        }

        // Pass userLoggedIn status to the template
        res.render('collectiondetails', { cards: rows, userLoggedIn: userLoggedIn });
    });
});





// add a card to a collection
app.get('/views/addtocollection/:id', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    const collectionId = req.params.id; // Retrieve collectionId from the URL parameter
    const collectionQuery = `
    SELECT card.card_id, card.card_name, card.image_url
    FROM card
    JOIN collection_card ON card.card_id = collection_card.card_id
    WHERE collection_card.collection_id =  ?`;
    
    connection.query(collectionQuery, [collectionId], (err, rows) => {
        if (err) {
            console.error('Error fetching card details:', err);
            res.status(500).send('Error fetching card details');
            return;
        }

        if (rows.length === 0) {
            res.status(404).send('Unable to load page');
            return;
        }

        res.render('addtocollection', { cards: rows, userLoggedIn: userLoggedIn, collectionId: collectionId }); // Pass collectionId to the template
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

app.get('/views/blog',  (req, res) => {
    res.render('blog');
});

// app.get('/views/account',  (req, res) => {
//     res.render('account');
// });

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


app.get('/views/signup',  (req, res) => {
    res.render('signup');
});

app.get('/createblog',  (req, res) => {
    res.render('createblog');
});

app.get('/views/newmember',  (req, res) => {
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
                        req.session.authen = user.user_id; // Set user ID in session upon successful login
                        res.redirect('/views/dashboard');

                       //  res.render("dashboard");
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

// Logout route
app.get("/logout", (req, res) => {
    req.session.destroy(); // Destroy the session upon logout
    res.redirect("/"); // Redirect to home page after logout
});




//4. show their dashboard
// 4. Show the dashboard page
app.get('/views/dashboard', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    // If the user is logged in, fetch user data and render the dashboard page
    if (userLoggedIn) {
        const userId = req.session.authen;
        const userQuery = `SELECT * FROM User WHERE user_id = ?`;

        connection.query(userQuery, [userId], (err, rows) => {
            if (err) {
                console.error("Error fetching user data:", err);
                res.status(500).send("Internal Server Error");
                return;
            }
            if (rows.length > 0) {
                const firstRow = rows[0];
                res.render('dashboard', { userLoggedIn: userLoggedIn, userData: firstRow });
            } else {
                res.send("User not found");
            }
        });
    } else {
        // If the user is not logged in, deny access
        res.send("Denied - please log in.");
    }
});


// 5. Display account page with User details
app.get('/views/account', (req, res) => {
   // Check if the user is logged in
   const userLoggedIn = req.session.authen ? true : false;

   // If the user is logged in, fetch user data and render the dashboard page
   if (userLoggedIn) {
       const userId = req.session.authen;
       const userQuery = `SELECT * FROM User WHERE user_id = ?`;

       connection.query(userQuery, [userId], (err, rows) => {
           if (err) {
               console.error("Error fetching user data:", err);
               res.status(500).send("Internal Server Error");
               return;
           }
           if (rows.length > 0) {
               const firstRow = rows[0];
               res.render('account', { userLoggedIn: userLoggedIn, userData: firstRow });
           } else {
               res.send("User not found");
           }
       });
   } else {
       // If the user is not logged in, deny access
       res.send("Denied - please log in.");
   }
});


// 6. user collection page
// 6. user collection page
app.get('/views/usercollection', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    // If the user is logged in, fetch user collections and render the user collection page
    if (userLoggedIn) {
        const userId = req.session.authen;
        const collectionsQuery = `SELECT * FROM collection WHERE user_id = ?`;

        connection.query(collectionsQuery, [userId], (err, rows) => {
            if (err) {
                console.error("Error fetching user collections:", err);
                res.status(500).send("Internal Server Error");
                return;
            }
            // Render the usercollection view with user collections data
            res.render('usercollection', { userLoggedIn: userLoggedIn, collections: rows });
        });
    } else {
        // If the user is not logged in, deny access
        res.send("Denied - please log in.");
    }
});


// 7. create NEW collection 
app.get('/views/createcollection', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    // If the user is logged in, fetch user data and render the dashboard page
    if (userLoggedIn) {
        const userId = req.session.authen;
        const userQuery = `SELECT * FROM User WHERE user_id = ?`;

        connection.query(userQuery, [userId], (err, rows) => {
            if (err) {
                console.error("Error fetching user data:", err);
                res.status(500).send("Internal Server Error");
                return;
            }
            if (rows.length > 0) {
                const firstRow = rows[0];
                res.render('createcollection', { userLoggedIn: userLoggedIn, userData: firstRow });
            } else {
                res.send("User not found");
            }
        });
    } else {
        // If the user is not logged in, deny access
        res.send("Denied - please log in.");
    }
});

// 8. Handle POST request to create a new collection
app.post('/createcollection', (req, res) => {
    // Retrieve collection data from the request body
    const collectionName = req.body.collectionName;
    const collectionDescription = req.body.collectionDescription;

    // Retrieve user ID from the session 
    const userId = req.session.authen;

    // Insert the new collection into the database
    const insertQuery = 'INSERT INTO collection (collection_name, collection_description, user_id) VALUES (?, ?, ?)';
    connection.query(insertQuery, [collectionName, collectionDescription, userId], (err) => {
        if (err) {
            console.error('Error creating new collection:', err);
            res.status(500).send('Error creating new collection');
            return;
        }

        // Redirect the user to a confirmation page or any other desired page
        res.redirect('/views/usercollection');
    });
});








// 9. Update user's display name
// Handle the PUT request to update user's display name
//app.put('/updateUser', (req, res) => {
app.post('/updateUser', (req, res) => {
    console.log('PUT /updateUser route hit'); // Add this line to log when the route is hit
    console.log('Request body:', req.body); // Add this line to log the request body

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
