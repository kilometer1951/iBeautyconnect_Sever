const mongoose = require("mongoose");
const Message = mongoose.model("messages");

module.exports = (app, io) => {
  io.on("connection", function(socket) {
    console.log("user connected");

    socket.on("newOrder", async function(order) {
      io.emit("newOrder", { order });
      console.log(order);
    });

    socket.on("disconnect", function() {
      console.log("user disconnected");
    });
  });
};
