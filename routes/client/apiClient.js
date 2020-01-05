const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const Partner = mongoose.model("partners");
const Cart = mongoose.model("carts");
const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");
const moment = require("moment");
const schedule = require("node-schedule");

let messageBody = "";
const httpRespond = require("../../functions/httpRespond");
const smsFunctions = require("../../functions/SMS");

module.exports = app => {
  app.get("/api_client/loadAllPartners", async (req, res) => {
    try {
      const partners = await Partner.find({});

      return httpRespond.authRespond(res, {
        status: true,
        partners
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: true,
        message: e
      });
    }
  });

  app.get("/api/get_client_cards/:stripeId", async (req, res) => {
    const cards = await stripe.customers.listSources(req.params.stripeId, {});
    return httpRespond.authRespond(res, {
      status: true,
      cards
    });
  });

  app.get("/api/get_item_in_cart_per_client/:cartId/", async (req, res) => {
    const cart = await Cart.findOne({
      _id: req.params.cartId
    });
    //console.log(cart_count);
    return httpRespond.authRespond(res, {
      status: true,
      items: cart.items
    });
  });

  app.post("/api/add_card/", async (req, res) => {
    try {
      const client = await Client.findOne({
        _id: req.body.clientId
      });

      await stripe.customers.createSource(client.stripeId, {
        source: req.body.tokenId
      });

      const cards = await stripe.customers.listSources(client.stripeId);

      return httpRespond.authRespond(res, {
        status: true,
        cards
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/api/charge_card/", async (req, res) => {
    try {
      const {
        cardId,
        cartId,
        partner_phone_number,
        client_phone_number,
        subTotal,
        total,
        comfort_fee,
        bookingDate,
        bookingTime,
        stripeId,
        client_name,
        partner_name
      } = req.body.chargeCardData;

      const newDate = moment(new Date(bookingDate)).format("MMM DD, YYYY");
      //charge card
      let amount = Math.round(parseFloat(total) * 100);
      const charge = await stripe.charges.create({
        amount: amount,
        currency: "usd",
        customer: stripeId,
        source: cardId
      });

      //dateTime calculation
      let input = bookingTime,
        matches = input.toLowerCase().match(/(\d{1,2}):(\d{2}) ([ap]m)/),
        outputTime =
          parseInt(matches[1]) +
          (matches[3] == "pm" ? 12 : 0) +
          ":" +
          matches[2] +
          ":00";
      let dateTime = new Date(bookingDate + " " + outputTime);
      let MS_PER_MINUTE = 60000;
      let oneHourBefore = new Date(dateTime - 60 * MS_PER_MINUTE);
      let thirtyMinuteBefore = new Date(dateTime - 30 * MS_PER_MINUTE);
      //end date time calculation
      //update cart
      const cart = await Cart.findOne({
        _id: cartId
      });
      cart.hasCheckedout = true;
      cart.subTotal = subTotal;
      cart.total = total;
      cart.booking_date = bookingDate;
      cart.booking_time = bookingTime;
      cart.stripe_charge_id = charge.id;
      cart.comfort_fee = comfort_fee;
      cart.save();

      // send message to partner
      messageBody = `Appointment confirmation for ${client_name} on ${newDate} at ${bookingTime}. This message is to confirm that ${client_name} has just booked an appointment with you. iBeautyConnect`;
      smsFunctions.sendSMS(req, res, partner_phone_number, messageBody);

      // scheduling
      let j_one_hour_before = schedule.scheduleJob(
        cartId + "oneHourBefore",
        oneHourBefore,
        function() {
          let partnerMessage = `Appointment reminder. This is a quick reminder of your appointment with ${client_name} on ${newDate} at ${bookingTime}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
          let clientMessage = `Appointment reminder. This is a quick reminder of your appointment with ${partner_name} on ${newDate} at ${bookingTime}. Do not forget to check in through the app thanks iBeautyConnect`;
          smsFunctions.sendSMS(req, res, partner_phone_number, partnerMessage);
          smsFunctions.sendSMS(req, res, client_phone_number, clientMessage);
        }
      );
      let j_30_minute_before = schedule.scheduleJob(
        cartId + "thirtyMinuteBefore",
        thirtyMinuteBefore,
        function() {
          let partnerMessage = `Appointment reminder. This is a quick reminder of your appointment with ${client_name} on ${newDate} at ${bookingTime}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
          let clientMessage = `Appointment reminder. This is a quick reminder of your appointment with ${partner_name} on ${newDate} at ${bookingTime}.  Do not forget to check in through the app thanks iBeautyConnect`;
          smsFunctions.sendSMS(req, res, partner_phone_number, partnerMessage);
          smsFunctions.sendSMS(req, res, client_phone_number, clientMessage);
        }
      );
      //return back to user
      return httpRespond.authRespond(res, {
        status: true
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
        message: e.message
      });
    }
  });
};
