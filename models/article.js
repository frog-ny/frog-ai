const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const Schema = mongoose.Schema;

const ArticleSchema = Schema({
    url: { type: String, required: true, max: 140 },
    posted_by: { type: String, required: true, max: 100 },
    timestamp: { type: Date, default: Date.now },
    tags: { type: Array, default: []}
});

const Article = mongoose.model('Article', ArticleSchema);

module.exports = Article;
