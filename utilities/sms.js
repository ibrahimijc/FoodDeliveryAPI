const authyToken = process.env.authyToken;
const authy = require("authy")(authyToken);

function verifyUser(authy_id, OTP, cb) {
  authy.verify(authy_id, (token = OTP), function (err, res) {
    if (err) {
      cb(err, null);
    } else if (res) {
      cb(null, res);
    }
  });
}

async function registerUser(email, number, countryCode, cb) {
  authy.register_user(email, number, countryCode, function (err, res) {
    if (res) {
      cb(null, res);
    }
    if (err) {
      cb(err, null);
    }
  });
}

function sendOTP(id, cb) {
  authy.request_sms((authy_id = id), function (err, res) {
    if (res) {
      cb(null, res);
    }
    if (err) {
      cb(err, null);
    }
  });
}

module.exports = { sendOTP, registerUser, verifyUser };
