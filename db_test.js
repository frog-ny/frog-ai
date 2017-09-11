
const Article = require('./models/article');
const mongoose = require('mongoose');
const mongoDB = 'mongodb://localhost/my_database';
mongoose.Promise = global.Promise;
mongoose.connect(mongoDB);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', ()=>{
    console.log('connected to mongodb');
});

var article = new Article({
    posted_by: 'jeffrey.ong',
    timestamp: Date.now(),
    url: "https://www.nytimes.com/2017/08/13/technology/the-messy-confusing-future-of-tv-its-here.html"
});

article.save(function(err){
    if(err) {
        console.error(err);
    }
    else {
        console.log('saved new article');
    }
    mongoose.connection.close();
});

