// #region Imports
const http = require('http');
const fs = require('fs');
const url = require('url');
const utilities = require('./utilities.js');
// #endregion

// #region Settings
// Read and parse settings file
const settings = JSON.parse(fs.readFileSync(`${__dirname}/../settings.json`));

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// Attempt to verify and set the webdir to serve from
let webdir;
try {
  webdir = fs.realpathSync(`${__dirname}/../${process.env.NODE_WEBDIR || settings.webdir}`);
} catch (error) {
  // Log error and exit if web directory could not be established
  if (error.code === 'NOENT') {
    console.log(`ERROR: webdir directory ${error.path} not found. `
      + 'Check the webdir is set correctly in settings.json');
  } else {
    console.log(error);
  }
  process.exit(1);
}
// #endregion

function jsonToXml(json) {
  let xml = '<response>';
  Object.keys(json).forEach((key) => {
    xml += `<${key}>${json[key]}</${key}>`;
  });
  xml += '</response>';

  return xml;
}

function serveFile(request, response, acceptedTypes, filePath) {
  // currently only supports html and css for simplicity
  const fileExtension = filePath.substring(filePath.lastIndexOf('.'));
  let contentType;
  if (fileExtension === '.html') {
    contentType = utilities.determineType(acceptedTypes, ['text/html', 'text/plain']);
  } else if (fileExtension === '.css') {
    contentType = utilities.determineType(acceptedTypes, ['text/css', 'text/plain']);
  } else {
    // 415 code, unsupported media type
    contentType = utilities.determineType(acceptedTypes, ['application/json', 'application/xml']);
    response.writeHead(415, contentType);
    if (request.method === 'GET') {
      const responseJSON = {
        id: '415UnsupportedMediaType',
        message: 'The resource you requested is of an unsupported type.',
      };

      let responseContent;
      if (contentType === 'application/xml') {
        responseContent = jsonToXml(responseJSON);
      } else {
        responseContent = JSON.stringify(responseJSON);
      }
      response.write(responseContent);
    }
    return response.end();
  }
  response.writeHead(200, { 'Content-Type': contentType });

  if (request.method === 'GET') {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // TODO: func for errors
        contentType = utilities.determineType(acceptedTypes, ['application/json', 'application/xml']);

        const responseJSON = {
          id: '500InternalServerError',
          message: 'The server encountered an unexpected problem getting the resourse.',
        };

        let responseContent;
        if (contentType === 'application/xml') {
          responseContent = jsonToXml(responseJSON);
        } else {
          responseContent = JSON.stringify(responseJSON);
        }
        response.writeHead(500, contentType);
        response.write(responseContent);
        return response.end();
      }

      response.write(data);
      return response.end();
    });
  } else {
    response.end();
  }
}

// Struct to manage any cases that should be handled in a specific way
const specialCases = {
  '/': (request, response, acceptedTypes) => serveFile(request, response, acceptedTypes, `${webdir}/client.html`),
};

function onRequest(request, response) {
  const parsedUrl = url.parse(request.url);
  // Remove any './' or '../' from the url and prepend the defined web dir
  const resolvedPath = parsedUrl.pathname.replaceAll('./', '').replaceAll('../', '');
  const acceptedTypes = request.headers.accept.split(',');

  // Check if the requested resource is a special case
  if (specialCases[resolvedPath]) {
    specialCases[resolvedPath](request, response, acceptedTypes, parsedUrl);
  } else if ((request.method === 'GET' || request.method === 'HEAD') && utilities.checkValidFile(webdir + resolvedPath)) {
    // If a file exists at the requested path, get it.
    serveFile(request, response, acceptedTypes, webdir + resolvedPath);
  } else { // TODO Break out to a funuction to send a response.
    response.statusCode = 404;
    const contentType = utilities.determineType(acceptedTypes, ['application/json', 'application/xml']);
    response.setHeader('Content-Type', contentType);

    if (request.method !== 'HEAD') {
      const responseJSON = {
        id: '404NotFound',
        message: 'The page or resource you have requested does not exist.',
      };

      let responseContent;
      if (contentType === 'application/xml') {
        responseContent = jsonToXml(responseJSON);
      } else {
        responseContent = JSON.stringify(responseJSON);
      }

      response.write(responseContent);
    }

    response.end();
  }
}

http.createServer(onRequest).listen(port, () => {
  console.log(`Serving files in ${webdir} on port ${port}`);
});
