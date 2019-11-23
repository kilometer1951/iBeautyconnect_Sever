const httpRespond = {};

httpRespond.authRespond = (res, response) => {
  return res.send(response);
};

module.exports = httpRespond;
