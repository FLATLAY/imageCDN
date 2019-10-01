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