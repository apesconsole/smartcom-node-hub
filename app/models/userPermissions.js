// get an instance of mongoose and mongoose.Schema
var config			= require('./config'); // get our config file
var mongoose 		= require('mongoose');
var connection 		= mongoose.createConnection(config.authentication); 
var Schema 			= mongoose.Schema;

// set up a mongoose model and pass it using module.exports
module.exports = connection.model('PERMISSIONS', new Schema({ 
    type: String,
    title: String,
    component: String,
    active: Boolean,
    icon: String,
    app: Boolean,
    web: Boolean
}),'PERMISSIONS');