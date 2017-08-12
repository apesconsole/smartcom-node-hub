// get an instance of mongoose and mongoose.Schema
var config			= require('./config'); // get our config file
var mongoose 		= require('mongoose');
var connection 		= mongoose.createConnection(config.cnstrntdatabase); 
var Schema 			= mongoose.Schema;


var paymentSchema = mongoose.Schema({
		paymentId: String,
		payment: Number,
		paidBy: String,
		paymentDate: Date	
	},{ _id : false });

var billingSchema = mongoose.Schema({
		billingId: String,
		currency: String,
		billingAmount: Number,
		totalPayment: Number,
		payments: [
			paymentSchema
		],
		invoice: String,
		createDate: Date,
		createdBy: String,
		updatedBy: String,
		updateDate: Date,
		approvedBy: String,
		approvalDate: Date,
		approved: Boolean
	},{ _id : false });

var labourSchema = mongoose.Schema({
		labourId: String,
		labourDescription: String,
		contractor: String,
		contractType: String,
		rate: Number,
		currency: String,
		count: Number,
		billing: [
			billingSchema
		],
		totalBill: Number,
		totalPayment: Number,		
		createDate: Date,
		createdBy: String,
		updatedBy: String,
		updateDate: Date,
		approvedBy: String,
		approvalDate: Date,
		approved: Boolean,
		active: Boolean
	},{ _id : false });

// set up a mongoose model and pass it using module.exports
module.exports = connection.model('SITE_LABOUR', new Schema({ 
	siteId: String,
	taskId: String,
	labour: [
		labourSchema
	]
}),'SITE_LABOUR');