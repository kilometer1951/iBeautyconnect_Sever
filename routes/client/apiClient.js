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

  app.post("/api/cancel_appoitment/", async (req, res) => {
    try {
      const {
        cartId,
        partner_stripe_id,
        partnerId,
        partnerPhone,
        stripe_charge_id,
        total,
        booking_date,
        booking_time
      } = req.body.cancelAppoitmentData;

      const stripeFees = parseFloat(total) * 0.029 + 0.3;
      const total_left_after_after_stripe = parseFloat(total) - stripeFees;
      const ibeauty_connect_takes = total_left_after_after_stripe * 0.17;
      const partner_takes = total_left_after_after_stripe * 0.5;

      const client_refund =
        parseFloat(total) -
        (parseFloat(stripeFees) +
          parseFloat(ibeauty_connect_takes) +
          parseFloat(partner_takes));

      const amount_to_refund = Math.round(parseFloat(client_refund) * 100);
      const amount_to_transfer = Math.round(parseFloat(partner_takes) * 100);

      //  split payment
      //  .1 refund client
      const refund = await stripe.refunds.create({
        charge: stripe_charge_id,
        amount: amount_to_refund
      });

      //.2 transfer money to connect account
      const transfer = await stripe.transfers.create({
        amount: amount_to_transfer,
        currency: "usd",
        source_transaction: stripe_charge_id,
        destination: partner_stripe_id
      });
      //update cart
      const cart = await Cart.findOne({
        _id: cartId
      });
      cart.hasCanceled = true;
      cart.iBeautyConnect_cancellation_fee_received = ibeauty_connect_takes.toFixed(
        2
      );
      cart.partner_cancellation_fee_received = partner_takes;
      cart.client_cancellation_fee_received = client_refund;
      cart.stripe_refund_id = refund.id;
      cart.stripe_transfer_id = transfer.id;
      cart.save();
      //send sms
      const newDate = moment(new Date(booking_date)).format("MMM DD, YYYY");
      let message =
        "Looks like your client for " +
        newDate +
        " at " +
        booking_time +
        " has cancelled their appoitment. The good news is you got paid a cancellation fee of $" +
        partner_takes +
        ". Thanks for using iBeautyConnect";
      smsFunctions.sendSMS("req", "res", msg.partnerPhone, message);

      return httpRespond.authRespond(res, {
        status: true
      });
    } catch (e) {
      console.log(e);
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
        source: cardId,
        transfer_group: cartId
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
      let thirtyMinuteBefore = new Date(dateTime - 30 * MS_PER_MINUTE);
      let tenMinuteBefore = new Date(dateTime - 10 * MS_PER_MINUTE);
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

      let j_30_minute_before = schedule.scheduleJob(
        cartId + "thirtyMinuteBefore",
        thirtyMinuteBefore,
        function() {
          if (!cart.hasRescheduled || !cart.hasCanceled) {
            let partnerMessage = `Appointment reminder. This is a quick reminder of your appointment with ${client_name} on ${newDate} at ${bookingTime}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
            let clientMessage = `Appointment reminder. This is a quick reminder of your appointment with ${partner_name} on ${newDate} at ${bookingTime}. Do not forget to check in through the app thanks iBeautyConnect`;
            smsFunctions.sendSMS(
              req,
              res,
              partner_phone_number,
              partnerMessage
            );
            smsFunctions.sendSMS(req, res, client_phone_number, clientMessage);
          }
        }
      );

      let j_10_minute_before = schedule.scheduleJob(
        cartId + "tenMinuteBefore",
        tenMinuteBefore,
        function() {
          if (!cart.hasRescheduled || !cart.hasCanceled) {
            let partnerMessage = `Appointment reminder. This is a quick reminder of your appointment with ${client_name} on ${newDate} at ${bookingTime}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
            let clientMessage = `Appointment reminder. This is a quick reminder of your appointment with ${partner_name} on ${newDate} at ${bookingTime}. Do not forget to check in through the app thanks iBeautyConnect`;
            smsFunctions.sendSMS(
              req,
              res,
              partner_phone_number,
              partnerMessage
            );
            smsFunctions.sendSMS(req, res, client_phone_number, clientMessage);
          }
        }
      );

      let job = schedule.scheduleJob(cartId + "job", dateTime, function() {
        if (!cart.hasRescheduled || !cart.hasCanceled) {
          let partnerMessage = `Appointment reminder. It's time for your appointment with ${client_name}. Do not forget to tell your client to check in through the app thanks iBeautyConnect`;
          let clientMessage = `Appointment reminder. It's time for your appointment with ${partner_name}. Open the iBeautyConnect app to checkin iBeautyConnectClient://appointment_checkin`;
          smsFunctions.sendSMS(req, res, partner_phone_number, partnerMessage);
          smsFunctions.sendSMS(req, res, client_phone_number, clientMessage);
        }
      });
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
