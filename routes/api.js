const mongoose = require("mongoose");
const Client = mongoose.model("clients");
const Partner = mongoose.model("partners");
const Cart = mongoose.model("carts");
const httpRespond = require("../functions/httpRespond");
const stripe = require("stripe")("sk_test_v7ZVDHiaLp9PXgOqQ65c678g");

module.exports = app => {
  app.get(
    "/api/check_cart/:clientId/:partnerId/:serviceId",
    async (req, res) => {
      const cart = await Cart.findOne({
        cart_belongs_to: req.params.clientId,
        cart_is_for: req.params.partnerId,
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
    }
  );

  app.get("/api/cart_count/:clientId/", async (req, res) => {
    const cart_count = await Cart.findOne({
      cart_belongs_to: req.params.clientId
    }).count();
    //console.log(cart_count);
    return httpRespond.authRespond(res, {
      status: cart_count !== 0 ? true : false
    });
  });

  app.get("/api/cart_regular/:clientId/", async (req, res) => {
    const cart = await Cart.find({
      cart_belongs_to: req.params.clientId,
      type_of_cart: "regular",
      hasCheckedout: false
    }).populate("cart_is_for");

    console.log(cart);

    return httpRespond.authRespond(res, {
      status: true,
      cart
    });
  });

  app.post("/api/add_to_cart", async (req, res) => {
    try {
      const cartExist = await Cart.findOne({
        cart_belongs_to: req.body.clientId,
        cart_is_for: req.body.partnerId,
        type_of_cart: "regular",
        hasCheckedout: false
      });
      const services = req.body.services;
      const newCart = {
        cart_belongs_to: req.body.clientId,
        cart_is_for: req.body.partnerId,
        items: { services }
      };

      if (cartExist) {
        //  update cart
        const cart = await Cart.update(
          { _id: cartExist._id },
          { $push: { items: { services } } }
        );
        return httpRespond.authRespond(res, {
          status: true
        });
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

  app.post("/api/delete_cart_item", async (req, res) => {
    const updated = await Cart.update(
      {
        _id: req.body.cartId,
        hasCheckedout: false
      },
      {
        $pull: {
          items: {
            _id: req.body.itemID
          }
        }
      },

      {
        multi: true
      }
    );

    const cart = await Cart.findOne({
      _id: req.body.cartId,
      hasCheckedout: false
    });

    if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: req.body.cartId, hasCheckedout: false });
    }
    return httpRespond.authRespond(res, {
      status: true
    });
  });
};
