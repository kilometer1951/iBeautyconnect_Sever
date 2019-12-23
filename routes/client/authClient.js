const mongoose = require("mongoose");
const Client = mongoose.model("clients");

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
        ".iBeautyconnect is a marketplace for licensed health and beauty professionals";
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
    const newUser = {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email
    };
    const createdUser = await new Client(newUser).save();
    console.log(createdUser);
    return httpRespond.authRespond(res, {
      status: true,
      message: "user created",
      user: createdUser
    });
  });

  // app.post("/auth/login", async (req, res) => {
  //   //login
  //   const user = await User.findOne({ email: req.body.email });
  //   if (!user) {
  //     return httpRespond.authRespond(res, {
  //       status: false,
  //       message: "user not found"
  //     });
  //   }
  //   return httpRespond.authRespond(res, {
  //     status: true,
  //     message: "user found",
  //     user: user
  //   });
  // });
};
