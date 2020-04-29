const express = require("express");
const router = express.Router();
const { Customer } = require("../models/Models");
const sms = require("../utilities/sms");
const { sendOTP, registerUser, verifyUser } = sms;
const { authCustomer } = require("../middlewear/Auth");

router.get("/customer/test", function (req, res) {
  res.status(200).send("Working");
});

router.post("/customer/login", async function (req, res) {
  try {
    const customer = await Customer.findByCredentials(
      req.body.Phone,
      req.body.Password
    );

    const token = await customer.generateAuthToken();
    res.send({ success: true, customer, token });
    return;
  } catch (e) {
    res.status(400).send({ success: false, message: "unable to login. Check Credentials"});
    return;
  }
});

router.post("/customer/register", async (req, res) => {
  try {
    const customer = new Customer(req.body);
    registerUser(
      req.body.Email,
      req.body.Phone,
      req.body.CountryCode,
      async (err, twilioResponse) => {
        if (twilioResponse) {
          customer.authy_id = twilioResponse.user.id;
          customer.CountryCode = req.body.CountryCode;
          let token;
          let existingCustomer;

          try {
            // if the customer already
            existingCustomer = await Customer.findOne({
              authy_id: customer.authy_id,
            });

            


            // if the customer is already verified
            if (existingCustomer && existingCustomer.Verified) {
              res
                .status(400)
                .send({ success: false, message: "User already exist" });
              return;
            }

            // If the customer has already registered but not verified. Can't change his details on signup now
            if (existingCustomer && !customer.equals(existingCustomer)){
              res.status(400).send({success:false,message:"Account already registered but unverified. Goto forgot passworod"})
              return;
            }


            // if customer doesn't exist then only persist in database
            if (!existingCustomer) {
              try {
                await customer.save();
                token = await customer.generateAuthToken(); // generate AuthToken for furher operations
              } catch (customerError) {
                res.status(400).send({
                  success: false,
                  "Error ": customerError.message,
                  message: "Couldn't register",
                });
                return;
              }
            }
          } catch (e) {
            res.status(500).send({
              success: false,
              message: "Internal server Error",
              Error: e,
            });
            return;
          }

          // send one time password to the customer
          sendOTP(customer.authy_id, async function (otpErr, otpRes) {
            if (otpErr) {
              res.status(400).send({ success: false, "Error ": otpErr.message });
              return;
            } else if (otpRes) {
              res.status(201).send({ success: true, customer, token });
            }
          });
          // send the final result after twilio registration, mongodb registration, otp sent
         
        } else if (err) {
          res.status(400).send({ success: false, "Error ": err.message });
          return;
        }
      }
    );
  } catch (e) {
    res.status(400).send({ success: false, Error: e });
    return;
  }
});

router.post("/customer/verify", function (req, res) {
  // get the token given by user.
  // authy_id
  // Post to authy for the verification
  // return the success or failure
  // OTP the one time password provided by the user for verification
  const id = req.body.authy_id;
  const OTP = req.body.one_time_password;

  verifyUser(id, OTP, async function (twilioerr, twilioResponse) {
    if (twilioerr) {
      res.status(500).send({
        Error: twilioerr,
        message: "unable to verify the user",
        success: false,
      });
    } else if (twilioResponse) {
      try {
        const customer = await Customer.findOne({ authy_id: id });
        customer.Verified = true;
        await customer.save();
        res.status(200).send({
          success: true,
          message: "User Verified Successfully",
          customer,
        });
      } catch (e) {
        res.status(500).send({
          Error: e,
          message: "unable to verify the user",
          success: false,
        });
        return;
      }
    }
  });
});

router.post("/customer/forgot/password", async (req, res) => {
  const phoneNumber = req.body.Phone;
  try {
    const customer = await Customer.findOne({
      Phone: phoneNumber
     
    });

    // if customer don't exist send back
    if (!customer) {
      res
        .status(400)
        .send({ success: false, message: "No account against this number" });
      return;
    }

    const authy_id = customer.authy_id;
    sendOTP(authy_id, (err, twilioResponse) => {
      if (twilioResponse) {
        res
          .status(200)
          .send({ success: true, message: "OTP has been sent", authy_id });
        return;
      } else {
        res.status(500).send({
          success: false,
          message: "Sending OTP was not successful ",
          Error: err,
        });
        return;
      }
    });
  } catch (e) {
    res.status(500).send({
      success: false,
      message: "Error in fetching customer",
      Error: e,
    });
  }
});

router.patch("/customer/password", authCustomer, async (req, res) => {
  const newPassword = req.body.newPassword;
  const Phone = req.body.Phone;
  try {
    const customer = await Customer.findOne({ Phone });

    if (!customer){
      res.status(400).send({success:false, message:"Customer not registered with this number"});
    }


    customer.Password = newPassword;
    await customer.save();
    res.status(200).send({ success: true, Customer: customer });
  } catch (e) {
    res.status(500).send({
      success: false,
      message: "Could not update password ",
      Error: e,
    });
  }
});

module.exports = router;
