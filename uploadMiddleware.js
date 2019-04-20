var crypto = require("crypto");
var multer = require("multer");
var path = require("path");
var fs = require('fs');
//const multerS3 = require("multer-s3");
//~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.
//for upload Image
//destination: Indicates where you want to save your files
//filename: Indicates how you want your files named.

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname + "/uploads"));
  },
  filename: (req, file, cb) => {
    //TODO: choosing the name is better to be via content hash rather than this (Important)
    var bytes = file.fieldname + "-" + Date.now() + "-" + file.originalname;
    //var byt = Buffer.from(req.body.image, 'base64');
    //create the SHA256 hash of the random bytes
    var checksum = crypto
      .createHash("SHA256")
      .update(bytes)
      .digest("hex");

    cb(null, checksum);
  }
});
var upload = multer({
  storage: storage
});
module.exports = upload