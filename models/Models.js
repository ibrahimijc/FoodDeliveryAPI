const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema({
  authy_id: {
    type: String,
    default: null,
  },

  Name: {
    type: String,
    required: true,
  },

  Phone: {
    type: String,
    required: true,
    unique: true,
  },

  CountryCode: {
    type: String,
  },

  Verified: {
    type: Boolean,
    default: false,
  },

  Email: {
    type: String,
    required: true,

    validate(value) {
      // Regex Expression for valid Email
      let re = /\S+@\S+\.\S+/;

      const result = re.test(value);

      // if the email is not correct
      if (!result) {
        throw new Error("Email is not correct");
      }
    },
  },

  Password: {
    type: String,
    required: true,
    minlength: 7,
  },
  tokens: [
    {
      token: {
        type: String,
        required: true,
      },
    },
  ],
});

UserSchema.methods.generateAuthToken = async function () {
  try {
    const customer = this;
    const token = jwt.sign(
      { _id: customer._id.toString() },
      process.env.secret
    );
    customer.tokens = customer.tokens.concat({ token });
    await customer.save();

    return token;
  } catch (e) {
    throw new Error(e.message);
  }
};

UserSchema.statics.findByCredentials = async function (phone, password) {
  const customer = await Customer.findOne({ Phone: phone });
  if (!customer) {
    throw Error({
      message: "unable to login",
      success: false,
    });
  }

  // If customer is not verified
  if (!customer.Verified){
    throw Error({
      message: "unable to login",
      success: false,
    });
  }

  const isMatch = await bcrypt.compare(password, customer.Password);
  if (!isMatch) {
    throw Error({
      message: "unable to login",
      success: false,
    });
  }

  return customer;
};

UserSchema.statics.riderFindByCredentials = async function (phone, password) {
  const rider = await Rider.findOne({ Phone: phone });
  if (!rider) {
    throw Error({
      message: "unable to login",
      success: false,
    });
  }

   // If customer is not verified
   if (!rider.Verified){
    throw Error({
      message: "unable to login",
      success: false,
    });
  }

  const isMatch = await bcrypt.compare(password, rider.Password);
  if (!isMatch) {
    throw Error({
      message: "unable to login",
      success: false,
    });
  }

  return rider;
};

//  runs before saving the user to store password as a hash in db
UserSchema.pre("save", async function (next) {
  const customer = this;
  if (customer.isModified("Password")) {
    customer.Password = await bcrypt.hash(customer.Password, 8);
  }
  next();
});

UserSchema.virtual("customerOrders", {
  ref: "Order",
  localField: "_id",
  foreignField: "owner",
});

const Customer = mongoose.model("Customer", UserSchema);
const Rider = mongoose.model("Rider", UserSchema);
module.exports = { Customer, Rider };
