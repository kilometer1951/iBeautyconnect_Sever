const mongoose = require("mongoose");
const Profession = mongoose.model("professions");
const Partner = mongoose.model("partners");
const Support = mongoose.model("supports");

const stripe = require("stripe")("sk_live_FsieDnf5IJFj2D28Wtm3OFv3");
const ip = require("ip");

let messageBody = "";
const httpRespond = require("../functions/httpRespond");
const smsFunctions = require("../functions/SMS");

module.exports = app => {
  app.get("/adminApi/partnerAccount", async (req, res) => {
    const partners = await Partner.find({});
    return res.send(partners);
  });
  app.post(
    "/adminApi/accounHasBeenApproved/partnerAccount/:partnerId/staffHandler/:staffName",
    async (req, res) => {
      try {
        //find the user and update isActive to true
        const user = await Partner.findOne({ _id: req.params.partnerId });
        const ssnSplit = user.ssnNumber.split("");
        const lastFour = ssnSplit
          .splice(5, 8)
          .toString()
          .replace(/,/g, "");
        //onbord the user for stripe connect
        const accountDetails = await stripe.accounts.create({
          type: "custom",
          country: "US",
          business_type: "individual",
          individual: {
            first_name: user.fName,
            last_name: user.lName,
            phone: user.phone,
            email: user.email,
            ssn_last_4: lastFour,
            id_number: user.ssnNumber,
            address: {
              city: "Griffith",
              country: "US",
              line1: "1814 dylane drive",
              line2: null,
              postal_code: "46319",
              state: "IN"
            }
          },

          business_profile: {
            mcc: "7230",
            name: `${user.fName} ${user.lName}`,
            product_description:
              "I sell my beauty services on iBeautyConnect." + user.profession,
            support_email: "support@ibeautyconnect.com",
            support_phone: "+13124010122",
            url: "https://www.ibeautyconnect.com"
          },
          requested_capabilities: ["card_payments", "transfers"],
          settings: {
            card_payments: {
              statement_descriptor_prefix: "iBC"
            },
            payments: {
              statement_descriptor: "iBeautyConnect"
            },
            payouts: {
              statement_descriptor: "iBeautyConnect"
            }
          }
        });

        user.isApproved = true;
        user.accountStatus = "approved";
        user.isApprovedNote = "account approved";
        user.stripeAccountId = accountDetails.id;
        user.staffHandler = req.params.staffName;
        user.liveRequest = true;

        //send the partner a welcome messsage
        messageBody = `Congratulation on your approval ${user.fName}. Welcome to the iBeautyConnect family. We are here for you. Open the iBeautyConnect app to get started iBeautyConnectPartner://get_started`;
        smsFunctions.sendSMS(req, res, user.phone, messageBody);
        await user.save();
        return httpRespond.authRespond(res, {
          status: true
        });
      } catch (e) {
        return httpRespond.authRespond(res, {
          status: false
        });
      }
    }
  );

  app.post(
    "/adminApi/accounHasBeenDeactivated/partnerAccount/:partnerId/staffHandler/:staffName",
    async (req, res) => {
      //find the user and update isActive to true
      const user = await Partner.findOne({ _id: req.params.partnerId });
      user.isDeactivated = true;
      user.deactivationNote = req.body.note;
      //send the partner a welcome messsage
      messageBody = `Hi there ${user.fName} please call customer support at 3124010122 your account needs attention thanks`;
      smsFunctions.sendSMS(req, res, user.phone, messageBody);
      await user.save();
      return httpRespond.authRespond(res, {
        status: true
      });
    }
  );

  //Apple review team activation
  app.get(
    "/adminApi/has_auth/accoun_has_been_approved_apple_review_team/",
    async (req, res) => {
      try {
        //find the user and update isActive to true
        const user = await Partner.findOne({
          email: "review_team@ibeautyconnect.com"
        });
        const ssnSplit = user.ssnNumber.split("");
        const lastFour = ssnSplit
          .splice(5, 8)
          .toString()
          .replace(/,/g, "");
        //onbord the user for stripe connect
        const accountDetails = await stripe.accounts.create({
          type: "custom",
          country: "US",
          business_type: "individual",
          individual: {
            first_name: user.fName,
            last_name: user.lName,
            phone: user.phone,
            email: user.email,
            ssn_last_4: lastFour,
            id_number: user.ssnNumber,
            address: {
              city: "Griffith",
              country: "US",
              line1: "1814 dylane drive",
              line2: null,
              postal_code: "46319",
              state: "IN"
            }
          },

          business_profile: {
            mcc: "7230",
            name: `${user.fName} ${user.lName}`,
            product_description:
              "I sell my beauty services on iBeautyConnect." + user.profession,
            support_email: "support@ibeautyconnect.com",
            support_phone: "+13124010122",
            url: "https://www.ibeautyconnect.com"
          },
          requested_capabilities: ["card_payments", "transfers"],
          settings: {
            card_payments: {
              statement_descriptor_prefix: "iBC"
            },
            payments: {
              statement_descriptor: "iBeautyConnect"
            },
            payouts: {
              statement_descriptor: "iBeautyConnect"
            }
          }
        });

        user.isApproved = true;
        user.accountStatus = "approved";
        user.isApprovedNote = "account approved";
        user.stripeAccountId = accountDetails.id;
        user.staffHandler = "Wilson";
        user.liveRequest = true;

        //send the partner a welcome messsage
        messageBody = `Congratulation on your approval ${user.fName}. Welcome to the iBeautyConnect family. We are here for you. Open the iBeautyConnect app to get started iBeautyConnectPartner://get_started`;
        smsFunctions.sendSMS(req, res, user.phone, messageBody);
        await user.save();
        return httpRespond.authRespond(res, {
          status: true
        });
      } catch (e) {
        return httpRespond.authRespond(res, {
          status: false,
          message: "a message has been sent to you. Get started"
        });
      }
    }
  );

  app.get("/apiAdmin/getUsers", async (req, res) => {
    const response = await Partner.find({ isApproved: false });
    return httpRespond.authRespond(res, {
      status: true,
      response
    });
  });
  app.get("/apiAdmin/getSupport", async (req, res) => {
    const response = await Support.find({});
    return httpRespond.authRespond(res, {
      status: true,
      response
    });
  });
};
