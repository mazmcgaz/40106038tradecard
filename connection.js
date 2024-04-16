
const mysql  = require('mysql2');



const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'tradecard_project',  //change to your DB name
    port: '8889'
});




db.connect((err)=> {
    if(err) throw err;
    console.log('Database connected successfully');
});


module.exports = db;


