module.exports = {
	'mongoSession'				: process.env.MONGODB_SESSION_URL 	|| 'mongodb://admin:admin@ds153521.mlab.com:53521/smartcom_session',
    'authentication'			: process.env.MONGODB_USR 			|| 'mongodb://admin:admin@ds113630.mlab.com:13630/smartcom_user',
	'cnstrntdatabase'			: process.env.MONGODB_CNSTRNT_DATA 	|| 'mongodb://admin:admin@ds013192.mlab.com:13192/construction'
};