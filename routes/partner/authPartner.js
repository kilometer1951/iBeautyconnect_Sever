const mongoose = require("mongoose");
const Partner = mongoose.model("partners");
const stripe = require("stripe")("sk_live_FsieDnf5IJFj2D28Wtm3OFv3");
const ip = require("ip");

const password = require("../../functions/password");
const httpRespond = require("../../functions/httpRespond");
const smsFunctions = require("../../functions/SMS");
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
  cloud_name: "ibc",
  api_key: "887482388487867",
  api_secret: "IDtj1fdfnQNJV-BTQ0mgfGOIIgU"
});

module.exports = app => {
  app.get("/auth/account", async (req, res) => {
    // const sa = await stripe.accounts.update("acct_1FmV8SKALHyUPxgI", {
    //   individual: { id_number: "624897317" }
    // });
    // console.log(sa);
    // const ac = await stripe.accounts.retrieve("acct_1GDgksCK7cheqNJk");
    // res.send(ac.individual.verification.document.details_code);
    // const account = await stripe.accountCards.list();
    // console.log(account);
    // res.send(account);
    // await stripe.accounts.del("acct_1GOCS5JhwB5OrPTY");
    // res.send(true);
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
    // const balance = await stripe.balance.retrieve({
    //   stripe_account: "acct_1Ft3RWEFG0p535eY"
    // });
    // const amount = balance.pending[0].amount;
    // //
    // const pay = await stripe.payouts.create(
    //   {
    //     amount: amount,
    //     currency: "usd",
    //     method: "instant"
    //   },
    //   { stripe_account: "acct_1Ft3RWEFG0p535eY" }
    // );
    //console.log(pay);
    //res.send(pay);
  });

  app.get("/api/check_stripe_document/:partnerId", async (req, res) => {
    const partner = await Partner.findOne({
      _id: req.params.partnerId
    });

    const ac = await stripe.accounts.retrieve(partner.stripeAccountId);
    console.log(ac.individual.verification.document);
    if (ac.individual.verification.document.details_code == null) {
      return httpRespond.authRespond(res, {
        status: true
      });
    } else {
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.post("/auth/verification", async (req, res) => {
    try {
      const code = Math.floor(Math.random() * 100) + 9000;
      //  send verification code
      messageBody =
        "iBeautyconnect Partner. Your verification code is: " + code;
      const response = await smsFunctions.verification(
        req,
        res,
        req.body.phone,
        messageBody,
        code
      );
      return res.send({ status: true, code: code });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e
      });
    }
  });

  app.post("/auth/verification_phone_forgot_password", async (req, res) => {
    try {
      const user = await Partner.findOne({ phone: req.body.phone });
      const code = Math.floor(Math.random() * 100) + 9000;

      if (!user) {
        return httpRespond.authRespond(res, {
          status: false,
          message: "user does not exist",
          userFound: false
        });
      }

      //  send verification code
      messageBody =
        "iBeautyconnect Partner. Your verification code is: " + code;
      const response = await smsFunctions.verification(
        req,
        res,
        req.body.phone,
        messageBody,
        code
      );
      //  console.log(messageBody);
      return res.send({ status: true, code: code, userFound: true });
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e,
        userFound: false
      });
    }
  });

  app.post("/auth/signup", async (req, res) => {
    const user = await Partner.findOne({ phone: req.body.phone });
    if (user) {
      return httpRespond.authRespond(res, {
        status: false,
        message: "user Exist"
      });
    }

    //send me a message if apple review team
    if (req.body.email === "apple_review_team@ibeautyconnect.com") {
      let message = "Apple in review";
      smsFunctions.sendSMS("req", "res", "312-401-0122", message);
    }

    const newUser = {
      fName: req.body.fName,
      lName: req.body.lName,
      phone: req.body.phone,
      email: req.body.email,
      points: 50,
      country: "usa",
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

    const createdUser = await new Partner(newUser).save();
    return httpRespond.authRespond(res, {
      status: true,
      message: "user created",
      user: createdUser
    });
  });

  app.post("/auth/verify_license_number", async (req, res) => {
    //login
    try {
      const user = await Partner.findOne({ phone: req.body.phoneNumber });

      const licenseDocument = user.licenseDocument.filter(function(license) {
        return license.licenseNumber === req.body.licenseNumber;
      });

      if (licenseDocument.length === 0) {
        return httpRespond.authRespond(res, {
          status: false,
          message: "license not found",
          licenseDocument: false
        });
      } else {
        return httpRespond.authRespond(res, {
          status: true,
          message: "license found",
          licenseDocument: true,
          user
        });
      }
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: false,
        message: e,
        licenseDocument: false
      });
    }
  });

  app.post("/auth/login", async (req, res) => {
    //login
    const user = await Partner.findOne({ email: req.body.email });
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
    const userFound = await Partner.findOne({ _id: req.params.userId });
    //  console.log(userFound);
    return res.send(userFound);
  });

  app.post("/auth/service_gender/:userId", async (req, res) => {
    const user = await Partner.findOne({ _id: req.params.userId });
    user.service_gender = req.body.service_gender;
    user.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/auth/profession/:userId", async (req, res) => {
    const user = await Partner.findOne({ _id: req.params.userId });
    user.profession = req.body.profession;
    user.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/auth/user_location/:userId", async (req, res) => {
    const user = await Partner.findOne({ _id: req.params.userId });
    user.locationState = req.body.locationState;
    user.locationCity = req.body.locationCity;
    user.postal_code = req.body.postalCode;
    user.address = req.body.address;
    user.locationLat = req.body.locationLat;
    user.locationLng = req.body.locationLng;
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
        const partner = await Partner.findOne({ _id: req.params.userId });

        if (partner.profilePhotoCloudinaryId === "") {
          //new upload
          const response = await cloudinary.uploader.upload(req.file.path);
          partner.profilePhoto = response.url;
          partner.profilePhotoCloudinaryId = response.public_id;
          partner.save();
        } else {
          //delete old photo and upload new photo
          await cloudinary.v2.uploader.destroy(
            partner.profilePhotoCloudinaryId
          );
          // //upload new photo
          const response = await cloudinary.uploader.upload(req.file.path);
          partner.profilePhoto = response.url;
          partner.profilePhotoCloudinaryId = response.public_id;
          partner.save();
        }

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
        const user = await Partner.findOne({ _id: req.params.userId });
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
    const user = await Partner.findOne({ _id: req.body.userId });
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
    const user = await Partner.findOne({ _id: req.body.userId });

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

  app.post("/auth/add_bank_account_info_settings", async (req, res) => {
    const user = await Partner.findOne({ _id: req.body.userId });
    let stripeAccount;
    //add bank to account and update DOB
    try {
      //delete banking info from stripe
      await stripe.accounts.deleteExternalAccount(
        user.stripeAccountId,
        user.bankId
      );

      //update new info

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
    const user = await Partner.findOne({ _id: req.body.userId });
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
        const user = await Partner.findOne({ _id: req.params.userId });
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
      const user = await Partner.findOne({ _id: req.params.userId });
      user.ssnNumber = req.body.ssnNumber;
      user.introScreen = true;
      user.licenseDocument[0].licenseNumber = req.body.licenseNumber;
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
        //const response = await cloudinary.uploader.upload(req.file.path);
        const user = await Partner.findOne({ _id: req.params.userId });
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
        //user.hasGoneThroughFinalScreen = true;
        user.photoId = photofileId.id;
        user.save();
        console.log(photofileId);
        return httpRespond.authRespond(res, {
          status: true,
          message: "upload complete",
          user
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
    upload.single("photo_back"),
    async (req, res) => {
      try {
        //  const response = await cloudinary.uploader.upload(req.file.path);
        const user = await Partner.findOne({ _id: req.params.userId });
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
                back: photofileId.id
              }
            }
          }
        });
        user.hasGoneThroughFinalScreen = true;
        user.photoId_back = photofileId.id;
        user.save();
        console.log(photofileId);
        return httpRespond.authRespond(res, {
          status: true,
          message: "upload complete",
          user
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
    "/api/upload_best_five/:partnerId",
    upload.single("fileName"),
    async (req, res) => {
      try {
        const partner = await Partner.findOne({ _id: req.params.partnerId });
        if (req.body.display === "image1") {
          if (partner.cloudinaryId_image1 === "") {
            //new upload
            const response = await cloudinary.uploader.upload(req.file.path);
            partner.image1 = response.url;
            partner.cloudinaryId_image1 = response.public_id;
            partner.save();
          } else {
            //delete old photo and upload new photo
            await cloudinary.v2.uploader.destroy(partner.cloudinaryId_image1);
            // //upload new photo
            const response = await cloudinary.uploader.upload(req.file.path);
            partner.image1 = response.url;
            partner.cloudinaryId_image1 = response.public_id;
            partner.save();
          }
          return httpRespond.authRespond(res, {
            status: true,
            message: "upload complete"
          });
        }
        if (req.body.display === "image2") {
          if (partner.cloudinaryId_image2 === "") {
            //new upload
            const response = await cloudinary.uploader.upload(req.file.path);
            partner.image2 = response.url;
            partner.cloudinaryId_image2 = response.public_id;
            partner.save();
          } else {
            //delete old photo and upload new photo
            await cloudinary.v2.uploader.destroy(partner.cloudinaryId_image2);
            // //upload new photo
            const response = await cloudinary.uploader.upload(req.file.path);
            partner.image2 = response.url;
            partner.cloudinaryId_image2 = response.public_id;
            partner.save();
          }
          return httpRespond.authRespond(res, {
            status: true,
            message: "upload complete"
          });
        }
        if (req.body.display === "image3") {
          if (partner.cloudinaryId_image3 === "") {
            //new upload
            const response = await cloudinary.uploader.upload(req.file.path);
            partner.image3 = response.url;
            partner.cloudinaryId_image3 = response.public_id;
            partner.save();
          } else {
            //delete old photo and upload new photo
            await cloudinary.v2.uploader.destroy(partner.cloudinaryId_image3);
            // //upload new photo
            const response = await cloudinary.uploader.upload(req.file.path);
            partner.image3 = response.url;
            partner.cloudinaryId_image3 = response.public_id;
            partner.save();
          }
          return httpRespond.authRespond(res, {
            status: true,
            message: "upload complete"
          });
        }
        if (req.body.display === "image4") {
          if (partner.cloudinaryId_image4 === "") {
            //new upload
            const response = await cloudinary.uploader.upload(req.file.path);
            partner.image4 = response.url;
            partner.cloudinaryId_image4 = response.public_id;
            partner.save();
          } else {
            //delete old photo and upload new photo
            await cloudinary.v2.uploader.destroy(partner.cloudinaryId_image4);
            // //upload new photo
            const response = await cloudinary.uploader.upload(req.file.path);
            partner.image4 = response.url;
            partner.cloudinaryId_image4 = response.public_id;
            partner.save();
          }
          return httpRespond.authRespond(res, {
            status: true,
            message: "upload complete"
          });
        }
        if (req.body.display === "image5") {
          if (partner.cloudinaryId_image5 === "") {
            //new upload
            const response = await cloudinary.uploader.upload(req.file.path);
            partner.image5 = response.url;
            partner.cloudinaryId_image5 = response.public_id;
            partner.save();
          } else {
            //delete old photo and upload new photo
            await cloudinary.v2.uploader.destroy(partner.cloudinaryId_image5);
            // //upload new photo
            const response = await cloudinary.uploader.upload(req.file.path);
            partner.image5 = response.url;
            partner.cloudinaryId_image5 = response.public_id;
            partner.save();
          }
          return httpRespond.authRespond(res, {
            status: true,
            message: "upload complete"
          });
        }

        if (req.body.display === "video") {
          let videoURL;
          if (partner.cloudinaryId_video === "") {
            //new upload
            const response = await cloudinary.v2.uploader.upload(
              req.file.path,
              {
                resource_type: "video"
              }
            );
            partner.salesVideo = response.url;
            partner.cloudinaryId_video = response.public_id;
            partner.save();
            videoURL = response.url;
          } else {
            //delete old video and upload new video
            await cloudinary.v2.uploader.destroy(partner.cloudinaryId_video, {
              resource_type: "video"
            });
            // //upload new photo
            const response = await cloudinary.v2.uploader.upload(
              req.file.path,
              {
                resource_type: "video"
              }
            );
            partner.salesVideo = response.url;
            partner.cloudinaryId_video = response.public_id;
            partner.save();
            videoURL = response.url;
          }
          return httpRespond.authRespond(res, {
            status: true,
            message: "upload complete",
            videoURL
          });
        }
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
