/*
 * Request handlers
 *
 */

// Dependecies
var _data = require('./data');
var helpers = require('./helpers');

// define the handlers
var handlers = {};

 // users
 handlers.users = function(data,callback){
   var acceptableMethods = ['post','get','put','delete'];
   if (acceptableMethods.indexOf(data.method) > -1){
     handlers._users[data.method](data,callback);

   }else {
     callback(405);
   }
 };

// container for the users submethods
handlers._users = {};

// Users - posts
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none

handlers._users.post = function(data,callback){
  // Check that all required fieds are filled out
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement){
    // make sure that user doesnt already exist
    _data.read('users',phone,function(err,data){
      if(err){
        // hash the password
        var hashedPassword = helpers.hash(password);
        // Create the user object
        if (hashedPassword) {
          var userObject = {
            'firstName':firstName,
            'lastName': lastName,
            'phone': phone,
            'hashedPassword': hashedPassword,
            'tosAgreement' : true
          };

          // Store the user
          _data.create('users',phone,userObject,function(err){
            if(!err){
              callback(200);
            }else {
              console.log(err);
              callback(500,{'Error': 'Could not create the new user'});
            }
          });
        }else {
          callback(500,{'error': 'could not hash the user\'s password'});
        }

      }else {
        // User already exists
        callback(400,{'Error': 'A user with that number already exists'});
      }
    });
  }else {
    callback(400,{'error':'missing required fields'});
  }
};
// Users - get
// Required data: phone
// Optional data: none
// @TODO only let an authenticated users acessess their  object. dont let then access anyone else.
handlers._users.get = function(data,callback){
// check that phone number is valid
var phone = typeof(data.queryStringObject.phone) =='string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

if(phone){
  // lookup the user
  _data.read('users',phone,function(err,data){
    if(!err && data){
      //remove the hashed password from the user object before returning it to the requester
      delete data.hashedPassword;
      callback(200,data);

    }else {
      callback(404);
    }
  });
} else {
  callback(400,{'Error':'Missing required field'});
}
};
// Users - put
// Required data : phone
// Optional data : firstName, lastName, password (at least one must be specified)
// @TODO only let an autheticated user update their own object. Dont let them update anyone else's
handlers._users.put = function(data,callback){
  // Check for the required fields
  console.log('teste ',data.payload.lastName);
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

  // Check for the optional fields
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // check for the optional fields

  if (phone) {
    // error if nothing is sent to Update
    if (firstName || lastName || password) {
      // lookup the users
      _data.read('users',phone,function(err,userData){
        if(!err && userData){
          //update the fields necessary
          if (firstName) {
            userData.firstName = firstName;
          }
          if (lastName) {
            userData.lastName = lastName;
          }
          if (password) {
            userData.hashedPassword = helpers.hash(password);
          }
          // store the new updates
          _data.update('users',phone,userData,function (err) {
            if (!err) {
              callback(200);
            }else {
              console.log(err);
              callback(500,{'error':'could not update the user'});
              console.log('nao encontrou ',phone);
            }

          });
        }else {
          callback(400,{'error': 'the specified user does not exist'});
        }
      });
    }else {
      callback(400,{'error': 'missing fields to update'});
    }
  }else {
    callback(400,{'error':'missing required field'});
  }

};
// Users - delete
handlers._users.delete = function(data,callback){

};


// Ping handler
handlers.ping = function(data,callback){
 callback(200);
};

// Not Found handler
handlers.notFound = function (data,callback){
  callback(404);
};

// Export the module
module.exports = handlers
