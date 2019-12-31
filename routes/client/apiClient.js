const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const Partner = mongoose.model("partners");
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

  app.get("/api/get_user_cards/:stripeId", async (req, res) => {
    const cards = await stripe.customers.listSources(req.params.stripeId, {
      object: "bank_account"
    });
    return httpRespond.authRespond(res, {
      status: true,
      cards
    });
  });
};
