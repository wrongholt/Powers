/*jshint esversion: 8 */
const Alexa = require('ask-sdk-core');
const https = require('https');
const fs = require('fs');
const {
  DynamoDbPersistenceAdapter
} = require('ask-sdk-dynamodb-persistence-adapter');
const mainAPL = require('./documents/main.json');
const listAPL = require('./documents/powerslist.json');
const listAPL2 = require('./documents/powerslist2.json');
const listData = require('./documents/listData.json');
const listData2 = require('./documents/listData2.json');
const fightAPL = require('./documents/fighting.json');

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
    var attributes = await getAttributes(handlerInput);
    var name = attributes.name;
    var power1 = await getRandomPowerImage();
    var power2 = await getRandomPowerImage();
    var bgImage = await getRandomMainBGImage();

    if (Object.keys(attributes).length === 0) {
      speakOutput = '<break strength="strong"/><p>Welcome, to <phoneme alphabet="ipa" ph="pɑwɚrs">Powers</phoneme>. I am  <say-as interpret-as="spell-out">G34XY</say-as>, a <phoneme alphabet="ipa" ph="pɑwɚrs">Powers</phoneme> fighter helper. </p><p>I am here to help you in any way possible through out any fight you may ask for my help by saying <break strength="strong"/> help me <say-as interpret-as="spell-out">G3</say-as> <break strength="strong"/>or I need help <say-as interpret-as="spell-out">G34XY</say-as> <break strength="strong"/>or hey bot I need help.</p> I will try to help in any way possible.<break strength="strong"/><amazon:emotion name="excited" intensity="high"> Except, I cannot fight for you!!</amazon:emotion> That is not in my contract you hear me <break strength="strong"/><emphasis level="strong">I do not fight!</emphasis>  Let\'s start by getting your name, we use this to keep track of your stats and how you are doing on the leaderboard. Just say, my name is.';
    } else {
      speakOutput = '<p>Welcome back to Powers, ' + CapitalizeTheFirstCharacter(name) + '. </p> <p>Would you like to view your ranking or pick your character to fight?</p>';
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
    } else {
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
    var attributes = await getAttributes(handlerInput);

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
      await saveAttributes(handlerInput, attributes);
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
    return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterSelectionScreenIntent' ||
      (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' &&
        handlerInput.requestEnvelope.request.arguments.length > 0 &&
        handlerInput.requestEnvelope.request.arguments[0] === 'ItemSelected'));
  },
  async handle(handlerInput) {
    var theBase = "appoBlEf8I1VQdU3r";
    var characterdata = await httpGet(theBase, '', 'Characters');
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
    var speakOutput = "Alright, lets go " + sessionAttributes.playerPower + "! Now who do you want to fight, " + sessionAttributes.charactersArray;
    if (!sessionAttributes.playerPower) {
      speakOutput = "You can pick from any of these characters: " + charactersArray + '!';
    }

    if (supportsAPL(handlerInput)) {
      if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' && handlerInput.requestEnvelope.request.arguments[0] === 'ItemSelected') {
        var character = handlerInput.requestEnvelope.request.arguments[2];
        console.log("IN SELECTION ----->>>>" + JSON.stringify(character));
        console.log("THE TOUCH EVENT---->>>" + JSON.stringify(handlerInput.requestEnvelope.request));
          
        await characterSelector(handlerInput,characterRecords,character);
          return CharactersSelectionScreenTwoHandler.handle(handlerInput);
      }
      return handlerInput.responseBuilder
        .speak(speechPolly(speakOutput))
        .reprompt(speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: listAPL,
          datasources: listData
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(speechPolly(speakOutput))
        .reprompt()
        .getResponse();
    }
  }
};

const CharactersSelectionScreenTwoHandler = {
  canHandle(handlerInput) {
    return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterSelectionTwoScreenIntent' ||
      (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' &&
        handlerInput.requestEnvelope.request.arguments.length > 0 &&
        handlerInput.requestEnvelope.request.arguments[0] === 'SecondItemSelected'));
  },
  async handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var speakOutput = "Alright, lets go " + sessionAttributes.playerPower + "! Now who do you want to fight, " + sessionAttributes.charactersArray;
    if (!sessionAttributes.playerPower) {
      speakOutput = "You can pick from any of these characters: " + charactersArray + '!';
    }

    if (supportsAPL(handlerInput)) {
      if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' && handlerInput.requestEnvelope.request.arguments[0] === 'SecondItemSelected') {
        var character = handlerInput.requestEnvelope.request.arguments[2];
        var characters = sessionAttributes.characterRecords;
        await characterSelector(handlerInput,characters,character);
        return FightStartHandler.handle(handlerInput);
      }
      
      return handlerInput.responseBuilder
        .speak(speechPolly(speakOutput))
        .reprompt(speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: listAPL2,
          datasources: listData
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(speechPolly(speakOutput))
        .reprompt()
        .getResponse();
    }
  }
};

const CharacterSelectedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterSelectedIntent';
  },
  async handle(handlerInput) {
    var character;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var characters = sessionAttributes.characterRecords;
    if (!sessionAttributes.playerPower) {
      character = handlerInput.requestEnvelope.request.intent.slots.Characters.value;
      await characterSelector(handlerInput,characters,character);
      return CharactersSelectionScreenTwoHandler.handle(handlerInput);
    } else if (!sessionAttributes.enemyPower) {
      character = handlerInput.requestEnvelope.request.intent.slots.Characters.value;
      await characterSelector(handlerInput,characters,character);
      return FightStartHandler.handle(handlerInput);
    }
  
  }
};

const EnemyRandomSelectedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'RandomCharacterSelectedIntent';
  },
  async handle(handlerInput) {
    var speakOutput;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var characters = sessionAttributes.characterRecords;
    var charactersArray = sessionAttributes.charactersArray;
    var randomCharacter = randomNoRepeats(charactersArray);
    if (!sessionAttributes.playerPower) {
      await characterSelector(handlerInput,characters,randomCharacter);
      sessionAttributes.randomCharacter = randomCharacter;
      return CharactersSelectionScreenTwoHandler.handle(handlerInput);
    } else if (!sessionAttributes.enemyPower) {
     await characterSelector(handlerInput,characters,randomCharacter);
      return FightStartHandler.handle(handlerInput);
    }
  }
};

const FightStartHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'FightStartIntent';
  },
  async handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    console.log("IN FIGHT START HANDLER COMPUTER IS----->>>>" + JSON.stringify(sessionAttributes));
    var speakOutput = sessionAttributes.playerPower + ' <phoneme alphabet="ipa" ph="versus">VS</phoneme> ' + sessionAttributes.enemyPower + "! Ready Fight!!";
    if (supportsAPL(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(speechPolly(speakOutput))
        .reprompt(speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: fightAPL,
          datasources: {}
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(speechPolly(speakOutput))
        .reprompt(speechPolly(speakOutput))
        .withSimpleCard("Fight", speakOutput)
        .getResponse();
    }
  }
};
const PlayerFightHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayerFightIntent';
  },
  async handle(handlerInput) {
    var speakOutput;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var move = handlerInput.requestEnvelope.request.intent.slots.Move.value;
    console.log("IN PLAYERFIGHTHANDLER AND MOVE IS ---->>>>" + JSON.stringify(move));
    if(move !== "use power move" || move !== "power move"){
    fightingPlayer(handlerInput,move);
    }
    if(sessionAttributes.playerPowerAttackAvail === true & move === "use power move" || sessionAttributes.playerPowerAttackAvail === true & move === "power move"){
      usePowerAttack(handlerInput, sessionAttributes.player, "player");
      speakOutput = "You just used " + sessionAttributes.player.POWER_ATK + " doing  a total of " + sessionAttributes.player.POWER_DMG + " damage to "+sessionAttributes.computer.Name +"! They now have " + sessionAttributes.computersHealth + " points left!";
      sessionAttributes.playerPowerAttackAvail = false;
      sessionAttributes.powersAttackTotal = 0;
    }
    else if(sessionAttributes.didTheyDodge){
      speakOutput = sessionAttributes.didTheyDodge;
      sessionAttributes.playerMoveData.Damage = 0.1;
    }else if(sessionAttributes.playerPowerAttackAvail === true){
      speakOutput = "Your " + sessionAttributes.playerMoveData.Name + " did " + sessionAttributes.playerMoveData.Damage + " points of damage to "+sessionAttributes.computer.Name +"! You also have your power move available, to use just say, power move. They now have " + sessionAttributes.computersHealth + " points left!";

    }else{
      speakOutput = "Your " + sessionAttributes.playerMoveData.Name + " did " + sessionAttributes.playerMoveData.Damage + " points of damage to "+sessionAttributes.computer.Name +"! They now have " + sessionAttributes.computersHealth + " points left!";
      
    }
    if(sessionAttributes.compPowerAttackAvail === false || !sessionAttributes.compPowerAttackAvail){
      fightingComputer(handlerInput);
    } 
    if(sessionAttributes.compPowerAttackAvail === true){
      usePowerAttack(handlerInput, sessionAttributes.computer, "computer");
      speakOutput += " Your opponent just activated their power move " + sessionAttributes.computer.POWER_ATK + " and did " + sessionAttributes.computer.POWER_DMG + " points of damage to you! You now have " + sessionAttributes.playersHealth + " points left, keep fighting!";
      sessionAttributes.compPowerAttackAvail = false;
      sessionAttributes.powersAttackTotal2 = 0;
    }else if(sessionAttributes.didTheyDodge){
      speakOutput += sessionAttributes.didTheyDodge;
      sessionAttributes.computerMoveData.Damage = 0.1;
    }else{
      speakOutput += " Your opponents, " + sessionAttributes.computerMoveData.Name + " did " + sessionAttributes.computerMoveData.Damage + " points of damage to "+ sessionAttributes.player.Name +"! You now have " + sessionAttributes.playersHealth + " points left, keep fighting!";
    }
    powersAttackMove(handlerInput);
    if (supportsAPL(handlerInput)) {

      return handlerInput.responseBuilder
        .speak(speechPolly(speakOutput))
        .reprompt(speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: fightAPL,
          datasources: {}
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(speechPolly(speakOutput))
        .reprompt(speechPolly(speakOutput))
        .withSimpleCard("Fight", speakOutput)
        .getResponse();
    }
  }
};
const ComputerFightHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ComputerFightIntent';
  },
  async handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var speakOutput;
    fightingComputer(handlerInput);
    if(sessionAttributes.didTheyDodge){
      speakOutput = sessionAttributes.didTheyDodge;
    }else{
      speakOutput = "Your opponents " + sessionAttributes.computerMoveData.Name + " did " + sessionAttributes.computerMoveData.Damage + " points of damage to "+sessionAttributes.player.Name +"! You now have " + sessionAttributes.playersHealth + " points left, keep fighting!";
    }
    if (supportsAPL(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(speechPolly(speakOutput))
        .reprompt(speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: fightAPL,
          datasources: {}
        }).addDirective({
          type: 'Dialog.Delegate',
          updatedIntent: {
            name: 'PlayerFightIntent',
            confirmationStatus: 'NONE',
            slots: {}
          }
        })
        .getResponse();
    } else {
      return PlayerFightHandler.handle(handlerInput);
    }
  }
};
const FightEndHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterSelectedIntent';
  },
  handle(handlerInput) {


    var speakOutput = "Ready Fight";
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
    CharactersSelectionScreenTwoHandler,
    CharacterSelectedHandler,
    EnemyRandomSelectedHandler,
    FightStartHandler,
    PlayerFightHandler,
    ComputerFightHandler,
    FightEndHandler,
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
  return '<speak><voice name="Russell"><prosody pitch="low">' + text + '</prosody></voice></speak>';
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
  var bgMainImage = ["https://powers.s3.amazonaws.com/empty-street-between-brick-buildings-4183230.jpg",
    "https://powers.s3.amazonaws.com/photo-of-pathway-between-walls-1472234.jpg",
    "https://powers.s3.amazonaws.com/street-urban-japan-brasil-50859+(1).jpg",
    "https://powers.s3.amazonaws.com/arches-architecture-art-baroque-316080.jpg"
  ];
  var randomBackground = await randomNoRepeats(bgMainImage);
  return randomBackground;
};
getRandomPowerBGImage = async () => {
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
  var randomBackground = await randomNoRepeats(bgMainImage);
  return randomBackground;
};
getRandomPowerImage = async () => {
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

saveAttributes = async (handlerInput, attributes) => {
  var attributesManager = handlerInput.attributesManager;
  attributesManager.setPersistentAttributes(attributes);
  await attributesManager.savePersistentAttributes();
};

getAttributes = async (handlerInput) => {
  var attributesManager = handlerInput.attributesManager;
  var attributes = await attributesManager.getPersistentAttributes() || {};

  return attributes;
};

characterSelector = async (handlerInput, characters, character) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if (!sessionAttributes.playerPower) {
    if (!sessionAttributes.hasOwnProperty('player')) {
      sessionAttributes.player = {};
    }
    character = characterFilter(character);
    character = CapitalizeTheFirstCharacter(character);
    sessionAttributes.player = findCharacterInData(characters, character);
    sessionAttributes.playerPower = character;
    sessionAttributes.playersHealth = 200;
  } else if (!sessionAttributes.enemyPower) {
    if (!sessionAttributes.hasOwnProperty('computer')) {
      sessionAttributes.computer = {};
    }
    character = characterFilter(character);
    character = CapitalizeTheFirstCharacter(character);
    sessionAttributes.computer = findCharacterInData(characters, character);
    sessionAttributes.computersHealth = 200;
    sessionAttributes.enemyPower = character;
  }
};
characterFilter = (character) =>{
    if(character === "mean" || character === "electric")
    {
      character = "Electric Mean";
    }else if(character === "lars" || character === "thundersquat" || character === "thunder" || character === "Lars")
    {
      character = "Lars Thundersquat";
    }else if(character === "ss" || character === "sharpie" || character === "sharp"|| character === "sharpy")
    {
      character = "Sharpie Sharp";
    }else{
      character = character;
    }
    return character;
};
findCharacterInData = (characters, character) => {
  for (var i = 0; i < characters.length;) {
    if (characters[i].fields.Name === character) {
      return characters[i].fields;
    }
    i++;
  }
};
findMoveInData = (player,move) => {
  var moveStats;
    if(player.ATK_LT_COMBO === move){
       moveStats = {
        Name: player.ATK_LT_NAME,
        Damage: player.ATK_LT_DMG,
        DodgeRating: player.ATK_LT_DBRATING
      }; 

      return moveStats;
    }else if(player.ATK_LT_COMBO2 === move){
       moveStats = {
        Name: player.ATK_LT_NAME2,
        Damage: player.ATK_LT_DMG2,
        DodgeRating: player.ATK_LT_DBRATING2
      }; 
      return moveStats;
    }else if(player.ATK_HV_COMBO === move){
       moveStats = {
        Name: player.ATK_HV_NAME,
        Damage: player.ATK_HV_DMG,
        DodgeRating: player.ATK_HV_DBRATING
      }; 
      return moveStats;
    }else if(player.ATK_HV_COMBO2 === move){
       moveStats = {
        Name: player.ATK_HV_NAME2,
        Damage: player.ATK_HV_DMG2,
        DodgeRating: player.ATK_HV_DBRATING2
      };
      return moveStats;
    }else{
        console.log("THAT ISN'T A POWER MOVE");
    }
};

fightingPlayer = (handlerInput, move) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if(move === "use power move" ||  move === "power move") return;
  var player = sessionAttributes.player;
    var moveData = findMoveInData(player,move);
    console.log("IN FIGHTING PLAYER FUNCTION ---->>>>" + JSON.stringify(moveData));
    var didTheyDodge = dodgeRating(moveData, player);
    if(didTheyDodge){
      sessionAttributes.didTheyDodge = didTheyDodge;
    }else{
      sessionAttributes.didTheyDodge = "";
      health(handlerInput,"player", moveData);
    }
    sessionAttributes.playerMoveData = moveData;
};

fightingComputer = (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var computer = sessionAttributes.computer;
  var compMove = randomizeComputerAttack(computer);
  var moveData = findMoveInData(computer, compMove);
  var didTheyDodge = dodgeRating(moveData,computer);
 if(didTheyDodge){
    sessionAttributes.didTheyDodge = didTheyDodge;
  }else{
    sessionAttributes.didTheyDodge = "";
  health(handlerInput,"computer", moveData);
  }
  sessionAttributes.computerMoveData = moveData;
};

health = (handlerInput,whosTurn,moveData) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if(whosTurn === "player"){
    sessionAttributes.computersHealth -= moveData.Damage;
  }else if(whosTurn === "computer"){
    sessionAttributes.playersHealth -= moveData.Damage;
  }
};

dodgeRating = (moveData, player) => {
   let theDodgeRating = moveData.DodgeRating;
   let theCharactersName = player.Name;
   let randomNumberTen = Math.floor(Math.random() * (5 * 100 - 1 * 100) + 1 * 100) / (1*100);
   if(theDodgeRating >= randomNumberTen){
    return theCharactersName +", has blocked your move!";
   }
};
randomizeComputerAttack = (computer) => {
  let combos = ["ATK_LT_COMBO","ATK_LT_COMBO2","ATK_HV_COMBO","ATK_HV_COMBO2"];
  var theCombo = randomNoRepeats(combos);
  if(computer.hasOwnProperty(theCombo)){
    var theAttack = computer[theCombo];
    return theAttack;
  }
};

powersAttackMove = (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var compDamage = sessionAttributes.computerMoveData.Damage;
  var playerDamage = sessionAttributes.playerMoveData.Damage;
  var total = ((playerDamage*compDamage)*sessionAttributes.player.POWER_RATIO);
  sessionAttributes.powersAttackTotal += total;
  console.log("TOTAL of PLAYERS SPECIAL POWER----->>>>> "+sessionAttributes.powersAttackTotal);

  if(sessionAttributes.player.POWER_TOTAL<=sessionAttributes.powersAttackTotal){
    sessionAttributes.playerPowerAttackAvail = true;
    console.log("<<<<<<<PLAYERS POWER ATTACK AVAILABLE!!!!>>>>>>>");
  }
  var total2 = ((playerDamage*compDamage) * sessionAttributes.computer.POWER_RATIO);
  sessionAttributes.powersAttackTotal2 += total2;
  console.log("TOTAL of COMPUTERS SPECIAL POWER----->>>> "+sessionAttributes.powersAttackTotal2);
  if(sessionAttributes.computer.POWER_TOTAL<=sessionAttributes.powersAttackTotal2){
    console.log("<<<<<<<COMPUTERS POWER ATTACK AVAILABLE!!!!>>>>>>>");
    sessionAttributes.compPowerAttackAvail = true;
  }
};
usePowerAttack = (handlerInput, player, whosTurn) =>{
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var damage = player.POWER_DMG;
  var audio = player.POWER_AUDIO;
  sessionAttributes.powersAudio = audio;
  if(whosTurn === "player"){
    sessionAttributes.computersHealth -= damage;
  }else if(whosTurn === "computer"){
    sessionAttributes.playersHealth -= damage;
  }
};
