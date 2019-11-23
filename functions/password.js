const bcrypt = require("bcrypt-nodejs");
const password = {};

password.encryptPassword = password => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
};

password.comparePassword = function(enteredPassword, currentPassword) {
  return bcrypt.compareSync(enteredPassword, currentPassword);
};

module.exports = password;
