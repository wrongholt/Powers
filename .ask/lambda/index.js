/*jshint esversion: 8 */
const Alexa = require('ask-sdk-core');
var EloRating = require('elo-rating');
const _ = require('lodash');
const {
  DynamoDbPersistenceAdapter
} = require('ask-sdk-dynamodb-persistence-adapter');

const mainAPL = require('./documents/main.json');
const listAPL = require('./documents/powerslist');
const listAPL2 = require('./documents/powerslist2.json');
const stats = require('./documents/stats.json');
const standings = require('./documents/standings.json');
const listData = require('./documents/listData');
const fightAPL = require('./documents/fighting.json');
const fightStartAPL = require('./documents/fightingStart.json');
const moveListAPL = require('./documents/fightingList.json');
const helpers = require('./helpers');
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
    var theBase = "appoBlEf8I1VQdU3r";
    var characterdata = await helpers.httpGet(theBase, '', 'Characters');
    var characterRecords = characterdata.records;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var attributes = await getAttributes(handlerInput);
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

    var name = attributes.name;
    var power1 = await getRandomPowerImage();
    var power2 = await getRandomPowerImage();
    var bgImage = await getRandomMainBGImage();

    if (Object.keys(attributes).length === 0) {
      speakOutput = '<break strength="strong"/><p>Welcome, to <phoneme alphabet="ipa" ph="pɑwɚrs">Powers</phoneme>. I am  <say-as interpret-as="spell-out">G34XY</say-as>, a <phoneme alphabet="ipa" ph="pɑwɚrs">Powers</phoneme> fighter helper. </p><p>I am here to help you in any way possible through out any fight you may ask for my help by saying <break strength="strong"/> move list <break strength="strong"/>or bot help.</p> I will try to help in any way possible.<break strength="strong"/><amazon:emotion name="excited" intensity="high"> Except, I cannot fight for you!!</amazon:emotion> That is not in my contract you hear me <break strength="strong"/><emphasis level="strong">I do not fight!</emphasis>  Let\'s start by getting your name, we use this to keep track of your stats and how you are doing on the leaderboard. Just say, my name is.';
    } else {
      var launch2 = ['<p>Welcome back to Powers, ' + helpers.capitalize_Words(name) + '. </p> <p>Would you like to view your rankings or pick your character to fight?</p>',
        '<p>Hey you came back!</p> <p>This is great news.</p> <p>What would you like to do fight or look at your rankings?</p>',
        '<p>Welcome back! You know, I am not the only bot here, there is another that helps me out from time to time, her name is <say-as interpret-as="spell-out">A73XA</say-as>.</p> <p>Now would you like to fight again or view your rankings?</p> '
      ];
      speakOutput = helpers.randomNoRepeats(launch2);
    }

    if (helpers.supportsAPL(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
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
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
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
      var nameSpeak = ['Perfect, ' + helpers.capitalize_Words(userName) + ", now lets pick your character, just say pick character.",
        'Outstanding, I have saved your name for rankings and to be more personible. Now lets pick your character, ' + helpers.capitalize_Words(userName) + '. Just say; pick character.',
        'Well hello there, ' + helpers.capitalize_Words(userName) + '! It is nice to meet you. Next, you got to pick a character you can do that by saying, pick character.'
      ];
      const speakOutput = helpers.randomNoRepeats(nameSpeak);


      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
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
    var characterdata = await helpers.httpGet(theBase, '', 'Characters');
    var characterRecords = characterdata.records;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var attributes = await getAttributes(handlerInput);
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
    var whoToFight = ["Alright, lets go " + sessionAttributes.playerPower + "! Now who do you want to fight, " + sessionAttributes.charactersArray,
      "Are you serious, " + sessionAttributes.playerPower + " my favorite! Who would you like to fight, " + sessionAttributes.charactersArray + "?",
      "Everyone, we got " + sessionAttributes.playerPower + " in the house! Who are they going to fight against, " + sessionAttributes.charactersArray + "?",
    ];
    var speakOutput = helpers.randomNoRepeats(whoToFight);
    if (!sessionAttributes.playerPower) {
      speakOutput = "You can pick from any of these characters: " + charactersArray + '!';
    }

    console.log("IN THE FIRST CHARACTER SELECTION>>>>>>>>");
    if (helpers.supportsAPL(handlerInput)) {
      var characterData;
      // if(attributes.firstExpansion === true){
      //   characterData = powersListExpansionData(handlerInput);
      // }else{
      //   characterData = powersListMainData(handlerInput);
      // }
      var bgImage = await getRandomMainBGImage();
      if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' && handlerInput.requestEnvelope.request.arguments[0] === 'ItemSelected') {
        var character = handlerInput.requestEnvelope.request.arguments[2];
        await characterSelector(handlerInput, characterRecords, character);
        return CharactersSelectionScreenTwoHandler.handle(handlerInput);
      }
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: listAPL,
          datasources: listData.powersListMainData(handlerInput)
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
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
    var whoToFight = ["Alright, lets go " + sessionAttributes.playerPower + "! Now who do you want to fight, " + sessionAttributes.charactersArray,
      "Are you serious, " + sessionAttributes.playerPower + " my favorite! Who would you like to fight, " + sessionAttributes.charactersArray + "?",
      "Everyone, we got " + sessionAttributes.playerPower + " in the house! Who are they going to fight against" + sessionAttributes.charactersArray + "?",
    ];
    var speakOutput = helpers.randomNoRepeats(whoToFight);
    if (!sessionAttributes.playerPower) {
      speakOutput = "You can pick from any of these characters: " + charactersArray + '!';
    }

    if (helpers.supportsAPL(handlerInput)) {
      var attributes = await getAttributes(handlerInput);
      var characterData;
      // if(attributes.firstExpansion === true){
      //   characterData = powersListExpansionData(handlerInput);
      // }else{
      //   characterData = powersListMainData(handlerInput);
      // }
      if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' && handlerInput.requestEnvelope.request.arguments[0] === 'SecondItemSelected') {
        var character = handlerInput.requestEnvelope.request.arguments[2];
        var characters = sessionAttributes.characterRecords;
        await characterSelector(handlerInput, characters, character);
        return FightStartHandler.handle(handlerInput);
      }

      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: listAPL2,
          datasources: listData.powersListMainData(handlerInput)
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
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
      await characterSelector(handlerInput, characters, character);
      return CharactersSelectionScreenTwoHandler.handle(handlerInput);
    } else if (!sessionAttributes.enemyPower) {
      character = handlerInput.requestEnvelope.request.intent.slots.Characters.value;
      await characterSelector(handlerInput, characters, character);
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
    var randomCharacter = helpers.randomNoRepeats(charactersArray);
    if (!sessionAttributes.playerPower) {
      await characterSelector(handlerInput, characters, randomCharacter);
      sessionAttributes.randomCharacter = randomCharacter;
      return CharactersSelectionScreenTwoHandler.handle(handlerInput);
    } else if (!sessionAttributes.enemyPower) {
      await characterSelector(handlerInput, characters, randomCharacter);
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
    var speakOutput;
    if (!sessionAttributes.hasOwnProperty("FightStart")) {
      speakOutput = sessionAttributes.playerPower + ' <phoneme alphabet="ipa" ph="versus">VS</phoneme> ' + sessionAttributes.enemyPower + "! Ok, next just say a move, or say move list, to access it.  Ready Fight!!";
      sessionAttributes.FightStart = true;
    } else {
      var fightReturn = ["Let's get back to the fight, just say a move.",
        "Sweet you have returned, just say a move to get back to fighting!",
        "So someone told me, to tell you, to just say a move to fight.",
        "Light attack or Heavy attack are universal fight moves you can start with those if you don't remember a fight move."
      ];
      speakOutput = helpers.randomNoRepeats(fightReturn);

    }

    if (helpers.supportsAPL(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: fightStartAPL,
          datasources: {
            "mainData": {
              "type": "object",
              "properties": {
                "playerName": sessionAttributes.player.Name,
                "computerName": sessionAttributes.computer.Name,
                "powerPlayer": sessionAttributes.player.PWR_IMG,
                "powerComputer": sessionAttributes.computer.PWR_IMG
              }
            }
          }
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
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
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var speakOutput;
    var audio;
    var move = handlerInput.requestEnvelope.request.intent.slots.Move.value;
    console.log("IN PLAYERFIGHTHANDLER AND MOVE IS ---->>>>" + JSON.stringify(move));

    if (move === "dodge" || move === "block" || move === "dip" || move === "duck" || move === "dive" || move === "blocked") {
      speakOutput = playerBlocked(handlerInput, move);
    } else {
      if (move !== "use power move" || move !== "power move") {
        fightingPlayer(handlerInput, move);
      }
      if (sessionAttributes.playerPowerAttackAvail === true & move === "use power move" || sessionAttributes.playerPowerAttackAvail === true & move === "power move") {
        usePowerAttack(handlerInput, sessionAttributes.player, "player");
        audio = sessionAttributes.player.POWER_AUDIO;
        if (sessionAttributes.player.Name === "Charity") {
          speakOutput = audio + "You just used " + sessionAttributes.player.POWER_ATK + " healing yourself for " + sessionAttributes.player.POWER_DMG + " points! You now have " + sessionAttributes.playersHealth + " points!";
        } else {
          speakOutput = audio + "You just used " + sessionAttributes.player.POWER_ATK + " doing  a total of " + sessionAttributes.player.POWER_DMG + " damage to " + sessionAttributes.computer.Name + "! They now have " + sessionAttributes.computersHealth + " points left!";
        }
        sessionAttributes.playerPowerAttackAvail = false;
        sessionAttributes.powersAttackTotal = 0;
      } else if (sessionAttributes.didCompDodge) {
        speakOutput = sessionAttributes.computer.Name + " blocked your move.";
        sessionAttributes.didCompDodge = false;
      } else if (sessionAttributes.playerPowerAttackAvail === true) {
        speakOutput = "Your " + sessionAttributes.playerMoveData.Name + " did " + sessionAttributes.playerMoveData.Damage + " points of damage to " + sessionAttributes.computer.Name + "! You also have your power move available, to use just say, power move. They now have " + sessionAttributes.computersHealth + " points left!";

      } else {
        speakOutput = "Your " + sessionAttributes.playerMoveData.Name + " did " + sessionAttributes.playerMoveData.Damage + " points of damage to " + sessionAttributes.computer.Name + "! They now have " + sessionAttributes.computersHealth + " points left!";

      }

      if (sessionAttributes.compPowerAttackAvail === true) {
        usePowerAttack(handlerInput, sessionAttributes.computer, "computer");
        audio = sessionAttributes.computer.POWER_AUDIO;
        if (sessionAttributes.computer.Name === "Charity") {
          speakOutput += audio + " Your opponent just used " + sessionAttributes.computer.POWER_ATK + " healing herself for " + sessionAttributes.player.POWER_DMG + " points! They now have " + sessionAttributes.computersHealth + " points!";
        } else {
          speakOutput += audio + " Your opponent just activated their power move " + sessionAttributes.computer.POWER_ATK + " and did " + sessionAttributes.computer.POWER_DMG + " points of damage to you! You now have " + sessionAttributes.playersHealth + " points left, keep fighting!";
        }
        sessionAttributes.compPowerAttackAvail = false;
        sessionAttributes.powersAttackTotal2 = 0;
      } else if (sessionAttributes.didPlayerDodge) {
        speakOutput += " " + sessionAttributes.player.Name + ", has blocked the move!";
        sessionAttributes.didPlayerDodge = false;
      } else {
        speakOutput += " Your opponents, " + sessionAttributes.computerMoveData.Name + " did " + sessionAttributes.computerMoveData.Damage + " points of damage to " + sessionAttributes.player.Name + "! You now have " + sessionAttributes.playersHealth + " points left, keep fighting!";
      }
    }
    sessionAttributes.turnCounter += 1;
    if (sessionAttributes.playersHealth < 0 || sessionAttributes.computersHealth < 0) {
      theEnd(handlerInput);
      return FightEndHandler.handle(handlerInput);
    }
    if (helpers.supportsAPL(handlerInput)) {
      healthBar(handlerInput);
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: fightAPL,
          datasources: {
            "mainData": {
              "type": "object",
              "properties": {
                "powerPlayer": sessionAttributes.player.PWR_IMG,
                "powerComputer": sessionAttributes.computer.PWR_IMG,
                "power": {
                  "health": sessionAttributes.playersBarOne,
                  "health2": sessionAttributes.playersBarTwo
                },
                "power2": {
                  "health": sessionAttributes.computersBarOne,
                  "health2": sessionAttributes.computersBarTwo
                }
              }
            }
          }
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .withSimpleCard("Fight", speakOutput)
        .getResponse();
    }
  }
};

const FightEndHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterSelectedIntent';
  },
  async handle(handlerInput) {
    var speakOutput;
    var color;
    var bgColor;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    if (sessionAttributes.computerWin === false && sessionAttributes.playerWin === false) {
      speakOutput = "Wow it was a tie you will get them next time!";
      bgColor = "#eeeeee";
      color = "#0E2773";
    } else if (sessionAttributes.playerWin === false) {
      speakOutput = "Sorry but you lost always next time!";
      bgColor = "#BF1736";
      color = "#0E2773";
    } else if (sessionAttributes.computerWin === false) {
      speakOutput = "Nice you won!";
      bgColor = "#0E2773";
      color = "#BF1736";
    }
    if (helpers.supportsAPL(handlerInput)) {
      healthBar(handlerInput);
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: fightAPL,
          datasources: {
            "mainData": {
              "type": "object",
              "properties": {
                "bgColor": bgColor,
                "color": color,
                "message": speakOutput
              }
            }
          }
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt()
        .getResponse();
    }
  }
};

const MoveListHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'MoveListIntent';
  },
  async handle(handlerInput) {
    var speakOutput = moveListSpeak(handlerInput);
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    if (helpers.supportsAPL(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: moveListAPL,
          datasources: {
            "mainData": {
              "type": "object",
              "properties": {
                "powerPlayer": sessionAttributes.player.PWR_IMG,
                "powerComputer": sessionAttributes.computer.PWR_IMG,
                "powerName": sessionAttributes.player.Name,
                "moveList": moveList(handlerInput)

              }
            }
          }
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt()
        .getResponse();
    }
  }
};

const YourStatsHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'YourStatsIntent';
  },
  async handle(handlerInput) {
    var speakOutput = "";
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var attributes = await getAttributes(handlerInput);
    if (!attributes.hasOwnProperty("stats")) {
      speakOutput = "I am sorry you need to play more to get your standings";
    }
    var statsObject = await statsData(handlerInput);
        speakOutput = statsObject.speakOutput;
    if (helpers.supportsAPL(handlerInput)) {
      
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: stats,
          datasources: {
            "mainData": {
              "type": "object",
              "properties": {
                "power": statsObject.charURL,
                "bgImage": "https://powers.s3.amazonaws.com/street-urban-japan-brasil-50859+(1).jpg",
                "title": sessionAttributes.name ,
                "subtitle": statsObject.topCharacter,
                "primaryText": statsObject.score + statsObject.statString
        
              }
            }
          }
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt()
        .getResponse();
    }
  }
};

const YourStandingsHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'YourStandingsIntent';
  },
  async handle(handlerInput) {
    var speakOutput = "";
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var attributes = await getAttributes(handlerInput);
    if (!attributes.hasOwnProperty("stats")) {
      speakOutput = "I am sorry you need to play more to get your standings";
    }

    if (helpers.supportsAPL(handlerInput)) {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: moveListAPL,
          datasources: {
            "mainData": {
              "type": "object",
              "properties": {
                "powerPlayer": sessionAttributes.player.PWR_IMG,
                "powerComputer": sessionAttributes.computer.PWR_IMG,
                "powerName": sessionAttributes.player.Name,
                "moveList": moveList(handlerInput)

              }
            }
          }
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt()
        .getResponse();
    }
  }
};

const CloseMoveListHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CloseMoveListIntent';
  },
  handle(handlerInput) {
    return FightStartHandler.handle(handlerInput);
  }
};

const YesNoIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      ((Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent') ||
        (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'));
  },
  async handle(handlerInput) {
    var attributes = await getAttributes(handlerInput);
    console.log("<=== YESNO HANDLER ===>");
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    switch (sessionAttributes.previousIntent) {
      case "ExpansionIntent":
        if (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent') return CharactersSelectionScreenHandler.handle(handlerInput);
        else {
          attributes.firstExpansion = true;
          await saveAttributes(handlerInput, attributes);
          return CharactersSelectionScreenHandler.handle(handlerInput);
        }
        break;
      default:
        return ErrorHandler.handle(handlerInput);

    }
  }
};
const GetListofISPsHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'WhatCanIBuyIntent';
  },
  handle(handlerInput) {
    var speakOutput;
    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return ms.getInSkillProducts(locale)
      .then(async function checkForProductAccess(result) {

          // const expansion = result.inSkillProducts.find(record => record.referenceName === "ExpansionPack1");
          const products = getAllProducts(result.inSkillProducts);
          if (products && products.length > 0) {
            // Customer owns one or more products
            console.log("GET SKILL PRODUCTS------>>>>>" + JSON.stringify(getSpeakableListOfProducts(products)));
            speakOutput = "The following are available for purchase: " + getSpeakableListOfProducts(products) + '. To purchase any of the products just say I want to buy, than the product name.';
            return handlerInput.responseBuilder
              .speak(helpers.speechPolly(speakOutput))
              .reprompt()
              .getResponse();
          }
          speakOutput = "I am sorry you have all the products purchased, please come back tomorrow to see if there are any new one's to buy.";
          // Not entitled to anything yet.
          console.log('No entitledProducts');
          return handlerInput.responseBuilder
            .speak(helpers.speechPolly(speakOutput))
            .reprompt()
            .getResponse();
        },
        function reportPurchasedProductsError(err) {
          console.log(`Error calling InSkillProducts API: ${err}`);

          return handlerInput.responseBuilder
            .speak('Something went wrong in loading the products available.')
            .getResponse();
        }, );
  },
};
const ExpansionIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'BuyIntent';
  },
  async handle(handlerInput) {
    console.log("<=== HINTINTENT HANDLER ===>");
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var attributes = await getAttributes(handlerInput);
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "BuyIntent";
    var speakOutput = "";

    if (!attributes.hasOwnProperty("firstExpansion")) {

      const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
      const locale = handlerInput.requestEnvelope.request.locale;
      console.log("GET SKILL PRODUCTS------>>>>>" + JSON.stringify(ms.getInSkillProducts(locale)));
      return await ms.getInSkillProducts(locale).then(async function checkForProductAccess(result) {
        const expansion = result.inSkillProducts.find(record => record.referenceName === "ExpansionPack1");

        var upsellMessage = "You have not purchased the first expansion pack, would you like to know more?";

        return handlerInput.responseBuilder
          .addDirective({
            "type": "Connections.SendRequest",
            "name": "Upsell",
            "payload": {
              "InSkillProduct": {
                "productId": expansion.productId
              },
              "upsellMessage": upsellMessage
            },
            "token": "correlationToken"
          })
          .getResponse();
      });
    } else {
      speakOutput = "I am sorry you alreay purchased the first expansion, please wait for use to make another.";
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .getResponse();
    }
  }
};

const SuccessfulPurchaseResponseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "Connections.Response" &&
      (handlerInput.requestEnvelope.request.name === "Buy" || handlerInput.requestEnvelope.request.name === "Upsell") &&
      (handlerInput.requestEnvelope.request.payload.purchaseResult == "ACCEPTED" || handlerInput.requestEnvelope.request.payload.purchaseResult == "ALREADY_PURCHASED");
  },
  async handle(handlerInput) {
    console.log("<=== SuccessfulPurchaseResponse HANDLER ===>");

    const locale = handlerInput.requestEnvelope.request.locale;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const productId = handlerInput.requestEnvelope.request.payload.productId;
    var attributes = await getAttributes(handlerInput);
    return ms.getInSkillProducts(locale).then(async function (res) {
      let product = res.inSkillProducts.find(record => record.productId == productId);
      if (product != undefined) {
        if (product.referenceName === "ExpansionPack1") {
          attributes.firstExpansion = true;
          await saveAttributes(handlerInput, attributes);
          return CharactersSelectionScreenHandler.handle(handlerInput);
        }


      }
    });
  }
};

const ErrorPurchaseResponseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "Connections.Response" &&
      (handlerInput.requestEnvelope.request.name === "Buy" || handlerInput.requestEnvelope.request.name === "Upsell") &&
      handlerInput.requestEnvelope.request.payload.purchaseResult == 'ERROR';
  },
  async handle(handlerInput) {
    console.log("<=== ErrorPurchaseResponse HANDLER ===>");
    //TODO: add launch request verbage

    return LaunchRequestHandler.handle(handlerInput);
  }
};

const UnsuccessfulPurchaseResponseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === "Connections.Response" &&
      (handlerInput.requestEnvelope.request.name === "Buy" || handlerInput.requestEnvelope.request.name === "Upsell") &&
      handlerInput.requestEnvelope.request.payload.purchaseResult == 'DECLINED';
  },
  async handle(handlerInput) {
    console.log("<=== UnsuccessfulPurchaseResponse HANDLER ===>");

    const locale = handlerInput.requestEnvelope.request.locale;
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const productId = handlerInput.requestEnvelope.request.payload.productId;

    return ms.getInSkillProducts(locale).then(async function (res) {
      let product = res.inSkillProducts.find(record => record.productId == productId);

      if (product != undefined) {
        //TODO: add launch request verbage
        return LaunchRequestHandler.handle(handlerInput);
      }
    });
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


const IntentReflectorHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const speakOutput = `You just triggered ${intentName}`;

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};


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

      if (sessionAttributes[currentIntent.name]) {
        let savedSlots = sessionAttributes[currentIntent.name].slots;

        for (let key in savedSlots) {

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
    FightEndHandler,
    MoveListHandler,
    CloseMoveListHandler,
    YourStatsHandler,
    YourStandingsHandler,
    GetListofISPsHandler,
    YesNoIntentHandler,
    ExpansionIntentHandler,
    SuccessfulPurchaseResponseHandler,
    UnsuccessfulPurchaseResponseHandler,
    ErrorPurchaseResponseHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler,
    IntentReflectorHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .withPersistenceAdapter(dynamoDbPersistenceAdapter)
  .withApiClient(new Alexa.DefaultApiClient())
  .addRequestInterceptors(DialogManagementStateInterceptor)
  .lambda();



getRandomMainBGImage = async () => {
  var bgMainImage = ["https://powers.s3.amazonaws.com/empty-street-between-brick-buildings-4183230.jpg",
    "https://powers.s3.amazonaws.com/photo-of-pathway-between-walls-1472234.jpg",
    "https://powers.s3.amazonaws.com/street-urban-japan-brasil-50859+(1).jpg",
    "https://powers.s3.amazonaws.com/arches-architecture-art-baroque-316080.jpg"
  ];
  var randomBackground = await helpers.randomNoRepeats(bgMainImage);
  return randomBackground;
};

getRandomPowerImage = async () => {
  var theBase = "appoBlEf8I1VQdU3r";
  var characterdata = await helpers.httpGet(theBase, '', 'Characters');
  var characterRecords = characterdata.records;
  var charactersArray = [];
  for (var i = 0; i < characterRecords.length;) {
    charactersArray.push(characterRecords[i].fields.PWR_IMG);
    i++;
  }
  var powersImage = await helpers.randomNoRepeats(charactersArray);
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
  let attributes = await getAttributes(handlerInput);
  if (!sessionAttributes.playerPower) {
    if (!sessionAttributes.hasOwnProperty('player')) {
      sessionAttributes.player = {};
    }
    character = characterFilter(character);
    character = helpers.capitalize_Words(character);
    if (!attributes.hasOwnProperty("characters")) {
      attributes.characters = {};
    }
    if (!attributes.characters.hasOwnProperty(character)) {
      attributes.characters[character] = {};
    }
    if (!attributes.characters[character].hasOwnProperty("count")) {
      attributes.characters[character].count = 0;
    }
    attributes.characters[character].count += 1;
    if (!attributes.characters[character].hasOwnProperty("score")) {
      attributes.characters[character].score = 100;
    } else if (attributes.characters[character].score <= 100) {
      attributes.characters[character].score = 100;
    }

    await saveAttributes(handlerInput, attributes);
    sessionAttributes.player = findCharacterInData(characters, character);
    sessionAttributes.playerPower = character;
    sessionAttributes.playersHealth = 200;
  } else if (!sessionAttributes.enemyPower) {
    if (!sessionAttributes.hasOwnProperty('computer')) {
      sessionAttributes.computer = {};
    }
    character = characterFilter(character);
    character = helpers.capitalize_Words(character);

    if (!attributes.hasOwnProperty("compCharacters")) {
      attributes.compCharacters = {};
    }
    if (!attributes.compCharacters.hasOwnProperty(character)) {
      attributes.compCharacters[character] = {};
    }
    if (!attributes.compCharacters[character].hasOwnProperty("count")) {
      attributes.compCharacters[character].count = 0;
    }
    attributes.compCharacters[character].count += 1;
    if (attributes.compCharacters[character].count === 1) {
      attributes.compCharacters[character].score = 100;
    }
    await saveAttributes(handlerInput, attributes);
    sessionAttributes.computer = findCharacterInData(characters, character);
    sessionAttributes.computersHealth = 200;
    sessionAttributes.enemyPower = character;
  }
};
characterFilter = (character) => {
  if (character === "mean" || character === "electric") {
    character = "Electric Mean";
  } else if (character === "lars" || character === "thundersquat" || character === "thunder" || character === "Lars") {
    character = "Lars Thundersquat";
  } else if (character === "ss" || character === "sharpie" || character === "sharp" || character === "sharpy") {
    character = "Sharpie Sharp";
  } else {
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
findMoveInData = (player, move) => {
  var moveStats;
  if (player.ATK_LT_COMBO === move) {
    moveStats = {
      Name: player.ATK_LT_NAME,
      Damage: player.ATK_LT_DMG,
      DodgeRating: player.ATK_LT_DBRATING
    };

    return moveStats;
  } else if (player.ATK_LT_COMBO2 === move) {
    moveStats = {
      Name: player.ATK_LT_NAME2,
      Damage: player.ATK_LT_DMG2,
      DodgeRating: player.ATK_LT_DBRATING2
    };
    return moveStats;
  } else if (player.ATK_HV_COMBO === move) {
    moveStats = {
      Name: player.ATK_HV_NAME,
      Damage: player.ATK_HV_DMG,
      DodgeRating: player.ATK_HV_DBRATING
    };
    return moveStats;
  } else if (player.ATK_HV_COMBO2 === move) {
    moveStats = {
      Name: player.ATK_HV_NAME2,
      Damage: player.ATK_HV_DMG2,
      DodgeRating: player.ATK_HV_DBRATING2
    };
    return moveStats;
  } else if (player.ATK_BLK_COMBO === move) {
    moveStats = {
      Name: player.ATK_BLK_NAME,
      Damage: player.ATK_BLK_DMG,
      DodgeRating: player.ATK_BLK_DBRATING
    };
    return moveStats;
  } else {
    console.log("THAT ISN'T A POWER MOVE");
  }
};

fightingPlayer = (handlerInput, move) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if (move === "use power move" || move === "power move") return;
  var player = sessionAttributes.player;
  var moveData = findMoveInData(player, move);
  console.log("IN FIGHTING PLAYER FUNCTION ---->>>>" + JSON.stringify(moveData));
  var didTheyDodge = dodgeRating(moveData);
  if (didTheyDodge) {
    sessionAttributes.didCompDodge = didTheyDodge;
  } else {
    sessionAttributes.didCompDodge = false;
    health(handlerInput, "player", moveData);
  }
  sessionAttributes.playerMoveData = moveData;

  if (sessionAttributes.compPowerAttackAvail === false || !sessionAttributes.compPowerAttackAvail) {
    fightingComputer(handlerInput);
    powersAttackMove(handlerInput, "player");
  } else return;


};

fightingComputer = (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var computer = sessionAttributes.computer;
  var compMove = randomizeComputerAttack(computer);
  var moveData = findMoveInData(computer, compMove);
  var didTheyDodge = dodgeCompRating(moveData);
  if (didTheyDodge) {
    sessionAttributes.didPlayerDodge = didTheyDodge;
  } else {
    sessionAttributes.didPlayerDodge = false;
    health(handlerInput, "computer", moveData);
  }
  sessionAttributes.computerMoveData = moveData;
  powersAttackMove(handlerInput, "computer");
};

playerBlocked = (handlerInput, move) => {
  if (move === "blocked" || move === "dodge" || move === "duck" || move === "dip" || move === "dive") {
    move = "block";
  }
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var compMove = randomizeComputerAttack(sessionAttributes.computer);
  var moveCompData = findMoveInData(sessionAttributes.computer, compMove);
  var moveData = findMoveInData(sessionAttributes.player, move);
  let theDodgeRating = moveData.DodgeRating;
  let randomNumberTen = Math.floor(Math.random() * (5 * 100 - 1 * 100) + 1 * 100) / (1 * 100);
  var blockDamage = moveData.Damage;
  var damageTook = (moveCompData.Damage - (moveCompData.Damage * 0.85));
  sessionAttributes.computersHealth -= blockDamage;
  sessionAttributes.playersHealth -= damageTook.toFixed();
  if (theDodgeRating >= randomNumberTen) {
    return "You activated, " + moveData.Name + " since you blocked their attack you did " + blockDamage + " points of damage, but you still took " + damageTook.toFixed() + " points of damage. Keep Fighting!";
  }
};
health = (handlerInput, whosTurn, moveData) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if (whosTurn === "player") {
    sessionAttributes.computersHealth = (parseInt(sessionAttributes.computersHealth) - parseInt(moveData.Damage));
  } else if (whosTurn === "computer") {
    sessionAttributes.playersHealth = (parseInt(sessionAttributes.playersHealth) - parseInt(moveData.Damage));
  }

};

dodgeRating = (moveData) => {
  let theDodgeRating = moveData.DodgeRating;
  let randomNumberTen = Math.floor(Math.random() * (5 * 100 - 1 * 100) + 1 * 100) / (1 * 100);
  console.log("THE DODGE RATING IS>>> " + theDodgeRating + " THE RANDOM NUMBER IS >>> " + randomNumberTen);
  if (theDodgeRating >= randomNumberTen) {
    return true;
  } else return false;
};
dodgeCompRating = (moveData) => {
  let theDodgeRating = moveData.DodgeRating;
  let randomNumberTen = Math.floor(Math.random() * (5 * 100 - 1 * 100) + 1 * 100) / (1 * 100);
  console.log("THE DODGE RATING IS>>> " + theDodgeRating + " THE RANDOM NUMBER IS >>> " + randomNumberTen);
  if (theDodgeRating >= randomNumberTen) {
    return true;
  } else return false;
};

randomizeComputerAttack = (computer) => {
  let combos = ["ATK_LT_COMBO", "ATK_LT_COMBO2", "ATK_HV_COMBO", "ATK_HV_COMBO2"];
  var theCombo = helpers.randomNoRepeats(combos);
  if (computer.hasOwnProperty(theCombo)) {
    var theAttack = computer[theCombo];
    return theAttack;
  }
};

powersAttackMove = (handlerInput, whosTurn) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var compDamage = sessionAttributes.computerMoveData.Damage;
  var playerDamage = sessionAttributes.playerMoveData.Damage;
  var total = (((compDamage * 0.5) * playerDamage) * sessionAttributes.player.POWER_RATIO);
  sessionAttributes.powersAttackTotal += total;

  if (sessionAttributes.player.POWER_TOTAL <= sessionAttributes.powersAttackTotal) {
    sessionAttributes.playerPowerAttackAvail = true;
  }
  var total2 = (((playerDamage * 0.5) * compDamage) * sessionAttributes.computer.POWER_RATIO);
  sessionAttributes.powersAttackTotal2 += total2;
  if (sessionAttributes.computer.POWER_TOTAL <= sessionAttributes.powersAttackTotal2 && whosTurn === "computer") {
    sessionAttributes.compPowerAttackAvail = true;
  }
};
usePowerAttack = (handlerInput, player, whosTurn) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var damage = player.POWER_DMG;
  if (whosTurn === "player") {
    if (player.Name === "Charity") {
      sessionAttributes.playersHealth = (parseInt(sessionAttributes.playersHealth) + parseInt(damage));
    } else {
      sessionAttributes.computersHealth = (parseInt(sessionAttributes.computersHealth) - parseInt(damage));
    }

  } else if (whosTurn === "computer") {
    if (player.Name === "Charity") {
      sessionAttributes.computersHealth = (parseInt(sessionAttributes.computersHealth) + parseInt(damage));
    } else {
      sessionAttributes.playersHealth = (parseInt(sessionAttributes.playersHealth) - parseInt(damage));
    }
  }

};

healthBar = (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if (sessionAttributes.playersHealth > 100) {
    var barOne = sessionAttributes.playersHealth - 100;
    sessionAttributes.playersBarOne = barOne + "%";
    sessionAttributes.playersBarTwo = "100%";
  } else {
    sessionAttributes.playersBarOne = "0%";
    var barTwo = sessionAttributes.playersHealth;
    sessionAttributes.playersBarTwo = barTwo + "%";
  }
  if (sessionAttributes.computersHealth > 100) {
    var barCompOne = sessionAttributes.computersHealth - 100;
    sessionAttributes.computersBarOne = barCompOne + "%";
    sessionAttributes.computersBarTwo = "100%";
  } else {
    sessionAttributes.computersBarOne = "0%";
    var barCompTwo = sessionAttributes.computersHealth;
    sessionAttributes.computersBarTwo = barCompTwo + "%";
  }
};

theEnd = async (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

  if (sessionAttributes.computersHealth <= 0 && sessionAttributes.playersHealth <= 0) {
    sessionAttributes.playerWin = false;
    sessionAttributes.computerWin = false;
    sessionAttributes.stats.ties += 1;
  } else if (sessionAttributes.computersHealth <= 0) {
    sessionAttributes.computerWin = false;
    sessionAttributes.stats.wins += 1;
  } else if (sessionAttributes.playersHealth <= 0) {
    sessionAttributes.stats.losses += 1;
    sessionAttributes.playerWin = false;
  }
  await calculateStats(handlerInput);

};

moveList = (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  let ltName = sessionAttributes.player.ATK_LT_NAME;
  let ltCombo = sessionAttributes.player.ATK_LT_COMBO;
  let ltName2 = sessionAttributes.player.ATK_LT_NAME2;
  let ltCombo2 = sessionAttributes.player.ATK_LT_COMBO2;
  let hvName = sessionAttributes.player.ATK_HV_NAME;
  let hvCombo = sessionAttributes.player.ATK_HV_COMBO;
  let hvName2 = sessionAttributes.player.ATK_HV_NAME2;
  let hvCombo2 = sessionAttributes.player.ATK_HV_COMBO2;
  var theList = `<b>${ltName}</b>: ${ltCombo} <br><b>${ltName2}</b>: ${ltCombo2} <br><b>${hvName}</b>: ${hvCombo} <br><b>${hvName2}</b>: ${hvCombo2}`;
  return theList;
};
moveListSpeak = (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  let ltName = sessionAttributes.player.ATK_LT_NAME;
  let ltCombo = sessionAttributes.player.ATK_LT_COMBO;
  let ltName2 = sessionAttributes.player.ATK_LT_NAME2;
  let ltCombo2 = sessionAttributes.player.ATK_LT_COMBO2;
  let hvName = sessionAttributes.player.ATK_HV_NAME;
  let hvCombo = sessionAttributes.player.ATK_HV_COMBO;
  let hvName2 = sessionAttributes.player.ATK_HV_NAME2;
  let hvCombo2 = sessionAttributes.player.ATK_HV_COMBO2;
  var theList = `The move list for ${sessionAttributes.player.Name} is the following: ${ltName}:<break strength="strong"/> ${ltCombo}; ${ltName2}:<break strength="strong"/> ${ltCombo2}; ${hvName}:<break strength="strong"/> ${hvCombo}; ${hvName2}:<break strength="strong"/> ${hvCombo2}.`;
  return theList;
};

calculateStats = async (handlerInput) => {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var attributes = await getAttributes(handlerInput);
  let playerCharacter = sessionAttributes.player.Name;
  let compCharacter = sessionAttributes.computer.Name;
  let charLevel;
  let charExp;
  if (!attributes.characters[playerCharacter].hasOwnProperty("charLevel")) {
    charLevel = 1;
  } else {
    charLevel = attributes.characters[playerCharacter].charLevel;
  }
  if (!attributes.characters[playerCharacter].hasOwnProperty("charExp")) {
    charExp = 0;
  } else {
    charExp = attributes.characters[playerCharacter].charExp;
  }

  levelingCharacter(handlerInput);

  let sessionStats = {
    "turns": sessionAttributes.turnCounter,
    "playerCharName": playerCharacter,
    "computerCharName": compCharacter,
    "playerPlayingCharacterCount": attributes.characters[playerCharacter].count,
    "computerCharacterCount": attributes.compCharacters[compCharacter].count,
    "rankingScore": attributes.characters[playerCharacter].score,
    "compRankingScore": attributes.compCharacters[compCharacter].score,
  };
  attributes.stats = sessionStats;
  await saveAttributes(handlerInput, attributes);
  getStandings(handlerInput);
};

getStandings = async (handlerInput) => {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  let computer = sessionAttributes.computer;
  let player = sessionAttributes.player;
  var attributes = await getAttributes(handlerInput);
  let playerScore = attributes.stats.rankingScore;
  let compScore = attributes.stats.compRankingScore;
  let playerWin = sessionAttributes.playerWin;
  var result = EloRating.calculate(playerScore, compScore, playerWin);
  attributes.characters[player.Name].score = result.playerRating;
  attributes.stats.rankingScore = result.playerRating;
  await saveAttributes(handlerInput, attributes);
};

levelingCharacter = async (handlerInput) => {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var attributes = await getAttributes(handlerInput);
  let playerCharacter = sessionAttributes.player.Name;
  let charLevel = attributes.characters[playerCharacter].charLevel;
  let charExp = attributes.characters[playerCharacter].charExp;
  switch (charExp) {
    case charExp < 200:
      charLevel = 1;
      charExp += 100;
      break;
    case charExp >= 200 && charExp < 500:
      charLevel = 2;
      charExp += 125;
      break;
    case charExp >= 500 && charExp < 900:
      charLevel = 3;
      charExp += 150;
      break;
    case charExp >= 900 && charExp < 1400:
      charExp += 175;
      charLevel = 4;
      break;
    case charExp >= 1400 && charExp < 2000:
      charExp += 200;
      charLevel = 5;
      break;
    case charExp >= 2000 && charExp < 2700:
      charExp += 200;
      charLevel = 6;
      break;
    case charExp >= 2700 && charExp < 3500:
      charExp += 225;
      charLevel = 7;
      break;
    case charExp >= 3500 && charExp < 4400:
      charExp += 250;
      charLevel = 8;
      break;
    case charExp >= 4400 && charExp < 5400:
      charExp += 275;
      charLevel = 9;
      break;
    case charExp >= 5400 && charExp < 6500:
      charExp += 300;
      charLevel = 10;
      break;
    case charExp >= 6500 && charExp < 7700:
      charExp += 300;
      charLevel = 11;
      break;
    case charExp >= 7700 && charExp < 9000:
      charExp += 325;
      charLevel = 12;
      break;
    case charExp >= 9000 && charExp < 13000:
      charExp += 350;
      charLevel = 13;
      break;
    case charExp >= 13000 && charExp < 14500:
      charExp += 375;
      charLevel = 14;
      break;
    case charExp >= 14500 && charExp < 16100:
      charExp += 400;
      charLevel = 15;
      break;
    case charExp >= 16100 && charExp < 17800:
      charExp += 400;
      charLevel = 16;
      break;
    case charExp >= 17800 && charExp < 19600:
      charExp += 425;
      charLevel = 17;
      break;
    case charExp >= 19600 && charExp < 21500:
      charExp += 450;
      charLevel = 18;
      break;
    case charExp >= 21500 && charExp < 23500:
      charExp += 475;
      charLevel = 19;
      break;
    case charExp >= 23500:
      charExp += 0;
      charLevel = 20;
      break;
    default:
      console.log("Invalid character experiance");
  }
  attributes.characters[playerCharacter].Name = playerCharacter;
  attributes.characters[playerCharacter].charExp = charExp;
  attributes.characters[playerCharacter].charLevel = charLevel;
  saveAttributes(handlerInput, attributes);

};

function getAllEntitledProducts(inSkillProductList) {
  const entitledProductList = inSkillProductList.filter(record => record.entitled === 'ENTITLED');
  return entitledProductList;
}

function getAllProducts(inSkillProductList) {
  const entitledProductList = inSkillProductList.filter(record => record.entitled === 'NOT_ENTITLED');
  return entitledProductList;
}

function getSpeakableListOfProducts(entitleProductsList) {
  const productNameList = entitleProductsList.map(item => item.name);
  let productListSpeech = productNameList.join(', '); // Generate a single string with comma separated product names
  productListSpeech = productListSpeech.replace(/_([^_]*)$/, 'and $1'); // Replace last comma with an 'and '
  return productListSpeech;
}

var backgroundImage = ["https://powers.s3.amazonaws.com/maarten-van-den-heuvel-Siuwr3uCir0-unsplash.jpg",
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

statsData = async (handlerInput) => {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var charCount = {};
  var attributes = await getAttributes(handlerInput);

  var highest = _.max(Object.keys(attributes.characters), function (o) {
    return attributes.characters[o];
  });
  var score = attributes.characters[highest].score;
  console.log("HIGHEST----->>>>" +JSON.stringify(highest));
  var charUrl;
  for(var i=0; sessionAttributes.characterRecords[i].fields.Name === highest; i++){
    charUrl = sessionAttributes.characterRecords[i].fields.PWR_IMG;
  }console.log(charUrl);
  var stats = {
    "topCharacter": highest,
    "score": "Your highest score with: " +highest+" is " +score+".<br> ",
    "statString": "Your total wins, losses and ties <br>Wins: " + attributes.stats.wins + "<br>" +
                  "Losses: " +attributes.stats.losses + "<br>Ties: " + attributes.stats.ties,
    "charURL":charUrl,
    "speakOutput":"Your highest score with: " +highest+" is " +score+". Your total wins, losses and ties; Wins: " + attributes.stats.wins +
    "Losses: " +attributes.stats.losses + "Ties: " + attributes.stats.ties
  };
  return stats;
};


powersListExpansionData = (handlerInput) => {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var attributes = getAttributes(handlerInput);
  var characterRecords = sessionAttributes.characterRecords;

  var charLevel = [];
  for (var i = 0; i >= characterRecords.length;) {
    if (attributes.characters[i].Name == characterRecords[i].fields.Name) {
      if (attributes.characters[i].charLevel > 1) {
        charLevel.push(attributes.characters[i].charLevel);
      }
    } else {
      charLevel.push(1);
    }
    i++;
  }

  var theListData = {
    "listTemplate2Metadata": {
      "type": "object",
      "objectId": "lt1Metadata",
      "backgroundImage": {
        "contentDescription": null,
        "smallSourceUrl": null,
        "largeSourceUrl": null,
        "sources": [{
            "url": "https://powers.s3.amazonaws.com/arches-architecture-art-baroque-316080.jpg",
            "size": "small",
            "widthPixels": 0,
            "heightPixels": 0
          },
          {
            "url": "https://powers.s3.amazonaws.com/arches-architecture-art-baroque-316080.jpg",
            "size": "large",
            "widthPixels": 0,
            "heightPixels": 0
          }
        ]
      },
      "title": "Select your Power Character",
      "logoUrl": "https://d2o906d8ln7ui1.cloudfront.net/images/cheeseskillicon.png"
    },
    "listTemplate2ListData": {
      "type": "list",
      "listId": "lt2Sample",
      "totalNumberOfItems": 9,
      "hintText": "Tap on your character or Say their name.",
      "listPage": {
        "listItems": [{
            "listItemIdentifier": "Lillith",
            "ordinalNumber": 1,
            "textContent": {
              "primaryText": {
                "type": "PlainText",
                "text": "Lillith"
              },
              "secondaryText": {
                "type": "PlainText",
                "text": "Power: Poison Spray"
              },
              "thirdText": {
                "type": "PlainText",
                "text": charLevel[0]
              }
            },
            "image": {
              "contentDescription": null,
              "smallSourceUrl": null,
              "largeSourceUrl": null,
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/samy-saadi-fFC7IOFT-OM-unsplash.jpg",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/samy-saadi-fFC7IOFT-OM-unsplash.jpg",
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
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/Lillith.png",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/Lillith.png",
                  "size": "large",
                  "widthPixels": 0,
                  "heightPixels": 0
                }
              ]
            },
            "token": "Lillith"
          },
          {
            "listItemIdentifier": "Randell",
            "ordinalNumber": 2,
            "textContent": {
              "primaryText": {
                "type": "PlainText",
                "text": "Randell"
              },
              "secondaryText": {
                "type": "PlainText",
                "text": "Power: Bone Breaker"
              },
              "thirdText": {
                "type": "PlainText",
                "text": charLevel[1]
              }
            },
            "image": {
              "contentDescription": null,
              "smallSourceUrl": null,
              "largeSourceUrl": null,
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/omid-armin-2GHCdtW45Uw-unsplash.jpg",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/omid-armin-2GHCdtW45Uw-unsplash.jpg",
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
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/Randell.png",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/Randell.png",
                  "size": "large",
                  "widthPixels": 0,
                  "heightPixels": 0
                }
              ]
            },
            "token": "Randell"
          },
          {
            "listItemIdentifier": "Charity",
            "ordinalNumber": 3,
            "textContent": {
              "primaryText": {
                "type": "PlainText",
                "text": "Charity"
              },
              "secondaryText": {
                "type": "PlainText",
                "text": "Power: Heel Stomp"
              },
              "thirdText": {
                "type": "PlainText",
                "text": charLevel[2]
              }
            },
            "image": {
              "contentDescription": null,
              "smallSourceUrl": null,
              "largeSourceUrl": null,
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/efe-kurnaz-RnCPiXixooY-unsplash.jpg",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/efe-kurnaz-RnCPiXixooY-unsplash.jpg",
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
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/Charity.png",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/Charity.png",
                  "size": "large",
                  "widthPixels": 0,
                  "heightPixels": 0
                }
              ]
            },
            "token": "Charity"
          },
          {
            "listItemIdentifier": "SharpieSharp",
            "ordinalNumber": 4,
            "textContent": {
              "primaryText": {
                "type": "PlainText",
                "text": "Sharpie Sharp"
              },
              "secondaryText": {
                "type": "PlainText",
                "text": "Power: Spike Throw"
              },
              "thirdText": {
                "type": "PlainText",
                "text": charLevel[3]
              }
            },
            "image": {
              "contentDescription": null,
              "smallSourceUrl": null,
              "largeSourceUrl": null,
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/matteo-di-iorio-wkMd_DylG8I-unsplash.jpg",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/matteo-di-iorio-wkMd_DylG8I-unsplash.jpg",
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
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/SharpySharp.png",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/SharpySharp.png",
                  "size": "large",
                  "widthPixels": 0,
                  "heightPixels": 0
                }
              ]
            },
            "token": "Sharpie Sharp"
          },
          {
            "listItemIdentifier": "LarsThundersquat",
            "ordinalNumber": 5,
            "textContent": {
              "primaryText": {
                "type": "PlainText",
                "text": "Lars Thundersquat"
              },
              "secondaryText": {
                "type": "PlainText",
                "text": "Power: Thigh Crusher"
              },
              "thirdText": {
                "type": "PlainText",
                "text": charLevel[4]
              }
            },
            "image": {
              "contentDescription": null,
              "smallSourceUrl": null,
              "largeSourceUrl": null,
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/michael-shannon-iIrB37J5yfA-unsplash.jpg",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/michael-shannon-iIrB37J5yfA-unsplash.jpg",
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
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/LarsThundersquat.png",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/LarsThundersquat.png",
                  "size": "large",
                  "widthPixels": 0,
                  "heightPixels": 0
                }
              ]
            },
            "token": "Lars Thundersquat"
          },
          {
            "listItemIdentifier": "Edge",
            "ordinalNumber": 6,
            "textContent": {
              "primaryText": {
                "type": "PlainText",
                "text": "Edge"
              },
              "secondaryText": {
                "type": "PlainText",
                "text": "Power: Speed Attack"
              },
              "thirdText": {
                "type": "PlainText",
                "text": charLevel[5]
              }
            },
            "image": {
              "contentDescription": null,
              "smallSourceUrl": null,
              "largeSourceUrl": null,
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/deglee-degi-wQImoykAwGs-unsplash.jpg",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/deglee-degi-wQImoykAwGs-unsplash.jpg",
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
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/Edge.png",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/Edge.png",
                  "size": "large",
                  "widthPixels": 0,
                  "heightPixels": 0
                }
              ]
            },
            "token": "Edge"
          },
          {
            "listItemIdentifier": "Argus",
            "ordinalNumber": 7,
            "textContent": {
              "primaryText": {
                "type": "PlainText",
                "text": "Argus"
              },
              "secondaryText": {
                "type": "PlainText",
                "text": "Power: Hand Beam Cannons"
              },
              "thirdText": {
                "type": "PlainText",
                "text": charLevel[6]
              }
            },
            "image": {
              "contentDescription": null,
              "smallSourceUrl": null,
              "largeSourceUrl": null,
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/david-bruyndonckx-F_hft1Wiyj8-unsplash.jpg",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/david-bruyndonckx-F_hft1Wiyj8-unsplash.jpg",
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
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/Argus.png",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/Argus.png",
                  "size": "large",
                  "widthPixels": 0,
                  "heightPixels": 0
                }
              ]
            },
            "token": "Argus"
          },
          {
            "listItemIdentifier": "Karrigan",
            "ordinalNumber": 8,
            "textContent": {
              "primaryText": {
                "type": "PlainText",
                "text": "Karrigan"
              },
              "secondaryText": {
                "type": "PlainText",
                "text": "Power: Stone Throw"
              },
              "thirdText": {
                "type": "PlainText",
                "text": charLevel[7]
              }
            },
            "image": {
              "contentDescription": null,
              "smallSourceUrl": null,
              "largeSourceUrl": null,
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/carles-rabada-gwwWhABtohs-unsplash.jpg",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/carles-rabada-gwwWhABtohs-unsplash.jpg",
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
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/Karrigan.png",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/Karrigan.png",
                  "size": "large",
                  "widthPixels": 0,
                  "heightPixels": 0
                }
              ]
            },
            "token": "Karrigan"
          },
          {
            "listItemIdentifier": "ElectricMean",
            "ordinalNumber": 9,
            "textContent": {
              "primaryText": {
                "type": "PlainText",
                "text": "Electric Mean"
              },
              "secondaryText": {
                "type": "PlainText",
                "text": "Power: Heel Stomp"
              },
              "thirdText": {
                "type": "PlainText",
                "text": charLevel[8]
              }
            },
            "image": {
              "contentDescription": null,
              "smallSourceUrl": null,
              "largeSourceUrl": null,
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/maarten-van-den-heuvel-Siuwr3uCir0-unsplash.jpg",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/maarten-van-den-heuvel-Siuwr3uCir0-unsplash.jpg",
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
              "sources": [{
                  "url": "https://powers.s3.amazonaws.com/ElectricMean.png",
                  "size": "small",
                  "widthPixels": 0,
                  "heightPixels": 0
                },
                {
                  "url": "https://powers.s3.amazonaws.com/ElectricMean.png",
                  "size": "large",
                  "widthPixels": 0,
                  "heightPixels": 0
                }
              ]
            },
            "token": "Electric Mean"
          }
        ]
      }
    }
  };

  return theListData;
};