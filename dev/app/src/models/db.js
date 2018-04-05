var mongoose = require('mongoose');

mongoose.Promise = global.Promise;

var DB_CONNECTION_URL = 'mongodb://if-db/ideafunnel';

const options = {
  autoReconnect: true,
  reconnectTries: 10, // try to connect 10 times
  reconnectInterval: 10000, // Reconnect every 10 sec
}


function createConnection(dbURL, options) {
  retry = options.reconnectTries
  var db = mongoose.connection;
  mongoose.connect(dbURL, options);

  // hack to force retry when first attempt fails.
  // Reason of failure is that docker starts but mongo takes some time to become available
  // so we need to retry if first attempt fails.
  db.on('error', function(err) {
    if (retry > 0 && err.message && err.message.match(/failed to connect to server .* on first connect/)) {
      console.log(new Date(), String(err));
      console.log("retries left: " + retry--);

      setTimeout(function() {
        db.openUri(dbURL).catch(() => {});
    }, options.reconnectInterval);

    } else {
      // Some other error occurred or retry attempts reached max
      console.error(new Date(), String(err));
    }
  });

  db.once('open', function callback() {
    console.log("DB connection opened to " + DB_CONNECTION_URL);
  });

  return db;
}

// Use it like
var db = createConnection(DB_CONNECTION_URL, options);
