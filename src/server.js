//#region Imports
const http = require('http');
const fs = require('fs');
const url = require('url');
//#endregion

// Read and parse settings file
const settings = JSON.parse(fs.readFileSync(__dirname + '/../settings.json'));

//#region Settings
const port = process.env.PORT || process.env.NODE_PORT || 3000;
// Attempt to verify and set the webdir to serve from
let webdir;
try {
  webdir = fs.realpathSync(__dirname + '/../'
    + (process.env.NODE_WEBDIR || settings.webdir));
} catch (error) {
  if (error.code = 'NOENT') {
    console.log(`ERROR: webdir directory ${error.path} not found. ` +
      "Check the webdir is set correctly in settings.json");
  } else {
    console.log(error);
  }
  process.exit(1);
}
//#endregion

const specialCases = {
  '/': () => console.log("/ reached"), //serveFile(webdir + '/client.html'),
};

function onRequest(request, response) {
  const parsedUrl = url.parse(request.url);
  // Remove any './' or '../' from the url and prepend the defined web dir
  const resolvedPath = parsedUrl.pathname.replaceAll('./', '').replaceAll('../', '');

  // Check if the requested resource is a special case
  if (specialCases[resolvedPath]) {
    specialCases[resolvedPath](request, response, parsedUrl);
  } else if ((request.method === 'GET' || request.method === 'HEAD') && checkValidFile(webdir + resolvedPath)) {
    console.log("serving " + webdir + resolvedPath); //serveFile(webdir + resolvedPath, request, response);
  } else {
    response.head
  }
}

http.createServer(onRequest).listen(port, () =>
  console.log(`Serving files in ${webdir} on port ${port}`));


function checkValidFile(filePath) {
  try {
    fs.accessSync(filePath)
  } catch (error) {
    return false;
  }
  return true;
}