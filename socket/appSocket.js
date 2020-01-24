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

    socket.on("reSchedule", async function(reScheduleData) {
      io.emit("reSchedule", { reScheduleData });
      const {
        cartId,
        partnerId,
        partnerPhone,
        booking_date,
        booking_time,
        client_name,
        client_phone,
        partner_name,
        clientId
      } = reScheduleData.reScheduleData;
      const newDate = moment(new Date(reScheduleData.bookingDate)).format(
        "MMM DD, YYYY"
      );
      const new_booking_date = reScheduleData.bookingDate;
      const new_booking_time = reScheduleData.bookingTime;

      // //send sms to parter
      messageBody = `Your client ${client_name} has updated their appointment from ${moment(
        new Date(booking_date)
      ).format("MMM DD, YYYY")} at ${booking_time} To ${moment(
        new Date(new_booking_date)
      ).format(
        "MMM DD, YYYY"
      )} at ${new_booking_time}. Your payment is not affected`;

      smsFunctions.sendSMS("req", "res", partnerPhone, messageBody);

      //update cart with new date and time
      const cart = await Cart.findOne({
        _id: cartId
      });
      cart.booking_date = new_booking_date;
      cart.booking_time = new_booking_time;
      cart.save();

      //delete cron job and create new one

      let input = new_booking_time,
        matches = input.toLowerCase().match(/(\d{1,2}):(\d{2}) ([ap]m)/),
        outputTime =
          parseInt(matches[1]) +
          (matches[3] == "pm" ? 12 : 0) +
          ":" +
          matches[2] +
          ":00";
      let dateTime = new Date(new_booking_date + " " + outputTime);
      let MS_PER_MINUTE = 60000;
      let thirtyMinuteBefore = new Date(dateTime - 30 * MS_PER_MINUTE);
      let tenMinuteBefore = new Date(dateTime - 10 * MS_PER_MINUTE);
      // //newSchedule
      // // scheduling

      let j_30_minute_before = schedule.scheduleJob(
        cartId + "thirtyMinuteBefore",
        thirtyMinuteBefore,
        function() {
          if (!cart.hasCanceled) {
            let partnerMessage = `Appointment reminder. This is a quick reminder of your appointment with ${client_name} on ${newDate} at ${new_booking_time}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
            let clientMessage = `Appointment reminder. This is a quick reminder of your appointment with ${partner_name} on ${newDate} at ${new_booking_time}. Do not forget to check in through the app thanks iBeautyConnect`;
            smsFunctions.sendSMS("req", "res", partnerPhone, partnerMessage);
            smsFunctions.sendSMS("req", "res", client_phone, clientMessage);
          }
        }
      );
      let j_10_minute_before = schedule.scheduleJob(
        cartId + "tenMinuteBefore",
        tenMinuteBefore,
        function() {
          if (!cart.hasCanceled) {
            let partnerMessage = `Appointment reminder. This is a quick reminder of your appointment with ${client_name} on ${newDate} at ${bookingTime}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
            let clientMessage = `Appointment reminder. This is a quick reminder of your appointment with ${partner_name} on ${newDate} at ${bookingTime}. Do not forget to check in through the app thanks iBeautyConnect`;
            smsFunctions.sendSMS(req, res, partnerPhone, partnerMessage);
            smsFunctions.sendSMS("req", "res", client_phone, clientMessage);
          }
        }
      );
      let job = schedule.scheduleJob(cartId + "job", dateTime, function() {
        if (!cart.hasCanceled) {
          let partnerMessage = `Appointment reminder. It's time for your appointment with ${client_name}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
          let clientMessage = `Appointment reminder. It's time for your appointment with ${partner_name}. Open the iBeautyConnect app to checkin iBeautyConnectClient://appointment_checkin`;
          smsFunctions.sendSMS("req", "res", partnerPhone, partnerMessage);
          smsFunctions.sendSMS("req", "res", client_phone, clientMessage);
        }
      });
    });

    socket.on("disconnect", function() {
      console.log("user disconnected");
    });
  });
};
