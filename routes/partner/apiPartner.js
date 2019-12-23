const mongoose = require("mongoose");
const Profession = mongoose.model("professions");
const Partner = mongoose.model("partners");
const Image = mongoose.model("images");
const Video = mongoose.model("videos");
const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");
const ip = require("ip");

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

const httpRespond = require("../../functions/httpRespond");

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
    const response = await Partner.findOne(
      { _id: req.params.userId },
      { services: 1 }
    );
    return httpRespond.authRespond(res, {
      status: true,
      data: response
    });
  });

  app.get("/api/delete/:userId/service/:serviceId", async (req, res) => {
    const response = await Partner.findOne(
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

  app.get("/api/images/:userId", async (req, res) => {
    const images = await Image.find({ belongsTo: req.params.userId });

    return httpRespond.authRespond(res, {
      status: true,
      images
    });
  });

  app.get("/api/videos/:userId", async (req, res) => {
    const videos = await Video.find({ belongsTo: req.params.userId });
    console.log(videos);
    return httpRespond.authRespond(res, {
      status: true,
      videos
    });
  });

  app.post("/api/profession", async (req, res) => {
    const profession = await new Profession({ name: req.body.name }).save();
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/api/delete_image", async (req, res) => {
    const image = await Image.findOne({ _id: req.body.imageId });
    await Image.deleteOne({ _id: req.body.imageId });
    //delete from cloudinary
    await cloudinary.v2.uploader.destroy(image.cloudinaryId);

    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/api/delete_video", async (req, res) => {
    const video = await Video.findOne({ _id: req.body.videoId });
    await Video.deleteOne({ _id: req.body.videoId });
    //  delete from cloudinary
    await cloudinary.v2.uploader.destroy(video.cloudinaryId, {
      resource_type: "video"
    });
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/api/updateComfortFee/:userId", async (req, res) => {
    const user = await Partner.findOne({ _id: req.params.userId });
    user.comfortFee = req.body.comfortFeeInput;
    await user.save();
    console.log(user);
    return httpRespond.authRespond(res, {
      status: true
    });
  });

  app.post("/api/add/service/:userId", async (req, res) => {
    const user = await Partner.findOne(
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
    const updateService = await Partner.findOne(
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
    const user = await Partner.findOne(
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

  app.post(
    "/api/upload_images/:userId",
    upload.single("upload"),
    async (req, res) => {
      const response = await cloudinary.uploader.upload(req.file.path);
      //save images
      const newImage = {
        belongsTo: req.params.userId,
        path: response.url,
        imageApproval: true,
        cloudinaryId: response.public_id
      };
      const image = await new Image(newImage).save();
      console.log(image);
      return httpRespond.authRespond(res, {
        status: true,
        image
      });
    }
  );
  app.post(
    "/api/upload_videos/:userId",
    upload.single("upload"),
    async (req, res) => {
      const response = await cloudinary.v2.uploader.upload(req.file.path, {
        resource_type: "video"
      });
      //save videos
      const newVideo = {
        belongsTo: req.params.userId,
        path: response.url,
        videoApproval: true,
        cloudinaryId: response.public_id
      };
      const video = await new Video(newVideo).save();
      return httpRespond.authRespond(res, {
        status: true,
        video
      });
    }
  );

  app.post("/api/online_status", async (req, res) => {
    //check if account is isActivated before going online
    const user = await Partner.findOne({ _id: req.body.userId });
    //  console.log(user);
    user.liveRequest = !user.liveRequest;
    user.save();
    return res.send({ success: true });
  });
};
