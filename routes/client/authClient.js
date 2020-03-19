const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const stripe = require("stripe")("sk_live_FsieDnf5IJFj2D28Wtm3OFv3");

const password = require("../../functions/password");
const httpRespond = require("../../functions/httpRespond");
const smsFunctions = require("../../functions/SMS");
let messageBody = "";

module.exports = app => {
  app.post("/auth_client/verification", async (req, res) => {
    try {
      const code = Math.floor(Math.random() * 100) + 9000;
      //  send verification code
      messageBody =
        "Your verification code is: " +
        code +
        ". iBeautyconnect is a marketplace for licensed health and beauty professionals";
      await smsFunctions.verification(
        req,
        res,
        req.body.phone,
        messageBody,
        code
      );
      const user = await Client.findOne({ phone: req.body.phone });
      if (!user) {
        return httpRespond.authRespond(res, {
          status: true,
          message: "user does not exist",
          code: code,
          user_exist: false
        });
      }
      if (user) {
        return httpRespond.authRespond(res, {
          status: true,
          message: "user exist",
          code: code,
          user_exist: true,
          user: user
        });
      }
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/auth_client/signup", async (req, res) => {
    try {
      const customer = await stripe.customers.create({
        description: "Customer for: " + req.body.email,
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email
      });
      const newUser = {
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email,
        stripeId: customer.id,
        points: 100,
        country: "usa"
      };
      const createdUser = await new Client(newUser).save();
      console.log(createdUser);
      return httpRespond.authRespond(res, {
        status: true,
        message: "user created",
        user: createdUser
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/api/update_device_token", async (req, res) => {
    const client = await Client.findOne({ _id: req.body.clientId });
    client.deviceToken = req.body.token;
    client.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });
};
