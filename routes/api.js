const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const Partner = mongoose.model("partners");
const Cart = mongoose.model("carts");
const Message = mongoose.model("messages");
const Rate = mongoose.model("rates");

const Country = mongoose.model("countries");
const State = mongoose.model("states");
const City = mongoose.model("cities");
const Support = mongoose.model("supports");
const Moment = require("moment");
var path = require("path");

const config = require("../config/secret");
const httpRespond = require("../functions/httpRespond");
const stripe = require("stripe")("sk_live_FsieDnf5IJFj2D28Wtm3OFv3");

const smsFunctions = require("../functions/SMS");
let messageBody = "";

let apn = require("apn");

//ss
// // sandbox or production APN service
// const apnProduction = process.env.NODE_ENV === "production" ? true : false;
//
// // configuring APN with credentials
// const apnOptions = {
//   token: {
//     key: path.join(__dirname, "..", "certs", "AuthKey_HP5C6549F2.p8"),
//     keyId: config.PushNotificationKEYID,
//     teamId: config.AppleTeamID
//   },
//   production: apnProduction
// };

//var apnProvider = new apn.Provider(apnOptions);

module.exports = app => {
  // app.get("/api/send_notification/:clientId", async (req, res) => {
  //   try {
  //     const client = await Client.findOne({ _id: req.params.clientId });
  //     const deviceTokens = client.deviceToken;
  //     let notification = new apn.Notification({
  //       alert: {
  //         title: "Hello World",
  //         body: "Hello world body"
  //       },
  //       topic: "com.org.appName",
  //       payload: {
  //         sender: "node-apn"
  //       },
  //       pushType: "background"
  //     });
  //
  //     apnProvider.send(notification, deviceTokens).then(response => {
  //       console.log(response.sent);
  //       console.log(response.failed);
  //     });
  //     return httpRespond.authRespond(res, {
  //       status: true
  //     });
  //   } catch (e) {
  //     console.log(e);
  //     return httpRespond.authRespond(res, {
  //       status: false
  //     });
  //   }
  // });

  // app.post("/api/testN/", async (req, res) => {
  //   let provider = new apn.Provider({
  //     token: {
  //       key: f,
  //       keyId: "key-id",
  //       teamId: "TRBNA383H2"
  //     },
  //     production: false
  //   });
  //
  //   let deviceTokens = [
  //     "86eaacdfa8889588522cdff826b4afcad40ae68242e2e6973fcea52008ffc1ee"
  //   ];
  //
  //   let notification = new apn.Notification();
  //   notification.alert = "Hello, world!";
  //   notification.badge = 1;
  //   notification.topic = "io.github.node-apn.test-app";
  //
  //   apn.Provider.send(notification, deviceTokens).then(response => {
  //     console.log(deviceTokens);
  //   });
  // });

  app.post("/api/send_reminder/", async (req, res) => {
    const {
      cartId,
      clientPhone,
      booking_date,
      booking_time,
      partner_name
    } = req.body.reminderData;
    const cart = await Cart.findOne({
      _id: cartId
    });

    if (cart) {
      const newDate = Moment(new Date(booking_date)).format("MMM DD, YYYY");
      let clientMessage =
        "Just a friendly reminder about your appoitment with " +
        partner_name +
        " on " +
        newDate +
        " at " +
        booking_time +
        ". Thanks for using iBeautyConnect";
      smsFunctions.sendSMS("req", "res", clientPhone, clientMessage);

      return httpRespond.authRespond(res, {
        status: true
      });
    } else {
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.get("/api/get_earnings/:userId/:stripeAccountId", async (req, res) => {
    const earnings = {};
    let curr = new Date(); // get current date
    let first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
    let last = first + 6; // last day is the first day + 6

    const firstDayOfWeek = Moment(
      new Date(curr.setDate(first)),
      "DD-MM-YYYY"
    ).add(1, "day");
    const lastDayOfWeek = Moment(
      new Date(curr.setDate(last)),
      "DD-MM-YYYY"
    ).add(1, "day");

    const startOfWeek = Moment(firstDayOfWeek).format();
    const endOfWeek = Moment(lastDayOfWeek).format();

    //convert date to regular time zone
    let newStartDate = Moment(startOfWeek).format("YYYY-MM-DD");
    let newStartOfWeekDateTime = new Date(newStartDate + "" + "T06:00:00.000Z");

    let newEndDate = Moment(endOfWeek).format("YYYY-MM-DD");
    let newEndOfWeekDateTime = new Date(newEndDate + "" + "T06:00:00.000Z");

    const balance = await stripe.balance.retrieve({
      stripe_account: req.params.stripeAccountId
    });

    const total_earned_per_week = await Cart.find({
      partner: req.params.userId,
      orderIsComplete: true,
      hasCheckedout: true,
      dateCheckedIn: {
        $gte: newStartOfWeekDateTime,
        $lte: newEndOfWeekDateTime
      }
    });

    let total = 0;

    for (var i = 0; i < total_earned_per_week.length; i++) {
      let total_earned = parseFloat(total_earned_per_week[i].partner_takes);
      total += parseFloat(total_earned);
    }

    earnings.available_balance = parseFloat(
      (balance.pending[0].amount + balance.available[0].amount) / 100
    ).toFixed(2);

    earnings.total_earned_per_week = parseFloat(total).toFixed(2);

    //console.log(Moment(curr).format());

    return httpRespond.authRespond(res, {
      status: true,
      earnings
    });
  });

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

  app.get("/api/get_daily_appoitments/:userId", async (req, res) => {
    let newDate = Moment(new Date()).format("YYYY-MM-DD");
    let dateTime = new Date(newDate + "" + "T05:00:00.000Z");

    const dailyAppoitments = await Cart.find({
      partner: req.params.userId,
      hasCheckedout: true,
      orderIsComplete: false,
      booking_date: dateTime
    })
      .populate("client")
      .populate("partner")
      .sort({ booking_date: -1 });

    return httpRespond.authRespond(res, {
      status: true,
      dailyAppoitments
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

  app.get("/api/order_again/:clientId", async (req, res) => {
    try {
      let per_page = 15;
      let page_no = parseInt(req.query.page);
      let pagination = {
        limit: per_page,
        skip: per_page * (page_no - 1)
      };
      const cart = await Cart.find({
        client: req.params.clientId,
        hasCheckedout: true,
        orderIsComplete: true
      })
        .populate("partner")
        .limit(pagination.limit)
        .skip(pagination.skip);

      return httpRespond.authRespond(res, {
        status: true,
        cart,
        endOfFile: cart.length === 0 ? true : false
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.get("/api/order_history/:clientId/", async (req, res) => {
    try {
      let per_page = 15;
      let page_no = parseInt(req.query.page);
      let pagination = {
        limit: per_page,
        skip: per_page * (page_no - 1)
      };
      const cart = await Cart.find({
        client: req.params.clientId,
        hasCheckedout: true,
        orderIsComplete: true
      })
        .populate("partner")
        .limit(pagination.limit)
        .skip(pagination.skip);

      return httpRespond.authRespond(res, {
        status: true,
        cart,
        endOfFile: cart.length === 0 ? true : false
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.get("/api/cancelled_orders_partner/:partnerId/", async (req, res) => {
    try {
      let per_page = 10;
      let page_no = parseInt(req.query.page);
      let pagination = {
        limit: per_page,
        skip: per_page * (page_no - 1)
      };
      const cart = await Cart.find({
        partner: req.params.partnerId,
        hasCanceled: true
      })
        .populate("client")
        .limit(pagination.limit)
        .skip(pagination.skip);

      return httpRespond.authRespond(res, {
        status: true,
        cart,
        endOfFile: cart.length === 0 ? true : false
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.get("/api/cancelled_orders/:clientId/", async (req, res) => {
    try {
      let per_page = 10;
      let page_no = parseInt(req.query.page);
      let pagination = {
        limit: per_page,
        skip: per_page * (page_no - 1)
      };
      const cart = await Cart.find({
        client: req.params.clientId,
        hasCanceled: true
      })
        .populate("partner")
        .limit(pagination.limit)
        .skip(pagination.skip);

      return httpRespond.authRespond(res, {
        status: true,
        cart,
        endOfFile: cart.length === 0 ? true : false
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

      const cart = await Cart.findOne({
        _id: cartId,
        orderIsComplete: false
      });

      if (cart) {
        //increment points for clients and partners

        const partner_takes = (parseFloat(total) * 0.8).toFixed(2);
        const stripeFees = (parseFloat(total) * 0.029 + 0.3).toFixed(2);
        const ibeauty_connect_takes = (
          parseFloat(total) -
          (parseFloat(stripeFees) + parseFloat(partner_takes))
        ).toFixed(2);

        const amount_to_transfer = Math.round(parseFloat(partner_takes) * 100);

        const transfer = await stripe.transfers.create({
          amount: amount_to_transfer,
          currency: "usd",
          source_transaction: stripe_charge_id,
          destination: partner_stripe_id
        });

        let newCheckInDate = Moment(new Date()).format("YYYY-MM-DD");
        let dateCheckedIn = new Date(newCheckInDate + "" + "T06:00:00.000Z");

        cart.ibeauty_connect_takes = ibeauty_connect_takes;
        cart.stripe_takes = stripeFees;
        cart.partner_takes = partner_takes;
        cart.stripe_transfer_id = transfer.id;
        cart.dateCheckedIn = dateCheckedIn;
        cart.dateTimeCheckedIn = new Date();
        cart.orderIsComplete = true;
        cart.save();

        const client = await Client.findOne({
          _id: clientId
        });
        client.points += 2;
        client.save();

        const partner = await Partner.findOne({
          _id: partnerId
        });
        partner.points += 2;
        partner.save();

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

        smsFunctions.sendSMS("req", "res", partnerPhone, "You just got paid.");

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

  app.get("/api/messages_partner/:partnerId", async (req, res) => {
    const messages = await Message.find({
      partner: req.params.partnerId,
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
      //  console.log(r);
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

      const partner = await Partner.findOne({
        _id: req.body.messageData.to
      });

      const client = await Client.findOne({
        _id: req.body.messageData.to
      });

      if (partner) {
        //send SMS
        smsFunctions.sendSMS(
          "req",
          "res",
          partner.phone,
          "You have a new message open the iBeautyConnect app to respond. iBeautyConnectPartner://messages."
        );
      } else {
        //send SMS
        smsFunctions.sendSMS(
          "req",
          "res",
          client.phone,
          "You have a new message open the iBeautyConnect app to respond. iBeautyConnectClient://messages."
        );
      }

      if (req.body.messageData.type == "reschedule") {
        //send sms
        messageBody =
          req.body.messageData.message +
          " Open the iBeautyConnect app to respond to your clients request thanks. iBeautyConnectPartner://messages.";
        smsFunctions.sendSMS(
          "req",
          "res",
          req.body.messageData.partnerPhone,
          messageBody
        );
      }

      if (req.body.messageData.type == "reschedule partner") {
        //send sms
        messageBody =
          req.body.messageData.message +
          " Open the iBeautyConnect app to respond thanks. iBeautyConnectClient://messages.";
        smsFunctions.sendSMS(
          "req",
          "res",
          req.body.messageData.clientPhone,
          messageBody
        );
      }

      if (req.body.messageData.type == "from_orders") {
        //send sms
        messageBody =
          req.body.messageData.message +
          " Open the iBeautyConnect app to respond. Thanks iBeautyConnectPartner://messages.";
        smsFunctions.sendSMS("req", "res", partner.phone, messageBody);
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
        await Message.updateOne(
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
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/api/delete_card", async (req, res) => {
    try {
      const { cardId, stripeId } = req.body.deleteData;

      await stripe.customers.deleteSource(stripeId, cardId);
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

  app.get("/api/get_supportMessages/:clientId", async (req, res) => {
    try {
      const supportMessage = await Support.find({
        client: req.params.clientId,
        ticketStatus: "open"
      });

      return httpRespond.authRespond(res, {
        status: true,
        supportMessage
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.get("/api/get_supportMessages_partner/:partnerId", async (req, res) => {
    try {
      const supportMessage = await Support.find({
        partner: req.params.partnerId,
        ticketStatus: "open"
      });

      return httpRespond.authRespond(res, {
        status: true,
        supportMessage
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.get("/api/get_supportConvo/:supportMessageId", async (req, res) => {
    try {
      const supportConvo = await Support.findOne({
        _id: req.params.supportMessageId
      });

      return httpRespond.authRespond(res, {
        status: true,
        supportConvo
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/api/new_support_message/", async (req, res) => {
    try {
      const { clientId, message, to, from_, category } = req.body.messageData;
      //save message
      const supportMessage = await Support.findOne({
        client: clientId,
        category: category,
        ticketStatus: "open"
      });

      if (supportMessage) {
        //update and do things
        //update message
        const update_message = {
          message: message,
          to: to,
          from: from_
        };
        await Support.updateOne(
          { _id: supportMessage._id },
          {
            $push: {
              message_data: update_message
            }
          }
        );
        return httpRespond.authRespond(res, {
          status: true
        });
      } else {
        newMessage = {
          client: clientId,
          category: category,
          message_data: {
            message: message,
            to: to,
            from: from_
          }
        };
        new Support(newMessage).save();
        return httpRespond.authRespond(res, {
          status: true
        });
      }
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/api/new_support_message_partner/", async (req, res) => {
    try {
      const { partnerId, message, to, from_, category } = req.body.messageData;
      //save message
      const supportMessage = await Support.findOne({
        partner: partnerId,
        category: category,
        ticketStatus: "open"
      });

      if (supportMessage) {
        //update and do things
        //update message
        const update_message = {
          message: message,
          to: to,
          from: from_
        };
        await Support.updateOne(
          { _id: supportMessage._id },
          {
            $push: {
              message_data: update_message
            }
          }
        );
        return httpRespond.authRespond(res, {
          status: true
        });
      } else {
        newMessage = {
          partner: partnerId,
          category: category,
          message_data: {
            message: message,
            to: to,
            from: from_
          }
        };
        new Support(newMessage).save();
        return httpRespond.authRespond(res, {
          status: true
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

//side note

//
// const percentage = 0.168 + 0.029;
// const totalPercentage_plus_30cents = parseFloat(
//   (percentage * 100).toFixed(2)
// );
// const totalPercentage = totalPercentage_plus_30cents + 0.3;
// console.log(totalPercentage / 100);
