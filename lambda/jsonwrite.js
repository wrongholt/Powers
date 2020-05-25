const variables = require('./variables');
const https = require('https');
const fs = require('fs');
var Airtable = require('airtable');
var base = new Airtable({
  apiKey: variables.ApiAirtable
}).base('appoBlEf8I1VQdU3r');

    var options = {
      host: "api.airtable.com",
      port: 443,
      path: "/v0/appoBlEf8I1VQdU3r/Characters?api_key=" + variables.ApiAirtable,
      method: "GET"
    };
    //console.log("FULL PATH = http://" + options.host + options.path);
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
    var characterRecords = characterdata.records;
  fs.readFile('powerslist.json', 'utf8', function readFileCallback(err, data){
    if (err){
        console.log(err);
    } else {
    obj = JSON.parse(data); //now it an object
    console.log("IN WRITE JSON THE OBJ IS ------>>>" +obj);
    console.log("IN WRITE JSON THE SOURCE IS ------>>>" +characterRecords);
    for(var i = 0; i < characterRecords.length;){
      var removespaces = characterRecords[i].fields.Name;
      removespaces = removespaces.replace(/\s+/g, '');
    obj.datasources.listTemplate2ListData.listPage.listItems.push({
                    "listItemIdentifier": removespaces,
                    "ordinalNumber": 1,
                    "textContent": {
                        "primaryText": {
                            "type": "PlainText",
                            "text": characterRecords[i].fields.Name
                        },
                        "secondaryText": {
                            "type": "PlainText",
                            "text": "Power: "+ characterRecords[i].fields.POWER_ATK
                        }
                    },
                    "image": {
                        "contentDescription": null,
                        "smallSourceUrl": null,
                        "largeSourceUrl": null,
                        "sources": [
                            {
                                "url": getRandomPowerBGImage(),
                                "size": "small",
                                "widthPixels": 0,
                                "heightPixels": 0
                            },
                            {
                                "url": getRandomPowerBGImage(),
                                "size": "large",
                                "widthPixels": 0,
                                "heightPixels": 0
                            }
                        ]
                    },
                    "image2": {
                        "contentDescription": null,
                        "smallSourceUrl": null,
                        "largeSourceUrl": null,
                        "sources": [
                            {
                                "url": characterRecords[i].fields.PWR_IMG,
                                "size": "small",
                                "widthPixels": 0,
                                "heightPixels": 0
                            },
                            {
                                "url": characterRecords[i].fields.PWR_IMG,
                                "size": "large",
                                "widthPixels": 0,
                                "heightPixels": 0
                            }
                        ]
                    },
                    "token": characterRecords[i].fields.Name
    }); //add some data
    i++;
  }
    json = JSON.stringify(obj); //convert it back to json
    fs.writeFile('powerslist.json', json, 'utf8', function(err) {
      if (err) throw err;
      console.log('complete');
      }); // write it back 
}});
