/*
 *
 *
 */

// Dependecies
var fs = require('fs');
var path = require('path');
var helpers = require('./helpers');

// Cointainer for the module (to be exported)
var lib ={};

// Base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.data/');
// write data to a file
lib.create = function(dir,file,data,callback){
  // Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json','wx',function(err, fileDescriptor){
    if(!err && fileDescriptor){
      // convert data to string
      var stringData = JSON.stringify(data);

      //write to file and close it
      fs.writeFile(fileDescriptor,stringData,function(err){
        if(!err){
          fs.close(fileDescriptor,function(err){
            if(!err){
              callback(false);
            }else {
              callback('Error closing new file');
            }
          });

        }else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not create new file, it may already exist');
    }
  });
}

// read data from a file
lib.read = function(dir,file,callback){
  fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf8',function(err,data){
    if(!err && data){
      var parsedData = helpers.parseJsonToObject(data);
      callback(false,parsedData);
    }else {
      callback(err,data);
    }

  });
};

// Update data inside a file
lib.update = function (dir,file,data,callback) {
  // Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json','r+',function(err,fileDescriptor){
    if(!err && fileDescriptor){
      // convert data to string
      var stringData = JSON.stringify(data);

      // Truncate the file
      fs.truncate(fileDescriptor,function(err){
        if(!err){
          // Write to the file and close it
          fs.writeFile(fileDescriptor,stringData,function(err){
            if(!err){
              fs.close(fileDescriptor,function(err){
                if(!err){
                  callback(false);
                }else {
                  callback('Error closing to existing file');
                }
              });
            }else {
              callback('Error writing to existing file');
            }
          });
        }else {
          callback('Error truncating file');
        }
      });
    }else {
      callback('Could not open the file for Updating, it may not exist yet');
    }
  });
}

// Delete a file
lib.delete = function(dir,file,callback){
  // unlink the file
  fs.unlink(lib.baseDir+dir+'/'+file+'.json',function(err){
    if(!err){
      callback(false);
    }else {
      callback('error deleting the file');
    }
  });
};

// Export the module
module.exports = lib;
