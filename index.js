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
const awsS3 = require('aws-s3');

//~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.
/*const aws = require("aws-sdk");
aws.config.update({
  region: process.env.REGION // region of your bucket
});*/
//~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.~.

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
	var imageNameOriginal= destination + "/" + checksum  ;
	var imageNameSmall= destination + "/" + checksum + "_small";
	var smallFileName = checksum + "_small";
	var imageNameLarge= destination + "/" + checksum + "_st";
	var largeFileName = checksum + "_st";
	return new Promise(function(resolve, reject) {
		for (var i = 0; i < 3; i++) {
			if (imageNameSmall) {
				sharp(path)
	    			.resize(200,200)
	    			.toBuffer()
	    			.then( data => {
	        		fs.writeFileSync(imageNameSmall, data);
					const config = {
		    		bucketName: 'upload-file-flatlay',
					    region: process.env.REGION ,
					    accessKeyId:  process.env.ACCESSKEYID,
					    secretAccessKey: process.env.SECRETACCESSKEY
					}
					// const S3Client = new awsS3(config);
					// S3Client
					//     .uploadFile(imageNameSmall, smallFileName)
					//     .then(data => console.log(data))
					//     .catch(err => console.error(err));
					response.message = "post Successful";
	        		resolve(response);
					})
	    		.catch( err => {
	        	console.log(err);
	        	reject (err);
	    		});

			} if(imageNameLarge){
			sharp(path)
		    .resize(1080,1080)
		    .toBuffer()
		    .then( data => {
		        fs.writeFileSync(imageNameLarge, data);
				const config = {
		    		bucketName: 'upload-file-flatlay',
				    region: process.env.REGION ,
				    accessKeyId:  process.env.ACCESSKEYID,
				    secretAccessKey: process.env.SECRETACCESSKEY
				}


				var FormData = require('form-data');
				var form = new FormData();
				form.append('file', fs.createReadStream('/home/mrm/Desktop/Proj/S3-Upload-image/uploads/download.jpeg'));

				

				const S3Client = new awsS3(config);
		 		S3Client
			    .uploadFile(form)
			    .then(data => console.log(data))
			    .catch(err => console.error(err));
					response.message = "post Successful";
			        resolve(response);
		    	})
		    .catch( err => {
		        console.log(err);
		        reject (err);
		    });
		} else {	
			const config = {
		    	bucketName: 'upload-file-flatlay', 
				region: process.env.REGION ,
				accessKeyId:  process.env.ACCESSKEYID,
				secretAccessKey: process.env.SECRETACCESSKEY
			}
/*			const S3Client = new awsS3(config);
		 	S3Client
			    .uploadFile(path, imageNameOriginal)
			    .then(data => console.log(data))
			    .catch(err => console.error(err));*/
				response.message = "post Successful";
		        resolve(response);
		}
	} //end of for
	});//Promise
});
