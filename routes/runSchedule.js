const mongoose = require("mongoose");

const Moment = require("moment");
const Cart = mongoose.model("carts");

let messageBody = "";
const httpRespond = require("../functions/httpRespond");
const smsFunctions = require("../functions/SMS");

module.exports = (app, agenda) => {
  const runTask = async () => {
    const carts = await Cart.find({
      orderIsComplete: false,
      hasCheckedout: true
    })
      .populate("client")
      .populate("partner");

    for (var i = 0; i < carts.length; i++) {
      const date = new Date();
      if (Moment(carts[i].booking_date).isSame(date, "day")) {
        const systemTime = Moment(date).format("h:mm a");
        const outputTime = Moment(carts[i].booking_time, ["h:mm a"]).format(
          "HH:mm"
        );
        const newDate = Moment(new Date(carts[i].booking_date)).format(
          "MMM DD, YYYY"
        );
        let dateTime = new Date(newDate + " " + outputTime);
        const newTime_1 = Moment(dateTime)
          .subtract(30, "minutes")
          .format("h:mm a");

        const timeNow = Moment(dateTime).format("h:mm a");

        const client_name = carts[i].client.name;
        const client_phone_number = carts[i].client.phone;

        const partner_name = carts[i].partner.fName;
        const partner_phone_number = carts[i].partner.phone;

        if (systemTime == newTime_1) {
          let partnerMessage = `Appointment reminder. This is a quick reminder of your appointment with ${client_name} on ${newDate} at ${timeNow}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
          let clientMessage = `Appointment reminder. This is a quick reminder of your appointment with ${partner_name} on ${newDate} at ${timeNow}. Do not forget to check in through the app thanks iBeautyConnect`;
          smsFunctions.sendSMS(
            "req",
            "res",
            partner_phone_number,
            partnerMessage
          );
          smsFunctions.sendSMS(
            "req",
            "res",
            client_phone_number,
            clientMessage
          );
        }

        if (systemTime == timeNow) {
          let partnerMessage_2 = `Appointment reminder. It's time for your appointment with ${client_name}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
          let clientMessage_2 = `Appointment reminder. It's time for your appointment with ${partner_name}. Open the iBeautyConnect app to checkin iBeautyConnectClient://appointment_checkin`;
          smsFunctions.sendSMS(
            "req",
            "res",
            partner_phone_number,
            partnerMessage_2
          );
          smsFunctions.sendSMS(
            "req",
            "res",
            client_phone_number,
            clientMessage_2
          );
        }
      }
    }
  };

  const sendNotifications = async () => {
    agenda.define("send notificiation", async job => {
      await runTask();
    });
  };

  (async function() {
    await agenda.start();
    await agenda.every("1 minutes", "send notificiation");
  })();

  sendNotifications();
};
