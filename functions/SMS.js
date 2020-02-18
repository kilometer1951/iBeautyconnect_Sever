const secret = require("../config/secret");
const client = require("twilio")(secret.TwiloAccountSid, secret.TwiloAuthToken);

const smsFunctions = {};

smsFunctions.verification = async (req, res, phone, messageBody, code) => {
  const message = await client.messages.create({
    to: "+1" + phone,
    from: "+17739749268",
    body: messageBody
  });
  console.log(messageBody);
  return message;
};

smsFunctions.sendSMS = async (req, res, phoneNumber, messageBody) => {
  client.messages.create({
    to: "+1" + phoneNumber,
    from: "+17739749268",
    body: messageBody
  });
};

module.exports = smsFunctions;
