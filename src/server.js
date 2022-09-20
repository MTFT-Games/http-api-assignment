// #region Imports
const http = require('http');
const fs = require('fs');
const url = require('url');
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

// Struct to manage any cases that should be handled in a specific way
const specialCases = {
  '/': () => console.log('/ reached'), // serveFile(webdir + '/client.html'),
};

// Helper to check if a file is accessable TODO: move to another file
function checkValidFile(filePath) {
  try {
    fs.accessSync(filePath);
  } catch (error) {
    return false;
  }
  return true;
}

// Determines the appropriate content type to return based on the
// clients accepted types and the types available for this endpoint. TODO: move to other file
function determineType(acceptedTypes, availableTypes) {
  // Search the clients accepted types for the first option available.
  const type = acceptedTypes.find((element) => {
    // Get rid of version or quality values and presume the list is already
    // sorted by preference.
    const testedType = element.split(';')[0];

    // Check if the type in question is available
    if (availableTypes.includes(testedType)) {
      return true;
    }

    // Check if the type in question is a wildcard
    if (testedType === '*/*') {
      return true;
    }

    return false;
  });

  // Get rid of version or quality values
  const trimmedType = type.split(';')[0];

  if (trimmedType === '*/*') {
    // If the client doesnt care, use default
    return acceptedTypes[0];
  }

  if (trimmedType) {
    // If a type was found, use it
    return trimmedType;
  }

  // Indicate that there are no acceptable responses.
  return false;
}

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
    contentType = determineType(acceptedTypes, ['text/html', 'text/plain']);
  } else {
    // 415 code, unsupported media type
  }
  response.writeHead(200, {'Content-Type': contentType});

  if (request.method === 'GET'){
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // TODO: func for errors
        contentType = determineType(acceptedTypes, ['application/json', 'application/xml']);
        // make error json
        //convert json
        //send and return end
        response.writeHead(500, contentType);
      }

      response.write(data);
      response.end();
    });
  } else {
    response.end();
  }
}

function onRequest(request, response) {
  const parsedUrl = url.parse(request.url);
  // Remove any './' or '../' from the url and prepend the defined web dir
  const resolvedPath = parsedUrl.pathname.replaceAll('./', '').replaceAll('../', '');
  const acceptedTypes = request.headers.accept.split(',');

  // Check if the requested resource is a special case
  if (specialCases[resolvedPath]) {
    specialCases[resolvedPath](request, response, parsedUrl);
  } else if ((request.method === 'GET' || request.method === 'HEAD') && checkValidFile(webdir + resolvedPath)) {
    // If a file exists at the requested path, get it.
    console.log(`serving ${webdir}${resolvedPath}`); // serveFile(webdir + resolvedPath, request, response);
  } else { // TODO Break out to a funuction to send a response.
    response.statusCode = 404;
    const contentType = determineType(acceptedTypes, ['application/json', 'application/xml']);
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
