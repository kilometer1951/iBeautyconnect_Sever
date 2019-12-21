const mongoose = require("mongoose");
const User = mongoose.model("users");
const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");
const ip = require("ip");

const password = require("../functions/password");
const httpRespond = require("../functions/httpRespond");
const smsFunctions = require("../functions/SMS");
const fs = require("fs");

let messageBody = "";

const multer = require("multer");
const storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
const upload = multer({
  storage: storage,
  limits: { fieldSize: 25 * 1024 * 1024 }
});

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
    const ac = await stripe.accounts.list();
    res.send(ac);
    // const account = await stripe.accountCards.list();
    // console.log(account);
    // res.send(account);
    // const del = await stripe.accounts.del("acct_1FrEaZEyoT2eoyJ9");
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
      password: password.encryptPassword(req.body.password),
      licenseDocument: [
        {
          licenseNumber: "",
          path: "",
          approved: false,
          needsAttention: false,
          issuedState: "",
          expirationDate: Date()
        }
      ]
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

    if (!password.comparePassword(req.body.password, user.password)) {
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
        dob: 1,
        profilePhoto: 1,
        profession: 1,
        liveRequest: 1
      }
    );
    return res.send(userFound);
  });

  app.post("/auth/service_gender/:userId", async (req, res) => {
    const user = await User.findOne({ _id: req.params.userId });
    user.service_gender = req.body.service_gender;
    user.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/auth/profession/:userId", async (req, res) => {
    const user = await User.findOne({ _id: req.params.userId });
    user.profession = req.body.profession;
    user.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/auth/user_location/:userId", async (req, res) => {
    const user = await User.findOne({ _id: req.params.userId });
    user.locationState = req.body.locationState;
    user.locationCity = req.body.locationCity;
    user.postal_code = req.body.postalCode;
    user.address = req.body.address;
    user.save();
    return httpRespond.authRespond(res, {
      status: true
    });
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
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: ip.address(),
          user_agent: req.headers["user-agent"]
        }
      });
      user.dob = req.body.dob;
      user.debitCardLastFour = stripeAccount.last4;
      user.cardId = stripeAccount.id;
      user.save();
      return httpRespond.authRespond(res, {
        status: true
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
        message: e.raw.message
      });
    }
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
      user.bankLastFour = stripeAccount.last4;
      user.bankId = stripeAccount.id;
      //  user.hasGoneThroughFinalScreen = true;
      user.save();
      return httpRespond.authRespond(res, {
        status: true
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
        message: e.raw.message
      });
    }
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
        user.licenseDocument[0].path = response.url;

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

  app.post("/auth/uploadDocuments/:userId", async (req, res) => {
    try {
      const user = await User.findOne({ _id: req.params.userId });
      user.ssnNumber = req.body.ssnNumber;
      user.introScreen = true;
      user.licenseDocument[0].licenseNumber = req.body.licenseNumber;
      user.licenseDocument[0].issuedState = req.body.issuedState;
      user.licenseDocument[0].expirationDate = req.body.licenseExpirationDate;

      user.save();
      return httpRespond.authRespond(res, {
        status: true,
        message: "complete"
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });
  app.post(
    "/auth/upload_photo_id_front/:userId",
    upload.single("photo_front"),
    async (req, res) => {
      try {
        const response = await cloudinary.uploader.upload(req.file.path);
        const user = await User.findOne({ _id: req.params.userId });
        //update stripe account front of id card
        //upload to stripe
        const fp = fs.readFileSync(req.file.path);
        const photofileId = await stripe.files.create({
          file: {
            data: fp,
            name: req.file.filename,
            type: req.file.mimetype
          },
          purpose: "identity_document"
        });
        //update stripe account
        const s = await stripe.accounts.update(user.stripeAccountId, {
          individual: {
            verification: {
              document: {
                front: photofileId.id
              }
            }
          }
        });
        user.photoIdFront = photofileId.id;
        user.save();
        console.log(s);
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
    "/auth/upload_photo_id_back/:userId",
    upload.single("photo_front"),
    async (req, res) => {
      try {
        const response = await cloudinary.uploader.upload(req.file.path);
        console.log(response);
        const user = await User.findOne({ _id: req.params.userId });
        user.photoIdBack = response.url;
        await stripe.accounts.update(user.stripeAccountId, {
          individual: {
            verification: {
              document: {
                back: response.url
              }
            }
          }
        });
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
