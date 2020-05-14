
const Alexa = require('ask-sdk-core');
const https = require('https');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');
const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({ tableName : 'powers' })
const variables = require('./variables');
var Airtable = require('airtable');
var base = new Airtable({apiKey: variables.ApiAirtable}).base('appoBlEf8I1VQdU3r');

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to Powers, what is your name? ';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const NameIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NameIntent';
    },
    async handle(handlerInput) {
        // var usersName = handlerInput.requestEnvelope.request.intent.slots.Name.value;
        // var usersGBName = handlerInput.requestEnvelope.request.intent.slots.GBName.value;
        // var usersDEName = handlerInput.requestEnvelope.request.intent.slots.DEName.value;
        var usersCustName = handlerInput.requestEnvelope.request.intent.slots.CustomName.value;
        var userID = handlerInput.requestEnvelope.context.System.user.userId;
        var usersID = userID.slice(userID.length - 6);
        console.log('THE ID IS----->>>>' + usersID);
        
          // var nameArray = [usersName,usersGBName,usersDEName,usersCustName];
          // console.log("THE NAME ARRAY IS ----->>>>" +nameArray);
          // var newUserName;
          // for(var i = 0; i < nameArray.length; i++){
          //   if(nameArray[i] !== '' || nameArray[i] !== null){
          //      newUserName = nameArray[i]
          //   }
          // }
          var record = await new Promise((resolve, reject) => {
            base('PlayerCharts').create([
                {
                  "userID": usersCustName + usersID
                }
              ], function(err, record) {
                if (err) {
                  console.error(err);
                  return;
                }
                resolve(record);
              });
            });
            console.log("THE RECORD IS ------>>>"+record)
              const attributesManager = handlerInput.attributesManager;
              const attributes = await attributesManager.getPersistentAttributes() || {};

              attributes.name = usersCustName; 
              attributes.nameid = usersCustName + usersID;
              attributesManager.setPersistentAttributes(attributes);
              await attributesManager.savePersistentAttributes();   
        
        const speakOutput = 'Perfect, ' +usersCustName+ ", now lets pick your character.";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .addDelegateDirective({
                name: 'CharacterSelectionScreenIntent',
                confirmationStatus: 'NONE',
                slots: {}
              })
            .getResponse();
    }
};

const CharactersSelectionScreenHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterSelectionScreenIntent';
    },
    handle(handlerInput){
        var theBase = "appoBlEf8I1VQdU3r";
        var characterdata = httpGet(theBase,'&fields%5B%5D=Name', 'Characters');
        var characterRecords = characterdata.records
        characterRecords.forEach(function(character) {
            console.log(character);
        })


        return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt()
        .getResponse();
    }
}
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        NameIntentHandler,
        CharactersSelectionScreenHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
        ) 
    .addErrorHandlers(ErrorHandler)
    .withPersistenceAdapter(dynamoDbPersistenceAdapter)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();


    function getSlotValues(filledSlots) {
        const slotValues = {};
      
        console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
        Object.keys(filledSlots).forEach((item) => {
          const name = filledSlots[item].name;
      
          if (filledSlots[item] &&
            filledSlots[item].resolutions &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
            switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
              case 'ER_SUCCESS_MATCH':
                slotValues[name] = {
                  synonym: filledSlots[item].value,
                  resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
                  isValidated: true,
                };
                break;
              case 'ER_SUCCESS_NO_MATCH':
                slotValues[name] = {
                  synonym: filledSlots[item].value,
                  resolved: filledSlots[item].value,
                  isValidated: false,
                };
                break;
              default:
                break;
            }
          } else {
            slotValues[name] = {
              synonym: filledSlots[item].value,
              resolved: filledSlots[item].value,
              isValidated: false,
            };
          }
        }, this);
      
        return slotValues;
      }


      httpGet = (base, filter, table) => {
        var options = { host: "api.airtable.com", port: 443, path: "/v0/" + base + "/" + table + "?api_key=" + variables.ApiAirtable + filter, method: "GET"};
        //console.log("FULL PATH = http://" + options.host + options.path);
        return new Promise(((resolve, reject) => { const request = https.request(options, (response) => { response.setEncoding("utf8");let returnData = "";
            if (response.statusCode < 200 || response.statusCode >= 300) { return reject(new Error(`${response.statusCode}: ${response.req.getHeader("host")} ${response.req.path}`));}
            response.on("data", (chunk) => { returnData += chunk; });
            response.on("end", () => { resolve(JSON.parse(returnData)); });
            response.on("error", (error) => { reject(error);});});
            request.end();
        }));
    };