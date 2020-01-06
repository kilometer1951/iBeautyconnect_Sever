const mongoose = require("mongoose");
const Cart = mongoose.model("carts");

const moment = require("moment");
const schedule = require("node-schedule");

let messageBody = "";
const smsFunctions = require("../functions/SMS");

module.exports = (app, io) => {
  io.on("connection", function(socket) {
    //    console.log("user connected");

    socket.on("newOrder", async function(order) {
      io.emit("newOrder", { order });
      console.log(order);
    });

    socket.on("checkIn", async function(check_in) {
      io.emit("checkIn", { check_in });
      console.log(check_in);
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
      let oneHourBefore = new Date(dateTime - 60 * MS_PER_MINUTE);
      let thirtyMinuteBefore = new Date(dateTime - 30 * MS_PER_MINUTE);
      let tenMinuteBefore = new Date(dateTime - 10 * MS_PER_MINUTE);
      // //newSchedule
      // // scheduling
      let j_one_hour_before = schedule.scheduleJob(
        cartId + "oneHourBefore",
        oneHourBefore,
        function() {
          let partnerMessage = `Appointment reminder. This is a quick reminder of your appointment with ${client_name} on ${newDate} at ${new_booking_time}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
          let clientMessage = `Appointment reminder. This is a quick reminder of your appointment with ${partner_name} on ${newDate} at ${new_booking_time}. Do not forget to check in through the app thanks iBeautyConnect`;
          smsFunctions.sendSMS(req, res, partnerPhone, partnerMessage);
          smsFunctions.sendSMS(req, res, client_phone, clientMessage);
        }
      );
      let j_30_minute_before = schedule.scheduleJob(
        cartId + "thirtyMinuteBefore",
        thirtyMinuteBefore,
        function() {
          let partnerMessage = `Appointment reminder. This is a quick reminder of your appointment with ${client_name} on ${newDate} at ${new_booking_time}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
          let clientMessage = `Appointment reminder. This is a quick reminder of your appointment with ${partner_name} on ${newDate} at ${new_booking_time}. Do not forget to check in through the app thanks iBeautyConnect`;
          smsFunctions.sendSMS(req, res, partnerPhone, partnerMessage);
          smsFunctions.sendSMS(req, res, client_phone, clientMessage);
        }
      );
      let j_10_minute_before = schedule.scheduleJob(
        cartId + "tenMinuteBefore",
        tenMinuteBefore,
        function() {
          let partnerMessage = `Appointment reminder. This is a quick reminder of your appointment with ${client_name} on ${newDate} at ${bookingTime}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
          let clientMessage = `Appointment reminder. This is a quick reminder of your appointment with ${partner_name} on ${newDate} at ${bookingTime}. Do not forget to check in through the app thanks iBeautyConnect`;
          smsFunctions.sendSMS(req, res, partner_phone_number, partnerMessage);
          smsFunctions.sendSMS(req, res, client_phone_number, clientMessage);
        }
      );
      console.log(schedule.scheduledJobs);
    });

    socket.on("disconnect", function() {
      console.log("user disconnected");
    });
  });
};
