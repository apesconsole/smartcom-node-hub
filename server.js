/*
	Apes's Console
*/

var express = require("express");
var app = express();
var http = require('http').Server(app);
var router = express.Router();
var logger = require("logging_component");
var url = require("url");
var mqtt = require('mqtt');

/*
	Cloud MongoDB Based Security & Operations
*/
var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');
var session      = require('express-session');
var MongoStore   = require('connect-mongo')(session);
var MongoClient  = require('mongodb').MongoClient;
app.use(bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
//MongoDB Connection Details
var cloudMonGoDBConfig = {
	mongoUsr		: process.env.MONGODB_USR 			|| 'mongodb://admin:admin@ds113630.mlab.com:13630/smartcom_user',
	mongoIntrstLog	: process.env.MONGODB_INTRST_LOG 	|| 'mongodb://admin:admin@ds053136.mlab.com:53136/interestlogger',
	mongoSession	: process.env.MONGODB_SESSION_URL 	|| 'mongodb://admin:admin@ds153521.mlab.com:53521/smartcom_session' 
}
var mongoose = require('mongoose');
mongoose.connect(cloudMonGoDBConfig.mongoSession);
var sessionStore = new MongoStore({mongooseConnection: mongoose.connection });
	
app.use(session({
    cookie: { maxAge: 1000*60*30 } ,
	//This is the Secret Key
    secret: "inferstrat session secret code",
    store: sessionStore
}));

var path = __dirname + '/public/';
app.use('/resources', express.static(path + 'resources'));
app.use("/", router);


var userValidatoin = function(user, callBackMethods){
	MongoClient.connect(cloudMonGoDBConfig.mongoUsr, function(err, db) {
		db.collection('USERS').findOne( user, function(err, result) {
			db.close();
			if (err || null == result || null == result.userId) 
				callBackMethods.failure();
			else
				callBackMethods.success(result)
		});
	});
}

var processInterestLogs = function(criteria, callBackMethods){
	MongoClient.connect(cloudMonGoDBConfig.mongoIntrstLog, function(err, db) {
		db.collection('LOGS').aggregate( criteria ).toArray(function(err, result) {
			db.close();
			if (err) 
				callBackMethods.failure();
			else
				callBackMethods.success(result)
		});
	});			
}

router.use(function (req, res, next) {
	var headers = req.headers;
	var userAgent = headers['user-agent'];
	logger.log('User Agent - ' + userAgent + ', Request - ' + req.method);
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});

var validate = function(req,res){
    var data = {status: false};
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;	
	if(query.id == bridge.bridgeid && query.key == bridge.key){
		data.status = true;
	}
	return data;
}

app.get("/getuser", function(req,res){
	logger.log('req.session.userId = '+ req.session.userId);
	if(req.session.userId != undefined)
		res.json({'name': req.session.name});
	else res.json({});
});

app.get("/getuserprofile", function(req,res){
	logger.log('req.session.userId = '+ req.session.userId);
	if(req.session.userId != undefined){
		userValidatoin( {
		        //User Entered Information
				userId: req.session.userId, 
				name: req.session.name,
				type: req.session.type
			}, { 
				//If Valid User respond
				success: function(userInfo){
					res.json(userInfo);
				}, 
				//If In-Valid User respond 
				failure: function(){
					res.redirect('/login');
				}
			}
		);
	} else res.json({});
});

/*
	Get Method not Allowed for authentication
*/
app.get("/auth", function(req, res){
	res.redirect('/login');
});

app.post("/auth", function(req, res){
	if(null != req.body.userId && null != req.body.password && '' != req.body.userId && '' != req.body.password){
	    userValidatoin( {
		        //User Entered Information
				userId: req.body.userId, 
				password:req.body.password
			}, { 
				//If Valid User Call 
				success: function(userInfo){
					req.session.userId = userInfo.userId;
					req.session.name = userInfo.name;
					req.session.type = userInfo.type;
					req.session.homeUrl = userInfo.homeUrl;
					res.redirect('/' + req.session.homeUrl);
				}, 
				//If In-Valid User Call 
				failure: function(){
					res.redirect('/login');
				}
			}
		);
	} else {
		res.redirect('/login');
	}
});	

app.get("/loadchart", function(req,res){
	if(req.session.userId != undefined){
	    processInterestLogs( [{ 
			     $group : { 
					"_id" : "$productId", 
				    "count" : {  
						$sum : 1  
					} 
				}	
			}] , { 
				success: function(chart){
					res.json(chart);
				}, 
				failure: function(){
					res.json({});
				}
			}
		);
	} else res.json({});
});

//All URL Patterns Routing
app.get("/", function(req,res){
	if(null != req.session.name){
		res.redirect('/' + req.session.homeUrl);
	} else {
		res.redirect('/login');
	}
});

app.get("/login", function(req,res){
	if(null != req.session || undefined != req.session)
		req.session.destroy();
	res.sendFile(path + "login.html");
});	

app.get("/power", function(req,res){
	if(req.session.name == undefined)
		res.redirect('/login');
	else res.sendFile(path + req.session.type + '-power.html');
});

app.get("/water", function(req,res){
	if(req.session.name == undefined)
		res.redirect('/login');
	else res.sendFile(path + req.session.type + '-water.html');
});

app.get("/cooling", function(req,res){
	if(req.session.name == undefined)
		res.redirect('/login');
	else res.sendFile(path + req.session.type + '-cooling.html');
});

app.get("/zone", function(req,res){
	if(req.session.name == undefined)
		res.redirect('/login');
	else res.sendFile(path + req.session.type + '-zone.html');
});

app.get("/dashboard", function(req,res){
	if(req.session.name == undefined)
		res.redirect('/login');
	else res.sendFile(path + req.session.type + '-dashboard.html');
});

app.get("/utilities", function(req,res){
	if(req.session.name == undefined)
		res.redirect('/login');
	else res.sendFile(path + req.session.type + '-utilities.html');
});

app.get("/profile", function(req,res){
	if(req.session.name == undefined)
		res.redirect('/login');
	else res.sendFile(path + req.session.type + '-profile.html');
});


app.get("/retail", function(req,res){
	if(req.session.name == undefined)
		res.redirect('/login');
	else res.sendFile(path + req.session.type + '-dashboard.html');
});

app.get("/logout", function(req,res){
	res.redirect('/login');
});


http.listen(process.env.PORT || 3001, () => {				
	logger.log('##################################################');
	logger.log('        Smart City - NODE - HUB | Cloud');
	logger.log('        Process Port :' + process.env.PORT);
	logger.log('        Local Port   :' + 3001);
	logger.log('##################################################');
});	