const secret = require("../config/secret");
const client = require("twilio")(secret.TwiloAccountSid, secret.TwiloAuthToken);

const smsFunctions = {};

smsFunctions.verification = async (req, res, phone, messageBody, code) => {
  client.messages.create(
    {
      to: "+1" + phone,
      from: "+17739749268",
      body: messageBody
    },
    (err, message) => {
      if (message === undefined) {
        return res.send({ status: false });
      } else {
        return res.send({ status: true, code: code });
      }
    }
  );
};

smsFunctions.sendGreeting = async (req, res, phoneNumber, messageBody) => {
  client.messages.create({
    to: "+1" + phoneNumber,
    from: "+17739749268",
    body: messageBody
  });
};

module.exports = smsFunctions;
