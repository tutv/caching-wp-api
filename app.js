var express = require('express');
var app = express();
var http = require('http').Server(app);
var compress = require('compression');
var fs = require('fs');
var datek = require('datek');
var Datastore = require('nedb');
var WP = require('wordpress-rest-api');


var db_caching = new Datastore({filename: 'databases/caching.db', autoload: true});

app.use(compress());
app.enable('view cache');


var wp = new WP({
	endpoint: 'http://tu.me/test/wp-json'
});

app.get('/', function (req, res) {
	db_caching.find({key: '/'}, function (err, docs) {
		if (err) throw err;

		if (docs.length === 0) {
			console.log('No caching!');

			wp.posts().get(function (err, data) {
				res.json(data);

				db_caching.insert({key: '/', created_at: datek.getNowTimestamp()}, function (err, newDoc) {
					var id_cache = newDoc._id;

					fs.writeFile('cache/' + id_cache + '.json', JSON.stringify(data), function (err) {
						if (err) throw err;

						console.log(id_cache + ' is\' saved!');
					});
				});
			});
		} else {
			console.log('Docs', docs);
			var node_cache = docs[0];
			var id_cache = node_cache._id;
			var created_at = parseInt(node_cache.created_at);
			var now = datek.getNowTimestamp();
			if (now - created_at > caching_config.maxAge * 1000) {
				console.log('Da het han!');

				db_caching.update({_id: id_cache}, {$set: {created_at: now}}, {}, function (err, num) {
					console.log('Updated ' + num);
				});

				wp.posts().get(function (err, data) {
					fs.writeFile('cache/' + id_cache + '.json', JSON.stringify(data), function (err) {
						if (err) throw err;

						console.log(id_cache + ' is\' saved!');
					});
				});
			} else {
				console.log('Chua het han!');
			}

			var static_file_cache = 'cache/' + id_cache + '.json';

			fs.readFile(static_file_cache, 'utf8', function (err, data) {
				if (err) throw err;

				res.set('Content-Type', 'application/json; charset=UTF-8');
				res.send(data);
			});
		}

	});
});

app.get('/test', function (req, res) {
	wp.posts().get(function (err, data) {
		res.json(data);
	});
});

http.listen(8002, function () {
	console.log('listening on localhost:8002');
});