module.exports = {
	'mongoSession'				: process.env.MONGODB_SESSION_URL 	|| '',
    'authentication'			: process.env.MONGODB_USR 			|| '',
	'cnstrntdatabase'			: process.env.MONGODB_CNSTRNT_DATA 	|| ''
};