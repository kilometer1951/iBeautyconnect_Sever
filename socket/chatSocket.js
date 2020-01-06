const mongoose = require("mongoose");
const Message = mongoose.model("messages");

let messageBody = "";
const smsFunctions = require("../functions/SMS");

module.exports = (app, io) => {
  io.on("connection", function(socket) {
    //  console.log("user connected");

    socket.on("newMessage", async function(msg) {
      io.emit("newMessage", { msg });
      //save message
      const message = await Message.findOne({
        client: msg.clientId,
        partner: msg.partnerId,
        deleted: false
      });

      if (msg.type == "reschedule") {
        //send sms
        messageBody =
          msg.message +
          ". Open the iBeautyConnect app to respond to your clients request. iBeautyConnectPartner://get_started thanks.";
        smsFunctions.sendSMS("req", "res", msg.partnerPhone, messageBody);
      }

      if (message) {
        //update message
        message.recentMesage = msg.message;
        if (msg.to == msg.partnerId) {
          message.partnerHasViewed = false;
          message.clientHasViewMessage = true;
        } else {
          message.clientHasViewMessage = false;
          message.partnerHasViewed = true;
        }
        message.dateModified = new Date();
        message.save();
        const update_message = {
          message: msg.message,
          to: msg.to,
          from: msg.from
        };
        await Message.update(
          { _id: message._id },
          {
            $push: {
              message_data: update_message
            }
          }
        );
      } else {
        newMessage = {
          client: msg.clientId,
          partner: msg.partnerId,
          recentMesage: msg.message,
          message_data: {
            message: msg.message,
            to: msg.to,
            from: msg.from
          }
        };
        new Message(newMessage).save();
      }
    });

    // socket.on("m", function(msg) {
    //   io.emit("m", { msg });
    //   console.log("msg");
    // });

    socket.on("disconnect", function() {
      console.log("user disconnected");
    });
  });
};
