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





// **display all cards AND route for filtering by price, name
app.get('/views/allcards/filter', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;
    console.log('userLoggedIn:', userLoggedIn);

    // Get the ID of the logged-in user
    const userId = req.session.authen;
    console.log('loggedInUserId:', userId);

    // Get the sort parameter from the query string, default to sorting by card name if not specified
    const filter = req.query.sort || 'card_name';
    // Get the sort order parameter from the query string, default to ascending order if not specified
    const sortOrder = req.query.order === 'desc' ? 'DESC' : 'ASC';

    // expansion_id parameter from the query string
    const expansionId = req.query.expansion_id;

    // rarity_id parameter from the query string
    const rarityId = req.query.rarity_id;

    // stage_id parameter from the query string
    const stageId = req.query.stage_id;

    // filter by expansion_id
    let expansionFilter = '';
    if (expansionId) {
        expansionFilter = `WHERE expansion_id = ${expansionId}`;
    }

    // filter by rarity_id
    let rarityFilter = '';
    if (rarityId) {
        rarityFilter = `WHERE rarity_id = ${rarityId}`;
    }

     // filter by stage_id
     let stageFilter = '';
     if (stageId) {
        stageFilter = `WHERE stage_id = ${stageId}`;
     }

    // Fetch all the cards from the database with optional filtering by expansion_id
    const cardsQuery = `SELECT card_id, card_name, image_url, price_market, price_low, expansion_id, rarity_id, stage_id
                        FROM card
                        ${expansionFilter}
                        ${rarityFilter}
                        ${stageFilter}
                        ORDER BY ${filter} ${sortOrder};`;

    connection.query(cardsQuery, (err, rows) => {
        if (err) {
            console.error("Error sorting/filtering cards:", err);
            res.status(500).send("Error sorting/filtering the cards");
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

// print out the cardId
console.log('Received cardId:', cardId);

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
            console.error('5) Error fetching card details:', err);
            res.status(500).send('6) Error fetching card details');
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



// Show all users route
app.get('/views/allusers', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    // Fetch all users from the database
    const usersQuery = `SELECT user_id, user_display_name, user_image FROM User`;
    connection.query(usersQuery, (err, rows) => {
        if (err) {
            console.error("Error fetching users:", err);
            res.status(500).send("Internal Server Error");
            return;
        }

        // Render different navigation bars based on user login status
        if (userLoggedIn) {
            // If the user is logged in, render the navigation bar for logged-in users
            res.render('allusers', { title: 'All Users:', rowdata: rows, userLoggedIn: true });
        } else {
            // If the user is not logged in, render the navigation bar for logged-out users
            res.render('allusers', { title: 'All Users:', rowdata: rows, userLoggedIn: false });
        }
    });
});

// member who's logged in views collection of a different member
app.get('/views/alluserscollections/:userId', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    
    // ** i just removed this
    // const userId = req.params.userId;

    // Fetch the ID of the user whose collections are being viewed
    const viewedMemberId = req.params.userId;

    // get collections data for the member along with their display name
    const collectionsQuery = `
        SELECT u.user_display_name, c.collection_name, c.collection_description, c.collection_id
        FROM collection c
        INNER JOIN User u ON c.user_id = u.user_id
        WHERE c.user_id = ?
    `;

    connection.query(collectionsQuery, [viewedMemberId], (err, rows) => {
        if (err) {
            console.error("Error fetching user collections:", err);
            res.status(500).send("Internal Server Error");
            return;
        }
        // Render the alluserscollections view with user collections data and the viewed member's display name
        res.render('alluserscollections', { userLoggedIn: userLoggedIn, collections: rows, viewedMemberDisplayName: rows.length > 0 ? rows[0].user_display_name : '', userId: req.params.userId });
    });
});


// view all the cards belonging to a different member's collection

app.get('/views/alluserscollectionsdetails/:userId/collection/:collectionId', (req, res) => {
    try {
        // Check if the user is logged in
        const userLoggedIn = req.session.authen ? true : false;

        


        // Query to fetch all the cards belonging to the specified collection for a different user
        const cardQuery = `
        SELECT collection_card.collection_card_id, collection_card.collection_id, collection.user_id, card.card_id, card.card_name, card.image_url
        FROM collection_card
        JOIN collection ON collection_card.collection_id = collection.collection_id
        JOIN card ON collection_card.card_id = card.card_id
        WHERE collection_card.collection_id = ?`;
         

        const userId = req.params.userId;
        const collectionId = req.params.collectionId;

        // Log userId and collectionId
        console.log('userId:', userId);
        console.log('collectionId:', collectionId);

        connection.query(cardQuery, [collectionId], (err, rows) => {
            if (err) {
                console.error('7) Error fetching card details:', err);
                res.status(500).send('8) Error fetching card details');
                return;
            }

             // Log fetched card details
             console.log('Fetched card details:', rows);

            // Render the alluserscollectionsdetails with the card details and parameters
            res.render('alluserscollectionsdetails', { 
                cards: rows, 
                userLoggedIn: userLoggedIn,
                userId: userId,
                collectionId: collectionId
            });
        });
    } catch (error) {
        console.error('Error in route handler:', error);
        res.status(500).send('Internal Server Error');
    }
});









// view all the cards in each individual WISHLIST belonging to a user
// Route to display cards in the user's wishlist
app.get('/views/wishlist', (req, res) => {
    // Check if the user is logged in
    if (!req.session.authen) {
        // If user is not logged in, redirect to the login page or show an error message
        res.redirect('/views/login'); // Adjust the route as per your application's login page
        return;
    }

    const userLoggedIn = req.session.authen ? true : false;
    const userId = req.session.authen; // Get the logged-in user's ID from the session

    // Query to retrieve card details from the user's wishlist
    const wishlistQuery = `
        SELECT card.card_id, card.card_name, card.image_url
        FROM wishlist
        JOIN card ON wishlist.card_id = card.card_id
        WHERE wishlist.user_id = ?
    `;

    connection.query(wishlistQuery, [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching wishlist:', err);
            res.status(500).send('Error fetching wishlist');
            return;
        }

        // Pass user's wishlist data to the view for rendering
        res.render('wishlist', { cards: rows });
    });
});


app.get('/views/back', (req, res) => {
    // Get the referer URL from the request headers
    const referer = req.headers.referer;

    // If the referer is available, redirect the user back to that page
    if (referer) {
        res.redirect(referer);
    } else {
        // If the referer is not available, redirect the user to a default page
        res.redirect('/');
    }
});




// Route for displaying comments
app.get('/views/comments/:collectionId', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    // Redirect to login page if user is not logged in
    if (!userLoggedIn) {
        return res.redirect('/views/login');
    }

    // Get the collection ID from the route parameters
    const collectionId = req.params.collectionId;

    // Query to fetch comments for the specified collection
    const commentsQuery = `
        SELECT Comment.*, User.user_display_name
        FROM Comment
        JOIN User ON Comment.user_id = User.user_id
        WHERE Comment.collection_id = ?
    `;

    // Execute the query
    connection.query(commentsQuery, [collectionId], (err, comments) => {
        if (err) {
            console.error('Error fetching comments:', err);
            res.status(500).send('Error fetching comments');
            return;
        }

        // Render the comments page with the fetched comments
        res.render('comments', { comments: comments, userLoggedIn: userLoggedIn });
    });
});




// view all the cards in each individual collection belonging to a user

// view all the cards in each individual collection belonging to a user
app.get('/views/collectiondetails/:id', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;
    console.log('userLoggedIn:', userLoggedIn);

    // Get the ID of the logged-in user
  //  const loggedInUserId = req.session.userId;
    const userId = req.session.authen;
    console.log('loggedInUserId:', userId);

    const collectionId = req.params.id;
    const collectionQuery = `
    SELECT collection_card.collection_card_id, card.card_id, card.card_name, card.image_url,  collection.user_id  
    FROM collection_card
    JOIN card ON collection_card.card_id = card.card_id
    JOIN collection ON collection_card.collection_id = collection.collection_id
    WHERE collection_card.collection_id =  ?`;

    connection.query(collectionQuery, [collectionId], (err, rows) => {
        if (err) {
            console.error('3) Error fetching card details:', err);
            res.status(500).send('4) Error fetching card details');
            return;
        }

        // Log the query results for debugging
        console.log('Query results:', rows);

       // Pass userLoggedIn status and logged-in user's ID to the template
        // user ID associated with the collection is retrieved 
        const collectionOwnerId = rows.length > 0 ? rows[0].user_id : null;

       res.render('collectiondetails', { cards: rows, userLoggedIn: userLoggedIn, collectionOwnerId: collectionOwnerId, loggedInUserId: userId,
        collectionId: collectionId, });
    });
});



// FILTER MENU
// We want to be able to allow a user to arrange the data by price, alphabetical order and even type. 
// To achieve this type of functionality we can use a query parameter within the URL to send a sort keyword to influence the SQL query.
app.get('/views/collectiondetails/:id/filter', (req, res) => {
   
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;
    console.log('userLoggedIn:', userLoggedIn);
 
    // Get the ID of the logged-in user
   //  const loggedInUserId = req.session.userId;
    const userId = req.session.authen;
    console.log('loggedInUserId:', userId);
 
    const collectionId = req.params.id;
   
    // lab 07 code begins here
    const filter = req.query.sort;
   
    const cardsSQL=`
    SELECT collection_card.collection_card_id, card.card_id, card.card_name, card.image_url,  collection.user_id  
    FROM collection_card
    JOIN card ON collection_card.card_id = card.card_id
    JOIN collection ON collection_card.collection_id = collection.collection_id
    WHERE collection_card.collection_id =  1
    ORDER BY ${filter}; `;
    

     // Execute the query
     connection.query(cardsSQL, [collectionId], (err, rows) => {
        if (err) {
            console.error('Error sorting cards', err);
            res.status(500).send('Error sorting the cards');
            return;
        }
         // user ID associated with the collection is retrieved 
         const collectionOwnerId = rows.length > 0 ? rows[0].user_id : null;

        // Render the comments page with the fetched comments
        res.render('collectiondetails', { cards: rows, userLoggedIn: userLoggedIn, collectionOwnerId: collectionOwnerId, loggedInUserId: userId,
            collectionId: collectionId, });
    });
});








// Route for showing the comment form for a specific collection
app.get('/views/addcomment/:collectionId', (req, res) => {

    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;
    // Pass userLoggedIn status and collection ID to the template
    res.render('addcomment', { userLoggedIn: userLoggedIn, collectionId: req.params.collectionId });
});


// Route for handling comment submission
app.post('/views/addcomment/:collectionId', (req, res) => {
    // Check if the user is logged in
    if (!req.session.authen) {
        // If user is not logged in, redirect to the login page or show an error message
        res.redirect('/views/login'); // Adjust the route as per your application's login page
        return;
    }

    // Get the user ID from the session
    const userId = req.session.authen;

    // Get comment content from the form
    const commentContent = req.body.comment_content;

    // Get the collection ID from the route parameters
    const collectionId = req.params.collectionId;

    // Insert the comment into the database
    const insertCommentQuery = 'INSERT INTO Comment (collection_id, user_id, comment_text) VALUES (?, ?, ?)';
    connection.query(insertCommentQuery, [collectionId, userId, commentContent], (err, result) => {
        if (err) {
            console.error('Error inserting comment:', err);
            res.status(500).send('Error inserting comment');
            return;
        }
        // Redirect to the collection details page after comment submission
        res.redirect(`/views/collectiondetails/${collectionId}`);
    });
});




// Delete a collection
app.post('/views/deletecollection/:id', (req, res) => {
    // Check if the user is logged in
    if (!req.session.authen) {
        res.status(401).send('Unauthorised ??');
        return;
    }

    // Extract the collection ID from the request parameters
    const collectionId = req.params.id;

    // Query to delete the collection
    const deleteCollectionQuery = 'DELETE FROM collection WHERE collection_id = ?';

    // Execute the query
    connection.query(deleteCollectionQuery, [collectionId], (err, result) => {
        if (err) {
            console.error('Error deleting collection:', err);
            res.status(500).send('Error deleting collection');
            return;
        }

         // Check if any rows were affected
         if (result.affectedRows === 0) {
            res.status(404).send('Collection not found');
            return;
        }

        // Redirect the user back to the user collection page
        res.redirect('/dashboard'); 
    });
});



// add a card to a collection
app.post('/views/addtocollection/:id', (req, res) => {
    // Check if the user is logged in
    if (!req.session.authen) {
        // If user is not logged in, redirect to the login page or show an error message
        res.redirect('/views/login'); // Adjust the route as per your application's login page
        return;
    }

    // gets the collectionId from the request body
    const collectionId = req.body.collectionId; 

    // gets the cardId from the request body
    const cardId = req.body.cardId;

    // checks if these have been got correctly
    console.log('Received collectionId:', collectionId);
    console.log('Received cardId:', cardId);

    if (!cardId) {
        console.error('Card ID is undefined');
        res.status(400).send('Card ID is missing');
        return;
    }

    const insertQuery = 'INSERT INTO collection_card (collection_id, card_id) VALUES (?, ?)';
    connection.query(insertQuery, [collectionId, cardId], (err, result) => {
        if (err) {
            console.error('Error adding card to collection:', err);
            res.status(500).send('Error adding card to collection');
            return;
        }
        
        res.redirect(`/views/carddetailspage/${cardId}`);
    });
});


// add a card to a wishlist
app.post('/views/addtowishlist/:id', (req, res) => {

     // Check if the user is logged in
     if (!req.session.authen) {

        // If user is not logged in, redirect to the login page or show an error message
        res.redirect('/views/login'); // Adjust the route as per your application's login page
        return;
    }

    // Get the user ID from the session
    const userId = req.session.authen;

    // gets the cardId from the request body
    const cardId = req.body.cardId;

    // checks if these have been got correctly
    
    console.log('Received cardId:', cardId);
    console.log('Received userId:', userId);

    if (!cardId) {
        console.error('Card ID is undefined');
        res.status(400).send('Card ID is missing');
        return;
    }
    const insertQuery = 'INSERT INTO wishlist (user_id, card_id) VALUES (?, ?)';
    connection.query(insertQuery, [userId, cardId], (err, result) => {
        if (err) {
            console.error('Error adding card to wishlist:', err);
            res.status(500).send('Error adding card to wishlist');
            return;
        }
        
        res.redirect(`/views/wishlist`);
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
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    res.render('blog', { userLoggedIn });
});

// app.get('/views/account',  (req, res) => {
//     res.render('account');
// });

// Show how to play route
app.get('/views/howtoplay', (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    // Render the howtoplay page, passing the userLoggedIn status
    res.render('howtoplay', { userLoggedIn });
});



app.get('/views/login',  (req, res) => {
    res.render('login');
});

app.get('/views/register',  (req, res) => {
    res.render('register');
});

// app.get('/views/carddetailspage',  (req, res) => {
//     res.render('carddetailspage');
// });


app.get('/views/signup',  (req, res) => {
    res.render('signup');
});

app.get('/createblog',  (req, res) => {
    res.render('createblog');
});

app.get('/views/newmember',  (req, res) => {
    res.render('newmember');
});

// 1. a user signing up and becoming a new member 
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

                const insertQuery = 'INSERT INTO User (user_display_name, user_email, user_password, user_first_name, user_last_name, user_role, user_image) VALUES (?, ?, ?, ?, ?, ?, ?)';
                const userRole = 'member'; // Default role for new users
                const userImage= 'https://pngimg.com/uploads/pokemon/pokemon_PNG93.png'; 

                connection.query(insertQuery, [firstname, email, hash, firstname, lastname, userRole, userImage], (err) => {
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

    console.log("Received login credentials:", loginEmail);

    try {
        const result = await queryAsync("SELECT user_id, user_email, user_first_name, user_last_name, user_role, user_password FROM User WHERE user_email = ?", [loginEmail]);

        if (result.length > 0) {
            const user = result[0];
            const storedHashedPassword = String(user.user_password);

            // Authenticate user
            console.log("User authenticated, setting session:", user.user_id);

            // verifying the password
            bcrypt.compare(loginPassword, storedHashedPassword, (err, passwordMatch) => {
                if (err) {
                    console.error("Error comparing passwords:", err);
                    res.status(500).send("Internal Server Error");
                    return;
                }
                if (passwordMatch) {
                    req.session.authen = user.user_id; // Set user ID in session upon successful login
                    res.redirect('/views/dashboard');
                } else {
                    res.status(401).send("<script>alert('Incorrect password'); window.location='/views/login';</script>");
                }
            });
        } else {
            res.status(404).send("User not found");
        }
    } catch (err) {
        console.error("Error logging in:", err);
        res.status(500).send("Internal Server Error");
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
        const userQuery = `SELECT user_id, user_display_name, user_email, user_password, user_first_name, user_last_name, user_role, user_image FROM User WHERE user_id = ?`;

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



// 10. delete a single card from a user's collection
// Define the DELETE route
app.delete('/views/deletefromcollection/:collectionCardId', (req, res) => {
    // Extract the collection card ID from the request parameters
    const collectionCardId = req.params.collectionCardId;

    // Query to delete the card from the collection based on the collection card ID
    const deleteFromCollectionQuery = 'DELETE FROM collection_card WHERE collection_card_id = ?';

    // Execute the query
    connection.query(deleteFromCollectionQuery, [collectionCardId], (err, result) => {
        if (err) {
            console.error('Error deleting card from collection:', err);
            res.status(500).send('Error deleting card from collection');
            return;
        }

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            res.status(404).send('Collection card not found');
            return;
        }

        // Send a success response
        res.status(200).send('Card deleted from collection successfully');
    });
});



app.get('*', (req, res) => {
    res.send('404! This is an invalid URL.');
  });

  

app.listen(process.env.PORT || 3001, ()=>{ 
    console.log("server started on: localhost:3001");
});
