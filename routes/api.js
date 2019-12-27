const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const Partner = mongoose.model("partners");
const Cart = mongoose.model("carts");
const httpRespond = require("../functions/httpRespond");

module.exports = app => {
  app.get("/api/check_cart/:clientId/:serviceId", async (req, res) => {
    const cart = await Cart.findOne({
      cart_belongs_to: req.params.clientId,
      hasCheckedout: false
    });

    if (cart !== null) {
      let data = cart.items.filter(function(value) {
        return value.services._id == req.params.serviceId;
      });

      return httpRespond.authRespond(res, {
        status: true,
        item_exist: data.length !== 0 ? true : false,
        message: data.length !== 0 ? "item exist" : "item does not exist"
      });
    }
    return httpRespond.authRespond(res, {
      status: true,
      item_exist: false,
      message: "item does not exist"
    });
  });

  app.get("/api/cart_count/:clientId/", async (req, res) => {
    const cart_count = await Cart.findOne({
      cart_belongs_to: req.params.clientId
    }).count();
    //console.log(cart_count);
    return httpRespond.authRespond(res, {
      status: cart_count !== 0 ? true : false
    });
  });

  app.get("/api/cart/:clientId/", async (req, res) => {
    const cart = await Cart.findOne({
      cart_belongs_to: req.params.clientId,
      hasCheckedout: false
    });
    return httpRespond.authRespond(res, {
      status: true,
      cart
    });
  });

  app.post("/add_to_cart", async (req, res) => {
    try {
      const cartExist = await Cart.findOne({
        cart_belongs_to: req.body.clientId,
        hasCheckedout: false
      });
      const services = req.body.services;
      const newCart = {
        cart_belongs_to: req.body.clientId,
        cart_is_for: req.body.partnerId,
        items: { services }
      };

      if (cartExist) {
        if (cartExist.cart_is_for == req.body.partnerId) {
          //  update cart
          const cart = await Cart.update(
            { _id: cartExist._id },
            { $push: { items: { services } } }
          );
          return httpRespond.authRespond(res, {
            status: true
          });
        } else {
          return httpRespond.authRespond(res, {
            status: false
          });
        }
      } else {
        //new cart
        const cart = await new Cart(newCart).save();
        return httpRespond.authRespond(res, {
          status: true
        });
      }
    } catch (e) {
      return httpRespond.authRespond(res, {
        status: true,
        message: e
      });
    }
  });
};
