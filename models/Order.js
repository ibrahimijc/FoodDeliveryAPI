const mongoose = require("mongoose");
let orderCount = 1000;
const Counter = require("../models/Counter");

const OrderSchema = new mongoose.Schema({
  OrderId: {
    type: Number,
    default: 0,
    unique: true,
  },

  Title: {
    type: String,
    default: "Order Items",
    required: true,
  },

  Owner: {
    type: mongoose.SchemaTypes.ObjectId,
    required: true,
  },

  Status: {
    type: String,
    required: true,
    enum: ["PLACED", "ACCEPTED", "DELIVERED"],
    default: "PLACED",
  },

  Address: {
    type: String,
    required: true,
  },

  PaymentMethod: {
    type: String,
    required: true,
    default: "CASH",
  },

  Items: [
    {
      Name: {
        type: String,
        required: true,
      },
      Price: {
        type: Number,
        required: true,
      },
      Quantity: {
        type: Number,
        required: true,
        default: 1,
      },
      Vendor: {
        type: String,
        required: true,
      },
    },
  ],
});

OrderSchema.pre("save", function (next) {
  // A logic to have a counter for OrderId as mongoose don't support autoIncrement like SQL
  // Whenever Order database is updating get the counter and assign the new value to OrderId
  if (this.isNew) {
    let order = this;
    let updatedOrderValue = 0;
    Counter.findOneAndUpdate(
      { _id: "entity" },
      { $inc: { count: 1 } },
      { new: true },
      async (err, res) => {
        if (!res) {
          const counter = new Counter({
            _id: "entity",
            count: 1000,
          });
          updatedOrderValue = counter.count;
          await counter.save();
        } else {
          updatedOrderValue = res.count;
        }

        order.OrderId = updatedOrderValue;
        next();
      }
    );
  } else {
    next();
  }
});

const Order = mongoose.model("Orders", OrderSchema);
module.exports = Order;
