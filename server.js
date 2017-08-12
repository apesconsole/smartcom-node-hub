/*
	Apes's Console
*/

var express  = require("express");
var app 	 = express();
var http 	 = require('http').Server(app);
var router 	 = express.Router();
var logger	 = require("logging_component");
var url 	 = require("url");
var ejs 	 = require('ejs');
var mongoose = require('mongoose');

/*
	Cloud MongoDB Based Security & Operations
*/
var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');
var session      = require('express-session');
var MongoStore   = require('connect-mongo')(session);

app.use(bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
//MongoDB Connection Details
var config = require('./app/models/config'); // get our config file

mongoose.connect(config.mongoSession);
var sessionStore = new MongoStore({mongooseConnection: mongoose.connection });
	
app.use(session({
    cookie: { maxAge: 1000*60*30 } ,
	//This is the Secret Key
    secret: "inferstrat session secret code",
    store: sessionStore
}));

//Schema Mapping
var user                = require('./app/models/user');
var menu                = require('./app/models/menu');
var userPermissions     = require('./app/models/userPermissions');
var project 	        = require('./app/models/project');
var cnstrntSiteUserMap  = require('./app/models/cnstrntSiteUserMap');      
var globalInventory     = require('./app/models/globalInventory');
var inventoryConfig     = require('./app/models/inventoryConfig');
var cnstrntSite         = require('./app/models/cnstrntSite');		   
var siteInventory       = require('./app/models/siteInventory');	  
var siteLabour          = require('./app/models/siteLabour');	

var path = __dirname + '/public/';
app.set('view engine', 'html');

app.engine('html', ejs.renderFile);
app.use('/resources', express.static(path + 'resources'));
app.set('views', path);
app.use("/", router);

router.use(function (req, res, next) {
	next();
});

/*
	Get Method not Allowed for authentication
*/
router.get("/authenticate", function(req, res){
	res.redirect('/login');
});

router.post("/authenticate", function(req, res){
	let userId = req.body.userId || req.query.userId;
	let password = req.body.password || req.query.password;
	if(undefined != userId && undefined != password && '' != userId && '' != password){
		user.findOne({userId: userId}, function(err, userData) {
			if (!userData) {
			  res.render('login.html', {message: 'User not found'});
			} else {
				if (userData.password != password) {
					res.render('login.html', {message: 'Invalid Password'});
				} else if(!userData.active){
					res.render('login.html', {message: 'Incative User. Please contact Admin'});
				} else {
					userData.password = '';
					req.session.userData = userData;
					console.log(req.session.userData.homeUrl);
					res.redirect('/' + userData.homeUrl);
				}
			}
		});	
	} else {
		res.render('login.html', {message: 'User Id/Password cannot be blank'});
	}
});	

router.get("/getuser", function(req,res){
	if(req.session.userData != undefined && req.session.userData.userId != undefined){
		if(req.session.userMenu == undefined){
			menu.find({userId: req.session.userData.userId, web: true}, function(err, userMenu) {
				req.session.userMenu = userMenu;
				res.json({ success: true, userData: req.session.userData, userMenu: userMenu});
			});
		} else {
			res.json({ success: true, userData: req.session.userData, userMenu: req.session.userMenu});
		}
	} else res.json({success: false, operation: false, message: 'Session Expired. Please login again'});
});

//Start - USERS
router.get("/getusers", function(req,res){
	if(req.session.userData != undefined){
		user.find({}, function(err, users) {
			res.json({ success: true, users: users});
		});
	} else res.json({success: false, operation: false, message: 'Session Expired. Please login again'});
});

router.post("/adduser", function(req, res){
	let userId = req.body.userId || req.query.userId;
	console.log(userId);
	if(req.session.userData != undefined){
		if(null != userId && '' != userId){
			user.findOne({userId: userId}, function(err, userData) {
				if (!userData) {
				   let newUser = new user({ 
						userId: userId,
						password: req.body.password || req.query.password, 
						name: req.body.name || req.query.name,
						emailId: req.body.emailId || req.query.emailId,
						type: 'construction',
						homeUrl: 'construction',
						changePwd: true,
						active: req.body.active || req.query.active
					});
					newUser.save(function(err2){
						res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Created'});
					});
				} else {
					res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Id already in use. Please select a unique User Id'});
				}
			});	
		} else {
			res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Id Cannot be blank'});
		}
	} else {
		res.render('login.html', {message: 'Session Expired. Please Login Again'});
	}
});

router.post("/edituser", function(req, res){
	let userId = req.body.userId || req.query.userId;
	if(req.session.userData != undefined){
		if(undefined != userId && '' != userId){
			user.findOne({userId: userId}, function(err, userData) {
				if (userData) {
					let name = req.body.name || req.query.name;
					let emailId = req.body.emailId || req.query.emailId;
					let active = req.body.active || req.query.active;
					let changePwd = req.body.changePwd || req.query.changePwd;
					if(undefined != name && null != name && '' != name){
						userData.name = name;
					}
					if(undefined != emailId && null != emailId && '' != emailId){
						userData.emailId = emailId;
					}
					if(undefined != active && null != active && '' != active){
						userData.active = active;
					}
					if(undefined != changePwd && null != changePwd && '' != changePwd){
						userData.changePwd = changePwd;
					}
					userData.save(function(err2){
						res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Data Updated'});
					});
				} else {
					res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Not Found'});
				}
			});	
		} else {
			res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Id Cannot be blank'});
		}
	} else {
		res.render('login.html', {message: 'Session Expired. Please Login Again.'});
	}
});

router.get("/getuserpermisiosns", function(req,res){
	if(req.session.userData != undefined){
		let userId = req.body.userId || req.query.userId;
		userPermissions.find({}, function(err, permissions) {
			menu.find({userId: userId}, function(err, userMenu) {
				let permissionList = [];
				permissions.forEach(function(_p){
					let modPer = {
						type: _p.type,
						title: _p.title,
						component: _p.component,
						web: _p.web,
						app: _p.app,
						selected: false
					}
					if(userMenu)
						userMenu.forEach(function(_up){
							if(_up.component == _p.component){
								modPer.selected = true;
							}
						});
					permissionList[permissionList.length] = modPer;
				});
				res.json({success: true, operation: true, permissions: permissionList});
			});
		});
	} else res.json({success: false, operation: false, message: 'Session Expired. Please login again'});
});

router.post("/editpermissions", function(req, res){
	let userId = req.body.userId || req.query.userId;
	if(req.session.userData != undefined){
		if(undefined != userId && '' != userId){
			let components = req.body.component || req.query.component;
			menu.find({userId: userId}, function(err, userMenu) {
				if (userMenu) {
					userPermissions.find({}, function(err, permissions) {
						userMenu.forEach(function(_oup){
							//Delete all existing roles
							_oup.remove();
						});
						permissions.forEach(function(_p){
							components.forEach(function(cmpId){
								if(_p.component == cmpId){
									let newRole = new menu({
										userId: userId, 
										title: _p.title, 
										component: _p.component,
										icon: _p.icon,
										app: _p.app,
										web: _p.web
									});
									newRole.save(function(e){
									  //Save Role
									});
								}
							});
						});
						res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Data Updated'});
					});
				} else {
					res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Not Found'});
				}
			});	
		} else {
			res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Id Cannot be blank'});
		}
	} else {
		res.render('login.html', {message: 'Session Expired. Please Login Again.'});
	}
});

router.post("/changepassword", function(req, res){
	let userId = req.body.userId || req.query.userId;
	if(req.session.userData != undefined){
		if(null != userId && '' != userId){
			user.findOne({userId: userId}, function(err, userData) {
				if (userData) {
					if(userData.active){
						let oldpassword = req.body.oldpassword || req.query.oldpassword;
						let newpassword = req.body.newpassword || req.query.newpassword;
						if(undefined != oldpassword && null != oldpassword && '' != oldpassword){
							if(undefined != newpassword && null != newpassword && '' != newpassword){
								if(oldpassword == newpassword)
									res.render(path + req.session.userData.type + '-useradmin.html', {message: 'Old and New Passwords cannot be same'});
								else {
									userData.password = newpassword;
									userData.changePwd = false;
									newUser.save(function(err2){
										res.render(path + req.session.userData.type + '-useradmin.html', {message: 'Password Changed'});
									});
								}
							}
						}
					} else {
						res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User is In-Active. Passwords cannot be reset for In-Active Users'});
					}
				} else {
					res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Not Found'});
				}
			});	
		} else {
			res.render(path + req.session.userData.type + '-useradmin.html', {message: 'User Id Cannot be blank'});
		}
	} else {
		res.render('login.html', {message: 'Session Expired. Please Login Again.'});
	}
});
//End - USERS

//Start - PROJECTS
router.get("/getprojects", function(req,res){
	if(req.session.userData != undefined){
		project.find({}, function(err, projects) {
			res.json({ success: true, projects: projects});
		});
	} else res.json({success: false, operation: false, message: 'Session Expired. Please login again'});
});

router.get("/getsites", function(req,res){
	if(req.session.userData != undefined){
		let projectId = req.body.projectId || req.query.projectId;
		cnstrntSite.find({projectId: projectId}, function(err, sites) {
			res.json({ success: true, sites: sites});
		});
	} else res.json({success: false, operation: false, message: 'Session Expired. Please login again'});
});

router.get("/getassignedusers", function(req,res){
	if(req.session.userData != undefined){
		let siteId = req.body.siteId || req.query.siteId;
		user.find({}, function(err, users) {
			cnstrntSiteUserMap.find({siteId: siteId}, function(err, assignedUser) {
				let assigneduserlist = [];
				let unassigneduserlist = [];
				users.forEach(function(_uu){
					let assigned = false;
					assignedUser.forEach(function(_au){
						if(_uu.userId == _au.userId){
							assigned = true;
							assigneduserlist[assigneduserlist.length] = {
									userId: _au.userId,
									name: _uu.name,
									siteId: _au.siteId,
									edit: _au.edit,
									viewFinance: _au.viewFinance,
									export: _au.export,
									approve: _au.approve,
									createOrder: _au.createOrder,
									createBill: _au.createBill,
									receive: _au.receive,
									pay: _au.pay,
									notification: {
										active: _au.active,
										task_add_info: _au.task_add_info,
										task_edit_info: _au.task_edit_info,
										task_global_inventory_request: _au.task_global_inventory_request,
										task_global_inventory_request_reject_info: _au.task_global_inventory_request_reject_info,
										task_inventory_approval_info: _au.task_inventory_approval_info,
										task_inventory_edit_info: _au.task_inventory_edit_info,
										task_inventory_order_approval_info: _au.task_inventory_order_approval_info,
										task_inventory_order_complete_info: _au.task_inventory_order_complete_info,
										task_inventory_order_payment_info: _au.task_inventory_order_payment_info,
										task_labour_approval_request: _au.task_labour_approval_request,
										task_labour_approval_info: _au.task_labour_approval_info,
										task_labour_edit_info: _au.task_labour_edit_info,
										task_labour_bill_create_info: _au.task_labour_bill_create_info,
										task_labour_bill_approval_request: _au.task_labour_bill_approval_request,
										task_labour_bill_approval_info: _au.task_labour_bill_approval_info,
										task_labour_bill_payment_info: _au.task_labour_bill_payment_info
									}
							};
						}
					});
					if(!assigned){
						unassigneduserlist[unassigneduserlist.length] = {
							userId: _uu.userId,
							name: _uu.name
						}
					}
				});
				res.json({ success: true, assigneduserlist: assigneduserlist, unassigneduserlist: unassigneduserlist});
			});
		});
	} else res.json({success: false, operation: false, message: 'Session Expired. Please login again'});
});
//End - PROJECTS

//All URL Patterns Routing
router.get("/", function(req,res){
	if(null != req.session.userData && undefined != req.session.userData){
		res.redirect('/' + req.session.userData.homeUrl);
	} else {
		res.redirect('/login');
	}
});

router.get("/login", function(req,res){
	if(null != req.session || undefined != req.session)
		req.session.destroy();
	res.render('login.html', {message: ''});
});	

router.get("/construction", function(req,res){
	if(req.session.userData == undefined)
		res.redirect('/login');
	else res.sendFile(path + req.session.userData.type + '-dashboard.html');
});

router.get("/user-admin", function(req,res){
	if(req.session.userData == undefined)
		res.redirect('/login');
	else res.render(path + req.session.userData.type + '-useradmin.html', {message: ''});
});

router.get("/project-management", function(req,res){
	if(req.session.userData == undefined)
		res.redirect('/login');
	else res.render(path + req.session.userData.type + '-projectadmin.html', {message: ''});
});

router.get("/logout", function(req,res){
	res.redirect('/login');
});

http.listen(process.env.PORT || 3001, () => {				
	logger.log('##################################################');
	logger.log('        Smart City - NODE - HUB | Cloud');
	logger.log('        Process Port :' + process.env.PORT);
	logger.log('        Local Port   :' + 3001);
	logger.log('##################################################');
});	