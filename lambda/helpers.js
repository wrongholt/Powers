/*jshint esversion: 8 */
const variables = require('./variables');
const https = require('https');
const fs = require('fs');


exports.CapitalizeTheFirstCharacter = (word) => {
  var newWord = word.charAt(0).toUpperCase() + word.substring(1);

  return newWord;

};
 exports.capitalize_Words = (str) =>
{
 return str.toLowerCase()
 .split(' ')
 .map(str => str.charAt(0).toUpperCase() + str.slice(1))
 .join(' ');
};

exports.httpGet = (base, filter, table) => {
  var options = {
    host: "api.airtable.com",
    port: 443,
    path: "/v0/" + base + "/" + table + "?api_key=" + variables.ApiAirtable + filter,
    method: "GET"
  };
  return new Promise(((resolve, reject) => {
    const request = https.request(options, (response) => {
      response.setEncoding("utf8");
      let returnData = "";
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error(`${response.statusCode}: ${response.req.getHeader("host")} ${response.req.path}`));
      }
      response.on("data", (chunk) => {
        returnData += chunk;
      });
      response.on("end", () => {
        resolve(JSON.parse(returnData));
      });
      response.on("error", (error) => {
        reject(error);
      });
    });
    request.end();
  }));
};

exports.speechPolly = (text) => {
  return '<speak><voice name="Russell"><prosody pitch="low">' + text + '</prosody></voice></speak>';
};

exports.supportsAPL = (handlerInput) => {
  if (handlerInput.requestEnvelope.context.System &&
    handlerInput.requestEnvelope.context.System.device &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces["Alexa.Presentation.APL"]) return true;
  return false;
};

exports.randomNoRepeats = (array) => {
  var copy = array.slice(0);
  if (copy.length < 1) {
    copy = array.slice(0);
  }
  var index = Math.floor(Math.random() * copy.length);
  var item = copy[index];
  copy.splice(index, 1);
  return item;
};

