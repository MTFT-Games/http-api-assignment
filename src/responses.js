const utilities = require('./utilities.js');
const fs = require('fs');

// Respond with an error code and object.
function sendError(request, response, acceptedTypes, code, id, message) {
  const contentType = utilities.determineType(acceptedTypes, ['application/json', 'application/xml']);
  response.writeHead(code, { 'Content-Type': contentType });

  if (request.method !== 'HEAD') {
    const responseJSON = { id, message };

    let responseContent;
    if (contentType === 'application/xml') {
      responseContent = utilities.jsonToXml(responseJSON);
    } else {
      responseContent = JSON.stringify(responseJSON);
    }

    response.write(responseContent);
  }

  response.end();
}

// Respond with a file read fron the file system.
function serveFile(request, response, acceptedTypes, filePath) {
  // currently only supports html and css for simplicity

  const fileExtension = filePath.substring(filePath.lastIndexOf('.'));

  // Determine available content types based on file extention. 
  let contentType;
  if (fileExtension === '.html') {
    contentType = utilities.determineType(acceptedTypes, ['text/html', 'text/plain']);
  } else if (fileExtension === '.css') {
    contentType = utilities.determineType(acceptedTypes, ['text/css', 'text/plain']);
  } else {
    // 415 code, unsupported media type
    return sendError(
      request,
      response,
      acceptedTypes,
      415,
      '415UnsupportedMediaType',
      'The resource you requested is of an unsupported type.',
    );
  }

  response.writeHead(200, { 'Content-Type': contentType });

  if (request.method === 'GET') {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // The file should be checked to be sure it can be accessed before calling this function.
        // If it now cant be read, thats an unknown error. 
        return sendError(
          request,
          response,
          acceptedTypes,
          500,
          '500InternalServerError',
          'The server encountered an unexpected problem getting the resourse.',
        );
      }

      response.write(data);
      return response.end();
    });
  } else {
    return response.end();
  }
  // Eslint is mad so heres a return
  return 1;
}

module.exports = { sendError, serveFile, };
