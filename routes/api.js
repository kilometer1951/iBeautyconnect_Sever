const mongoose = require("mongoose");
const Profession = mongoose.model("professions");
const User = mongoose.model("users");
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
    user.businessAddress = req.body.businessAddress;
    await user.save();
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
