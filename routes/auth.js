const mongoose = require("mongoose");
const User = mongoose.model("users");
const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");

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
  app.get("/auth/account", async (req, res) => {
    // const sa = await stripe.accounts.update("acct_1FmV8SKALHyUPxgI", {
    //   individual: { id_number: "624897317" }
    // });
    // console.log(sa);
    // const ac = await stripe.accounts.list();
    // res.send(ac);
    // const account = await stripe.accountCards.list();
    // console.log(account);
    // res.send(account);
    // const del = await stripe.accounts.del("acct_1Fms1RFRPtJ9zrXh");
    // console.log(del);
    // stripe.accounts.retrieveExternalAccount(
    //   "acct_1FmQD2EWMyi6h2Gs",
    //   "card_1FmRJjEWMyi6h2GsM0HXEzOR",
    //   function(err, card) {
    //     // asynchronously called
    //     console.log(card);
    //   }
    // );
    // const del = await stripe.accounts.deleteExternalAccount(
    //   "acct_1FmQD2EWMyi6h2Gs",
    //   "card_1FmRJjEWMyi6h2GsM0HXEzOR"
    // );
    // console.log(del);
    // const update = await stripe.accounts.updateExternalAccount(
    //   "acct_1FmQD2EWMyi6h2Gs",
    //   "card_1FmRJjEWMyi6h2GsM0HXEzOR",
    //   { default_for_currency: false }
    // );
    // console.log(update);
  });

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
      fName: req.body.fName,
      lName: req.body.lName,
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
      {
        isApproved: 1,
        hasGoneThroughFinalScreen: 1,
        introScreen: 1,
        fName: 1,
        lName: 1,
        completeBusinessAddress: 1,
        cardId: 1,
        debitCardLastFour: 1,
        bankLastFour: 1,
        bankId: 1,
        dob: 1
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

  app.post("/auth/add_debit_card", async (req, res) => {
    const user = await User.findOne({ _id: req.body.userId });
    const newDob = req.body.dob.split("/");
    const ssnSplit = user.ssnNumber.split("");

    let stripeAccount;
    //add card to account and update DOB
    try {
      stripeAccount = await stripe.accounts.createExternalAccount(
        user.stripeAccountId,
        {
          external_account: req.body.token.tokenId
        }
      );
      await stripe.accounts.update(user.stripeAccountId, {
        individual: {
          dob: {
            day: parseInt(newDob[1].trim(""), 10),
            month: parseInt(newDob[0].trim(""), 10),
            year: parseInt(newDob[2].trim(""), 10)
          }
        }
      });
    } catch (e) {
      console.log(e);
    }
    user.dob = req.body.dob;
    user.debitCardLastFour = stripeAccount.last4;
    user.cardId = stripeAccount.id;
    user.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/auth/add_bank_account_info", async (req, res) => {
    const user = await User.findOne({ _id: req.body.userId });

    let stripeAccount;
    //add bank to account and update DOB
    try {
      stripeAccount = await stripe.accounts.createExternalAccount(
        user.stripeAccountId,
        {
          external_account: req.body.bankAccountToken
        }
      );
    } catch (e) {
      console.log(e);
    }
    user.bankLastFour = stripeAccount.last4;
    user.bankId = stripeAccount.id;
    user.hasGoneThroughFinalScreen = true;
    user.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/auth/hasGoneThroughFinalScreen", async (req, res) => {
    const user = await User.findOne({ _id: req.body.userId });
    user.hasGoneThroughFinalScreen = true;
    user.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post(
    "/auth/uploadLicense/:userId",
    upload.single("licensePhoto"),
    async (req, res) => {
      try {
        const response = await cloudinary.uploader.upload(req.file.path);
        const user = await User.findOne({ _id: req.params.userId });

        user.gender = req.body.gender;
        user.locationState = req.body.locationState;
        user.locationCity = req.body.locationCity;
        user.postal_code = req.body.postalCode;
        user.address = req.body.address;
        user.profession = req.body.profession;
        user.ssnNumber = req.body.ssnNumber;
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
