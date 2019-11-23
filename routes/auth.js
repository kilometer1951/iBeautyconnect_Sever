const mongoose = require("mongoose");
const User = mongoose.model("users");

const password = require("../functions/password");
const httpRespond = require("../functions/httpRespond");
const smsFunctions = require("../functions/SMS");
let messageBody = "";

const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: "dtfyfl4kz",
  api_key: "223622844967433",
  api_secret: "r20BlHgHcoH8h-EznEJPQmG6sZ0"
});

module.exports = app => {
  app.post("/auth/verification", async (req, res) => {
    const code = Math.floor(Math.random() * 100) + 9000;
    //  send verification code
    messageBody = "iBeautyconnect Partner.Your verification code is: " + code;
    smsFunctions.verification(req, res, req.body.phone, messageBody, code);
  });

  app.post("/auth/signup", async (req, res) => {
    const user = await User.findOne({ phone: req.body.phone });
    if (user) {
      return httpRespond.authRespond(res, {
        status: false,
        message: "user Exist"
      });
    }
    const newUser = {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      password: password.encryptPassword(req.body.password)
    };
    const createdUser = await new User(newUser).save();
    return httpRespond.authRespond(res, {
      status: true,
      message: "user created",
      user: createdUser
    });
  });

  app.post("/auth/login", async (req, res) => {
    //login
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return httpRespond.authRespond(res, {
        status: false,
        message: "user not found"
      });
    }
    if (!user && password.comparePassword(req.body.password, user.password)) {
      return httpRespond.authRespond(res, {
        status: false,
        message: "user not found"
      });
    }
    return httpRespond.authRespond(res, {
      status: true,
      message: "user found",
      user: user
    });
  });

  app.get("/auth/userIsActive/:userId", async (req, res) => {
    const userFound = await User.findOne(
      { _id: req.params.userId },
      { isActive: 1, hasGoneThroughFinalScreen: 1, introScreen: 1 }
    );

    console.log(userFound);

    return res.send(userFound);
  });

  app.post("/auth/uploadDocuments/:userId", async (req, res) => {
    try {
      const profilePhotoUpload = await cloudinary.v2.uploader.upload(
        req.body.profilePhotoUpload
      );
      const licensePhotoUpload = await cloudinary.v2.uploader.upload(
        req.body.licensePhotoUpload
      );

      const user = await User.findOne({ _id: req.params.userId });
      user.location = req.body.location;
      user.profilePhoto = req.body.profilePhotoUpload;
      user.profession = req.body.profession;
      user.ssnNumber = req.body.ssnNumber;
      user.introScreen = true;
      user.licenseDocument = [
        {
          licenseNumber: req.body.licenseNumber,
          path: req.body.licensePhotoUpload,
          issuedState: req.body.issuedState,
          expirationDate: req.body.licenseExpirationDate
        }
      ];
      user.save();
      return httpRespond.authRespond(res, {
        status: true,
        message: "upload complete"
      });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });
};
