const mongoose = require("mongoose");
/*
Since MongoDb don't have it's own counter indexer except for the MongoDb Id.
And MongoDb Id cannot be used for Order Id because it won't be human friendly.

This counter is created to generate the Order ID in increasing fashion.

Can be used for generating Id's for other purposes too.
*/
const CounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: "entity",
  },
  count: {
    type: Number,
    default: 0,
  },
});

const counter = mongoose.model("Count", CounterSchema);
module.exports = counter;
