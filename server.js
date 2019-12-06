const express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose");

const config = require("./config/secret");

//models
require("./models/User");
require("./models/Profession");

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//connect to db
mongoose.Promise = global.Promise;
mongoose.connect(
  config.database,
  function(err) {
    if (err) {
      console.log(err.message);
    } else {
      console.log("database connected");
    }
  },
  { useNewUrlParser: true, useUnifiedTopology: true }
);

require("./routes/auth")(app);
require("./routes/api")(app);
require("./routes/adminApi")(app);

const port = process.env.PORT || 5002;
app.listen(port, () => {
  console.log("Partner server connected successfully at port:", port);
});
