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
/*const aws = require("aws-sdk");
aws.config.update({
  region: process.env.REGION // region of your bucket
});*/
//~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.
import S3 from 'aws-s3';

app.post("/upload", upload.single("image"), function(req, res) {
	var path =res.req.file.path;
	function base64_encode(file) {

      var bitmap = fs.readFileSync(file);
      // convert binary data to base64 encoded string
      return new Buffer.from(bitmap).toString('base64');
    }
   	var encodedFile= base64_encode(path);
   	var checksum = crypto
      .createHash("SHA256")
      .update(encodedFile)
      .digest("hex");
	//console.log(checksum);
	var response={}
	var destination= res.req.file.destination;
	var imageNameOriginag= destination + "/" + checksum ;
	var imageNameSmall= destination + "/" + checksum + "_small.jpg";
	var imageNameLarge= destination + "/" + checksum + "_large.jpg";
	return new Promise(function(resolve, reject) {
		for (var i = 0; i < 3; i++) {
			if (imageNameSmall) {
			sharp(path)
    		.resize(200,200)
    		.toBuffer()
    		.then( data => {
        	var imageSmall = fs.writeFileSync(imageNameSmall, data);
			const config = {
	    		bucketName: 'upload-file-flatlay',
			    dirName: imageSmall, 
			    region: process.env.REGION ,
			    accessKeyId:  process.env.ACCESSKEYID,
			    secretAccessKey: process.env.SECRETACCESSKEY
			}
			response.message = "post Successful";
        	res.json(response);
        	resolve(response);
    	})
    	.catch( err => {
        	console.log(err);
        	reject (err);
    	});

		} if(imageNameLarge){
			sharp(path)
		    .resize(1800,1800)
		    .toBuffer()
		    .then( data => {
		        var imageLarge = fs.writeFileSync(imageNameLarge, data);
        	const config = {
	    		bucketName: 'upload-file-flatlay',
			    dirName: imageLarge, 
			    region: process.env.REGION ,
			    accessKeyId:  process.env.ACCESSKEYID,
			    secretAccessKey: process.env.SECRETACCESSKEY
			}
				response.message = "post Successful";
		        res.json(response);
		        resolve(response);
		    })
		    .catch( err => {
		        console.log(err);
		        reject (err);
		    });
			} else {
			sharp(path)
		    .toBuffer()
		    .then( data => {
		        var imageOriginag= fs.writeFileSync(imageNameOriginag, data);
        	const config = {
	    		bucketName: 'upload-file-flatlay',
			    dirName: imageOriginag, 
			    region: process.env.REGION ,
			    accessKeyId:  process.env.ACCESSKEYID,
			    secretAccessKey: process.env.SECRETACCESSKEY
			}
				response.message = "post Successful";
		        res.json(response);
		        resolve(response);
		    })
		    .catch( err => {
		        console.log(err);
		        reject (err);
		    });	
			}
		} //end of for
	});//Promise
});