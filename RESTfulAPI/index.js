/*
 * Primary file for API
 *
 */

// Dependecies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var _data = require('./lib/data');

//Testing
//@TODO delete This
_data.read('test','newFile', function(err,data){
  console.log('this was the error', err, 'and this was the data ',data);
});

// Instantiate the HTTP server
var httpServer = http.createServer(function(req,res){
  unifiedServer(req,res);
});

// Start the http server
httpServer.listen(config.httpPort,function(){
  console.log("The server is listening on Port "+config.httpPort+" in "+config.envName+" mode");
});

// Instantiate the Https server
var httpsServerOptions = {
  'key': fs.readFileSync('./https/key.pem'),
  'cert' : fs.readFileSync('./https/cert.pem')
};
var httpsServer = https.createServer(httpsServerOptions,function(req,res){
  unifiedServer(req,res);
});

// Start the https server
httpsServer.listen(config.httpsPort,function(){
  console.log("The server is listening on Port "+config.httpsPort+" in "+config.envName+" mode");
});

// All the server logic for both the http and https server
var unifiedServer = function(req,res){
  // Get the URL and parse it
  var parsedUrl = url.parse(req.url,true);

  // Get the path
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g,'');

  //Get the query string as an object
  var queryStringObject = parsedUrl.query;

  //Get the HTTP method
  var method = req.method.toLowerCase();

  // Get the headers as an object
  var headers = req.headers;

  // Get the payload, if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  req.on('data',function(data){
    buffer += decoder.write(data);
  });
  req.on('end',function(){
    buffer += decoder.end();

    // Choose the handler this request should go to, use not found if don't exit the pathname
    var chooseHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;
    console.log(router['test']);

    // Contruct the data object to send to the handler
    var data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject' : queryStringObject,
      'method' : method,
      'headers' : headers,
      'payload' : buffer
    };

    // Route the request to the handler specified in the router
    chooseHandler(data, function(statusCode, payload){
      // Use the statusCode called back by the handler, or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      // Use the payload called back the handler, or default to an empty object
      payload = typeof(payload) == 'object' ? payload : {};

      // Convert the payload to a string
      var payloadString = JSON.stringify(payload);

      // Return a response
      res.setHeader('Content-Type','application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request path
      console.log('request recieved on path: ',trimmedPath);
      console.log('method: ',method);
      console.log('headers: ',headers);
      console.log('queryStringObject: ',queryStringObject);
      console.log('payload: ',buffer);
      console.log('response: ',statusCode,payloadString);

    });

  });
};

 // define the handlers
 var handlers = {};

// Ping handler
handlers.ping = function(data,callback){
  callback(200);
};

 // Not Found handler
 handlers.notFound = function (data,callback){
   callback(404);
 };

 // Define a request router
 var router ={
   'ping': handlers.ping

 };
