const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const Partner = mongoose.model("partners");
const Cart = mongoose.model("carts");
const Message = mongoose.model("messages");
const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");
const moment = require("moment");
const schedule = require("node-schedule");

let messageBody = "";
const httpRespond = require("../../functions/httpRespond");
const smsFunctions = require("../../functions/SMS");

const multer = require("multer");
const storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
const upload = multer({
  storage: storage,
  limits: { fieldSize: 25 * 1024 * 1024 }
});

const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: "ibeautyconnect",
  api_key: "678214445386768",
  api_secret: "R5OQpKQ93luFxI7lVXZZ_nsUUsk"
});

module.exports = app => {
  app.get("/api/get_points/:clientId", async (req, res) => {
    try {
      const response = await Client.findOne({ _id: req.params.clientId });

      return httpRespond.authRespond(res, {
        status: true,
        points: response.points
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.get("/api_client/loadAllPartners", async (req, res) => {
    try {
      const partnerCount = await Partner.find({
        isApproved: true
      }).countDocuments();
      const partners = await Partner.aggregate([
        {
          $match: {
            isApproved: true,
            hasGoneThroughFinalScreen: true
          }
        },
        { $sample: { size: partnerCount } }
      ]);

      return httpRespond.authRespond(res, {
        status: true,
        partners
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.get("/api_client/loadCustomSearch/:clientId", async (req, res) => {
    try {
      const client = await Client.findOne({ _id: req.params.clientId });

      const partners = await Partner.aggregate([
        {
          $match: {
            isApproved: true,
            hasGoneThroughFinalScreen: true,
            locationCity: { $regex: client.searchByCity },
            locationState: { $regex: client.searchByState },
            profession: { $regex: client.searchByProfession }
          }
        }, // filter the results
        { $sample: { size: 20 } }
      ]);

      if (partners.length === 0) {
        //return all partners
        const partnerCount = await Partner.find({
          isApproved: true
        }).countDocuments();
        const partners = await Partner.aggregate([
          {
            $match: {
              isApproved: true,
              hasGoneThroughFinalScreen: true
            }
          },
          { $sample: { size: partnerCount } }
        ]);
        return httpRespond.authRespond(res, {
          status: true,
          partners
        });
      }

      return httpRespond.authRespond(res, {
        status: true,
        partners
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/api/filter_professionals", async (req, res) => {
    try {
      const client = await Client.findOne({ _id: req.body.clientId });
      const partners = await Partner.aggregate([
        {
          $match: {
            locationCity: { $regex: req.body.searchByCity },
            locationState: { $regex: req.body.searchByState },
            profession: { $regex: req.body.searchByProfession }
          }
        }, // filter the results
        { $sample: { size: 20 } }
      ]);

      console.log(partners.length);

      //update back end for client search
      if (partners.length !== 0) {
        //update search
        client.searchByCity = req.body.searchByCity;
        client.searchByState = req.body.searchByState;
        client.searchByProfession = req.body.searchByProfession;
        client.search = "custom";
        client.save();
      }

      //  res.send(partners);

      return httpRespond.authRespond(res, {
        status: true,
        partners,
        hasPartners: partners.length === 0 ? false : true
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
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

  app.post("/api/update_has_viewed_intro_screen", async (req, res) => {
    const client = await Client.findOne({
      _id: req.body.userId
    });

    client.hasViewedIntroModal = true;
    client.save();

    return httpRespond.authRespond(res, {
      status: true
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
        clientId,
        cartId,
        partner_stripe_id,
        partnerId,
        partnerPhone,
        stripe_charge_id,
        total,
        booking_date,
        booking_time
      } = req.body.cancelAppoitmentData;

      const cart = await Cart.findOne({
        _id: cartId,
        orderIsComplete: false
      });

      if (cart) {
        const stripeFees = parseFloat(total) * 0.029 + 0.3;

        const partner_takes = parseFloat(total) * 0.5;

        const client_refund = parseFloat(total) * 0.3;

        const ibeauty_connect_takes =
          parseFloat(total) - (client_refund + partner_takes) - stripeFees;

        const amount_to_refund = Math.round(parseFloat(client_refund) * 100);
        const amount_to_transfer = Math.round(parseFloat(partner_takes) * 100);

        //   split payment
        //    .1 refund client
        const refund = await stripe.refunds.create({
          charge: stripe_charge_id,
          amount: amount_to_refund
        });

        // //.2 transfer money to connect account
        const transfer = await stripe.transfers.create({
          amount: amount_to_transfer,
          currency: "usd",
          source_transaction: stripe_charge_id,
          destination: partner_stripe_id
        });
        //update cart

        cart.hasCanceled = true;
        cart.ibeauty_connect_takes = ibeauty_connect_takes.toFixed(2);
        cart.partner_takes = partner_takes.toFixed(2);
        cart.client_cancellation_fee_received = client_refund.toFixed(2);
        cart.stripe_refund_id = refund.id;
        cart.stripe_transfer_id = transfer.id;
        cart.orderIsComplete = true;
        cart.save();
        //send sms
        const newDate = moment(new Date(booking_date)).format("MMM DD, YYYY");
        let message =
          "Looks like your client for " +
          newDate +
          " at " +
          booking_time +
          " has cancelled their appoitment. The good news is, you got paid a cancellation fee of $" +
          partner_takes.toFixed(2) +
          ". Thanks for using iBeautyConnect";
        smsFunctions.sendSMS("req", "res", partnerPhone, message);

        //update messages by removing from list
        const updatedMessage = await Message.findOne({
          client: clientId,
          partner: partnerId,
          deleted: false
        });
        if (updatedMessage) {
          updatedMessage.deleted = true;
          updatedMessage.save();
        }

        return httpRespond.authRespond(res, {
          status: true
        });
      } else {
        return httpRespond.authRespond(res, {
          status: false
        });
      }
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
        partner_name,
        comfortFeeAddress
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
      cart.comfortFeeAddress = comfortFeeAddress;
      cart.save();

      if (comfortFeeAddress === "") {
        // send message to partner
        messageBody = `Appointment confirmation for ${client_name} on ${newDate} at ${bookingTime}. This message is to confirm that ${client_name} has just booked an appointment with you. iBeautyConnect`;
      } else {
        messageBody = `Appointment confirmation for ${client_name} on ${newDate} at ${bookingTime}. This message is to confirm that ${client_name} has just booked an appointment with you. This is a comfort request that means you have to go to your client. Their address is ${comfortFeeAddress} thanks. iBeautyConnect`;
      }

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

      let job = schedule.scheduleJob(dateTime, function() {
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

  app.post(
    "/api/edit_client_photo/:clientId",
    upload.single("photo"),
    async (req, res) => {
      try {
        const client = await Client.findOne({ _id: req.params.clientId });

        if (client.cloudinaryId === "") {
          //new upload
          const response = await cloudinary.uploader.upload(req.file.path);
          client.profilePhoto = response.url;
          client.cloudinaryId = response.public_id;
          client.save();
        } else {
          //delete old photo and upload new photo
          await cloudinary.v2.uploader.destroy(client.cloudinaryId);
          // //upload new photo
          const response = await cloudinary.uploader.upload(req.file.path);
          client.profilePhoto = response.url;
          client.cloudinaryId = response.public_id;
          client.save();
        }

        return httpRespond.authRespond(res, {
          status: true,
          message: "upload complete"
        });
      } catch (e) {
        console.log(e);
        return httpRespond.authRespond(res, {
          status: false,
          message: e
        });
      }
    }
  );

  app.post("/api/reSchedule", async (req, res) => {
    try {
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
      } = req.body.reScheduleData;

      const cart = await Cart.findOne({
        _id: cartId,
        orderIsComplete: false
      });

      if (cart) {
        const newDate = moment(new Date(req.body.bookingDate)).format(
          "MMM DD, YYYY"
        );
        const new_booking_date = req.body.bookingDate;
        const new_booking_time = req.body.bookingTime;

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

        return httpRespond.authRespond(res, {
          status: true
        });
      } else {
        return httpRespond.authRespond(res, {
          status: false
        });
      }
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.post("/api/confirm_no_show/", async (req, res) => {
    try {
      const {
        clientId,
        cartId,
        partner_stripe_id,
        partnerId,
        partnerPhone,
        clientPhone,
        stripe_charge_id,
        total,
        booking_date,
        booking_time
      } = req.body.noShowAppoitmentData;

      const cart = await Cart.findOne({
        _id: cartId,
        orderIsComplete: false
      });

      if (cart) {
        const stripeFees = parseFloat(total) * 0.029 + 0.3;
        const partner_takes = parseFloat(total) * 0.5;
        const client_refund = parseFloat(total) * 0.3;
        const ibeauty_connect_takes =
          parseFloat(total) - (client_refund + partner_takes) - stripeFees;

        const amount_to_refund = Math.round(parseFloat(client_refund) * 100);
        const amount_to_transfer = Math.round(parseFloat(partner_takes) * 100);

        //   split payment
        //    .1 refund client
        const refund = await stripe.refunds.create({
          charge: stripe_charge_id,
          amount: amount_to_refund
        });

        // //.2 transfer money to connect account
        const transfer = await stripe.transfers.create({
          amount: amount_to_transfer,
          currency: "usd",
          source_transaction: stripe_charge_id,
          destination: partner_stripe_id
        });

        //update cart

        cart.noShow = true;
        cart.ibeauty_connect_takes = ibeauty_connect_takes.toFixed(2);
        cart.partner_takes = partner_takes.toFixed(2);
        cart.client_cancellation_fee_received = client_refund.toFixed(2);
        cart.stripe_refund_id = refund.id;
        cart.stripe_transfer_id = transfer.id;
        cart.orderIsComplete = true;
        cart.save();
        //send sms
        const newDate = moment(new Date(booking_date)).format("MMM DD, YYYY");
        let message =
          "No show payment confirmation for " +
          newDate +
          " at " +
          booking_time +
          ".You got paid a no show fee of $" +
          partner_takes.toFixed(2) +
          ". Thanks for using iBeautyConnect";
        smsFunctions.sendSMS("req", "res", partnerPhone, message);
        let clientMessage =
          "No show for " +
          newDate +
          " at " +
          booking_time +
          ". Thanks for using iBeautyConnect";
        smsFunctions.sendSMS("req", "res", clientPhone, clientMessage);

        //update messages by removing from list
        const updatedMessage = await Message.findOne({
          client: clientId,
          partner: partnerId,
          deleted: false
        });
        if (updatedMessage) {
          updatedMessage.deleted = true;
          updatedMessage.save();
        }

        return httpRespond.authRespond(res, {
          status: true
        });
      } else {
        return httpRespond.authRespond(res, {
          status: false
        });
      }
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });
};
