const mongoose = require("mongoose");
const Profession = mongoose.model("professions");
const Partner = mongoose.model("partners");
const Support = mongoose.model("supports");
const Client = mongoose.model("clients");
const Cart = mongoose.model("carts");

const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");
const ip = require("ip");

let messageBody = "";
const httpRespond = require("../functions/httpRespond");
const smsFunctions = require("../functions/SMS");

module.exports = app => {
  app.get("/supportApi/partnerAccount", async (req, res) => {
    const partners = await Partner.find({});
    return res.send(partners);
  });
  app.get("/supportApi/date", async (req, res) => {
    const dateTime = new Date();
    return res.send(dateTime);
  });
  app.post(
    "/supportApi/accounHasBeenApproved/partnerAccount/:partnerId/staffHandler/:staffName",
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
        console.log(e);
        return httpRespond.authRespond(res, {
          status: false,
          message: e
        });
      }
    }
  );

  app.get("/supportApi/search_partner/:search", async (req, res) => {
    //find the user and update isActive to true
    const data = await Partner.find({ ssnNumber: req.params.search });
    return httpRespond.authRespond(res, {
      status: true,
      data
    });
  });

  app.get("/supportApi/get_clients", async (req, res) => {
    const data = await Client.find({});
    return httpRespond.authRespond(res, {
      status: true,
      data
    });
  });
  app.get("/supportApi/get_partners", async (req, res) => {
    const data = await Partner.find({});
    return httpRespond.authRespond(res, {
      status: true,
      data
    });
  });
  app.get("/supportApi/get_partners_needing_activation", async (req, res) => {
    const data = await Partner.find({ isApproved: false });
    return httpRespond.authRespond(res, {
      status: true,
      data
    });
  });

  app.get("/supportApi/getSupport_tickets", async (req, res) => {
    const data = await Support.find({ ticketStatus: "open" })
      .populate("client")
      .populate("partner");
    return httpRespond.authRespond(res, {
      status: true,
      data
    });
  });

  app.get(
    "/supportApi/get_appointment_per_partner/:partnerId",
    async (req, res) => {
      // let per_page = 10;
      // let page_no = parseInt(req.query.page);
      // let pagination = {
      //   limit: per_page,
      //   skip: per_page * (page_no - 1)
      // };
      const allAppoitments = await Cart.find({
        partner: req.params.partnerId,
        hasCheckedout: true,
        orderIsComplete: false,
        hasCanceled: false
      })
        .populate("client")
        .populate("partner")
        .sort({ booking_date: -1 });
      // .limit(pagination.limit)
      // .skip(pagination.skip);

      return httpRespond.authRespond(res, {
        status: true,
        allAppoitments
        //endOfFile: allAppoitments.length === 0 ? true : false
      });
    }
  );

  app.post("/supportApi/update_ssn", async (req, res) => {
    const partner = await Partner.findOne({ _id: req.body.partnerId });
    partner.ssnNumber = req.body.ssnInput;
    partner.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/supportApi/close_support_ticket", async (req, res) => {
    const support = await Support.findOne({ _id: req.body.supportMessageId });
    support.ticketStatus = "close";
    support.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/supportApi/send_support_sms_notification", async (req, res) => {
    let message;

    if (req.body.typeOfUser === "client") {
      messageBody =
        "Hi " +
        req.body.userName +
        ", this is iBeautyConnect. You have a pending message from support. Open the iBeautyConnect app to respond iBeautyConnectClient://support";
    } else {
      messageBody =
        "Hi " +
        req.body.userName +
        ", this is iBeautyConnect. You have a pending message from support. Open the iBeautyConnect app to respond iBeautyConnectPartner://support";
    }

    smsFunctions.sendSMS(req, res, req.body.phone, messageBody);

    return httpRespond.authRespond(res, {
      status: true
    });
  });
};
