const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const Partner = mongoose.model("partners");
const Cart = mongoose.model("carts");
const Message = mongoose.model("messages");

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
        booking_time
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
      conversations: messages.message_data
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
};

//side note

//
// const percentage = 0.168 + 0.029;
// const totalPercentage_plus_30cents = parseFloat(
//   (percentage * 100).toFixed(2)
// );
// const totalPercentage = totalPercentage_plus_30cents + 0.3;
// console.log(totalPercentage / 100);
