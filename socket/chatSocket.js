const mongoose = require("mongoose");
const Message = mongoose.model("messages");

let messageBody = "";
const smsFunctions = require("../functions/SMS");

module.exports = (app, io) => {
  io.on("connection", function(socket) {
    //  console.log("user connected");

    socket.on("newMessage", async function(msg) {
      io.emit("newMessage", { msg });
      //  console.log(msg);
    });

    // socket.on("m", function(msg) {
    //   io.emit("m", { msg });
    //   console.log("msg");
    // });

    socket.on("disconnect", function() {
      console.log("user disconnected");
    });
  });
};
