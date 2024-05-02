
const mysql  = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: '40106038',  
    port: '8889'
});




db.connect((err)=> {
    if(err) throw err;
    console.log('Database connected successfully');
});


module.exports = db;


