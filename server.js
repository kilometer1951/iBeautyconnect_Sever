const express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose"),
  Agenda = require("agenda");

let http = require("http").Server(app);
let io = require("socket.io")(http);

const config = require("./config/secret");

//models
require("./models/Partner");
require("./models/Client");
require("./models/Profession");
require("./models/Image");
require("./models/Video");
require("./models/Cart");
require("./models/Message");
require("./models/Rate");

require("./models/Country");
require("./models/State");
require("./models/City");
require("./models/Support");
require("./models/AgendaJob");

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongoose.connect(config.database, {
  socketTimeoutMS: 0,
  keepAlive: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on("open", () => {
  mongoose.connection.db.collection("agendaJobs", (err, collection) => {
    collection.updateOne(
      { lockedAt: { $exists: true }, lastFinishedAt: { $exists: false } },
      {
        $unset: {
          lockedAt: undefined,
          lastModifiedBy: undefined,
          lastRunAt: undefined
        },
        $set: { nextRunAt: new Date() }
      },
      { multi: true },
      (e, numUnlocked) => {
        if (e) {
          console.error(e);
        }
        //console.log(`Unlocked #{${numUnlocked}} jobs.`);
      }
    );
  });
});

const agenda = new Agenda({
  db: {
    address: config.database,
    collection: "agendaJobs",
    options: { useNewUrlParser: true }
  }
});

// //connect to db
//
// mongoose.Promise = global.Promise;
// mongoose.connect(
//   config.database,
//   function(err) {
//     if (err) {
//       console.log(err.message);
//     } else {
//       console.log("database connected");
//     }
//   },
//   { useNewUrlParser: true, useUnifiedTopology: true }
// );

require("./routes/api")(app);
require("./routes/runSchedule")(app, agenda);
require("./routes/partner/authPartner")(app);
require("./routes/partner/apiPartner")(app);
require("./routes/client/authClient")(app);
require("./routes/client/apiClient")(app);
require("./socket/chatSocket")(app, io);
require("./socket/appSocket")(app, io);
require("./socket/supportSocket")(app, io);
//require("./routes/adminApi")(app);
require("./routes/supportApi")(app);

const port = process.env.PORT || 5002;
http.listen(port, () => {
  console.log("Partner server connected successfully at port:", port);
});
