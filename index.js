require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.listen(port, function () {
	console.log('Server is running on PORT', port);
});

const upload = require('./uploadMiddleware.js');
var crypto = require("crypto");
var fs = require('fs');
const sharp = require('sharp');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
	region: process.env.REGION,
	accessKeyId: process.env.ACCESSKEYID,
	secretAccessKey: process.env.SECRETACCESSKEY
});

app.post("/upload", upload.single("image"), function (req, res) {
	var path = res.req.file.path;

	function base64_encode(file) {
		var bitmap = fs.readFileSync(file);
		// convert binary data to base64 encoded string
		return new Buffer.from(bitmap).toString('base64');
	}
	var encodedFile = base64_encode(path);
	var checksum = crypto
		.createHash("SHA256")
		.update(encodedFile)
		.digest("hex");

	var response = {}
	var destination = res.req.file.destination;

	//This object holds images to be uploaded
	var images = [];

	var imagePathOriginal = path;
	var imagePathSmall = destination + "\\" + checksum + "_sm";
	var imagePathLarge = destination + "\\" + checksum + "_st";

	var imageNameOriginal = checksum;
	var imageNameSmall = imageNameOriginal + "_sm";
	var imageNameLarge = imageNameOriginal + "_st";


	//addding image files and their location in an array to facilitate upload
	images.push({
		"path": imagePathOriginal,
		"name": imageNameOriginal,
		"type":"original"
	})
	images.push({
		"path": imagePathSmall,
		"name": imageNameSmall,
		"type":"small"
	})
	images.push({
		"path": imagePathLarge,
		"name": imageNameLarge,
		"type":"standard"
	})

	return new Promise(function (resolve, reject) {
		//creating thumbnail
		sharp(path)
			.resize(300, 300)
			.toBuffer()
			.then(data => {
				fs.writeFileSync(imagePathSmall, data);
				response.small = "Successful";


				//creating standard size
				sharp(path)
					.resize(1080, 1080)
					.toBuffer()
					.then(data => {
						fs.writeFileSync(imagePathLarge, data);
						

						//uploading to s3
						images.forEach(function (element) {
							console.log(element.path);
							fs.readFile(element.path, (err, data) => {
								if (err) throw err;
								const params = {
									Bucket: 'upload-file-flatlay', // bucket name
									Key: element.name, // file name
									Body: data
								};
								s3.upload(params, function (s3Err, data) {
									if (s3Err) throw s3Err
									console.log(`File uploaded successfully at ${data.Location}`)
									response[element.type] = data.Location;
									//just a lazy hack for making response assynchronous
									if(element.type == "standard"){ 
										response.message = "post Successful";
										res.send(response);
										resolve(response);
									}
									fs.unlink(element.path, function (err) {
										if (err) {
											console.error(err);
										}
										console.log(element.name + ' has been Deleted Locally');
									});
								});
							});
						});

						
					})
					.catch(err => {
						console.log(err);
						reject(err);
					});
			})
			.catch(err => {
				console.log(err);
				reject(err);
			});

	});
});