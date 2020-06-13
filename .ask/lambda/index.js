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
const fightEndAPL = require('./documents/fightingEnd.json');
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
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "launch";
    var attributes = await getAttributes(handlerInput);

    var name;
    var power1 = await getRandomPowerImage();
    var power2 = await getRandomPowerImage();
    var bgImage = await getRandomMainBGImage();

    if (Object.keys(attributes).length === 0) {
      speakOutput = '<break strength="strong"/><p>Welcome, to <phoneme alphabet="ipa" ph="pɑwɚrs">Powers</phoneme>. I am  <say-as interpret-as="spell-out">G34XY</say-as>, a <phoneme alphabet="ipa" ph="pɑwɚrs">Powers</phoneme> fighter helper. </p><p>I am here to help you in any way possible through out any fight you may ask for my help by saying <break strength="strong"/> move list <break strength="strong"/>or bot help.</p> I will try to help in any way possible.<break strength="strong"/><amazon:emotion name="excited" intensity="high"> Except, I cannot fight for you!!</amazon:emotion> That is not in my contract you hear me <break strength="strong"/><emphasis level="strong">I do not fight!</emphasis>  Let\'s start by getting your name, we use this to keep track of your stats and how you are doing on the leaderboard. Just say, my name is.';
    } else {
      name = attributes.name;
      var launch2 = ['<p>Welcome back to Powers, ' + helpers.capitalize_Words(name) + '. </p> <p>Would you like to view your rankings or pick your character to fight?</p>',
        '<p>Hey you came back!</p> <p>This is great news.</p> <p>What would you like to do fight or look at your rankings?</p>',
        '<p>Welcome back! You know, I am not the only bot here, there is another that helps me out from time to time, her name is <say-as interpret-as="spell-out">A73XA</say-as>.</p> <p>Now would you like to fight again or view your rankings?</p> '
      ];
      speakOutput = helpers.randomNoRepeats(launch2);
    }
    if (!sessionAttributes.hasOwnProperty('characterRecords')) {
      sessionAttributes.characterRecords = [];
    }
    if (!attributes.hasOwnProperty("characters")) {
      attributes.characters = {};
    }
    sessionAttributes.characterRecords = characterRecords;
    var charactersArray = [];
    for (var i = 0; i < characterRecords.length;) {
      charactersArray.push(characterRecords[i].fields.Name);

      if (!attributes.characters.hasOwnProperty(characterRecords[i].fields.Name)) {
        attributes.characters[characterRecords[i].fields.Name] = {};
        attributes.characters[characterRecords[i].fields.Name].charLevel = 1;
        attributes.characters[characterRecords[i].fields.Name].charExp = 0;
      }
      i++;
    }
    if (sessionAttributes.previousIntent === "stats" || sessionAttributes.previousIntent === "standings") {
      speakOutput = "I am sorry you need to play more to get your statistics.";
    } else if (sessionAttributes.previousIntent === "CopperXP") {
      speakOutput = "Outstanding you just bought the Copper Experience Pack. If you wish to use them just say, Use Copper Pack or Use Copper Pack on Character name.";
    } else if (sessionAttributes.previousIntent === "SilverXP") {
      speakOutput = "Outstanding you just bought the Silver Experience Pack. If you wish to use them just say, Use Silver Pack or Use Silver Pack on Character name.";
    } else if (sessionAttributes.previousIntent === "GoldXP") {
      speakOutput = "Outstanding you just bought the Gold Experience Pack. If you wish to use them just say, Use Gold Pack or Use Gold Pack on Character name.";
    }
    sessionAttributes.charactersArray = charactersArray;
    await saveAttributes(handlerInput, attributes);
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
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "nameIntent";
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

      
      await new Promise((resolve, reject) => {
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
      var theBase = "appoBlEf8I1VQdU3r";
      var record = await helpers.httpGet(theBase, "&filterByFormula=%7BuserID%7D%3D%22" + attributes.nameid + "%22", 'PlayerCharts');
      var userRecord = record.records;
      console.log("THE RECORD IS" + userRecord);
      attributes.usersID = userRecord[0].fields.RecordId;
      
      await saveAttributes(handlerInput, attributes);
      var nameSpeak = ['Perfect, ' + helpers.capitalize_Words(userName) + ", now lets pick your character, just say pick character.",
        'Outstanding, I have saved your name for rankings and to be more personable. Now lets pick your character, ' + helpers.capitalize_Words(userName) + '. Just say; pick character.',
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
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "characterSelection";
    var attributes = await getAttributes(handlerInput);
    if (Object.keys(attributes).length === 0) {
      return LaunchRequestHandler.handle(handlerInput);
    }
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
      "Are you serious, " + sessionAttributes.playerPower + " is my favorite! Who would you like to fight, " + sessionAttributes.charactersArray + "?",
      "Everyone, we got " + sessionAttributes.playerPower + " in the house! Who are they going to fight against, " + sessionAttributes.charactersArray + "?",
    ];
    var speakOutput = helpers.randomNoRepeats(whoToFight);
    if (!sessionAttributes.playerPower) {
      speakOutput = "You can pick from any of these characters: " + charactersArray + '!';
    }

    if (helpers.supportsAPL(handlerInput)) {
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
          datasources: await listData.powersListMainData(handlerInput)
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
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "characterSelectionTwo";
    var whoToFight = ["Alright, lets go " + sessionAttributes.playerPower + "! Now who do you want to fight, " + sessionAttributes.charactersArray,
      "Are you serious, " + sessionAttributes.playerPower + " is my favorite! Who would you like to fight, " + sessionAttributes.charactersArray + "?",
      "Everyone, we got " + sessionAttributes.playerPower + " in the house! Who are they going to fight against, " + sessionAttributes.charactersArray + "?",
    ];
    var speakOutput = helpers.randomNoRepeats(whoToFight);
    if (!sessionAttributes.playerPower) {
      speakOutput = "You can pick from any of these characters: " + charactersArray + '!';
    }

    if (helpers.supportsAPL(handlerInput)) {
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
          datasources: await listData.powersListMainData(handlerInput)
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
    var character = handlerInput.requestEnvelope.request.intent.slots.Characters.value;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "characterSelected";
    var characters = sessionAttributes.characterRecords;
    if (!sessionAttributes.playerPower) {
      await characterSelector(handlerInput, characters, character);
      return CharactersSelectionScreenTwoHandler.handle(handlerInput);
    } else if (!sessionAttributes.enemyPower) {
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
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "randomSelected";
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
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "fightStart";
    console.log("IN FIGHT START HANDLER COMPUTER IS----->>>>" + JSON.stringify(sessionAttributes));
    var speakOutput;
    if (!sessionAttributes.hasOwnProperty("FightStart")) {
      speakOutput = sessionAttributes.playerPower + ' <phoneme alphabet="ipa" ph="versus">VS</phoneme> ' + sessionAttributes.enemyPower + "! Ok, next just say a move, or say move list, to access it.  Ready Fight!!";
      sessionAttributes.FightStart = true;
    } else {
      var fightReturn = ["Let's get back to the fight, just say <break strength='strong'/>a<break strength='strong'/> move.",
        "Sweet you have returned, just say <break strength='strong'/>a<break strength='strong'/> move to get back to fighting!",
        "So someone told me, to tell you, to just say,<break strength='strong'/>a<break strength='strong'/> move to fight.",
        "Light attack or Heavy attack are universal fight moves you can start with those if you don't remember <break strength='strong'/>a<break strength='strong'/> fight move."
      ];
      speakOutput = helpers.randomNoRepeats(fightReturn);

    }


    if (helpers.supportsAPL(handlerInput)) {
      sessionAttributes.bgImageFighting = await getRandomMainBGImage();
      var bgImage = sessionAttributes.bgImageFighting;
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
                "bgImage": bgImage,
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
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "fightHandler";
    var speakOutput;
    var audio;
    var move = handlerInput.requestEnvelope.request.intent.slots.Move.value;
    console.log("IN PLAYERFIGHTHANDLER AND MOVE IS ---->>>>" + JSON.stringify(move));

    if (move === "dodge" || move === "block" || move === "dip" || move === "duck" || move === "dive" || move === "blocked") {
      speakOutput = playerBlocked(handlerInput, move);
    } else {
      if (move !== "use power move" || move !== "power move") {
        await fightingPlayer(handlerInput, move);
        if (sessionAttributes.didCompDodge) {
          speakOutput = sessionAttributes.computer.Name + " blocked your move.";
          sessionAttributes.didCompDodge = false;
        } else if (sessionAttributes.playerPowerAttackAvail === true) {
          speakOutput = "Your " + sessionAttributes.playerMoveData.Name + " did " + sessionAttributes.playerMoveData.Damage + " points of damage to " + sessionAttributes.computer.Name + "! You also have your power move available, to use just say, power move. They now have " + sessionAttributes.computersHealth + " points left!";
          
        } else {
          speakOutput = "Your " + sessionAttributes.playerMoveData.Name + " did " + sessionAttributes.playerMoveData.Damage + " points of damage to " + sessionAttributes.computer.Name + "! They now have " + sessionAttributes.computersHealth + " points left!";
          
        }
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
      }
      if (sessionAttributes.compPowerAttackAvail === false || !sessionAttributes.compPowerAttackAvail) {
        await fightingComputer(handlerInput); 
        if (sessionAttributes.didPlayerDodge) {
          speakOutput += " " + sessionAttributes.player.Name + ", has blocked " + sessionAttributes.computer.Name + "'s move!";
          sessionAttributes.didPlayerDodge = false;
          
        }else{
          speakOutput += " Your opponents, " + sessionAttributes.computerMoveData.Name + " did " + sessionAttributes.computerMoveData.Damage + " points of damage to " + sessionAttributes.player.Name + "! You now have " + sessionAttributes.playersHealth + " points left, keep fighting!";
        }
        
      } else if (sessionAttributes.compPowerAttackAvail === true) {
        usePowerAttack(handlerInput, sessionAttributes.computer, "computer");
        audio = sessionAttributes.computer.POWER_AUDIO;
        if (sessionAttributes.computer.Name === "Charity") {
          speakOutput += audio + " Your opponent just used " + sessionAttributes.computer.POWER_ATK + " healing herself for " + sessionAttributes.player.POWER_DMG + " points! They now have " + sessionAttributes.computersHealth + " points!";
        } else {
          speakOutput += audio + " Your opponent just activated their power move " + sessionAttributes.computer.POWER_ATK + " and did " + sessionAttributes.computer.POWER_DMG + " points of damage to you! You now have " + sessionAttributes.playersHealth + " points left, keep fighting!";
        }
        sessionAttributes.compPowerAttackAvail = false;
        sessionAttributes.powersAttackTotal2 = 0;
      }
    }
    sessionAttributes.turnCounter += 1;
    if (sessionAttributes.playersHealth <= 0 || sessionAttributes.computersHealth <= 0) {
      await theEnd(handlerInput);
      return FightEndHandler.handle(handlerInput);
    }
    if (helpers.supportsAPL(handlerInput)) {
      var bgImage = sessionAttributes.bgImageFighting;
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
                "bgImage": bgImage,
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
    var displayOutput;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "fightEnd";
    if (sessionAttributes.computerWin === false && sessionAttributes.playerWin === false) {
      speakOutput =  "You just used the " +sessionAttributes.playerMoveData.Name + " move and your opponent used "+ sessionAttributes.computerMoveData.Name + " and it ended in a tie, you will get them next time!";
      displayOutput = "Wow, it was a tie, you will get them next time!";
      bgColor = "#eeeeee";
      color = "#0E2773";
    } else if (sessionAttributes.playerWin === false) {
      speakOutput = "You just used the " +sessionAttributes.playerMoveData.Name + " move and your opponent used "+ sessionAttributes.computerMoveData.Name + " and sorry to say, but you lost, there is always next time!";
      displayOutput = "Sorry, but you lost, there is always next time!";
      bgColor = "#BF1736";
      color = "#0E2773";
    } else if (sessionAttributes.computerWin === false) {
      speakOutput = "You just used the " +sessionAttributes.playerMoveData.Name + " move and your opponent used "+ sessionAttributes.computerMoveData.Name + ". The results are in, you won!";
      displayOutput = "Nice you won!";
      bgColor = "#0E2773";
      color = "#BF1736";
    }
    if (helpers.supportsAPL(handlerInput)) {
      var bgImage = sessionAttributes.bgImageFighting;
      handlerInput.attributesManager.setSessionAttributes({});
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: fightEndAPL,
          datasources: {
            "mainData": {
              "type": "object",
              "properties": {
                "bgImage": bgImage,
                "bgColor": bgColor,
                "color": color,
                "message": displayOutput
              }
            }
          }
        })
        .getResponse();
    } else {
      handlerInput.attributesManager.setSessionAttributes({});
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
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "moveList";
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
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "stats";
    var attributes = await getAttributes(handlerInput);
    if (!attributes.hasOwnProperty("stats")) {
      return LaunchRequestHandler.handle(handlerInput);
    }
    var playerName = attributes.name;
    var statsObject = await statsData(handlerInput);
    playerName = helpers.capitalize_Words(playerName);
    speakOutput = "The stats for " + playerName + " are the following: " + statsObject.speakOutput;

    if (helpers.supportsAPL(handlerInput)) {
      var bgImage = await getRandomMainBGImage();

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
                "bgImage": bgImage,
                "headerTitle": playerName,
                "title": statsObject.topCharacter,
                "subtitle": statsObject.topCharacter,
                "primaryText": statsObject.score + statsObject.count + statsObject.statString

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
    var statsObject = await statsData(handlerInput);
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "standings";
    var attributes = await getAttributes(handlerInput);
    if (!attributes.hasOwnProperty("stats")) {
      return LaunchRequestHandler.handle(handlerInput);
    }
    var theBase = "appoBlEf8I1VQdU3r";
    var playerData = await helpers.httpGet(theBase,"","PlayerCharts");
    var playerRecords = playerData.records;
    var playersString;
    var playersString2;
    
    for (var i in playerRecords) {
      var theNumber = 1;
      if(playerRecords[i].fields.HighestScoreLevel === statsObject.highestScoreLevel){
      playersString2 += theNumber + ". " + playerRecords[i].fields.userID +": " +playerRecords[i].fields.HighestScore + " Level: "+playerRecords[i].fields.HighestScoreLevel + "<br>";
      }
      for(var j = 0; j===10;j++){
        playersString += theNumber + ". " + playerRecords[i].fields.userID +": " +playerRecords[i].fields.HighestScore + " Level: "+playerRecords[i].fields.HighestScoreLevel + "<br>";
        speakOutput += theNumber + ". " + playerRecords[i].fields.userID +": " +playerRecords[i].fields.HighestScore + ", Level: "+playerRecords[i].fields.HighestScoreLevel + "";
        console.log("WITHIN THE PLAYERRECORDS LOOP---->>>" + playersString);
      }
      theNumber++;
      }
    var title2 = "Your top score: "+statsObject.highestScore + " at level "+ statsObject.highestScoreLevel + ". ";
    var title1 = "Your top score, "+statsObject.highestScore + " with "+ statsObject.topCharacter + ". ";
    if (helpers.supportsAPL(handlerInput)) {
      var bgImage = await getRandomMainBGImage();
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: standings,
          datasources: {
            "mainData": {
              "type": "object",
              "properties": {
                "bgImage": bgImage,
                "headerTitle": "World Leaderboard",
                "title": title1,
                "textbox": playersString,
                "headerTitle2": "Level Leaderboard",
                "title2": title2,
                "textbox2": playersString2

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
const UseExperiencePackHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'UseExperiencePack';
  },
  async handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var attributes = await getAttributes(handlerInput);
    var experiencePack = handlerInput.requestEnvelope.request.intent.slots.ExperiencePack.value;
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "useExperiencePack";
    var charactersArray = sessionAttributes.charactersArray;

    if (experiencePack === "copper" || experiencePack === "Copper") {
      if (attributes.hasOwnProperty("copperXP") || attributes.copperXP === 0) {
        speakOutput = "I am sorry you need to buy some experience packs. Is there anything else you would like to do like pick character to fight or look at your stats?";
      } else {
        sessionAttributes.expPack = "copper";
        speakOutput = "Now who would you like to add it the experience too? Just say, use on, then one of these names; "+ charactersArray + '! ';
      }
    } else if (experiencePack === "Silver" || experiencePack === "silver") {
      if (!attributes.hasOwnProperty("silverXP") || attributes.silverXP === 0) {
        speakOutput = "I am sorry you need to buy some experience packs. Is there anything else you would like to do like pick character to fight or look at your stats?";
      } else {
        sessionAttributes.expPack = "silver";
        speakOutput = "Now who would you like to add it the experience too? Just say, use on, then one of these names; "+ charactersArray + '! ';
      }
    } else if (experiencePack === "Gold" || experiencePack === "gold") {
      if (!attributes.hasOwnProperty("goldXP") || attributes.goldXP === 0) {
        speakOutput = "I am sorry you need to buy some experience packs. Is there anything else you would like to do like pick character to fight or look at your stats?";
      } else {
        sessionAttributes.expPack = "gold";
        speakOutput = "Now who would you like to add it the experience too? Just say, use on, then one of these names; "+ charactersArray + '! ';
      }
    }

    return handlerInput.responseBuilder
      .speak(helpers.speechPolly(speakOutput))
      .reprompt()
      .getResponse();
  }
};

const UseExperienceOnCharacterPackHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'UseExperiencePackOnCharacter';
  },
  async handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var attributes = await getAttributes(handlerInput);
    var character = handlerInput.requestEnvelope.request.intent.slots.UseOnCharacters.value;
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "useExperiencePack";

    character = characterFilter(character);
    character = helpers.capitalize_Words(character);
    if(sessionAttributes.previousIntent === "useExperiencePack"){

    }
    if (sessionAttributes.expPack === "copper") {
      if (attributes.hasOwnProperty("copperXP") || attributes.copperXP === 0) {
        speakOutput = "I am sorry you need to buy some experience packs. Is there anything else you would like to do like pick character to fight or look at your stats?";
      } else {
        attributes.copperXP = parseInt(attributes.copperXP) - 1;
        attributes.characters[character].charExp = parseInt(attributes.characters[character].charExp) + 200;
        speakOutput = "I have added two hundred experience points to " + character + '! You have ' + attributes.copperXP + ' copper experience packs left';
      }
    } else if (sessionAttributes.expPack === "silver") {
      if (!attributes.hasOwnProperty("silverXP") || attributes.silverXP === 0) {
        speakOutput = "I am sorry you need to buy some experience packs. Is there anything else you would like to do like pick character to fight or look at your stats?";
      } else {
        attributes.silverXP = parseInt(attributes.silver) - 1;
        attributes.characters[character].charExp = parseInt(attributes.characters[character].charExp) + 350;
        speakOutput = "I have added three hundred and fifty experience points to " + character + '! You have ' + attributes.silverXP + ' silver experience packs left';
      }
    } else if (sessionAttributes.expPack === "gold") {
      if (!attributes.hasOwnProperty("goldXP") || attributes.goldXP === 0) {
        speakOutput = "I am sorry you need to buy some experience packs. Is there anything else you would like to do like pick character to fight or look at your stats?";
      } else {
        attributes.goldXP = parseInt(attributes.goldXP) - 1;
        attributes.characters[character].charExp = parseInt(attributes.characters[character].charExp) + 500;
        speakOutput = "I have added five hundred experience points to " + character + '! You have ' + attributes.goldXP + ' gold experience packs left';
      }
    }
    await saveAttributes(handlerInput,attributes);
    await levelingCharacter(handlerInput, character);
    return handlerInput.responseBuilder
      .speak(helpers.speechPolly(speakOutput))
      .reprompt()
      .getResponse();
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

const GetListofISPsHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'WhatCanIBuyIntent';
  },
  handle(handlerInput) {
    var speakOutput;
    const locale = handlerInput.requestEnvelope.request.locale;
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "listOfISPs";
    return ms.getInSkillProducts(locale)
      .then(async function checkForProductAccess(result) {
          const products = getAllProducts(result.inSkillProducts);
          if (products && products.length > 0) {
            console.log("GET SKILL PRODUCTS------>>>>>" + JSON.stringify(getSpeakableListOfProducts(products)));
            speakOutput = "The following are available for purchase: " + getSpeakableListOfProducts(products) + '. To purchase any of the products just say I want to buy, then the product name.';
            return handlerInput.responseBuilder
              .speak(helpers.speechPolly(speakOutput))
              .reprompt()
              .getResponse();
          }
          speakOutput = "I am sorry you have all the products purchased, please come back tomorrow to see if there are any new one's to buy.";
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

    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const locale = handlerInput.requestEnvelope.request.locale;
    console.log("GET SKILL PRODUCTS------>>>>>" + JSON.stringify(ms.getInSkillProducts(locale)));
    var productName = handlerInput.requestEnvelope.request.intent.slots.ProductName.value;

    return await ms.getInSkillProducts(locale).then(async function checkForProductAccess(result) {
      var theProduct;
      var upsellMessage;
      if (productName === "Copper Experience Pack" || productName === "copper pack" || productName === "copper" || productName === "copper pack") {
        upsellMessage = "The Copper Experience pack is one out of three expierence packs that you can buy, would you like to know more?";
        theProduct = result.inSkillProducts.find(record => record.referenceName === "CopperXP");
      } else if (productName === "Silver Experience Pack" || productName === "silver pack" || productName === "silver" || productName === "silver pack") {
        upsellMessage = "The Silver Experience pack is one out of three expierence packs that you can buy, would you like to know more?";
        theProduct = result.inSkillProducts.find(record => record.referenceName === "SilverXP");
      } else if (productName === "Gold Experience Pack" || productName === "gold pack" || productName === "gold" || productName === "gold pack") {
        upsellMessage = "The Gold Experience pack is one out of three expierence packs that you can buy, would you like to know more?";
        theProduct = result.inSkillProducts.find(record => record.referenceName === "GoldXP");
      }

      return handlerInput.responseBuilder
        .addDirective({
          "type": "Connections.SendRequest",
          "name": "Upsell",
          "payload": {
            "InSkillProduct": {
              "productId": theProduct.productId
            },
            "upsellMessage": upsellMessage
          },
          "token": "correlationToken"
        })
        .getResponse();
    });
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
    var speakOutput;
    return ms.getInSkillProducts(locale).then(async function (res) {
      let product = res.inSkillProducts.find(record => record.productId == productId);
      console.log("IN SUCCESS---->>>> " + JSON.stringify(product));
      if (!attributes.hasOwnProperty("copperXP")) {
        attributes.copperXP = 0;
      }
      if (!attributes.hasOwnProperty("silverXP")) {
        attributes.silverXP = 0;
      }
      if (!attributes.hasOwnProperty("goldXP")) {
        attributes.goldXP = 0;
      }
      if (product != undefined) {
        if (product.referenceName === "CopperXP") {
          attributes.copperXP += 5;
          console.log("IN COPPER" + attributes.copperXP);
          await saveAttributes(handlerInput, attributes);
          sessionAttributes.previousIntent = sessionAttributes.currentIntent;
          sessionAttributes.currentIntent = "CopperXP";
          return LaunchRequestHandler.handle(handlerInput);
        } else if (product.referenceName === "SilverXP") {
          attributes.silverXP += 5;
          sessionAttributes.previousIntent = sessionAttributes.currentIntent;
          sessionAttributes.currentIntent = "SilverXP";
          await saveAttributes(handlerInput, attributes);
          return LaunchRequestHandler.handle(handlerInput);

        } else if (product.referenceName === "GoldXP") {
          attributes.goldXP += 5;
          sessionAttributes.previousIntent = sessionAttributes.currentIntent;
          sessionAttributes.currentIntent = "GoldXP";
          await saveAttributes(handlerInput, attributes);
          return LaunchRequestHandler.handle(handlerInput);

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
      .speak(helpers.speechPolly(speakOutput))
      .reprompt(helpers.speechPolly(speakOutput))
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
      .speak(helpers.speechPolly(speakOutput))
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
      .speak(helpers.speechPolly(speakOutput))
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
      .speak(helpers.speechPolly(speakOutput))
      .reprompt(helpers.speechPolly(speakOutput))
      .getResponse();
  }
};
const FallbackIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    console.log("<=== FALLBACKINTENT HANDLER ===>");
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousAction = "AMAZON.FallbackIntent";
    const speakOutput = "Fallback Intent";

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
    ExpansionIntentHandler,
    UseExperiencePackHandler,
    UseExperienceOnCharacterPackHandler,
    SuccessfulPurchaseResponseHandler,
    UnsuccessfulPurchaseResponseHandler,
    ErrorPurchaseResponseHandler,
    FallbackIntentHandler,
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
    sessionAttributes.player = findCharacterInData(characters, character);
    sessionAttributes.playerPower = character;
    sessionAttributes.playersHealth = 200;
    if (!attributes.characters[character].hasOwnProperty("charURL")) {
      attributes.characters[character].charURL = sessionAttributes.player.PWR_IMG;
    }

    await saveAttributes(handlerInput, attributes);

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

fightingPlayer = async(handlerInput, move) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if (move === "use power move" || move === "power move") return;
  var player = sessionAttributes.player;
  var moveData = findMoveInData(player, move);
  console.log("MOVE DATA BEFORE---->>>>>" + JSON.stringify(moveData));
  var attributes = await getAttributes(handlerInput);
  if (attributes.characters[sessionAttributes.playerPower].hasOwnProperty("attackDamageIncrease")) {
  var updateDamage = moveData.Damage  * attributes.characters[sessionAttributes.playerPower].attackDamageIncrease;
  moveData.Damage = updateDamage.toFixed();
  console.log("MOVE DATA AFTER---->>>>>" + JSON.stringify(moveData));
  sessionAttributes.playerMoveData = moveData;
  }else{
    sessionAttributes.playerMoveData = moveData;
  }
  var didTheyDodge = dodgeRating(moveData);
  if (didTheyDodge) {
    sessionAttributes.didCompDodge = didTheyDodge;
  } else {
    sessionAttributes.didCompDodge = false;
    health(handlerInput, "player", moveData);
  }
  
  powersAttackMove(handlerInput, "player");
};

fightingComputer = async (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if (sessionAttributes.compPowerAttackAvail === true) return;
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
  console.log("THE MOVE DATA FROM COMPUTER --->>>" +JSON.stringify(moveData));
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
  sessionAttributes.computersHealth -= parseInt(blockDamage);
  sessionAttributes.playersHealth -= parseInt(damageTook.toFixed());
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
  var counter;
  if(!sessionAttributes.hasOwnProperty("turnCounter")){
    sessionAttributes.turnCounter = 1;
  }else{
    counter = sessionAttributes.turnCounter;
  }
  if(whosTurn === "player"){
    var playerDamage = sessionAttributes.playerMoveData.Damage;
    var total = (((playerDamage * 0.5) * playerDamage) * sessionAttributes.player.POWER_RATIO);
    sessionAttributes.powersAttackTotal += total;
    if (sessionAttributes.player.POWER_TOTAL <= sessionAttributes.powersAttackTotal) {
      sessionAttributes.playerPowerAttackAvail = true;
    }
  }

  if(whosTurn === "computer"){
    var computerDamage = sessionAttributes.computerMoveData.Damage;
  var total2 = (((computerDamage * 0.5) * computerDamage) * sessionAttributes.computer.POWER_RATIO);
  sessionAttributes.powersAttackTotal2 += total2;
  if (sessionAttributes.computer.POWER_TOTAL <= sessionAttributes.powersAttackTotal2 && whosTurn === "computer") {
    sessionAttributes.compPowerAttackAvail = true;
    }
  }
};
usePowerAttack = (handlerInput, player, whosTurn) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var damage = player.POWER_DMG;
  
  console.log("USEPOWERATTACK -------->>>>>" + damage);
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
    var barOne;
    if(!sessionAttributes.hasOwnProperty("playersBarOne")){
      barOne = 100 - parseInt(sessionAttributes.computerMoveData.Damage);
    }else{
      barOne = parseInt(sessionAttributes.playersBarOne) - parseInt(sessionAttributes.computerMoveData.Damage);
    }
    sessionAttributes.playersBarOne = barOne + "%";
    sessionAttributes.playersBarTwo = "100%";
  } else {
    sessionAttributes.playersBarOne = "0%";
    var barTwo = sessionAttributes.playersHealth;
    sessionAttributes.playersBarTwo = barTwo + "%";
  }
  if (sessionAttributes.computersHealth > 100) {
    var barCompOne;
    if(!sessionAttributes.hasOwnProperty("computersBarOne")){
      barCompOne = 100 - parseInt(sessionAttributes.playerMoveData.Damage);
    }else{
      barCompOne = parseInt(sessionAttributes.computersBarOne) - parseInt(sessionAttributes.playerMoveData.Damage);
    }
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
  var attributes = await getAttributes(handlerInput);
  if (!attributes.hasOwnProperty("stats")) {
    attributes.stats = {};
  }
  if (!attributes.stats.hasOwnProperty("wins")) {
    attributes.stats.wins = 0;
  }
  if (!attributes.stats.hasOwnProperty("losses")) {
    attributes.stats.losses = 0;
  }
  if (!attributes.stats.hasOwnProperty("ties")) {
    attributes.stats.ties = 0;
  }
  if (sessionAttributes.computersHealth <= 0 && sessionAttributes.playersHealth <= 0) {
    sessionAttributes.playerWin = false;
    sessionAttributes.computerWin = false;
    attributes.stats.ties += 1;
  } else if (sessionAttributes.computersHealth <= 0) {
    sessionAttributes.computerWin = false;
    attributes.stats.wins += 1;
    await levelingCharacter(handlerInput,sessionAttributes.playerPower);
  } else if (sessionAttributes.playersHealth <= 0) {
    attributes.stats.losses += 1;
    sessionAttributes.playerWin = false;
  }
  await saveAttributes(handlerInput, attributes);
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
  var theList = `<b>${ltName}</b>: ${ltCombo} <br><b>${ltName2}</b>: ${ltCombo2} <br><b>${hvName}</b>: ${hvCombo} <br><b>${hvName2}</b>: ${hvCombo2}<br>Dodge: dodge`;
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
  var theList = `The move list for ${sessionAttributes.player.Name} is the following: ${ltName}:<break strength="strong"/> ${ltCombo}; ${ltName2}:<break strength="strong"/> ${ltCombo2}; ${hvName}:<break strength="strong"/> ${hvCombo}; ${hvName2}:<break strength="strong"/> ${hvCombo2}. Lastly, you can also dodge.`;
  return theList;
};

calculateStats = async (handlerInput) => {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var attributes = await getAttributes(handlerInput);
  let playerCharacter = sessionAttributes.player.Name;
  let compCharacter = sessionAttributes.computer.Name;
  var charLevel;
  var charExp;
  if (!attributes.characters[playerCharacter].hasOwnProperty("charLevel")) {
    attributes.characters[playerCharacter].charLevel = 1;
  } else {
    charLevel = attributes.characters[playerCharacter].charLevel;
  }
  if (!attributes.characters[playerCharacter].hasOwnProperty("charExp")) {
    attributes.characters[playerCharacter].charExp = 0;
  } else {
    charExp = attributes.characters[playerCharacter].charExp;
  }

  let sessionStats = {
    "turns": sessionAttributes.turnCounter,
    "playerCharName": playerCharacter,
    "computerCharName": compCharacter,
    "playerPlayingCharacterCount": attributes.characters[playerCharacter].count,
    "computerCharacterCount": attributes.compCharacters[compCharacter].count,
    "rankingScore": attributes.characters[playerCharacter].score,
    "compRankingScore": attributes.compCharacters[compCharacter].score,
    "wins": attributes.stats.wins,
    "losses": attributes.stats.losses,
    "ties": attributes.stats.ties
  };
  attributes.stats = sessionStats;
  await saveAttributes(handlerInput, attributes);
  await getStandings(handlerInput);
};

getStandings = async (handlerInput) => {
  var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
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

levelingCharacter = async (handlerInput,playerCharacter) => {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var attributes = await getAttributes(handlerInput);
  var charLevel = attributes.characters[playerCharacter].charLevel;
  var charExp = attributes.characters[playerCharacter].charExp;

  if (charExp < 200) {
    charLevel = 1;
    charExp += 100;
    attackDamageIncrease = 1;
  } else if (charExp >= 200 && charExp < 500) {
    charLevel = 2;
    charExp += 125;
    attackDamageIncrease = 1.02;
  } else if (charExp >= 500 && charExp < 900) {
    charLevel = 3;
    attackDamageIncrease = 1.03;
    charExp += 150;
  } else if (charExp >= 900 && charExp < 1400) {
    charExp += 175;
    charLevel = 4;
    attackDamageIncrease = 1.04;
  } else if (charExp >= 1400 && charExp < 2000) {
    charExp += 200;
    charLevel = 5;
    attackDamageIncrease = 1.05;
  } else if (charExp >= 2000 && charExp < 2700) {
    charExp += 200;
    charLevel = 6;
    attackDamageIncrease = 1.06;
  } else if (charExp >= 2700 && charExp < 3500) {
    charExp += 225;
    charLevel = 7;
    attackDamageIncrease = 1.07;
  } else if (charExp >= 3500 && charExp < 4400) {
    charExp += 250;
    charLevel = 8;
    attackDamageIncrease = 1.08;
  } else if (charExp >= 4400 && charExp < 5400) {
    charExp += 275;
    charLevel = 9;
    attackDamageIncrease = 1.09;
  } else if (charExp >= 5400 && charExp < 6500) {
    charExp += 300;
    charLevel = 10;
    attackDamageIncrease = 1.10;
  } else if (charExp >= 6500 && charExp < 7700) {
    charExp += 300;
    charLevel = 11;
    attackDamageIncrease = 1.11;
  } else if (charExp >= 7700 && charExp < 9000) {
    charExp += 325;
    charLevel = 12;
    attackDamageIncrease = 1.12;
  } else if (charExp >= 9000 && charExp < 13000) {
    charExp += 350;
    charLevel = 13;
    attackDamageIncrease = 1.13;
  } else if (charExp >= 13000 && charExp < 14500) {
    charExp += 375;
    charLevel = 14;
    attackDamageIncrease = 1.14;
  } else if (charExp >= 14500 && charExp < 16100) {
    charExp += 400;
    charLevel = 15;
    attackDamageIncrease = 1.15;
  } else if (charExp >= 16100 && charExp < 17800) {
    charExp += 400;
    charLevel = 16;
    attackDamageIncrease = 1.16;
  } else if (charExp >= 17800 && charExp < 19600) {
    charExp += 425;
    charLevel = 17;
    attackDamageIncrease = 1.17;
  } else if (charExp >= 19600 && charExp < 21500) {
    charExp += 450;
    charLevel = 18;
    attackDamageIncrease = 1.18;
  } else if (charExp >= 21500 && charExp < 23500) {
    charExp += 475;
    charLevel = 19;
    attackDamageIncrease = 1.19;
  } else if (charExp >= 23500) {
    charExp += 0;
    charLevel = 20;
    attackDamageIncrease = 1.20;
  } else {
    console.log("Invalid character experience points");
  }
  if (!attributes.characters[playerCharacter].hasOwnProperty("attackDamageIncrease")) {
    attributes.characters[playerCharacter].attackDamageIncrease = attackDamageIncrease;
  } else {
    attributes.characters[playerCharacter].attackDamageIncrease = attackDamageIncrease;
  }
  attributes.characters[playerCharacter].Name = playerCharacter;
  attributes.characters[playerCharacter].charExp = charExp;
  attributes.characters[playerCharacter].charLevel = charLevel;
  await saveAttributes(handlerInput, attributes);

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
  var attributes = await getAttributes(handlerInput);
  var scoreObj = {};
  var countObj = {};
  var i;
  for (i in attributes.characters) {
    if (attributes.characters[i].hasOwnProperty("count")) {
       countObj[i] = attributes.characters[i].count;

    }
  }
  for (i in attributes.characters) {
    if (attributes.characters[i].hasOwnProperty("score")) {
      scoreObj[i] = attributes.characters[i].score;
    }
  }

  let countArr = Object.values(countObj);
  let maxCount = Math.max(...countArr);
  let scoreArr = Object.values(scoreObj);
  let maxScore = Math.max(...scoreArr);
var highestScoreName;
var highestScoreNames = Object.keys(scoreObj);
console.log("IN SCOREOBJ----->>>>" +JSON.stringify(Object.keys(scoreObj)));

var highestCountName;
var highestCountNames = Object.keys(countObj);
for(i in scoreObj){
console.log("IN SCOREOBJ----->>>>" +JSON.stringify(scoreObj[i]));
  if(scoreObj[i]===maxScore){
    highestScoreName = i;
  }
}
for(i in countObj){
  if(countObj[i]===maxCount){
    highestCountName =i;
  }
}
  var score = attributes.characters[highestScoreName].score;
  var charUrl = attributes.characters[highestScoreName].charURL;
  var charLevel = attributes.characters[highestScoreName].charLevel;
  highestScoreName = helpers.capitalize_Words(highestScoreName);
  var stats = {
    "topCharacter": highestScoreName,
    "score": "Your highest score is with: " + highestScoreName + " with the score being " + maxScore + " points.<br> ",
    "count": "Your most played is with: " + highestCountName + " you have played them " + maxCount + " times.<br> ",
    "statString": "Your total wins, losses and ties are... <br>Wins: " + attributes.stats.wins + "<br>" +
      "Losses: " + attributes.stats.losses + "<br>Ties: " + attributes.stats.ties,
    "charURL": charUrl,
    "speakOutput": "Your highest score is with: " + highestScoreName + " with the score being " + maxScore + " points. Your total Wins: " + attributes.stats.wins +
      ", Losses: " + attributes.stats.losses + ", Ties: " + attributes.stats.ties,
    "highestScore": maxScore,
    "highestScoreLevel": charLevel
    };
  var fields = {};
  fields.HighestScoreWith = highestScoreName;
  fields.HighestScore = score;
  fields.HighestScoreLevel = charLevel;
  var record = await new Promise((resolve, reject) => {
    base('PlayerCharts').update([{ 
          "id": attributes.usersID,
          "fields": fields
      }], function(err, records) {
              if (err) {console.error(err);return;}
              console.log("UPDATED RECORD IN PROMISE = " + JSON.stringify(records[0]));
              resolve(records[0]);
          });
  });
  console.log("UPDATED RECORD = " + JSON.stringify(record));
  return stats;
};