const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const Partner = mongoose.model("partners");
const Cart = mongoose.model("carts");
const Message = mongoose.model("messages");
const stripe = require("stripe")("sk_live_FsieDnf5IJFj2D28Wtm3OFv3");
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
  cloud_name: "ibc",
  api_key: "887482388487867",
  api_secret: "IDtj1fdfnQNJV-BTQ0mgfGOIIgU"
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

  app.get("/api/get_points_partner/:partnerId", async (req, res) => {
    try {
      const response = await Partner.findOne({ _id: req.params.partnerId });

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
    //  fName: { $ne: "Shamecka" }
    try {
      const partnerCount = await Partner.find({
        isApproved: true
      }).countDocuments();
      const partners = await Partner.aggregate([
        {
          $match: {
            isApproved: true,
            hasGoneThroughFinalScreen: true,
            email: { $ne: "review_team@ibeautyconnect.com" }
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
            email: { $ne: "review_team@ibeautyconnect.com" },
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
      console.log(cards);

      return httpRespond.authRespond(res, {
        status: true,
        cards
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/api/update_cutomer_stripe_email/", async (req, res) => {
    try {
      const respond = await stripe.customers.update(req.body.stripeId, {
        email: req.body.update_email,
        description: "Customer for: " + req.body.update_email
      });

      const user = await Client.findOne({ stripeId: req.body.stripeId });
      user.email = req.body.update_email;
      user.save();

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
        const stripeFees = (parseFloat(total) * 0.029 + 0.3).toFixed(2);
        //const new_total = (total - parseFloat(stripeFees)).toFixed(2);
        const ibeauty_connect_takes = (parseFloat(total) * 0.168).toFixed(2);
        const partner_takes = (parseFloat(total) * 0.5).toFixed(2);

        const client_refund = (
          total -
          (parseFloat(stripeFees) +
            parseFloat(ibeauty_connect_takes) +
            parseFloat(partner_takes))
        ).toFixed(2);

        // console.log(partner_takes);
        // console.log(ibeauty_connect_takes);
        // console.log(client_refund);
        // console.log(stripeFees);

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

        let newCheckInDate = moment(new Date()).format("YYYY-MM-DD");
        let dateCheckedIn = new Date(newCheckInDate + "" + "T06:00:00.000Z");

        cart.hasCanceled = true;
        cart.cancelledBy = "client";
        cart.ibeauty_connect_takes = ibeauty_connect_takes;
        cart.partner_takes = partner_takes;
        cart.stripe_takes = stripeFees;
        cart.client_cancellation_fee_received = client_refund;
        cart.stripe_refund_id = refund.id;
        cart.stripe_transfer_id = transfer.id;
        cart.dateCheckedIn = dateCheckedIn;
        cart.dateTimeCheckedIn = new Date();
        cart.orderIsComplete = true;
        cart.save();
        //send sms
        const newDate = moment(new Date(booking_date)).format("MMM DD, YYYY");
        let message =
          "Looks like your client for " +
          newDate +
          " at " +
          booking_time +
          " has cancelled their appointment. The good news is, you got paid a cancellation fee of $" +
          partner_takes +
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

  app.post("/api/charge_card_one_time_payment/", async (req, res) => {
    try {
      const {
        tokenId,
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
        source: tokenId,
        transfer_group: cartId,
        description:
          "Payment for Health and Beauty services to: " + partner_name,
        statement_descriptor: "iBeautyConnect"
      });

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
        transfer_group: cartId,
        description:
          "Payment for Health and Beauty services to: " + partner_name,
        statement_descriptor: "iBeautyConnect"
      });

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

  app.post("/api/reSchedule_partner", async (req, res) => {
    try {
      const {
        cartId,
        partnerId,
        booking_date,
        booking_time,
        client_name,
        clientPhone,
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
        messageBody = `Hi, one of your appoitment has been updated from ${moment(
          new Date(booking_date)
        ).format("MMM DD, YYYY")} at ${booking_time} To ${moment(
          new Date(new_booking_date)
        ).format("MMM DD, YYYY")} at ${new_booking_time}.`;

        smsFunctions.sendSMS("req", "res", clientPhone, messageBody);

        //update cart with new date and time
        cart.booking_date = new_booking_date;
        cart.booking_time = new_booking_time;
        cart.save();

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
        const stripeFees = (parseFloat(total) * 0.029 + 0.3).toFixed(2);
        //const new_total = (total - parseFloat(stripeFees)).toFixed(2);
        const ibeauty_connect_takes = (parseFloat(total) * 0.168).toFixed(2);
        const partner_takes = (parseFloat(total) * 0.5).toFixed(2);

        const client_refund = (
          total -
          (parseFloat(stripeFees) +
            parseFloat(ibeauty_connect_takes) +
            parseFloat(partner_takes))
        ).toFixed(2);

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

        let newCheckInDate = moment(new Date()).format("YYYY-MM-DD");
        let dateCheckedIn = new Date(newCheckInDate + "" + "T06:00:00.000Z");

        cart.noShow = true;
        cart.hasCanceled = true;
        cart.cancelledBy = "partner";
        cart.ibeauty_connect_takes = ibeauty_connect_takes;
        cart.partner_takes = partner_takes;
        cart.stripe_takes = stripeFees;
        cart.client_cancellation_fee_received = client_refund;
        cart.stripe_refund_id = refund.id;
        cart.stripe_transfer_id = transfer.id;
        cart.dateCheckedIn = dateCheckedIn;
        cart.dateTimeCheckedIn = new Date();
        cart.orderIsComplete = true;
        cart.save();
        //send sms
        const newDate = moment(new Date(booking_date)).format("MMM DD, YYYY");
        let message =
          "No-show payment confirmation for " +
          newDate +
          " at " +
          booking_time +
          ".You got paid a no show fee of $" +
          partner_takes +
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
