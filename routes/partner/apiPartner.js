const mongoose = require("mongoose");
const Profession = mongoose.model("professions");
const Partner = mongoose.model("partners");
const Image = mongoose.model("images");
const Video = mongoose.model("videos");
const Rate = mongoose.model("rates");
const Moment = require("moment");
const Cart = mongoose.model("carts");

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
  cloud_name: "ibeautyconnect",
  api_key: "678214445386768",
  api_secret: "R5OQpKQ93luFxI7lVXZZ_nsUUsk"
});
const httpRespond = require("../../functions/httpRespond");

module.exports = app => {
  app.get("/api/profession", async (req, res) => {
    const profession = await Profession.find();
    //  console.log(profession);
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
    try {
      let per_page = 15;
      let page_no = parseInt(req.query.page);
      let pagination = {
        limit: per_page,
        skip: per_page * (page_no - 1)
      };
      const images = await Image.find({ belongsTo: req.params.userId })
        .limit(pagination.limit)
        .skip(pagination.skip);

      return httpRespond.authRespond(res, {
        status: true,
        images,
        endOfFile: images.length === 0 ? true : false
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.get("/api/get_partner_review/:partnerId", async (req, res) => {
    try {
      let per_page = 15;
      let page_no = parseInt(req.query.page);
      let pagination = {
        limit: per_page,
        skip: per_page * (page_no - 1)
      };
      const reviews = await Rate.find({
        partner: req.params.partnerId,
        rateNumber: { $eq: 5 }
      })
        .populate("client")
        .limit(pagination.limit)
        .skip(pagination.skip);

      return httpRespond.authRespond(res, {
        status: true,
        reviews,
        endOfFile: reviews.length === 0 ? true : false
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.get("/api/videos/:userId", async (req, res) => {
    try {
      let per_page = 15;
      let page_no = parseInt(req.query.page);
      let pagination = {
        limit: per_page,
        skip: per_page * (page_no - 1)
      };
      const videos = await Video.find({ belongsTo: req.params.userId })
        .limit(pagination.limit)
        .skip(pagination.skip);
      return httpRespond.authRespond(res, {
        status: true,
        videos,
        endOfFile: videos.length === 0 ? true : false
      });
    } catch (e) {
      //  console.log(req.params.userId);
      return httpRespond.authRespond(res, {
        status: false
      });
    }
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
    //console.log(user);
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
      try {
        const response = await cloudinary.uploader.upload(req.file.path);
        //  save images
        const newImage = {
          belongsTo: req.params.userId,
          path: response.url,
          imageApproval: true,
          cloudinaryId: response.public_id
        };
        const image = await new Image(newImage).save();
        return httpRespond.authRespond(res, {
          status: true,
          image
        });
      } catch (e) {
        console.log(e);
        return httpRespond.authRespond(res, {
          status: true,
          message: e
        });
      }
    }
  );
  app.post(
    "/api/upload_videos/:userId",
    upload.single("upload"),
    async (req, res) => {
      try {
        countVideos = await Video.find({
          belongsTo: req.params.userId
        }).countDocuments();

        //console.log(countVideos);

        if (countVideos <= 10) {
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
        } else {
          return httpRespond.authRespond(res, {
            status: false,
            message: "max reached. Maximum upload for videos is 5.",
            video: []
          });
        }
      } catch (e) {
        return httpRespond.authRespond(res, {
          status: false
        });
      }
    }
  );

  app.get("/api/get_all_activities/:userId", async (req, res) => {
    let per_page = 15;
    let page_no = parseInt(req.query.page);
    let pagination = {
      limit: per_page,
      skip: per_page * (page_no - 1)
    };
    const allactivities = await Cart.find({
      partner: req.params.userId,
      orderIsComplete: true
    })
      .populate("client")
      .populate("partner")
      .limit(pagination.limit)
      .skip(pagination.skip)
      .sort({ booking_date: -1 });

    return httpRespond.authRespond(res, {
      status: true,
      allactivities,
      endOfFile: allactivities.length === 0 ? true : false
    });
  });

  app.get("/api/weekly_activity/:partnerId", async (req, res) => {
    try {
      let per_page = 15;
      let page_no = parseInt(req.query.page);
      let pagination = {
        limit: per_page,
        skip: per_page * (page_no - 1)
      };
      let curr = new Date(); // get current date
      let first = curr.getDate() - curr.getDay(); // First day is the day of the month - the day of the week
      let last = first + 6; // last day is the first day + 6

      const firstDayOfWeek = Moment(
        new Date(curr.setDate(first)),
        "DD-MM-YYYY"
      ).add(1, "day");
      const lastDayOfWeek = Moment(
        new Date(curr.setDate(last)),
        "DD-MM-YYYY"
      ).add(1, "day");

      const startOfWeek = Moment(firstDayOfWeek).format();
      const endOfWeek = Moment(lastDayOfWeek).format();
      const cart = await Cart.find({
        partner: req.params.partnerId,
        hasCheckedout: true,
        orderIsComplete: true,
        dateCheckedIn: { $gte: startOfWeek, $lte: endOfWeek }
      })
        .populate("client")
        .limit(pagination.limit)
        .skip(pagination.skip);

      return httpRespond.authRespond(res, {
        status: true,
        cart,
        endOfFile: cart.length === 0 ? true : false
      });
    } catch (e) {
      console.log(e);
      return httpRespond.authRespond(res, {
        status: false
      });
    }
  });

  app.post("/api/online_status", async (req, res) => {
    //check if account is isActivated before going online
    const user = await Partner.findOne({ _id: req.body.userId });
    //  console.log(user);
    user.liveRequest = !user.liveRequest;
    user.save();
    return res.send({ success: true });
  });

  app.get("/api/get_all_appoitments/:partnerId", async (req, res) => {
    let per_page = 10;
    let page_no = parseInt(req.query.page);
    let pagination = {
      limit: per_page,
      skip: per_page * (page_no - 1)
    };
    const allAppoitments = await Cart.find({
      partner: req.params.partnerId,
      hasCheckedout: true,
      orderIsComplete: false,
      hasCanceled: false
    })
      .populate("client")
      .populate("partner")
      .sort({ booking_date: -1 })
      .limit(pagination.limit)
      .skip(pagination.skip);

    return httpRespond.authRespond(res, {
      status: true,
      allAppoitments,
      endOfFile: allAppoitments.length === 0 ? true : false
    });
  });

  app.get(
    "/api/query_partner_agenda_by_date/:partnerId/:dateTime",
    async (req, res) => {
      const allAppoitments = await Cart.find({
        partner: req.params.partnerId,
        hasCheckedout: true,
        orderIsComplete: false,
        hasCanceled: false,
        booking_date: new Date(req.params.dateTime)
      })
        .populate("client")
        .populate("partner")
        .sort({ booking_date: -1 });

      return httpRespond.authRespond(res, {
        status: true,
        allAppoitments
      });
    }
  );
};
