const fs = require('fs');

// Helper to check if a file is accessible.
function checkValidFile(filePath) {
  try {
    fs.accessSync(filePath);
  } catch (error) {
    return false;
  }
  return true;
}

// Determines the appropriate content type to return based on the
// clients accepted types and the types available for this endpoint.
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

  if (!type) {
    // Indicate that there are no acceptable responses.
    return false;
  }

  // Get rid of version or quality values again
  const trimmedType = type.split(';')[0];

  if (trimmedType === '*/*') {
    // If the client doesnt care, use default
    return acceptedTypes[0];
  }

  // If a type was found, use it
  return trimmedType;
}

// Helper to convert JSON to XML
function jsonToXml(json) {
  let xml = '<response>';
  Object.keys(json).forEach((key) => {
    xml += `<${key}>${json[key]}</${key}>`;
  });
  xml += '</response>';

  return xml;
}

module.exports = { checkValidFile, determineType, jsonToXml };
