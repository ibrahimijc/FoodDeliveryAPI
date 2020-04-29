const express = require("express");
const router = express.Router();
const { Rider } = require("../models/Models");
const { authRider } = require("../middlewear/Auth");
const { registerUser, verifyUser, sendOTP } = require("../utilities/sms");

router.post("/rider/login", async function (req, res) {
  try {
    const rider = await Rider.riderFindByCredentials(
      req.body.Phone,
      req.body.Password
    );
    const token = await rider.generateAuthToken();
    res.send({ success: true, rider, token });
  } catch (e) {
    res
      .status(400)
      .send({ success: false, message: "Unable to login Check Credentials" });
  }
});

router.post("/rider/register", async (req, res) => {
  try {
    const rider = new Rider(req.body);
    registerUser(
      req.body.Email,
      req.body.Phone,
      req.body.CountryCode,
      async (err, twilioResponse) => {
        if (twilioResponse) {
          rider.authy_id = twilioResponse.user.id;
          rider.CountryCode = req.body.CountryCode;
          let token;
          let existingRider;

          try {
            // if the rider already
            existingRider = await Rider.findOne({
              authy_id: rider.authy_id,
            });

            // if the rider is already verified
            if (existingRider && existingRider.Verified) {
              res
                .status(400)
                .send({ success: false, message: "User already exist" });
              return;
            }

            // If the rider has already registered but not verified. Can't change his details on signup now
            if (existingRider && !rider.equals(existingRider)){
              res.status(400).send({success:false,message:"Account already registered but unverified. Goto forgot passworod"})
              return;
            }



            // if rider doesn't exist then only persist in database
            if (!existingRider) {
              try {
                await rider.save();
                token = await rider.generateAuthToken(); // generate AuthToken for furher operations
              } catch (riderError) {
                res.status(400).send({
                  success: false,
                  "Error ": riderError.message,
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

          // send one time password to the rider
          sendOTP(rider.authy_id, function (otpErr, otpRes) {
            if (otpErr) {
              res.status(400).send({ success: false, "Error ": otpErr.message });
              return;
            } else if (otpRes) {
              res.status(201).send({ success: true, rider, token });
              return;

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

router.post("/rider/verify", function (req, res) {
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
        const rider = await Rider.findOne({ authy_id: id });
        rider.Verified = true;
        await rider.save();
        res.status(200).send({
          success: true,
          message: "User Verified Successfully",
          rider,
        });
      } catch (e) {
        res.status(500).send({
          Error: e,
          message: "unable to verify the user",
          success: false,
        });
      }
    }
  });
});

router.post("/rider/forgot/password", async (req, res) => {
  const phoneNumber = req.body.Phone;
  try {
    const rider = await Rider.findOne({ Phone: phoneNumber});


    // if rider don't exist send back
    if (!rider) {
      res
        .status(400)
        .send({ success: false, message: "No account against this number" });
      return;
    }


    const authy_id = rider.authy_id;
    sendOTP(authy_id, (err, twilioResponse) => {
      if (twilioResponse)
        res.status(200).send({ success: true, message: "OTP has been sent" , authy_id});
      else {
        res.status(500).send({
          success: false,
          message: "Sending OTP was not successful ",
          Error: err,
        });
      }
    });
  } catch (e) {
    res
      .status(500)
      .send({ success: false, message: "Error in fetching rider", Error: e });
  }
});

router.patch("/rider/password", authRider, async (req, res) => {
  const newPassword = req.body.newPassword;
  const Phone = req.body.Phone;
  try {
    const rider = await Rider.findOne({ Phone });

    if (!rider){
      res.status(400).send({success:false, message:"Rider not registered with this number"});
      return;
    }


    rider.Password = newPassword;
    await rider.save();
    res.status(200).send({ success: true, rider: rider });
  } catch (e) {
    res.status(500).send({
      success: false,
      message: "Could not update password ",
      Error: e,
    });
  }
});

module.exports = router;
