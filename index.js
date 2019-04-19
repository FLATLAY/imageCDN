// index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT;
const router = express.Router();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('public'));
app.use('/upload', router);

app.listen(port, function () {
  console.log('Server is running on PORT',port);
});

const upload = require('./uploadMiddleware.js');
var crypto = require("crypto");
var multer = require("multer");
var path = require("path");
var fs = require('fs');
const sharp = require('sharp');
//~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.
//const multerS3 = require("multer-s3");
const aws = require("aws-sdk");
aws.config.update({
  secretAccessKey: process.env.SECRETACCESSKEY,
  accessKeyId: process.env.ACCESSKEYID,
  region: process.env.REGION // region of your bucket
});

const s3 = new aws.S3();
//~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.

app.post("/upload", upload.single("image"), function(req, res) {
	//console.log(res.req.file.filename);
	var path =res.req.file.path;
	function base64_encode(file) {

      var bitmap = fs.readFileSync(file);
      // convert binary data to base64 encoded string
      return new Buffer.from(bitmap).toString('base64');
    }
   	var encodedFile= base64_encode(path);
   	//console.log(encodedFile);
   	var checksum = crypto
      .createHash("SHA256")
      .update(encodedFile)
      .digest("hex");
	//console.log(checksum);
	var response={}
	var destination= res.req.file.destination;
	var imageName= destination + "/" + checksum + "_small.jpg";
	console.log(imageName);
	return new Promise(function(resolve, reject) {
	sharp(imageName)
    .resize(200,200)
    .toBuffer()
    .then( data => {
    	//{ imageName, encoding: null }
        fs.writeFileSync(imageName, data);
		response.message = "post Successful";
        res.json(response);
        resolve(response);
		//console.log('post DONE');
    })
    .catch( err => {
        console.log(err);
        reject (err);
    });
	
	});//Promise
});