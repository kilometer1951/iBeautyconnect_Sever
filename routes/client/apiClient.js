const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const Partner = mongoose.model("partners");
const Cart = mongoose.model("carts");

const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");

const httpRespond = require("../../functions/httpRespond");

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
};
