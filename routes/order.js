const express = require("express");
const router = express.Router();
const { authCustomer, authRider } = require("../middlewear/Auth");
const Order = require("../models/Order");

/*
    End point to Update Order or Make order
*/
router.post("/customer/order", authCustomer, async (req, res) => {
  console.log("Request Body",req.body);


  const orders = new Order({ ...req.body, Owner: req.customer._id });
  try {
    await orders.save();
    res.status(201).send({ orders, success: true });
  } catch (e) {
    res.status(400);
    res.send({
      Error: e,
      success: false,
    });
  }
});

/*
    End point to get the orders of the User
    authCustomer is the middlewear which will verify if the customer is authenticated or not
*/
router.get("/customer/orders", authCustomer, async (req, res) => {
  try {
    const customerOrders = await Order.find({
      Owner: req.customer._id,
    });
    res.status(200).send({ success: true, Orders: customerOrders });
  } catch (e) {
    res.status(400).send({ success: false, "Error ": e.message });
  }
});

// get the detail of the order via Id
router.get("/customer/order/:id", authCustomer, async (req, res) => {
  const OrderId = req.params.id;
  try {
    const orderDetail = await Order.findOne({
      Owner: req.customer._id,
      OrderId,
    });
    // If order is not found
    if (!orderDetail) {
      res.status(400).send({ success: false, Error: "Order not found" });
      return;
    }

    res.status(200).send({ success: true, Order: orderDetail });
    return;
  } catch (e) {
    res.status(500).send({ success: false, Error: e.message });
    return;
  }
});

// Displays orders to the rider
router.get("/rider/orders", authRider, async (req, res) => {
  // bring out all orders.
  const orders = await Order.find({});
  res.status(200).send({ success: true, Orders: orders });
});

/*
Allows the rider to change the status of Order
Updates the status to accepted
*/
router.patch("/rider/status/accept/:id", authRider, async (req, res) => {
  const OrderId = req.params.id;

  try {
    const updateOrder = await Order.findOne({ OrderId });

    // if Order with Id do not exist
    if (!updateOrder) {
      res
        .status(400)
        .send({ success: false, Error: "Order with the id does not exist" });
      return;
    }

    updateOrder.Status = "ACCEPTED";

    await updateOrder.save();
    res.status(200).send({ success: true, Order: updateOrder });
  } catch (e) {
    res.status(400).send({ success: false, Error: e.message });
  }
});

/*
Allows the rider to change the status of Order
Updates the status to Delivered
*/
router.patch("/rider/status/deliver/:id", authRider, async (req, res) => {
  const OrderId = req.params.id;

  try {
    const updateOrder = await Order.findOne({ OrderId });

    // if Order with Id do not exist
    if (!updateOrder) {
      res
        .status(400)
        .send({ success: false, Error: "Order with the id does not exist" });
      return;
    }

    updateOrder.Status = "DELIVERED";

    await updateOrder.save();
    res.status(200).send({ success: true, Order: updateOrder });
  } catch (e) {
    res.status(400).send({ success: false, Error: e.message });
  }
});

module.exports = router;
