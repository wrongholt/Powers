/*jshint esversion: 8 */
const mainAPL = require('./main.json');
const Alexa = require('ask-sdk-core');
const https = require('https');
const {
  DynamoDbPersistenceAdapter
} = require('ask-sdk-dynamodb-persistence-adapter');
const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({
  tableName: 'powers'
});
const variables = require('./variables');
var Airtable = require('airtable');
var base = new Airtable({
  apiKey: variables.ApiAirtable
}).base('appoBlEf8I1VQdU3r');

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    var speakOutput = "";
    const attributesManager = handlerInput.attributesManager;
    const attributes = await attributesManager.getPersistentAttributes() || {};
    var name = attributes.name;
    var power1 = await getRandomPowerImage();
    var power2 = await getRandomPowerImage();
    var bgImage = await getRandomMainBGImage();

    if (Object.keys(attributes).length === 0) {
      speakOutput = 'Welcome to Powers, what is your name? ';
    } else {
      speakOutput = 'Welcome back to Powers, ' + CapitalizeTheFirstCharacter(name) + '. Would you like to view your ranking or pick your character to fight?';
    }

    if (supportsAPL(handlerInput)) {
    return handlerInput.responseBuilder
      .speak(speechPolly(speakOutput))
      .reprompt(speechPolly(speakOutput))
      .addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        version: '1.3',
        document: mainAPL,
        datasources: {
          "mainData": {
            "type": "object",
            "properties": {
              "power1": power1,
              "power2": power2,
              "bgImage": bgImage
            }
          }
        }
      })
      .getResponse();
    }else {
        return handlerInput.responseBuilder
          .speak(speechPolly(speakOutput))
          .reprompt(speechPolly(speakOutput))
          .withSimpleCard("Powers", speakOutput)
          .getResponse();
      }
  },
};
const NameIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'NameIntent';
  },
  async handle(handlerInput) {
    var attributesManager = handlerInput.attributesManager;
    var attributes = await attributesManager.getPersistentAttributes() || {};
    var powers = handlerInput.requestEnvelope.request.intent.slots.CustomName.value;
    if (attributes.name) {
      return CharactersSelectionScreenHandler.handle(handlerInput);
    } else {
      var usersName = handlerInput.requestEnvelope.request.intent.slots.Name.value;
      var usersGBName = handlerInput.requestEnvelope.request.intent.slots.GBName.value;
      var usersDEName = handlerInput.requestEnvelope.request.intent.slots.DEName.value;
      var usersCustName = handlerInput.requestEnvelope.request.intent.slots.CustomName.value;
      var userID = handlerInput.requestEnvelope.context.System.user.userId;
      var usersID = userID.slice(userID.length - 6);
      var userName;
      if (usersName) {
        userName = usersName;
      } else if (usersGBName) {
        userName = usersGBName;
      } else if (usersDEName) {
        userName = usersDEName;
      } else if (usersCustName) {
        userName = usersCustName;
      }

      var record = await new Promise((resolve, reject) => {
        base('PlayerCharts').create([{
          "fields": {
            "Name": userName,
            "userID": userName + usersID
          }
        }], function (err, record) {
          if (err) {
            console.error(err);
            return;
          }
          resolve(record);
        });
      });

      attributes.name = userName;
      attributes.nameid = userName + usersID;
      attributesManager.setPersistentAttributes(attributes);
      await attributesManager.savePersistentAttributes();
      const speakOutput = 'Perfect, ' + CapitalizeTheFirstCharacter(userName) + ", now lets pick your character.";

      return handlerInput.responseBuilder
        .speak(speechPolly(speakOutput))
        .reprompt(speechPolly(speakOutput))
        .getResponse();
    }
  }
};

const CharactersSelectionScreenHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterSelectionScreenIntent';
  },
  async handle(handlerInput) {
    var theBase = "appoBlEf8I1VQdU3r";
    var characterdata = await httpGet(theBase, '&fields%5B%5D=Name', 'Characters');
    var characterRecords = characterdata.records;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    if (!sessionAttributes.hasOwnProperty('characterRecords')) {
      sessionAttributes.characterRecords = [];
    }
    sessionAttributes.characterRecords = characterRecords;
    var charactersArray = [];
    for (var i = 0; i < characterRecords.length;) {
      charactersArray.push(characterRecords[i].fields.Name);
      i++;
    }
    sessionAttributes.charactersArray = charactersArray;
    if (charactersArray.length > 2) {
      charactersArray = charactersArray.slice(1).join(', <break strength="strong"/>').replace(/, ([^,]*)$/, ' or $1');
    }
    var speakOutput = "You can pick from any of these characters: " + charactersArray + '!';
    return handlerInput.responseBuilder
      .speak(speechPolly(speakOutput))
      .reprompt()
      .getResponse();
  }
}
const CharacterSelectedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterSelectedIntent';
  },
  handle(handlerInput) {
    var character = handlerInput.requestEnvelope.request.intent.slots.Characters.value;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var speakOutput = "";
    console.log("THE ATTRIBUTES ARE ------->>>>" + JSON.stringify(sessionAttributes));
    if (!sessionAttributes.playerPower) {
      speakOutput = "Alright, lets go " + character;
      sessionAttributes.playerPower = character;
    } else {
      speakOutput = "Ok you have picked " + character + " to fight now lets battle!";
      sessionAttributes.playerPower = character;
    }

    return handlerInput.responseBuilder
      .speak(speechPolly(speakOutput))
      .reprompt()
      .getResponse();
  }
};

const EnemyRandomSelectedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterSelectedIntent';
  },
  handle(handlerInput) {


    var speakOutput = "Hello Power player";
    return handlerInput.responseBuilder
      .speak(speechPolly(speakOutput))
      .reprompt()
      .getResponse();
  }
};
const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
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
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
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
const DialogManagementStateInterceptor = {
  process(handlerInput) {

    const currentIntent = handlerInput.requestEnvelope.request.intent;

    if (handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.dialogState !== "COMPLETED") {

      const attributesManager = handlerInput.attributesManager;
      const sessionAttributes = attributesManager.getSessionAttributes();

      // If there are no session attributes we've never entered dialog management
      // for this intent before.

      if (sessionAttributes[currentIntent.name]) {
        let savedSlots = sessionAttributes[currentIntent.name].slots;

        for (let key in savedSlots) {
          // we let the current intent's values override the session attributes
          // that way the user can override previously given values.
          // this includes anything we have previously stored in their profile.
          if (!currentIntent.slots[key].value && savedSlots[key].value) {
            currentIntent.slots[key] = savedSlots[key];
          }
        }
      }
      sessionAttributes[currentIntent.name] = currentIntent;
      attributesManager.setSessionAttributes(sessionAttributes);
    }
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
    CharacterSelectedHandler,
    EnemyRandomSelectedHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
  )
  .addErrorHandlers(ErrorHandler)
  .withPersistenceAdapter(dynamoDbPersistenceAdapter)
  .withApiClient(new Alexa.DefaultApiClient())
  .addRequestInterceptors(DialogManagementStateInterceptor)
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
  var options = {
    host: "api.airtable.com",
    port: 443,
    path: "/v0/" + base + "/" + table + "?api_key=" + variables.ApiAirtable + filter,
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
};

CapitalizeTheFirstCharacter = (word) => {
  var newWord = word.charAt(0).toUpperCase() + word.substring(1);

  return newWord;

};
speechPolly = (text) => {
  return '<speak><voice name="Matthew"><amazon:domain name="conversational">' + text + '</amazon:domain></voice></speak>';
};

function supportsAPL(handlerInput) {
  if (handlerInput.requestEnvelope.context.System &&
      handlerInput.requestEnvelope.context.System.device &&
      handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
      handlerInput.requestEnvelope.context.System.device.supportedInterfaces["Alexa.Presentation.APL"]) return true;
  return false;
}

function randomNoRepeats(array) {
  var copy = array.slice(0);
    if (copy.length < 1) {
      copy = array.slice(0);
    }
    var index = Math.floor(Math.random() * copy.length);
    var item = copy[index];
    copy.splice(index, 1);
    return item;
}
getRandomMainBGImage = async () => {
  var bgMainImage = ["https://powers.s3.amazonaws.com/concrete-road-between-trees-1563356+(1).jpg",
    "https://powers.s3.amazonaws.com/photo-of-pathway-between-walls-1472234.jpg",
    "https://powers.s3.amazonaws.com/street-urban-japan-brasil-50859+(1).jpg"
  ];
  var randomBackground = await randomNoRepeats(bgMainImage);
  return randomBackground;
};
getRandomPowerBGImage = () => {
  var bgMainImage = ["https://powers.s3.amazonaws.com/maarten-van-den-heuvel-Siuwr3uCir0-unsplash.jpg",
    "https://powers.s3.amazonaws.com/carles-rabada-gwwWhABtohs-unsplash.jpg",
    "https://powers.s3.amazonaws.com/david-bruyndonckx-F_hft1Wiyj8-unsplash.jpg",
    "https://powers.s3.amazonaws.com/deglee-degi-wQImoykAwGs-unsplash.jpg",
    "https://powers.s3.amazonaws.com/efe-kurnaz-RnCPiXixooY-unsplash.jpg",
    "https://powers.s3.amazonaws.com/matteo-di-iorio-wkMd_DylG8I-unsplash.jpg",
    "https://powers.s3.amazonaws.com/michael-shannon-iIrB37J5yfA-unsplash.jpg",
    "https://powers.s3.amazonaws.com/omid-armin-2GHCdtW45Uw-unsplash.jpg",
    "https://powers.s3.amazonaws.com/samy-saadi-fFC7IOFT-OM-unsplash.jpg",
    "https://powers.s3.amazonaws.com/steven-pahel-7IOcBt29C2w-unsplash.jpg"
  ];
};
getRandomPowerImage = async() => {
  var theBase = "appoBlEf8I1VQdU3r";
  var characterdata = await httpGet(theBase, '', 'Characters');
    var characterRecords = characterdata.records;
  var charactersArray = [];
  for (var i = 0; i < characterRecords.length;) {
    charactersArray.push(characterRecords[i].fields.PWR_IMG);
    i++;
  }
  var powersImage = await randomNoRepeats(charactersArray);
  return powersImage;
};