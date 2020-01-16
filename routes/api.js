const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const Partner = mongoose.model("partners");
const Cart = mongoose.model("carts");
const Message = mongoose.model("messages");
const Rate = mongoose.model("rates");

const Country = mongoose.model("countries");
const State = mongoose.model("states");
const City = mongoose.model("cities");

const httpRespond = require("../functions/httpRespond");
const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");

module.exports = app => {
  app.get(
    "/api/check_cart/:clientId/:partnerId/:serviceId",
    async (req, res) => {
      const cart = await Cart.findOne({
        client: req.params.clientId,
        partner: req.params.partnerId,
        hasCheckedout: false
      });

      if (cart !== null) {
        let data = cart.items.filter(function(value) {
          return value.services._id == req.params.serviceId;
        });

        return httpRespond.authRespond(res, {
          status: true,
          item_exist: data.length !== 0 ? true : false,
          message: data.length !== 0 ? "item exist" : "item does not exist"
        });
      }
      return httpRespond.authRespond(res, {
        status: true,
        item_exist: false,
        message: "item does not exist"
      });
    }
  );

  app.get("/api/get_reviews/:clientId/:partnerId", async (req, res) => {
    try {
      const fiveStar = await Rate.find({
        partner: mongoose.Types.ObjectId(req.params.partnerId),
        rateNumber: 5
      }).countDocuments();
      const fourStar = await Rate.find({
        partner: mongoose.Types.ObjectId(req.params.partnerId),
        rateNumber: 4
      }).countDocuments();
      const threeStar = await Rate.find({
        partner: mongoose.Types.ObjectId(req.params.partnerId),
        rateNumber: 3
      }).countDocuments();

      const twoStar = await Rate.find({
        partner: mongoose.Types.ObjectId(req.params.partnerId),
        rateNumber: 2
      }).countDocuments();

      const oneStar = await Rate.find({
        partner: mongoose.Types.ObjectId(req.params.partnerId),
        rateNumber: 1
      }).countDocuments();

      const reviews = await Rate.aggregate([
        {
          $match: {
            partner: mongoose.Types.ObjectId(req.params.partnerId),
            //  client: { $ne: mongoose.Types.ObjectId(req.params.clientId) },
            rateNumber: 5
          }
        },
        { $sample: { size: 10 } },
        {
          $lookup: {
            from: "clients",
            localField: "client",
            foreignField: "_id",
            as: "client"
          }
        }
      ]);

      const totalRating = (
        (5 * fiveStar +
          4 * fourStar +
          3 * threeStar +
          2 * twoStar +
          1 * oneStar) /
        (fiveStar + fourStar + threeStar + twoStar + oneStar)
      ).toFixed(2);

      return httpRespond.authRespond(res, {
        status: true,
        reviews,
        totalRating
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.get("/api/cart_count/:clientId/", async (req, res) => {
    const cart_count = await Cart.find({
      client: req.params.clientId,
      hasCheckedout: false
    }).countDocuments();
    //console.log(cart_count);
    return httpRespond.authRespond(res, {
      status: cart_count !== 0 ? true : false
    });
  });

  app.get("/api/appointment_count/:clientId/", async (req, res) => {
    const appointment_count = await Cart.find({
      client: req.params.clientId,
      hasCheckedout: true,
      orderIsComplete: false,
      hasCanceled: false
    }).countDocuments();
    //console.log(cart_count);
    return httpRespond.authRespond(res, {
      status: appointment_count !== 0 ? true : false
    });
  });

  app.get("/api/query_agenda_by_date/:clientId/:dateTime", async (req, res) => {
    const appointments = await Cart.find({
      client: req.params.clientId,
      hasCheckedout: true,
      orderIsComplete: false,
      hasCanceled: false,
      booking_date: new Date(req.params.dateTime)
    })
      .populate("client")
      .populate("partner")
      .sort({ booking_date: -1 });

    return httpRespond.authRespond(res, {
      status: true,
      appointments
    });
  });

  app.get("/api/cart_regular/:clientId/", async (req, res) => {
    try {
      const cart = await Cart.find({
        client: req.params.clientId,
        type_of_cart: "regular",
        hasCheckedout: false
      }).populate("partner");

      return httpRespond.authRespond(res, {
        status: true,
        cart
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.get("/api/order_again/:clientId/", async (req, res) => {
    try {
      const cart = await Cart.find({
        client: req.params.clientId,
        hasCheckedout: true,
        orderIsComplete: true
      }).populate("partner");

      return httpRespond.authRespond(res, {
        status: true,
        cart
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.post("/api/add_to_cart", async (req, res) => {
    try {
      const cartExist = await Cart.findOne({
        client: req.body.clientId,
        partner: req.body.partnerId,
        type_of_cart: "regular",
        hasCheckedout: false
      });
      const services = req.body.services;
      const newCart = {
        client: req.body.clientId,
        partner: req.body.partnerId,
        items: { services }
      };

      if (cartExist) {
        //  update cart
        const cart = await Cart.update(
          { _id: cartExist._id },
          { $push: { items: { services } } }
        );
        return httpRespond.authRespond(res, {
          status: true
        });
      } else {
        //new cart
        const cart = await new Cart(newCart).save();
        return httpRespond.authRespond(res, {
          status: true
        });
      }
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: true,
        message: e
      });
    }
  });

  app.post("/api/delete_cart_item", async (req, res) => {
    const updated = await Cart.update(
      {
        _id: req.body.cartId,
        hasCheckedout: false
      },
      {
        $pull: {
          items: {
            _id: req.body.itemID
          }
        }
      },

      {
        multi: true
      }
    );

    const cart = await Cart.findOne({
      _id: req.body.cartId,
      hasCheckedout: false
    });

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: req.body.cartId, hasCheckedout: false });
    }
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/api/check_in_location", async (req, res) => {
    const cart = await Cart.findOne({
      _id: req.body.cartId
    });
    cart.client_check_in_location = req.body.location;
    cart.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/api/update_cart_check_in", async (req, res) => {
    try {
      const {
        cartId,
        partner_stripe_id,
        partnerId,
        partnerPhone,
        stripe_charge_id,
        today,
        total,
        booking_date,
        booking_time,
        clientId
      } = req.body.checkInData;

      const stripeFees = parseFloat(total) * 0.029 + 0.3;
      const partner_takes = Math.round(parseFloat(total) * 0.8);
      const ibeauty_connect_takes =
        parseFloat(total) - partner_takes - stripeFees;

      const amount_to_transfer = Math.round(parseFloat(partner_takes) * 100);

      const transfer = await stripe.transfers.create({
        amount: amount_to_transfer,
        currency: "usd",
        source_transaction: stripe_charge_id,
        destination: partner_stripe_id
      });

      const cart = await Cart.findOne({
        _id: cartId
      });
      cart.ibeauty_connect_takes = ibeauty_connect_takes.toFixed(2);
      cart.stripe_takes = stripeFees.toFixed(2);
      cart.partner_takes = partner_takes.toFixed(2);
      cart.stripe_transfer_id = transfer.id;
      cart.dateCheckedIn = today;
      cart.orderIsComplete = true;
      cart.save();

      //update messages by removing from list
      const message = await Message.findOne({
        client: clientId,
        partner: partnerId,
        deleted: false
      });
      if (message) {
        message.deleted = true;
        message.save();
      }

      //send notificiation to user to be done

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

  app.get("/api/messages/:clientId", async (req, res) => {
    const messages = await Message.find({
      client: req.params.clientId,
      deleted: false
    })
      .populate("client")
      .populate("partner")
      .sort({ dateModified: -1 });

    return httpRespond.authRespond(res, {
      status: true,
      messages
    });
  });
  app.get("/api/conversations/:messageId", async (req, res) => {
    const messages = await Message.findOne({
      _id: req.params.messageId,
      deleted: false
    })
      .populate("client")
      .populate("partner");

    return httpRespond.authRespond(res, {
      status: true,
      conversations: messages.message_data,
      allConversationsData: messages
    });
  });
  app.get("/api/appointments_client/:clientId", async (req, res) => {
    const appointments = await Cart.find({
      client: req.params.clientId,
      hasCheckedout: true,
      orderIsComplete: false,
      hasCanceled: false
    })
      .populate("client")
      .populate("partner")
      .sort({ booking_date: -1 });

    return httpRespond.authRespond(res, {
      status: true,
      appointments
    });
  });

  app.post("/api/add_rating", async (req, res) => {
    try {
      const {
        partnerId,
        clientId,
        comment,
        rateNumber,
        cartId
      } = req.body.rateData;
      newReview = {
        partner: partnerId,
        client: clientId,
        comment: comment,
        rateNumber: rateNumber,
        cart: cartId
      };
      const r = await new Rate(newReview).save();
      console.log(r);
      return httpRespond.authRespond(res, {
        status: true
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/api/country", async (req, res) => {
    try {
      const country = await new Country({ country: req.body.country }).save();
      return httpRespond.authRespond(res, {
        status: true,
        country
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });
  app.post("/api/state", async (req, res) => {
    try {
      const state = await new State({
        state: req.body.state,
        country: req.body.country
      }).save();
      return httpRespond.authRespond(res, {
        status: true,
        state
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });
  app.post("/api/city", async (req, res) => {
    try {
      const city = await new City({
        city: req.body.city,
        state: req.body.state
      }).save();
      return httpRespond.authRespond(res, {
        status: true,
        city
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });
  app.get("/api/states", async (req, res) => {
    try {
      const states = await State.find({});
      return httpRespond.authRespond(res, {
        status: true,
        states
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });
  app.get("/api/cities/:searchByState", async (req, res) => {
    try {
      const cities = await City.find({ state: req.params.searchByState });
      return httpRespond.authRespond(res, {
        status: true,
        cities
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/api/new_message/", async (req, res) => {
    try {
      //save message
      const message = await Message.findOne({
        client: req.body.messageData.clientId,
        partner: req.body.messageData.partnerId,
        deleted: false
      });

      if (req.body.messageData.type == "reschedule") {
        //send sms
        messageBody =
          req.body.messageData.message +
          ". Open the iBeautyConnect app to respond to your clients request. iBeautyConnectPartner://messages thanks.";
        smsFunctions.sendSMS(
          "req",
          "res",
          req.body.messageData.partnerPhone,
          messageBody
        );
      }

      if (message) {
        //update message
        message.recentMesage = req.body.messageData.message;
        if (req.body.messageData.to == req.body.messageData.partnerId) {
          message.partnerHasViewed = false;
          message.clientHasViewMessage = true;
        } else {
          message.clientHasViewMessage = false;
          message.partnerHasViewed = true;
        }
        message.dateModified = new Date();
        message.save();
        const update_message = {
          message: req.body.messageData.message,
          to: req.body.messageData.to,
          from: req.body.messageData.from
        };
        await Message.update(
          { _id: message._id },
          {
            $push: {
              message_data: update_message
            }
          }
        );
      } else {
        newMessage = {
          client: req.body.messageData.clientId,
          partner: req.body.messageData.partnerId,
          recentMesage: req.body.messageData.message,
          message_data: {
            message: req.body.messageData.message,
            to: req.body.messageData.to,
            from: req.body.messageData.from
          }
        };
        new Message(newMessage).save();
      }
      return httpRespond.authRespond(res, {
        status: true
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });
};

//side note

//
// const percentage = 0.168 + 0.029;
// const totalPercentage_plus_30cents = parseFloat(
//   (percentage * 100).toFixed(2)
// );
// const totalPercentage = totalPercentage_plus_30cents + 0.3;
// console.log(totalPercentage / 100);
