const { getLinkPreview } = require('link-preview-js');
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json({
	limit: '50mb'
}));
app.use(bodyParser.urlencoded({
	limit: '50mb',
	extended: true
}));

const port = process.env.PORT;
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
	var origin = res.req.file.destination;
	var bitmap = fs.readFileSync(path);
	// convert binary data to base64 encoded string
	var encodedFile = new Buffer.from(bitmap).toString('base64');
	var checksum = crypto
		.createHash("SHA256")
		.update(encodedFile)
		.digest("hex");
	uploadPhoto(path, origin, checksum, res, 0);
});

app.post("/uploadB64", async function (req, res) {
	var origin = __dirname + "/uploads";
	var checksum = crypto
		.createHash("SHA256")
		.update(req.body.data)
		.digest("hex");
	var base64Data = req.body.data.replace(/^data:image\/\w+;base64,/, "");
	var path = __dirname + "/uploads/" + checksum;
	await fs.writeFile(path, base64Data, 'base64', function (err) {
		console.log("Writing Errors: " + err);
		uploadPhoto(path, origin, checksum, res, 1);
	});
});

app.post("/uploadB64file", async function (req, res) {
	var checksum = crypto
		.createHash("SHA256")
		.update(req.body.data)
		.digest("hex");
	var matches = req.body.data.match(/^data:(.+);base64,(.+)$/);
	if (matches.length !== 3)
		return res.json('Invalid input base64. Valid form: data:{dataType};base64,{base64data}').status(400).end();
	
	var base64Data = matches[2];
	const dataType = matches[1];
	const supportedDataTypes = ['application/pdf', 'application/msword'];
	if (!supportedDataTypes.includes(dataType))
		return res.json("Invalid base64 data type. Valid types: '" + supportedDataTypes.join("', '") + "'").status(400).end();
	
	var path = __dirname + "/uploads/" + checksum;
	await fs.writeFile(path, base64Data, 'base64', function (err) {
		console.log("Writing Errors: " + err);
		uploadFile(path, dataType, checksum, res);
	});
});

app.post("/link-preview", function (req, res) {
	res.setHeader('content-type', 'application/json');

	const response = {};
	const url = req.body['url'];
	if (!url) {
		response.message = 'url parameter is not specified in body';
		res.send(JSON.stringify(response)).status(400);
	}
	getLinkPreview(url)
		.then((data) => res.json(data))
		.catch(err => {
			response.message = 'Error in parsing the specified URL';
			response.error_detail = err;
			res.send(response).status(400);
		});
});

function uploadPhoto(path, origin, checksum, res, isB64) {
	var response = {};
	//This object holds images to be uploaded
	var images = [];

	var imagePathOriginal = path; 
	var imagePathSmall = origin + "\\" + checksum + "_sm";
	var imagePathLarge = origin + "\\" + checksum + "_st";

	var imageNameSmall = checksum;
	var imageNameOriginal = imageNameSmall + "_or";
	var imageNameLarge = imageNameSmall + "_st";

	//addding image files and their location in an array to facilitate upload
	images.push({
		"path": imagePathOriginal,
		"name": imageNameOriginal,
		"type": "original"
	})
	images.push({
		"path": imagePathSmall,
		"name": imageNameSmall,
		"type": "small"
	})
	images.push({
		"path": imagePathLarge,
		"name": imageNameLarge,
		"type": "standard"
	})

	return new Promise(function (resolve, reject) {
		//creating thumbnail
		sharp(imagePathOriginal)
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
						var countImagesCopied = 0;
						images.forEach(function (element) {
							console.log(element.path);
							fs.readFile(element.path, (err, data) => {
								if (err){
									console.log(err);
									reject(err);
								}
								const params = {
									Bucket: 'upload-file-flatlay', // bucket name
									Key: element.name, // file name
									ContentType: 'image/png', 
									ACL: 'public-read',
									Body: data
								};
								s3.upload(params, function (s3Err, data) {
									if (s3Err) throw s3Err
									console.log(`File uploaded successfully at ${data.Location}`)
									response[element.type] = data.Location;
									//just a lazy hack for making response assynchronous
									countImagesCopied++;
									
									if (countImagesCopied == images.length) {
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
}

function uploadFile(path, dataType, checksum, res) {
	var response = {};

	var imagePathOriginal = path;
	var imageNameOriginal = checksum + "_or";

	var file = {
		"path": imagePathOriginal,
		"name": imageNameOriginal,
		"type": "original"
	};

	return new Promise(function (resolve, reject) {
		//uploading to s3
		var element = file;
		console.log(element.path);
		fs.readFile(element.path, (err, data) => {
			if (err) {
				console.log(err);
				reject(err);
			}
			const params = {
				Bucket: 'upload-file-flatlay', // bucket name
				Key: element.name, // file name
				ContentType: dataType,
				ACL: 'public-read',
				Body: data
			};
			s3.upload(params, function (s3Err, data) {
				if (s3Err) throw s3Err
				console.log(`File uploaded successfully at ${data.Location}`)
				response[element.type] = data.Location;
				fs.unlink(element.path, function (err) {
					if (err) {
						console.error(err);
					}
					console.log(element.name + ' has been Deleted Locally');
				});
				response.message = "post Successful";
				res.send(response);
				resolve(response);
			});
		});
	});
}
