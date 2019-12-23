const express = require("express"),
  app = express(),
  bodyParser = require("body-parser"),
  mongoose = require("mongoose");

const config = require("./config/secret");

//models
require("./models/Partner");
require("./models/Client");
require("./models/Profession");
require("./models/Image");
require("./models/Video");

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

require("./routes/partner/authPartner")(app);
require("./routes/partner/apiPartner")(app);
require("./routes/client/authClient")(app);

require("./routes/adminApi")(app);

const port = process.env.PORT || 5002;
app.listen(port, () => {
  console.log("Partner server connected successfully at port:", port);
});
