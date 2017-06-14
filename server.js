/*
	Apes's Console
*/

var express = require("express");
var app = express();
var http = require('http').Server(app);
var router = express.Router();
var logger = require("logging_component");
var url = require("url");

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
	mongoTrffcDta	: process.env.MONGODB_TRAFFIC_DTA 	|| 'mongodb://admin:admin@ds121222.mlab.com:21222/trafficdata',
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

var loadTrafficData = function(criteria, callBackMethods){
	MongoClient.connect(cloudMonGoDBConfig.mongoTrffcDta, function(err, db) {
		db.collection('TRAFFIC_DATA_SET').find( criteria.query ).skip(eval(criteria.skip)).limit(eval(criteria.limit)).toArray(function(err, result) {
			db.close();
			if (err) 
				callBackMethods.failure();
			else
				callBackMethods.success(result)
		});
	});		
}

var loadProcessedData = function(criteria, colName, callBackMethods){
	MongoClient.connect(cloudMonGoDBConfig.mongoTrffcDta, function(err, db) {
		db.collection(colName).find( criteria).toArray(function(err, result) {
			db.close();
			if (err) 
				callBackMethods.failure();
			else
				callBackMethods.success(result)
		});
	});	
}

var insertData = function(data, colName, callBackMethods){
	MongoClient.connect(cloudMonGoDBConfig.mongoTrffcDta, function(err, db) {
		db.collection(colName).insert(data, function(err, result) {
			db.close();
			callBackMethods();
		});
	});
}

var consolidateMonthlyData = function(monthList, index){
	if(index >= monthList.length) return;
	var criteria = [{
		$match: {
			violationMonth: monthList[index]['_id'].month
		}	
		},{
        $group : {
           _id : { carMake: "$carMake" },
           total: { $sum: 1 }
        }
      }];

	MongoClient.connect(cloudMonGoDBConfig.mongoTrffcDta, function(err, db) {
		db.collection('TRAFFIC_DATA_SET').aggregate( criteria ).toArray(function(err, result) {
			db.close();
			console.log(monthList[index]['_id'].month + '-->' + JSON.stringify(result));
			var carList = [];
			for(var i=0; i< result.length; i++){
				carList[carList.length] = {
					carMake         : result[i]['_id']['carMake'],
					totalViolations : result[i]['total']
				}
			}
			var data = {
				month: monthList[index]['_id'].month,
				totalPerMonth: monthList[index]['total'],
				monthlyDataPerCar: carList,
			};
	    	insertData(data, 'AGGREGATE_BY_MONTH_SET', function(){
				consolidateMonthlyData(monthList, ++index);
	    	});
		});
	});	
}

var consolidateByTypeData = function(typeList, index){
	if(index >= typeList.length) return;
	var criteria = [{
		$match: {
			carMake: typeList[index]['_id'].type
		}	
		},{
        $group : {
           _id : { month: "$violationMonth" },
           total: { $sum: 1 }
        }
      }];

	MongoClient.connect(cloudMonGoDBConfig.mongoTrffcDta, function(err, db) {
		db.collection('TRAFFIC_DATA_SET').aggregate( criteria ).toArray(function(err, result) {
			db.close();
			console.log(typeList[index]['_id'].type + '-->' + JSON.stringify(result));
			var monthList = [];
			for(var i=0; i< result.length; i++){
				monthList[monthList.length] = {
					violationMonth  : result[i]['_id']['month'],
					totalViolations : result[i]['total']
				}
			}
			var data = {
				carMake: typeList[index]['_id'].type,
				totalPerCar: typeList[index]['total'],
				monthlyDataPerCar: monthList,
			};
	    	insertData(data, 'AGGREGATE_BY_TYPE_SET', function(){
				consolidateByTypeData(typeList, ++index);
	    	});
		});
	});	
}

var aggregateMonthData = function(){
	var criteria = [{
        $group : {
           _id : { month: "$violationMonth" },
           total: { $sum: 1 }
        }
      }];

	MongoClient.connect(cloudMonGoDBConfig.mongoTrffcDta, function(err, db) {
		db.collection('TRAFFIC_DATA_SET').aggregate( criteria ).toArray(function(err, result) {
			db.close();
			console.log(JSON.stringify(result));
			consolidateMonthlyData(result, 0);
		});
	});		
}

var aggregateTypeData = function(){

	var criteria = [{
        $group : {
           _id : { type: "$carMake" },
           total: { $sum: 1 }
        }
      }];

	MongoClient.connect(cloudMonGoDBConfig.mongoTrffcDta, function(err, db) {
		db.collection('TRAFFIC_DATA_SET').aggregate( criteria ).toArray(function(err, result) {
			db.close();
			console.log(result.length);
			consolidateByTypeData(result, 0);
		});
	});		
}

var getMaxType = function (arr, prop) {
    var max;
    for (var i=0 ; i<arr.length ; i++) {
        if (!max || parseInt(arr[i][prop]) > parseInt(max.count))
	        max = {
	        	type : arr[i].carMake,
	        	count: arr[i].totalViolations
	        };
    }
    return max;
}
var getMinType = function (arr, prop) {
    var min;
    for (var i=0 ; i<arr.length ; i++) {
        if (!min || parseInt(arr[i][prop]) < parseInt(min.count))
	        min = {
	        	type : arr[i].carMake,
	        	count: arr[i].totalViolations
	        };
    }
    return min;
}

var aggregateMaxPerMonthData = function(){
	MongoClient.connect(cloudMonGoDBConfig.mongoTrffcDta, function(err, db) {
		db.collection('AGGREGATE_BY_MONTH_SET').find( ).toArray(function(err, result) {
			db.close();
			var cleanData = [];
			for (var i=0 ; i<result.length ; i++) {
				var max = getMaxType(result[i].monthlyDataPerCar, 'totalViolations');
				var min = getMinType(result[i].monthlyDataPerCar, 'totalViolations');
				cleanData[cleanData.length] = {
					month: result[i].month,
					totalPerMonth: result[i].totalPerMonth,
					maxType: max.type,
					maxCount: max.count,
					minType: min.type,
					minCount: min.count
				};
			}
			insertData(cleanData, 'FINALIZED_DATA_SET', function(){
			console.log('Complete !!!');
			});
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

app.get("/loadtrafficdata", function(req,res){
	if(req.session.userId != undefined){
		var url_parts = url.parse(req.url, true);
		var queryParam = url_parts.query;
	    loadTrafficData( {
				query: {},
				limit: queryParam.limit,
				skip: queryParam.skip
			}, { 
				success: function(data){
					logger.log(data.length);
					res.json(data);
				}, 
				failure: function(){
					res.json({});
				}
			}
		);
	} else res.json({});
});

app.get("/getmonthlydata", function(req,res){
	if(req.session.userId != undefined){
		var url_parts = url.parse(req.url, true);
		var queryParam = url_parts.query;
	    loadProcessedData({},'FINALIZED_DATA_SET', { 
				success: function(data){
					logger.log(data.length);
					res.json(data);
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

app.get("/transport", function(req,res){
	if(req.session.name == undefined)
		res.redirect('/login');
	else res.sendFile(path + req.session.type + '-dashboard.html');
});


app.get("/process", function(req,res){
	//aggregateTypeData();
	//aggregateMonthData();
	//aggregateMaxPerMonthData();
	res.redirect('/login');
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