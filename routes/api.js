const mongoose = require("mongoose");
const Profession = mongoose.model("professions");
const User = mongoose.model("users");
const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");
const ip = require("ip");

const httpRespond = require("../functions/httpRespond");

module.exports = app => {
  app.get("/api/profession", async (req, res) => {
    const profession = await Profession.find();
    console.log(profession);
    return httpRespond.authRespond(res, {
      status: true,
      data: profession
    });
  });

  app.get("/api/services/:userId", async (req, res) => {
    const response = await User.findOne(
      { _id: req.params.userId },
      { services: 1 }
    );
    return httpRespond.authRespond(res, {
      status: true,
      data: response
    });
  });

  app.get("/api/delete/:userId/service/:serviceId", async (req, res) => {
    const response = await User.findOne(
      { _id: req.params.userId },
      { services: 1 }
    );
    const foundData = response.services.filter(
      value => value._id == req.params.serviceId
    );
    response.services.pull(foundData[0]);
    response.save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/api/profession", async (req, res) => {
    const profession = await new Profession({ name: req.body.name }).save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/api/updateBusinessAddress/:userId", async (req, res) => {
    const user = await User.findOne({ _id: req.params.userId });
    user.completeBusinessAddress = req.body.businessAddress;
    user.businessAddressLine1 = req.body.businessAddressLine1;
    user.businessCity = req.body.businessCity;
    user.businessState = req.body.businessState;
    user.businessPostalCode = req.body.businessPostal;

    //update stripe account and include last four of SSN
    await stripe.accounts.update(user.stripeAccountId, {
      individual: {
        address: {
          city: req.body.businessCity,
          country: "US",
          line1: req.body.businessAddressLine1,
          line2: null,
          postal_code: req.body.businessPostal,
          state: req.body.businessState
        }
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: ip.address(),
        user_agent: req.headers["user-agent"]
      }
    });

    await user.save();

    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/api/updateComfortFee/:userId", async (req, res) => {
    const user = await User.findOne({ _id: req.params.userId });
    user.comfortFee = req.body.comfortFeeInput;
    await user.save();
    console.log(user);
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/api/add/service/:userId", async (req, res) => {
    const user = await User.findOne(
      { _id: req.params.userId },
      { services: 1 }
    );
    const service = {
      serviceName: req.body.serviceName,
      serviceHour: req.body.serviceHour,
      servicePricePerHour: req.body.servicePricePerHour,
      serviceDescription: req.body.serviceDescription
    };
    user.services.push(service);
    user.save();
    //  console.log(user);
    return httpRespond.authRespond(res, {
      status: true,
      user
    });
  });

  app.post("/api/edit/:userId/service/:serviceId/", async (req, res) => {
    const updateService = await User.findOne(
      {
        _id: req.params.userId
      },
      { services: 1 }
    );

    for (var i = 0; i < updateService.services.length; i++) {
      if (updateService.services[i]._id.equals(req.params.serviceId)) {
        updateService.services[i] = {
          serviceName: req.body.serviceName,
          serviceHour: req.body.serviceHour,
          servicePricePerHour: req.body.servicePricePerHour,
          serviceDescription: req.body.serviceDescription
        };
      }
    }
    await updateService.save();
    const user = await User.findOne(
      {
        _id: req.params.userId
      },
      { services: 1 }
    );
    return httpRespond.authRespond(res, {
      status: true,
      user
    });
  });
};
