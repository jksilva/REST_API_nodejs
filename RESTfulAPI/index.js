/*
 * Primary file for API
 *
 */

// Dependecies
var http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;

// The server should respond to all requests with a string
var server = http.createServer(function(req,res){

  // Get the URL and parse it
  var parsedUrl = url.parse(req.url,true);

  // Get the path
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\+|\/+$/g,'');

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

    // Send the response
    res.end('Hello World\n');

    // Log the request path
    console.log('request recieved on path: ',trimmedPath);
    console.log('method: ',method);
    console.log('headers: ',headers);
    console.log('queryStringObject: ',queryStringObject);
    console.log('payload: ',buffer);

  });




});

// Start the server, and have it listen on port 3000
server.listen(3000,function(){
  console.log("The server is listening on port 3000 now");
});

 // define the handlers
 var handlers = {};

 // sample handler
 handlers.sample = function (data,callback){

 };

 // Not Found handler
 handlers.notFound = function (data,callback){

 };

 // Define a request router
 var router ={
   'sample': handlers.sample
 }
