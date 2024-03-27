const express = require("express");
const app = express();
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
const axios = require('axios');

app.use(express.urlencoded({ extended: true }));



app.get("/", (req, res) => {
    axios.get("http://jbusch.webhosting2.eeecs.qub.ac.uk/tvapi/?shows").then(results => {
        let showsdata = results.data;
        res.render('index', {showsdata});
        })
        .catch(err => {
            console.log("Error: ", err.message);
    });
});



app.listen(3000, () => {
    console.log("Server is running at port 3000");
});