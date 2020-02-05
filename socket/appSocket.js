const mongoose = require("mongoose");
const Cart = mongoose.model("carts");

const moment = require("moment");
const schedule = require("node-schedule");

let messageBody = "";
const smsFunctions = require("../functions/SMS");

module.exports = (app, io) => {
  io.on("connection", function(socket) {
    //    console.log("user connected");

    socket.on("noDataInCart", async function(clientId) {
      io.emit("addedToCart", clientId);
      console.log(clientId);
    });

    socket.on("addedToCart", async function(clientId) {
      io.emit("addedToCart", { clientId });
      console.log(clientId);
    });

    socket.on("newOrder", async function(order) {
      io.emit("newOrder", order);
      console.log(order.from);
    });

    socket.on("checkIn", async function(checkInData) {
      io.emit("checkIn", checkInData);
      console.log(checkInData);
    });

    socket.on("cancelAppoitment", async function(cancelAppoitmentData) {
      io.emit("cancelAppoitment", cancelAppoitmentData);
      console.log(cancelAppoitmentData);
    });

    socket.on("noShow", async function(noShowAppoitmentData) {
      io.emit("noShow", noShowAppoitmentData);
      console.log(noShowAppoitmentData);
    });

    socket.on("reSchedule", async function(reScheduleData) {
      io.emit("reSchedule", { reScheduleData });
      console.log(reScheduleData);
    });

    socket.on("disconnect", function() {
      console.log("user disconnected");
    });
  });
};
