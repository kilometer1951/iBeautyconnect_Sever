// const passport = require("passport");
// const LocalStrategy = require("passport-local").Strategy;
// const mongoose = require("mongoose");
//
// const User = mongoose.model("users");
//
// passport.serializeUser(function(user, done) {
//   done(null, user.id);
// });
//
// passport.deserializeUser(function(id, done) {
//   if (err) done(err);
//   User.findById(id, function(err, user) {
//     if (err) done(err);
//     done(err, user);
//   });
// });
//
// /* Sign in using Email and Password */
// passport.use(
//   "local-login",
//   new LocalStrategy(
//     {
//       usernameField: "email",
//       passwordField: "password",
//       passReqToCallback: true
//     },
//     function(req, email, password, done) {
//       User.findOne({ email: email }, function(err, user) {
//         if (err) return done(err);
//         if (!user) return done(null, false);
//         if (!user.comparePassword(password)) return done(null, false);
//         return done(null, user);
//       });
//     }
//   )
// );
