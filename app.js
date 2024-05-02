const express = require('express');
const app = express();
const path = require('path');
const connection = require("./connection.js");
const bcrypt = require('bcrypt'); // Import bcrypt module
const saltRounds = 10;
// const methodOverride = require('method-override');


// // middleware - overrides _method in updating data (put / post) 
// // app.use(methodOverride('_method'));

// Middleware - to parse JSON bodies
app.use(express.json());

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
// Using this make my routes more readable
const queryAsync = promisify(connection.query).bind(connection);

// Gives access to the EJS files location
const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

// Attempted to write middleware to determine if the user is logged in
const userLoggedIn = (req, res, next) => {
    req.userLoggedIn = req.session.authen ? true : false;
    next();
};

// Pass userLoggedIn to all views
app.use((req, res, next) => {
    res.locals.userLoggedIn = req.userLoggedIn;
    next();
});


// Attempted to write middleware to check user authentication
const checkAuthentication = (req, res, next) => {
    // Check if the user is logged in
    req.userLoggedIn = req.session.authen ? true : false;

    // If the user is not logged in, deny access
    if (!req.userLoggedIn) {
        return res.redirect('/views/login');
    }

    // If the user is logged in, proceed to the next middleware/route handler
    next();
};


// 1. Function to capitalise the first letter of a string 
// 2. Used for a user signing up, and user updating their first and last name
function capitaliseFirstLetter(string) {
    // Convert the first character to uppercase and concatenate it with the lowercase version of the rest of the string
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}




// 1. DISPLAY HOME PAGE
// not using the middleware here because I want the page to render for both logged in
// and logged out users. Ie I don't want them to get sent to the log in page automatically
app.get('/', async (req, res) => {
    try {
        // Check if the user is logged in
        const userLoggedIn = req.session.authen ? true : false;
        console.log('userLoggedIn:', userLoggedIn);

        // Get the ID of the logged-in user
        const userId = req.session.authen;
        console.log('loggedInUserId:', userId);

        // Fetch the user_display_name from the database
        const query = "SELECT user_display_name FROM User WHERE user_id = ?";
        
        // Execute the query using await
        const result = await queryAsync(query, [userId]);

        // if the user is not logged in / issue with session data 
        if (result.length === 0) {
            console.error("User not found with user ID:", userId);
            // Handle user not found
            const userDisplayName = 'Guest';
            res.render('index', { userLoggedIn: userLoggedIn, userDisplayName: userDisplayName });
            return;
        }

        const userDisplayName = result[0].user_display_name;
        res.render('index', { userLoggedIn: userLoggedIn, userDisplayName: userDisplayName });
    } catch (error) {
        console.error("Error fetching user_display_name:", error);
        // Handle error
        res.status(500).send("Internal Server Error");
    }
});







// *******
// im not sure if i need this anymore
// Updated this 
app.post('/', async (req, res) => {
    try {
        const useremail = req.body.emailField;
        const password = req.body.passwordField;

        // Use parameterised queries to prevent SQL injection
        const checkUser = 'SELECT * FROM User WHERE user_email = ? AND user_password = ?';

        // Execute the query using await
        const rows = await queryAsync(checkUser, [useremail, password]);

        const numRows = rows.length;
        if (numRows > 0) {
            // Store user ID in session
            req.session.authen = rows[0].user_id;
            return res.redirect('/dashboard');
        } else {
            // Send error message and redirect to login page
            return res.send('<script>alert("Incorrect log in details. Please try again."); window.location="/";</script>');
        }
    } catch (error) {
        console.error('Error executing SQL query:', error);
        return res.status(500).send('Internal server error');
    }
});



// CARDS 
// Display all cards AND route for filtering by price, name
app.get('/views/allcards/filter', async (req, res) => {
    try {
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

        // format_id parameter from the query string
        const formatId = req.query.format_id;

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

        // filter by format_id
        let formatFilter = '';
        if (formatId) {
            formatFilter = `WHERE card_format_id = ${formatId}`;
        }

        // Fetch all the cards from the database with optional filtering by expansion_id
        const cardsQuery = `SELECT card_id, card_name, image_url, price_market, price_low, expansion_id, rarity_id, stage_id, card_format_id
                            FROM card
                            ${expansionFilter}
                            ${rarityFilter}
                            ${stageFilter}
                            ${formatFilter}
                            ORDER BY ${filter} ${sortOrder};`;

        // Execute the query using await
        const rows = await queryAsync(cardsQuery);

        // Render different navigation bars based on user login status
        res.render('allcards', { title: 'All Cards:', rowdata: rows, userLoggedIn });
    } catch (error) {
        console.error("Error sorting/filtering cards:", error);
        res.status(500).send("Error sorting/filtering the cards");
    }
});



// FILTER MENU
// We want to be able to allow a user to arrange the data by price, alphabetical order and even type. 
// To achieve this type of functionality we can use a query parameter within the URL to send a sort keyword to influence the SQL query.
app.get('/views/collectiondetails/:id/filter', async (req, res) => {
    try {
        // Check if the user is logged in
        const userLoggedIn = req.session.authen ? true : false;
        console.log('userLoggedIn:', userLoggedIn);

        // Get the ID of the logged-in user
        const userId = req.session.authen;
        console.log('loggedInUserId:', userId);

        const collectionId = req.params.id;

        // Extract filter from query parameters
        const filter = req.query.sort;

        // Construct SQL query to fetch cards with sorting
        const cardsSQL = `
            SELECT collection_card.collection_card_id, card.card_id, card.card_name, card.image_url, collection.user_id  
            FROM collection_card
            JOIN card ON collection_card.card_id = card.card_id
            JOIN collection ON collection_card.collection_id = collection.collection_id
            WHERE collection_card.collection_id = ?
            ORDER BY ${filter};
        `;

        // Execute the query using promisified function
        const rows = await queryAsync(cardsSQL, [collectionId]);

        // Log the query results for debugging
        console.log('Query results:', rows);

        // Pass userLoggedIn status and logged-in user's ID to the template
        // user ID associated with the collection is retrieved 
        const collectionOwnerId = rows.length > 0 ? rows[0].user_id : null;

        res.render('collectiondetails', { 
            cards: rows, 
            userLoggedIn: userLoggedIn, 
            collectionOwnerId: collectionOwnerId, 
            loggedInUserId: userId,
            collectionId: collectionId 
        });
    } catch (error) {
        console.error('Error sorting cards', error);
        res.status(500).send('Error sorting the cards');
    }
});


// Route to fetch card details and render the card details page 
app.get('/views/carddetailspage/:id', async (req, res) => {
    try {
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
                card.attack_1_desc,
                card.attack_1_number,
                card.attack_1_img_1,
                card.attack_1_img_2,
                card.attack_1_img_3,
                card.attack_1_img_4,
                card.attack_2,
                card.attack_2_desc,
                card.attack_2_number,
                card.attack_2_img_1,
                card.attack_2_img_2,
                card.attack_2_img_3,
                card.attack_2_img_4,
                card.hit_points_id,
                hit_points.hit_points_number,
                card.weakness_number,
                card.resistance_number,
                weakness.weakness_img,
                card.weakness_number,
                resistance.resistance_img,
                card_condition.card_condition_type,
                illustrator.illustrator_first_name,
                illustrator.illustrator_last_name,
                expansion.expansion_name,
                rarity.rarity_type,
                card_number.card_number_number,
                card_format.card_format_type
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
            JOIN 
                card_number ON card.card_number_id = card_number.card_number_id
            JOIN 
                card_format ON card.card_format_id = card_format.card_format_id
            JOIN 
                resistance ON card.resistance_id = resistance.resistance_id
            JOIN 
                hit_points ON card.hit_points_id = hit_points.hit_points_id
            WHERE 
                card.card_id = ?`;

        // Execute the query using await
        const rows = await queryAsync(cardQuery, [cardId]);

        if (rows.length === 0) {
            res.status(404).render('errorpage', { 
                errorCode: 404, 
                userLoggedIn
            });
        }

        const cardData = rows[0];
        const userLoggedIn = req.session.authen ? true : false;
        
        if (userLoggedIn) {
            const userId = req.session.authen; // Use req.session.authen to retrieve user ID
            const collectionsQuery = `SELECT * FROM collection WHERE user_id = ?`;
            const collections = await queryAsync(collectionsQuery, [userId]);
            console.log('Collections:', collections); // Log fetched collections
            res.render('carddetailspage', { card: cardData, userLoggedIn: userLoggedIn, collections: collections });
        } else {
            res.render('carddetailspage', { card: cardData, userLoggedIn: userLoggedIn, collections: [] });
        }
    } catch (error) {
        console.error('Error fetching card details:', error);
        res.status(404).render('errorpage', { 
            userLoggedIn
        });
    }
});


// MEMBERS
// Show all users route
app.get('/views/allusers', async (req, res) => {
    try {
        // Check if the user is logged in
        const userLoggedIn = req.session.authen ? true : false;

        // Fetch all users from the database using the promisified queryAsync function
        const usersQuery = `SELECT user_id, user_display_name, user_image FROM User`;
        const rows = await queryAsync(usersQuery);

        // Render different navigation bars based on user login status
        if (userLoggedIn) {
            // If the user is logged in, render the navigation bar for logged-in users
            res.render('allusers', { title: 'All Users:', rowdata: rows, userLoggedIn: true });
        } else {
            // If the user is not logged in, render the navigation bar for logged-out users
            res.render('allusers', { title: 'All Users:', rowdata: rows, userLoggedIn: false });
        }
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Internal Server Error");
    }
});


// COLLECTIONS
// View all the cards in each individual collection belonging to a user
app.get('/views/collectiondetails/:id', async (req, res) => {
    try {
        // Check if the user is logged in
        const userLoggedIn = req.session.authen ? true : false;
        console.log('userLoggedIn:', userLoggedIn);

        // Get the ID of the logged-in user
        const userId = req.session.authen;
        console.log('loggedInUserId:', userId);

        const collectionId = req.params.id;

        const collectionQuery = `
            SELECT collection_card.collection_card_id, card.card_id, card.card_name, card.image_url, collection.user_id  
            FROM collection_card
            JOIN card ON collection_card.card_id = card.card_id
            JOIN collection ON collection_card.collection_id = collection.collection_id
            WHERE collection_card.collection_id = ?
        `;

        // Execute the query using promisified function
        const rows = await queryAsync(collectionQuery, [collectionId]);

        // Log the query results for debugging
        console.log('Query results:', rows);

        // Pass userLoggedIn status and logged-in user's ID to the template
        // user ID associated with the collection is retrieved 
        const collectionOwnerId = rows.length > 0 ? rows[0].user_id : null;

        res.render('collectiondetails', { 
            cards: rows, 
            userLoggedIn: userLoggedIn, 
            collectionOwnerId: collectionOwnerId, 
            loggedInUserId: userId,
            collectionId: collectionId 
        });
    } catch (error) {
        console.error('Error fetching card details:', error);
        res.status(500).send('Error fetching card details');
    }
});

// Delete a collection
app.post('/views/deletecollection/:id', async (req, res) => {
    try {
        // Check if the user is logged in
        if (!req.session.authen) {
            return res.status(401).send('Unauthorised');
        }

        // Extract the collection ID from the request parameters
        const collectionId = req.params.id;

        // Query to delete the collection
        const deleteCollectionQuery = 'DELETE FROM collection WHERE collection_id = ?';

        // Execute the query using promisified query
        const result = await queryAsync(deleteCollectionQuery, [collectionId]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).send('Collection not found');
        }

        // Redirect the user back to the user collection page
        res.redirect('/views/usercollection');
    } catch (error) {
        console.error('Error deleting collection:', error);
        res.status(500).send('Error deleting collection');
    }
});


// Add a card to a collection
app.post('/views/addtocollection/:id', async (req, res) => {
    try {
        // Check if the user is logged in
        if (!req.session.authen) {
            // If user is not logged in, redirect to the login page or show an error message
            return res.redirect('/views/login'); 
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
        await queryAsync(insertQuery, [collectionId, cardId]);

        res.redirect(`/views/carddetailspage/${cardId}`);
    } catch (error) {
        console.error('Error adding card to collection:', error);
        res.status(500).send('Error adding card to collection');
    }
});

// member who's logged in views collection of a different member
app.get('/views/alluserscollections/:userId', async (req, res) => {
    try {
        // Check if the user is logged in
        const userLoggedIn = req.session.authen ? true : false;

        // Fetch the ID of the user whose collections are being viewed
        const viewedMemberId = req.params.userId;

        // Query to fetch collections data for the viewed member along with their display name
        const collectionsQuery = `
            SELECT 
                u.user_display_name, 
                c.collection_name, 
                c.collection_description, 
                c.collection_id, 
                u.user_image, 
                COALESCE(l.like_count, 0) AS like_count,
                ROUND(AVG(r.rating_value), 1) AS average_rating
            FROM User u
            LEFT JOIN collection c ON u.user_id = c.user_id
            LEFT JOIN (
                SELECT collection_id, COUNT(*) AS like_count
                FROM likes
                GROUP BY collection_id
            ) l ON c.collection_id = l.collection_id
            LEFT JOIN rating r ON c.collection_id = r.collection_id 
            WHERE u.user_id = ?
            GROUP BY c.collection_id;
        `;

        // Execute the query using the promisified queryAsync function
        const rows = await queryAsync(collectionsQuery, [viewedMemberId]);

        // Check if any collections were found for the specified user ID
        if (rows.length === 0) {
            // Render a page indicating that the user was not found
            return res.render('errorpage', { userLoggedIn });
        }

        // Render the alluserscollections view with user collections data and the viewed member's display name
        res.render('alluserscollections', { userLoggedIn, collections: rows, viewedMemberDisplayName: rows.length > 0 ? rows[0].user_display_name : '', userId: req.params.userId });
    } catch (error) {
        console.error("Error fetching user collections:", error);
        res.status(500).send("Internal Server Error");
    }
});



// user submits rating on a member's collection
app.post('/submit-rating', async (req, res) => {
    try {
        // Check if the user is logged in
        if (!req.session.authen) {
            // If user is not logged in, send an error response
            return res.status(401).send('User is not logged in');
        }

        // Extract rating data from the request body
        const { ratingValue, collectionId } = req.body;

        // Get the user ID from the session
        const userId = req.session.authen;

        // Insert the rating into the database using the promisified queryAsync function
        const insertQuery = 'INSERT INTO rating (rating_value, collection_id, user_id) VALUES (?, ?, ?)';
        await queryAsync(insertQuery, [ratingValue, collectionId, userId]);

        // Send a success response
        res.status(200).send('Rating inserted successfully');
    } catch (error) {
        // Handle any errors
        console.error('Error inserting rating:', error);
        res.status(500).send('Error inserting rating');
    }
});



// Route to like a collection
app.post('/views/like-collection/:collectionId', async (req, res) => {
    try {
        console.log("Request to like collection received");

        const userId = req.session.authen ? req.session.authen.user_id : null;
        const collectionId = req.params.collectionId;
        console.log("User ID:", userId);
        console.log("Collection ID:", collectionId);
      
        console.log('Like collection request received:', { userId, collectionId });
      
        if (!userId) {
          console.error('User is not logged in');
          res.status(401).json({ error: 'User is not logged in' });
          return;
        }
      
        // Insert a new like record into the database using promisified query
        await queryAsync('INSERT INTO likes (user_id, collection_id) VALUES (?, ?)', [userId, collectionId]);

        console.log('Collection liked successfully');
        res.status(200).json({ message: 'Collection liked successfully' });
    } catch (error) {
        console.error('Failed to like collection:', error);
        res.status(500).json({ error: 'Failed to like collection' });
    }
});
  
  
  // Route to unlike a collection
  app.post('/views/unlike-collection/:collectionId', async (req, res) => {
    try {
        const collectionId = req.params.collectionId;
        const userId = req.user.id; 

        // Delete the like record from the database using promisified query
        await queryAsync('DELETE FROM likes WHERE user_id = ? AND collection_id = ?', [userId, collectionId]);

        console.log('Collection unliked successfully');
        res.status(200).json({ message: 'Collection unliked successfully' });
    } catch (error) {
        console.error('Failed to unlike collection:', error);
        res.status(500).json({ error: 'Failed to unlike collection' });
    }
});



// WISHLIST
// Route to display cards in the user's wishlist
app.get('/views/wishlist', async (req, res) => {
    // Check if the user is logged in
    if (!req.session.authen) {
        // If user is not logged in, redirect to the login page or show an error message
        res.redirect('/views/login'); 
        return;
    }

    try {
        // Check if the user is logged in
        const userLoggedIn = req.session.authen ? true : false;
        console.log('userLoggedIn:', userLoggedIn);

        // Get the ID of the logged-in user
        const userId = req.session.authen; 
        console.log('loggedInUserId:', userId);

        // Query to retrieve card details from the user's wishlist
        const wishlistQuery = `
            SELECT card.card_id, card.card_name, card.image_url, wishlist_id
            FROM wishlist
            JOIN card ON wishlist.card_id = card.card_id
            WHERE wishlist.user_id = ?
        `;

        // Execute the query asynchronously
        const rows = await queryAsync(wishlistQuery, [userId]);

        // Pass user's wishlist data to the view for rendering
        res.render('wishlist', { cards: rows, userLoggedIn: userLoggedIn, loggedInUserId: userId });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Error fetching wishlist');
    }
});


// add a card to a wishlist
app.post('/views/addtowishlist/:id', async (req, res) => {
    try {
        // Check if the user is logged in
        if (!req.session.authen) {
            // If user is not logged in, redirect to the login page or show an error message
            return res.redirect('/views/login'); 
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

        // Check if the card already exists in the user's wishlist
        const checkQuery = 'SELECT * FROM wishlist WHERE user_id = ? AND card_id = ?';
        const checkResult = await queryAsync(checkQuery, [userId, cardId]);

        // If the card already exists in the wishlist, inform the user
        if (checkResult.length > 0) {
            console.log('Card already exists in wishlist');
            return res.status(400).send('This card is already in your wishlist');
        }

        // If the card does not exist in the wishlist, add it
        const insertQuery = 'INSERT INTO wishlist (user_id, card_id) VALUES (?, ?)';
        await queryAsync(insertQuery, [userId, cardId]);

        res.redirect(`/views/wishlist`);
    } catch (error) {
        console.error('Error adding card to wishlist:', error);
        res.status(500).send('Error adding card to wishlist');
    }
});


// DELETE a card from user's WISHLIST
app.delete('/views/deletefromwishlist/:wishlistId', async (req, res) => {
    try {
        // Check if the user is logged in
        if (!req.session.authen) {
            return res.status(401).send('Unauthorised ??');
        }

        // Extract the wishlist ID from the request parameters
        const wishlistId = req.params.wishlistId;

        // Query to delete the card from the wishlist
        const deleteFromWishlistQuery = 'DELETE FROM wishlist WHERE wishlist_id = ?';

        // Execute the query
        const result = await queryAsync(deleteFromWishlistQuery, [wishlistId]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).send('Card not found in wishlist');
        }

        // Send a success response
        res.status(200).send('Card from Wishlist deleted successfully');
        console.log("Card from Wishlist was successfully deleted");
    } catch (error) {
        console.error('Error deleting card from wishlist:', error);
        res.status(500).send('Error deleting card from wishlist');
    }
});






// COMMENTS
// Route for displaying comments
app.get('/views/comments/:collectionId', async (req, res) => {
    try {
        // Check if the user is logged in
        const userLoggedIn = req.session.authen ? true : false;
        console.log('userLoggedIn:', userLoggedIn);

        // Get the ID of the logged-in user
        const userId = req.session.authen;
        console.log('loggedInUserId:', userId);

        // Redirect to login page if user is not logged in
        if (!userLoggedIn) {
            return res.redirect('/views/login');
        }

        // Get the collection id from the route parameters
        const collectionId = req.params.collectionId;

        // get the comments for the collection
        const commentsQuery = `
            SELECT Comment.*, User.user_display_name, User.user_image, User.user_id
            FROM Comment
            JOIN User ON Comment.user_id = User.user_id
            WHERE Comment.collection_id = ?
        `;

        // Execute the query using promisified function
        const comments = await queryAsync(commentsQuery, [collectionId]);

        // Render the comments page and comments
        res.render('comments', { comments: comments, userLoggedIn: userLoggedIn, collectionId: collectionId, loggedInUserId: userId });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).send('Error fetching comments');
    }
});


// Route for showing the comment form for a specific collection
app.get('/views/addcomment/:collectionId', (req, res) => {

    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;
    // Pass userLoggedIn status and collection ID to the template
    res.render('addcomment', { userLoggedIn: userLoggedIn, collectionId: req.params.collectionId });
});


// Route for ADDING a comment
app.post('/views/addcomment/:collectionId', async (req, res) => {
    try {
        // Check if the user is logged in
        if (!req.session.authen) {
            // If user is not logged in, redirect to the login page or show an error message
            return res.redirect('/views/login'); 
        }

        // Get the user ID from the session
        const userId = req.session.authen;

        // Get comment content from the form
        const commentContent = req.body.comment_content;

        // Get the collection ID from the route parameters
        const collectionId = req.params.collectionId;

        // Insert the comment into the database using promisified query
        await queryAsync('INSERT INTO Comment (collection_id, user_id, comment_text) VALUES (?, ?, ?)', [collectionId, userId, commentContent]);

        // Redirect to the collection details page after comment submission
        res.redirect(`/views/collectiondetails/${collectionId}`);
    } catch (error) {
        console.error('Error inserting comment:', error);
        res.status(500).send('Error inserting comment');
    }
});


// deleting a comment
app.delete('/views/deletecomment/:commentId', async (req, res) => {
    try {
        // Check if the user is logged in
        if (!req.session.authen) {
            res.status(401).send('Unauthorised');
            return;
        }

        // get the comment ID
        const commentId = req.params.commentId;

        // delete the comment from the database
        const deleteCommentQuery = 'DELETE FROM comment WHERE comment_id = ?';

        // execute the query 
        const result = await queryAsync(deleteCommentQuery, [commentId]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            res.status(404).send('Comment not found');
            return;
        }

        // Send a success response
        res.status(200).send('Comment deleted successfully');
        console.log("Comment deleted successfully");
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).send('Error deleting comment');
    }
});












// DISPLAY HOME PAGE
app.get('/views/index',  (req, res) => {
    res.render('index');
});



app.get('/views/blog',  (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    res.render('blog', { userLoggedIn });
});

app.get('/views/howtoplay',  (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    res.render('howtoplay', { userLoggedIn });
});



app.get('/views/errorpage',  (req, res) => {
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    res.render('errorpage', { userLoggedIn });
});



app.get('/views/login', (req, res) => {
    res.render('login', { loginError: false }); // Pass loginError as false initially
});

app.get('/views/register',  (req, res) => {
    res.render('register');
});

app.get('/views/signup',  (req, res) => {
    res.render('signup');
});

app.get('/views/newmember', (req, res) => {
    res.render('newmember');
});

// BACK BUTTON
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

// 1. a user signing up and becoming a new member 
app.post('/newmember', async (req, res) => {
    try {
        const email = req.body.registerEmail;
        const password = req.body.registerPassword;
        let firstname = req.body.registerFirstName;
        let lastname = req.body.registerLastName;
        const age = req.body.registerDateOfBirth;

        // Capitalise the first letter of first and last names
        firstname = capitaliseFirstLetter(firstname);
        lastname = capitaliseFirstLetter(lastname);

        // Check if the email already exists in the database
        const checkQuery = 'SELECT * FROM User WHERE user_email = ?';
        const rows = await queryAsync(checkQuery, [email]);

        if (rows.length > 0) {
            return res.send('<script>alert("Email already exists. Try logging in."); window.location="/views/login";</script>');
        } else {
            const hash = await bcrypt.hash(password, saltRounds);
            console.log('Hashed Password:', hash);

            const insertQuery = 'INSERT INTO User (user_display_name, user_email, user_password, user_first_name, user_last_name, user_role, user_image, user_dob) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
            const userRole = 'member'; // Default role for new users
            const userImage = 'https://pngimg.com/uploads/pokemon/pokemon_PNG93.png'; 

            await queryAsync(insertQuery, [firstname, email, hash, firstname, lastname, userRole, userImage, age]);

            res.render('login', { loginError: false });
        }
    } catch (error) {
        console.error('Error inserting new user:', error);
        res.status(500).send('Error inserting new user');
    }
});

 



// 3. the user logs into their account
app.post("/views/login", async (req, res) => {
    const loginEmail = req.body.loginEmail;
    const loginPassword = req.body.loginPassword;

    console.log("Received login credentials:", loginEmail);

    try {
        const result = await queryAsync("SELECT user_id, user_email, user_first_name, user_last_name, user_role, user_password, user_image FROM User WHERE user_email = ?", [loginEmail]);

        if (result.length > 0) {
            const user = result[0];
            const storedHashedPassword = String(user.user_password);

           

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
                     // Authenticate user
            console.log("User authenticated, setting session:", user.user_id);
                } else {
                    // Set loginError to true to indicate a failed login attempt
                    res.render('login', { loginError: true });
                }
            });
        } else {
            // Set loginError to true to indicate a failed login attempt
            res.render('login', { loginError: true });
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







// Routes with authentication check middleware applied
app.get('/views/dashboard', checkAuthentication, async (req, res) => {
    try {
        const userId = req.session.authen;
        const userQuery = `SELECT user_id, user_display_name, user_email, user_password, user_first_name, user_last_name, user_role, user_image FROM User WHERE user_id = ?`;

        const rows = await queryAsync(userQuery, [userId]);

        if (rows.length > 0) {
            const userInfo = rows[0];
            res.render('dashboard', { userLoggedIn: true, userData: userInfo });
        } else {
            res.send("User not found");
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).send("Internal Server Error");
    }
});




// NEW ** NEW ** NEW ** NEW ** NEW ** NEW ** NEW ** NEW ** NEW ** NEW ** NEW ** 
// 5. Display account page with User details
app.get('/views/account', checkAuthentication, async (req, res) => {
    try {
        const userId = req.session.authen;
        const userQuery = `SELECT * FROM User WHERE user_id = ?`;
        const rows = await queryAsync(userQuery, [userId]);
        
        if (rows.length > 0) {
            const userInfo = rows[0];
            res.render('account', { userLoggedIn: true, userData: userInfo });
        } else {
            res.send("User not found");
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).send("Internal Server Error");
    }
});


// 6. user collection page
app.get('/views/usercollection', async (req, res) => {
    try {
        // Check if the user is logged in
        const userLoggedIn = req.session.authen ? true : false;

        // If the user is logged in, fetch user collections and render the user collection page
        if (userLoggedIn) {
            const userId = req.session.authen;
            const collectionsQuery = `SELECT * FROM collection WHERE user_id = ?`;

            const rows = await queryAsync(collectionsQuery, [userId]);
            
            // Render the usercollection view with user collections data
            res.render('usercollection', { userLoggedIn: userLoggedIn, collections: rows });
        } else {
            // If the user is not logged in, deny access
            res.send("Denied - please log in.");
        }
    } catch (error) {
        console.error("Error fetching user collections:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 7. create NEW collection 
app.get('/views/createcollection', async (req, res) => {
    try {
        // Check if the user is logged in
        const userLoggedIn = req.session.authen ? true : false;

        // If the user is logged in, fetch user data and render the dashboard page
        if (userLoggedIn) {
            const userId = req.session.authen;
            const userQuery = `SELECT * FROM User WHERE user_id = ?`;

            const rows = await queryAsync(userQuery, [userId]);

            if (rows.length > 0) {
                const userInfo = rows[0];
                res.render('createcollection', { userLoggedIn: userLoggedIn, userData: userInfo });
            } else {
                res.send("User not found");
            }
        } else {
            // If the user is not logged in, deny access
            res.send("Denied - please log in.");
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).send("Internal Server Error");
    }
});



// 8. Handle POST request to create a new collection
app.post('/createcollection', async (req, res) => {
    try {
        // Retrieve collection data from the request body
        const collectionName = req.body.collectionName;
        const collectionDescription = req.body.collectionDescription;

        // Retrieve user ID from the session
        const userId = req.session.authen;

        // Insert the new collection into the database
        const insertQuery = 'INSERT INTO collection (collection_name, collection_description, user_id) VALUES (?, ?, ?)';
        await queryAsync(insertQuery, [collectionName, collectionDescription, userId]);

        // Redirect the user to a confirmation page or any other desired page
        res.redirect('/views/usercollection');
    } catch (error) {
        console.error('Error creating new collection:', error);
        res.status(500).send('Error creating new collection');
    }
});






// 9. Update user's display name
//app.put('/updateUser', (req, res) => {
    app.post('/updateUser', async (req, res) => {
        try {
            console.log('/updateUser route hit'); 
            console.log('Request body:', req.body); 
    
            const newDisplayName = req.body.newDisplayName;
            const userId = req.session.authen; // Assuming you store user ID in session
    
            const updateQuery = 'UPDATE User SET user_display_name = ? WHERE user_id = ?';
            await queryAsync(updateQuery, [newDisplayName, userId]);
    
            res.redirect('/views/dashboard'); // Redirect back to the account page after updating
        } catch (error) {
            console.error('Error updating user display name:', error);
            res.status(500).send('Error updating user display name');
        }
    });




//  update user's FIRST name
app.post('/updateFirstName', async (req, res) => {
    try {
        console.log('POST /updateFirstName route hit');
        console.log('Request body:', req.body);

        let newFirstName = req.body.newFirstName;

        // Capitalise first letter of last name
        newFirstName = capitaliseFirstLetter(newFirstName);

        const userId = req.session.authen;

        const updateQuery = 'UPDATE User SET user_first_name = ? WHERE user_id = ?';
        await queryAsync(updateQuery, [newFirstName, userId]);

        res.redirect('/views/dashboard');
    } catch (error) {
        console.error('Error updating user first name:', error);
        res.status(500).send('Error updating user first name');
    }
});


// update user's LAST name
app.post('/updateLastName', async (req, res) => {
    try {
        console.log('POST /updateLastName route hit');
        console.log('Request body:', req.body);

        let newLastName = req.body.newLastName;

        // Capitalise first letter of last name
        newLastName = capitaliseFirstLetter(newLastName);

        const userId = req.session.authen;

        const updateQuery = 'UPDATE User SET user_last_name = ? WHERE user_id = ?';
        await queryAsync(updateQuery, [newLastName, userId]);

        res.redirect('/views/dashboard');
    } catch (error) {
        console.error('Error updating user last name:', error);
        res.status(500).send('Error updating user last name');
    }
});



// 10. delete a single card from a user's collection
app.delete('/views/deletefromcollection/:collectionCardId', async (req, res) => {
    try {
        // Extract the collection card ID from the request parameters
        const collectionCardId = req.params.collectionCardId;

        // Query to delete the card from the collection based on the collection card ID
        const deleteFromCollectionQuery = 'DELETE FROM collection_card WHERE collection_card_id = ?';

        // Execute the query
        const result = await queryAsync(deleteFromCollectionQuery, [collectionCardId]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            res.status(404).send('Collection card not found');
            return;
        }

        // Send a success response
        res.status(200).send('Card deleted from collection successfully');
    } catch (error) {
        console.error('Error deleting card from collection:', error);
        res.status(500).send('Error deleting card from collection');
    }
});


// renders the deleteaccount page
app.get('/views/deleteaccount', checkAuthentication, (req, res) => {

    const userLoggedIn = req.session.authen ? true : false;

    res.render('deleteaccount', { userLoggedIn });
});
 
// when a user wants to delete their account
app.post('/views/deleteaccount', async (req, res) => {
    try {
        const userId = req.session.authen;

        // Query to delete the user from the database based on the user ID
        const deleteUserQuery = 'DELETE FROM User WHERE user_id = ?';

        // Execute the query
        await queryAsync(deleteUserQuery, [userId]);

        // Destroy the session
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                res.status(500).send('Error destroying session');
                return;
            }
            // Redirect to the login page 
            res.redirect('/views/login');
        });
    } catch (error) {
        console.error('Error deleting user account:', error);
        res.status(500).send('Error deleting user account');
    }
});

app.get



// Route handler for 404 errors
app.get('*', (req, res) => {

     // Check if the user is logged in
     const userLoggedIn = req.session.authen ? true : false;

    res.status(404).render('errorpage', { 
        userLoggedIn
    });
});


app.listen(process.env.PORT || 3000, ()=>{ 
    console.log("Server started on: localhost:3000");
});
