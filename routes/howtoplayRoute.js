const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Route /howtoplay is working'); 
    // Check if the user is logged in
    const userLoggedIn = req.session.authen ? true : false;

    console.log('Request to /howtoplay route received'); // Add this line

    res.render('howtoplay', { userLoggedIn });
});

module.exports = router;
