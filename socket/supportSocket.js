const mongoose = require("mongoose");
const Message = mongoose.model("messages");

let messageBody = "";
const smsFunctions = require("../functions/SMS");

module.exports = (app, io) => {
  io.on("connection", function(socket) {
    //  console.log("user connected");

    socket.on("newSupportMessage", async function(messageData) {
      io.emit("newSupportMessage", messageData);
    });

    socket.on("disconnect", function() {
      console.log("user disconnected");
    });
  });
};
