/*
* Request handlers
*
*/

// Dependecies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

// define the handlers
var handlers = {};

// users
handlers.users = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if (acceptableMethods.indexOf(data.method) > -1){
    handlers._users[data.method](data,callback);

  }else  {
    callback(405);
  }
};

// container for the users submethods
handlers._users = {};

// Users - posts
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none

handlers._users.post = function(data,callback){
  // Check that all required fields are filled out
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

    // get the token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token :false;
    // verify that given token is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if (tokenIsValid) {
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
      }else {
        callback(403,{'error':'missing required token in header, or token is invalid'})
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
      // get the token from headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token :false;

      // verify that given token is valid for the phone number
      handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
        if (tokenIsValid) {
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
          callback(403,{'error':'missing required token in header, or token is invalid'});
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
// required field : phone
// @TODO only let an authenticated user delete their object, dont let them delete anyone else
//@TODO cleanup (delete) any other data files associated with this user
handlers._users.delete = function(data,callback){
  //check that phone number is valid
  var phone = typeof(data.queryStringObject.phone) =='string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

  if(phone){

    // get the token from headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token :false;

    // verify that given token is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if (tokenIsValid) {
        // lookup the user
        _data.read('users',phone,function(err,data){
          if(!err && data){
            _data.delete('users',phone,function(err){
              if(!err){
                // delete each of the checks associated with the user
                var userChecks = typeof(data.checks) == 'object' && data.checks instanceof Array ? data.checks : [];
                var checksToDelete = userChecks.length;

                if (checksToDelete > 0) {
                  var checksDeleted = 0;
                  var deletionErrors = false;
                  // loop through the checks
                  userChecks.forEach(function(checkId){
                    // Delete the checks
                    _data.delete('checks',checkId,function(err){
                      if (err) {
                        deletionErrors = true;
                      }
                      checksDeleted++;
                      if (checksDeleted == checksToDelete) {
                        if (!deletionErrors) {
                          callback(200);
                        }else {
                          callback(500,{'error':'errors encountered trying delete the user checks'});
                        }
                      }
                    });
                  });
                }else {
                  callback(200);
                }


              }else {
                callback(500,{'error':'could not delete the specified user'})
              }
            });
            callback(200,data);

          }else {
            callback(400,{'error': 'could not find the specified users'});
          }
        });
      }else {
        callback(403,{'error':'missing required token in header, or token is invalid'});
      }
    });

  } else {
    callback(400,{'Error':'Missing required field'});
  }
};

// Tokens
handlers.tokens = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if (acceptableMethods.indexOf(data.method) > -1){
    handlers._tokens[data.method](data,callback);

  }else {
    callback(405);
  }
};

// container for all the tokens methods
handlers._tokens = {};

// tokens - post
// required data: phone, password
// optional data: none
handlers._tokens.post = function(data,callback){
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if(phone && password){
    // lookup the user who matches that phone number
    _data.read('users',phone,function(err,userData){
      if (!err && userData) {
        // hash the sent password, and compare it to the password store
        var hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword){
          // if valid, create a new token with a random name, set the expiration data 1 hour in the future
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now()+ 1000 *60 *60;
          var tokenObject = {
            'phone':phone,
            'id':tokenId,
            'expires':expires
          };

          // store the tokens
          _data.create('tokens',tokenId,tokenObject,function(err){
            if(!err){
              callback(200,tokenObject);
            }else {
              callback(500,{'error':'could not create the new token'});
            }
          });
        }else {
          callback(400,{'error':'password did not match the specified users Stored password'});
        }
      }else {
        callback(400,{'error':'could not find the specified user'});
      }
    });

  }else {
    callback(400,{'Error': 'missing required field(s)'});
  }

};
// tokens - get
// required data: phone
// optional data: anyone
// @TODO Only let an autheticated users acess their object. don't let then access anyone else.
handlers._tokens.get = function(data,callback){
  // check that phone number is valid
  var id = typeof(data.queryStringObject.id) =='string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(id){
    // lookup the token
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        //remove the hashed password from the user object before returning it to the requester
        callback(200,tokenData);

      }else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error':'Missing required field'});
  }
};

// tokens - put
// required data : id, extend
// optional data : none

handlers._tokens.put = function(data,callback){
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

  if(id && extend){
    // lookup the token
    _data.read('tokens', id, function(err,tokenData){
      if (!err && tokenData) {
        // check to the make sure the token isn't already expired
        if (tokenData.expires >Date.now()) {
          // set the expiration an hour form now
          tokenData.expires = Date.now() + 1000 * 60 * 60 ;

          // store the new updates
          _data.update('tokens',id,tokenData,function(err){
            if (!err) {
              callback(200);
            }else {
              callback(500,{'error':'could not update the tokens expiration'});
            }
          });
        }else {
          callback(400,{'error': 'the token has already expired, and cannot be extended'});
        }
      }else {
        callback(400,{'error': 'specified token does not exist'});
      }
    });
  }else {
    callback(400,{'error':'missing required filed(s) or field(s) are invalid'});
  }


};
// tokens - post
handlers._tokens.delete = function(data,callback){
  // check is the id is valid
  var id = typeof(data.queryStringObject.id) =='string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(id){
    // lookup the user
    _data.read('tokens',id,function(err,data){
      if(!err && data){
        _data.delete('tokens',id,function(err){
          if(!err){
            callback(200);
          }else {
            callback(500,{'error':'could not delete the specified token'})
          }
        });
        callback(200,data);

      }else {
        callback(400,{'error': 'could not find the specified token'});
      }
    });
  } else {
    callback(400,{'Error':'Missing required field'});
  }
};

// verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id,phone,callback){
  // lookup the token
  _data.read('tokens',id,function(err,tokenData){
    if (!err && tokenData) {
      // check that the token is for the given user and has not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      }  else {
        callback(false);
      }
    }else {
      callback(false);
    }
  });
};

// checks
handlers.checks = function(data,callback){
  var acceptableMethods = ['post','get','put','delete'];
  if (acceptableMethods.indexOf(data.method) > -1){
    handlers._checks[data.method](data,callback);

  }else {
    callback(405);
  }
};
// container for all the checks methods
handlers._checks = {};

// checks - post
// required data:protocol, url, method, sucessCode, timeoutSeconds
// optional data: none

handlers._checks.post = function (data,callback){
  // validate inputs
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol)> -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method)> -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
  console.log('esse e protolo ',protocol);
  console.log('esse a url ',url);
  console.log('esse o method ',method);
  console.log('esse o successCodes ',successCodes);
  console.log('esse o timeoutSeconds ',timeoutSeconds);
  console.log('esse o data.payload.timeoutSeconds.length >= 1  ', data.payload.timeoutSeconds.length >= 1 );
  console.log('data.payload.timeoutSeconds.length <= 5  ', data.payload.timeoutSeconds.length <= 5 );
  console.log('data.payload.timeoutSecond  ', data.payload.timeoutSeconds );

  if (protocol && url && method && successCodes && timeoutSeconds) {
    //get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token :false;

    // lookup the user by reading the token
    _data.read('tokens',token,function(err,tokenData){
      if (!err && tokenData) {
        var userPhone = tokenData.phone;

        // lookup the user data
        _data.read('users',userPhone,function(err,userData){
          if (!err && userData) {
            var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
            //verify that the user has less than the number of max-checks-per-users
            if (userChecks.length<config.maxChecks) {
              // create a random id for the check
              var checkId = helpers.createRandomString(20);

              // create the check object, and include the user's phone
              var checkObject = {
                'id':checkId,
                'userPhone': userPhone,
                'protocol':protocol,
                'url':url,
                'method':method,
                'successCodes':successCodes,
                'timeoutSeconds':timeoutSeconds
              };

              //save the object
              _data.create('checks',checkId,checkObject,function(err){
                if (!err) {
                  // add the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);
                  // save the new user data
                  _data.update('users',userPhone,userData,function(err){
                    if (!err) {
                      //return the data about the new check
                      callback(200,checkObject);
                    }else {
                      callback(500,{'error':'could not update the user with the new check'})
                    }
                  });

                }else {
                  callback(500,{'eror':'could not create the new check'});
                }
              });

            }else {
              callback(400,{'Error':'The user already has the maximum number of checks ( '+config.maxChecks+')'});
            }

          }else {
            callback(403);
          }

        });

      }else {
        callback(403);
      }
    });

  }else {
    callback(400,{'Error':'Missing required input, or inputs are invalid'});
  }

};

//get request checks
// required data : idea
// optional data
handlers._checks.get = function(data,callback){
  // check that id number is valid
  var id = typeof(data.queryStringObject.id) =='string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  console.log('typeof(data.queryStringObject.id) ',typeof(data.queryStringObject.id) =='string');
  console.log('data.queryStringObject.id.trim().length == 20 ',data.queryStringObject.id.trim().length == 20);
  console.log('data.queryStringObject.id.trim() ',data.queryStringObject.id.trim());
  console.log('o valor de id ', id);
  if(id){
    // lookup the check
    _data.read('checks',id,function(err,checkData){
      if (!err && checkData) {
        // get the token from headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token :false;
        // verify that given token is valid and belongs to the users who create that check
        handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
          if (tokenIsValid) {
            // return the check data
            callback(200,checkData);

          }else {
            callback(403,{'error':'missing required token in header, or token is invalid'});
          }
        });
      }else {
        callback(404);
      }
    });

  } else {
    callback(400,{'Error':'Missing required field'});
  }
};

// Checks -put
// required data: id
// optional data : protocol, url, method, sucessCode, timeoutSecond (one must be sent)
handlers._checks.put = function(data,callback){

  // check for the required fields
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

  // Check for the optional fields
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol)> -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method)> -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // check for the optional fields
  if (id) {

    // check to make sure one or more optional fields has been sent
    if (protocol || url || method || successCodes || timeoutSeconds) {
      // lookup the check
      _data.read('checks',id,function(err,checkData){
        if (!err && checkData) {
          var token = typeof(data.headers.token) == 'string' ? data.headers.token :false;
          // verify that given token is valid and belongs to the users who create that check
          handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
            if (tokenIsValid) {
              // update the check wher necessary
              if (protocol) {
                checkData.protocol = protocol;

              }
              if (url) {
                checkData.url = url;

              }
              if (method) {
                checkData.method = method;

              }
              if (successCodes) {
                checkData.successCodes = successCodes;
              }
              if (timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }

              // store the new updates
              _data.update('checks',id,checkData,function(err){
                if (!err) {
                  callback(200);
                }else {
                  callback(500,{'error':'could not update the check '});
                }
              });

            }else {
              callback(403);
            }
          });
        }else {
          callback(400,{'error':'checkId did not exist'});
        }
      });

    }else {
      callback(400,{'error':'missing field to update'});
    }


  }else {
    callback(400,{'Error':'Missing required field'});
  }

};


// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function(data,callback){
  //check that phone number is valid
  var id = typeof(data.queryStringObject.id) =='string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

  if(id){

    // lookup the check
    _data.read('checks',id,function(err,checkData){
      if (!err && checkData) {
        // get the token from headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token :false;

        // verify that given token is valid for the id number
        handlers._tokens.verifyToken(token,checkData.userPhone,function(tokenIsValid){
          if (tokenIsValid) {
            // delete the check data
            _data.delete('checks',id,function(err){
              if (!err) {
                // lookup the user
                _data.read('users',checkData.userPhone,function(err,userData){
                  if(!err && userData){
                    var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                    // remove the delete check from their list of checks
                    var checkPosition = userChecks.indexOf(id);
                    if (checkPosition> -1) {
                      userChecks.splice(checkPosition,1);
                      // re-save the user data
                      _data.update('users',checkData.userPhone,userData,function(err){
                        if(!err){
                          callback(200);
                        }else {
                          callback(500,{'error':'could not delete the specified user'});
                        }
                      });
                    }else {
                      callback(500,{'error':'could not find the check in the users object'});
                    }
                  }else {
                    callback(500,{'error': 'could not find the user'});
                  }
                });
              }else {
                callback(500,{'error':'could not delete the delete check data'});
                console.log('id: ',id);
                console.log('checkData.userPhone: ',checkData.userPhone);
                console.log('err : ',err);
              }
            });



          }else {
            callback(403,{'error':'missing required token in header, or token is invalid'});
          }
        });


      }else {
        callback(400,{'Error':'The specified checkId does not exist'});
      }
    });



  } else {
    callback(400,{'Error':'Missing required field'});
  }
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
