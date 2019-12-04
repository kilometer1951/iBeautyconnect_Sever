const mongoose = require("mongoose");
const User = mongoose.model("users");
const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");
const ip = require("ip");

const password = require("../functions/password");
const httpRespond = require("../functions/httpRespond");
const smsFunctions = require("../functions/SMS");
let messageBody = "";

const multer = require("multer");
const storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
const upload = multer({ storage: storage });

const cloudinary = require("cloudinary");
cloudinary.config({
  cloud_name: "dtfyfl4kz",
  api_key: "223622844967433",
  api_secret: "r20BlHgHcoH8h-EznEJPQmG6sZ0"
});

module.exports = app => {
  // app.get("/auth/account", async (req, res) => {
  //   // const account = await stripe.accounts.list();
  //   // console.log(account);
  //   // res.send(account);
  //   const del = await stripe.accounts.del("acct_1FltcYDLBl8inzZa");
  //   console.log(del);
  // });

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

    //onbord the user for connect
    const accountDetails = await stripe.accounts.create({
      type: "custom",
      country: "US",
      business_type: "individual",
      individual: {
        first_name: req.body.fName,
        last_name: req.body.lName,
        phone: req.body.phone,
        email: req.body.email
      },
      requested_capabilities: ["card_payments", "transfers"],
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: ip.address(),
        user_agent: req.headers["user-agent"]
      }
    });
    const newUser = {
      fName: req.body.fName,
      lName: req.body.lName,
      phone: req.body.phone,
      email: req.body.email,
      password: password.encryptPassword(req.body.password),
      stripeAccountId: accountDetails.id
    };
    //  console.log(accountDetails);

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
      {
        isActive: 1,
        hasGoneThroughFinalScreen: 1,
        introScreen: 1,
        fName: 1,
        lName: 1,
        businessAddress: 1
      }
    );
    return res.send(userFound);
  });

  app.post(
    "/auth/uploadProfilePhoto/:userId",
    upload.single("profilePhoto"),
    async (req, res) => {
      try {
        const response = await cloudinary.uploader.upload(req.file.path);
        const user = await User.findOne({ _id: req.params.userId });
        user.profilePhoto = response.url;
        user.save();
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

  app.post(
    "/auth/uploadVideo/:userId",
    upload.single("uploadVideo"),
    async (req, res) => {
      try {
        const response = await cloudinary.v2.uploader.upload(req.file.path, {
          resource_type: "video"
        });
        //  console.log(response);
        const user = await User.findOne({ _id: req.params.userId });
        user.salesVideo = response.url;
        user.save();
        return httpRespond.authRespond(res, {
          status: true,
          message: "upload complete",
          video: response.url,
          public_id: response.public_id
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

  app.post("/auth/deleteVideo", async (req, res) => {
    const response = await cloudinary.v2.uploader.destroy(req.body.videoId, {
      resource_type: "video"
    });
    return httpRespond.authRespond(res, {
      status: true,
      message: "video deleted"
    });
  });

  app.post(
    "/auth/uploadLicense/:userId",
    upload.single("licensePhoto"),
    async (req, res) => {
      try {
        const response = await cloudinary.uploader.upload(req.file.path);
        const user = await User.findOne({ _id: req.params.userId });

        user.locationState = req.body.locationState;
        user.locationCity = req.body.locationCity;
        user.businessAddress = req.body.businessAddress;
        user.profession = req.body.profession;
        user.ssnNumber = req.body.ssnNumber;
        user.postalCode = req.body.postalCode;
        user.addressLine1 = req.body.addressLine1;
        user.introScreen = true;
        user.licenseDocument = [
          {
            licenseNumber: req.body.licenseNumber,
            path: response.url,
            issuedState: req.body.issuedState,
            expirationDate: req.body.licenseExpirationDate
          }
        ];
        user.save();

        //update stripe account and include last four of SSN
        await stripe.accounts.update(user.stripeAccountId, {
          individual: {
            address: {
              city: req.body.locationCity,
              country: "US",
              line1: req.body.addressLine1,
              line2: null,
              postal_code: req.body.postalCode,
              state: req.body.locationState
            }
          }
        });

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
};
