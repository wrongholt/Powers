/*jshint esversion: 8 */
const Alexa = require('ask-sdk-core');
var EloRating = require('elo-rating');
const _ = require('lodash');
const {
  DynamoDbPersistenceAdapter
} = require('ask-sdk-dynamodb-persistence-adapter');
var Airtable = require('airtable');

const mainAPL = require('./documents/main.json');
const mainAPL2 = require('./documents/main2.json');
const listAPL = require('./documents/powerslist');
const listAPL2 = require('./documents/powerslist2.json');
const stats = require('./documents/stats.json');
const standings = require('./documents/standings.json');
const listData = require('./documents/listData');
const listData2 = require('./documents/listData.json');
const fightAPL = require('./documents/fighting.json');
const fightStartAPL = require('./documents/fightingStart.json');
const fightEndAPL = require('./documents/fightingEnd.json');
const moveListAPL = require('./documents/fightingList.json');
const helpers = require('./helpers');
const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({
  tableName: 'powers'
});
const variables = require('./variables');

//TODO Fix the healthbars 


const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'||
    (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' &&
        handlerInput.requestEnvelope.request.arguments[0] === 'Fight'));
  },
  async handle(handlerInput) {
    var speakOutput = "";
    var theBase = "appoBlEf8I1VQdU3r";
    
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "launch";
    if(sessionAttributes.hasOwnProperty("computer")){
      sessionAttributes.player = {};
    }
    if(sessionAttributes.hasOwnProperty("playerPower")){
      sessionAttributes.playerPower = '';
    }
    if(sessionAttributes.hasOwnProperty("player")){
      sessionAttributes.computer = {};
    }
    var attributes = await getAttributes(handlerInput);
    var name;
    console.log("IN LAUNCH WHERE COMING FROM---->>>>" + sessionAttributes.previousIntent);
 
    if (Object.keys(attributes).length === 0) {
      speakOutput = '<break strength="strong"/><p>Welcome, to <phoneme alphabet="ipa" ph="pɑwɚrs">Powers</phoneme>. I am  <say-as interpret-as="spell-out">G34XY</say-as>, a <phoneme alphabet="ipa" ph="pɑwɚrs">Powers</phoneme> fighter helper. </p><p>I am here to help you in any way possible through out any fight you may ask for my help by saying <break strength="strong"/> move list <break strength="strong"/>or bot help, with this I can show you the possible moves you can than say in the fight.</p> I will try to help in any way possible.<break strength="strong"/><amazon:emotion name="excited" intensity="high"> Except, I cannot fight for you!!</amazon:emotion> That is not in my contract you hear me <break strength="strong"/><emphasis level="strong">I do not fight!</emphasis>  Let\'s start by getting your name, we use this to keep track of your stats and how you are doing on the leaderboard. Just say, my name is.';
    } else {
      name = attributes.name;
    console.log("IN LAUNCH---->>>>" + name);

      var launch2 = ['<p>Welcome back to Powers, ' + helpers.capitalize_Words(name) + '. </p> <p>Would you like to view your rankings or pick your character to fight?</p>',
        '<p>Hey you came back!</p> <p>This is great news.</p> <p>What would you like to do fight or look at your rankings?</p>',
        '<p>Hello again, can\'t keep away can you, I was told it was addicting. You can start by saying pick character or view my rankings or statistics.</p>',
        '<p>Hello again, ' + helpers.capitalize_Words(name) + ' did you come back to kick butt and take names? If you wish to start taking names or kicking butt, just say pick character or view leaderboards or stats.</p>',
        '<p>Welcome back! You know, I am not the only bot here, there is another that helps me out from time to time, her name is <say-as interpret-as="spell-out">A73XA</say-as>.</p> <p>Now would you like to fight or view your stats or leaderboards?</p> '
      ];
      speakOutput = await helpers.randomNoRepeats(launch2);
    }
    var charactersArray = [];
    var characterdata = await helpers.httpGet(theBase, '', 'Characters');
    var characterRecords = characterdata.records;
    if (!sessionAttributes.hasOwnProperty('characterRecords')) {
      sessionAttributes.characterRecords = [];
    }
    if (!attributes.hasOwnProperty("characters")) {
      attributes.characters = {};
    }
    sessionAttributes.characterRecords = characterRecords;
    
   for (var i = 0; i < characterRecords.length;) {
      charactersArray.push(characterRecords[i].fields.Name);

      if (!attributes.characters.hasOwnProperty(characterRecords[i].fields.Name)) {
        attributes.characters[characterRecords[i].fields.Name] = {};
        attributes.characters[characterRecords[i].fields.Name].charLevel = 1;
        attributes.characters[characterRecords[i].fields.Name].charExp = 0;
      }
      i++;
    }
    sessionAttributes.charactersArray = charactersArray;
    if(sessionAttributes.previousIntent ==="practiceRoundIntent"){
      var record = await helpers.httpGet(theBase, "&filterByFormula=%7BuserID%7D%3D%22" + attributes.nameid + "%22", 'PlayerCharts');
      var userRecord = record.records;
      attributes.usersID = userRecord[0].fields.RecordId;
      speakOutput = 'You have now recieved your certification of practice mode, to get into a real game we start by selecting your character. To do that say, select character.';
    }else if (sessionAttributes.previousIntent === "stats" || sessionAttributes.previousIntent === "standings") {
      speakOutput = "I am sorry you need to play more to get your statistics.";
    } else if (sessionAttributes.previousIntent === "CopperXP") {
      speakOutput = "Outstanding you just bought the Copper Experience Pack. If you wish to use them just say, Use Copper Pack.";
    } else if (sessionAttributes.previousIntent === "SilverXP") {
      speakOutput = "Outstanding you just bought the Silver Experience Pack. If you wish to use them just say, Use Silver Pack.";
    } else if (sessionAttributes.previousIntent === "GoldXP") {
      speakOutput = "Outstanding you just bought the Gold Experience Pack. If you wish to use them just say, Use Gold Pack.";
    }
    var textOutput = speakOutput.replace( /(<([^>]+)>)/ig, '');
    await saveAttributes(handlerInput, attributes);
    if (helpers.supportsAPL(handlerInput)) {
      var power1 = await getRandomPowerImage(characterRecords);
    var power2 = await getRandomPowerImage(characterRecords);
    var bgImage = await getRandomMainBGImage();
      if(!attributes.name){
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
      }else{
        if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' && handlerInput.requestEnvelope.request.arguments[0] === 'Fight') {
          return CharactersSelectionScreenHandler.handle(handlerInput);
        } 
        if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' && handlerInput.requestEnvelope.request.arguments2[0] === 'Store') {
          return GetListofISPsHandler.handle(handlerInput);
        }
        return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          version: '1.3',
          document: mainAPL2,
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
      } 
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .withSimpleCard("Powers", textOutput)
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
    var base = new Airtable({
      apiKey: variables.ApiAirtable
    }).base('appoBlEf8I1VQdU3r');
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
    console.log("IN GET FIRST NAME---->>>>" + userName);

      } else if (usersGBName) {
        userName = usersGBName;
    console.log("IN GET GB NAME---->>>>" + userName);

      } else if (usersDEName) {
        userName = usersDEName;
    console.log("IN GET DE NAME---->>>>" + userName);

      } else if (usersCustName) {
        userName = usersCustName;
    console.log("IN GET CUSTOM NAME---->>>>" + userName);

      }
      if(userName.includes("is")){
      userName.replace('is','');
      }
      userName = helpers.capitalize_Words(userName);
      
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
      await saveAttributes(handlerInput, attributes);
     return PracticeRoundIntentHandler.handle(handlerInput);
    }
  }
};

const PracticeRoundIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'PracticeRoundIntent';
  },
  async handle(handlerInput) {
    var attributes = await getAttributes(handlerInput);
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "practiceRoundIntent";
    attributes.isPractice = true;

    var characters = sessionAttributes.characterRecords;
    if (!sessionAttributes.hasOwnProperty('practicePlayer')) {
      sessionAttributes.practicePlayer = {};
    }
    if (!sessionAttributes.hasOwnProperty('practiceComputer')) {
      sessionAttributes.practiceComputer = {};
    }
    sessionAttributes.practicePlayer =  await findCharacterInData(characters, 'Electric Mean');
    sessionAttributes.practiceComputer = await findCharacterInData(characters, 'Sharpie Sharp');
    var userName = attributes.name;
    var practiceSteps;
    console.log(JSON.stringify(sessionAttributes));
    if(!sessionAttributes.hasOwnProperty("practiceSteps")){
      sessionAttributes.practiceSteps = 0;
      practiceSteps = sessionAttributes.practiceSteps;
    }else{
      practiceSteps = sessionAttributes.practiceSteps;
    }
    console.log("IN PRACTICE---->>>>" + practiceSteps);

    var speakOutput;
    var practiceSpeak = ['Perfect, ' + helpers.capitalize_Words(userName) + ", I have randomly chosen your character and an opponent, lets start out by teaching you, the first move, which is, light attack. Try saying, light attack.",
        'Excellent!! The light attack move is the only move that you can use without your opponent possibly blocking you. So keep that in mind when you use other moves. Now for your next attack move. Try saying, heavy attack.',
        'You are a quick learner! Next, lets look at the move list and try new attack move you haven\'t done yet. Say, move list.',
        'You have passed all the tests so far. One important thing to know is that you can block, by saying, block. Let\'s try it now.',
        'One last important thing, is that you gain power by fighting and when you have enough power, you can use your power move. You will be notified when your power move is available, to activate it just say, power move.' + sessionAttributes.practicePlayer.POWER_AUDIO
      ];
      if(practiceSteps === 5){
        return LaunchRequestHandler.handle(handlerInput);
      }
        speakOutput = practiceSpeak[practiceSteps];         
        practiceSteps++;
        
        sessionAttributes.practiceSteps = practiceSteps;
     
      await saveAttributes(handlerInput,attributes);
   
    var textOutput = speakOutput.replace( /(<([^>]+)>)/ig, '');
      if (helpers.supportsAPL(handlerInput)) {
        var bgImage = await getRandomMainBGImage();
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
                  "powerPlayer": sessionAttributes.practicePlayer.PWR_IMG,
                  "powerComputer": sessionAttributes.practiceComputer.PWR_IMG
                }
              }
            }
          })
          .getResponse();
      } else {
        return handlerInput.responseBuilder
          .speak(helpers.speechPolly(speakOutput))
          .reprompt(helpers.speechPolly(speakOutput))
          .withSimpleCard("Fight", textOutput)
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
    var attributes = await getAttributes(handlerInput);
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var charactersArray;   
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "characterSelection";
    if (Object.keys(attributes).length === 0) {
      return LaunchRequestHandler.handle(handlerInput);
    }
    if(sessionAttributes.hasOwnProperty("player") ){
      sessionAttributes.player = {};
    }if (sessionAttributes.hasOwnProperty('computer')){
      sessionAttributes.computer = {};
    }

    if (!sessionAttributes.hasOwnProperty('characterRecords')) {
      var theBase = "appoBlEf8I1VQdU3r";
    var characterdata = await helpers.httpGet(theBase, '', 'Characters');
    var characterRecords = characterdata.records;
      sessionAttributes.characterRecords = [];
       charactersArray = [];
    for (var i = 0; i < characterRecords.length;) {
        charactersArray.push(characterRecords[i].fields.Name);
        i++;
      }
      sessionAttributes.charactersArray = charactersArray;
    }else{
      charactersArray = sessionAttributes.charactersArray;
    }
    console.log(sessionAttributes);
    console.log("CHARACTER SELECTION "+charactersArray);
    attributes.isPractice = false;
    await saveAttributes(handlerInput,attributes);
    if (charactersArray.length > 2) {
      charactersArray = charactersArray.slice(0).join(', <break time=".4s"/>').replace(/, ([^,]*)$/, '<break time=".4s"/> or<break time=".3s"/> $1');
    }
    sessionAttributes.timedCharacterArray = charactersArray;

    var speakOutput;
      var speakArray = ["You can pick from any of these characters, just say thier name or you can have me choose for you by saying choose for me: " + charactersArray + '!',
    "Are you ready? You can pick from these characters, just by saying their name or you could say choose for me and I will grab someone by random. The characters are: "+ charactersArray + '!',
  "Who's ready to rumble!? I am not, but I am not also a character you can choose, those are: " + charactersArray + ". You may also say, random character and I will go and select the best random character you could get!"];
      speakOutput = await helpers.randomNoRepeats(speakArray);
    

    if (helpers.supportsAPL(handlerInput)) {
      if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' && handlerInput.requestEnvelope.request.arguments[0] === 'ItemSelected') {
        var character = handlerInput.requestEnvelope.request.arguments[2];
    console.log("IN CHARACTER SELECTION---->>>>" + character);
        await characterSelector(handlerInput, sessionAttributes.characterRecords, character);
        return CharactersSelectionScreenTwoHandler.handle(handlerInput);
      }
      return handlerInput.responseBuilder
      .addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        version: '1.3',
        document: listAPL,
        datasources: listData2
      })  
      .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
        .getResponse();
    }
  }
};

const CharactersSelectionScreenTwoHandler = {
  canHandle(handlerInput) {
    return (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
    Alexa.getIntentName(handlerInput.requestEnvelope) === 'CharacterSelectionScreenTwoIntent' ||
    (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' &&
        handlerInput.requestEnvelope.request.arguments.length > 0 &&
        handlerInput.requestEnvelope.request.arguments[0] === 'SecondItemSelected'));
  },
  async handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "characterSelectionTwo";
    if (!sessionAttributes.playerPower) {
      return CharactersSelectionScreenHandler.handle(handlerInput);
    }
    var whoToFight = ["Alright, lets go " + sessionAttributes.playerPower + "! Now who do you want to fight, " + sessionAttributes.timedCharacterArray + "? You may say, the characters name, or random character.",
      "Are you serious, " + sessionAttributes.playerPower + " is my favorite! Who would you like to fight, " + sessionAttributes.timedCharacterArray + "? Don't forget, that you can say the characters name, or random character.",
      "Everyone, we got " + sessionAttributes.playerPower + " in the house! Who are they going to fight against, " + sessionAttributes.timedCharacterArray + "? Did I tell you, that you may say the characters name, or random character.",
    ];
    var speakOutput = await helpers.randomNoRepeats(whoToFight);
    if (helpers.supportsAPL(handlerInput)) {
      if (Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent' && handlerInput.requestEnvelope.request.arguments[0] === 'SecondItemSelected') {
        var character = handlerInput.requestEnvelope.request.arguments[2];
    console.log("IN CHARACTER SELECTION 2---->>>>" + character);

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
          datasources: listData2
        })
        .getResponse();
    } else {
      return handlerInput.responseBuilder
        .speak(helpers.speechPolly(speakOutput))
        .reprompt(helpers.speechPolly(speakOutput))
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
    console.log("IN CHARACTER SELECTED---->>>>" + character);

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

const RandomSelectedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'RandomCharacterSelectedIntent';
  },
  async handle(handlerInput) {
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "randomSelected";

    var characters = sessionAttributes.characterRecords;
    var charactersArray = sessionAttributes.charactersArray;
    var randomCharacter = await helpers.randomNoRepeats(charactersArray);
    console.log("IN RANDOM SELECTED CHARACTER---->>>>" + randomCharacter);

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
    console.log("IN MOVE START---->>>>");
    var speakOutput;
    if (!sessionAttributes.hasOwnProperty("FightStart")) {
      speakOutput = "To start the fight, say either an attack move or move list to access it. " + sessionAttributes.playerPower + ' <sub alias="versus">VS</sub> ' + sessionAttributes.enemyPower + "! Ready Fight!!";
      sessionAttributes.FightStart = true;
    } else {
      var fightReturn = ["Let's get back to the fight, just say <break strength='strong'/>a<break strength='strong'/> move.",
        "Sweet you have returned, just say <break strength='strong'/>a<break strength='strong'/> move to get back to fighting!",
        "So someone told me, to tell you, to just say,<break strength='strong'/>a<break strength='strong'/> move to fight.",
        "Light attack or Heavy attack are universal fight moves you can start with those if you don't remember <break strength='strong'/>a<break strength='strong'/> fight move."
      ];
      speakOutput = await helpers.randomNoRepeats(fightReturn);

    }

    var textOutput = speakOutput.replace( /(<([^>]+)>)/ig, '');
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
        .withSimpleCard("Fight", textOutput)
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
    var attributes = await getAttributes(handlerInput);
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "fightHandler";
    var move = handlerInput.requestEnvelope.request.intent.slots.Move.value;
    console.log("IN MOVE---->>>>" + move);
    if (attributes.isPractice === true){
      return PracticeRoundIntentHandler.handle(handlerInput);
    }
    
    var speakOutput;
    var audio;
    if (move === "dodge" || move === "block" || move === "dip" || move === "duck" || move === "dive" || move === "blocked") {
      speakOutput = await playerBlocked(handlerInput, move);
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
        await usePowerAttack(handlerInput, sessionAttributes.player, "player");
        audio = sessionAttributes.player.POWER_AUDIO;
        if (sessionAttributes.player.Name === "Charity") {
          speakOutput = audio + "You just used " + sessionAttributes.player.POWER_ATK + " healing yourself for " + sessionAttributes.player.POWER_DMG + " points! You now have " + sessionAttributes.playersHealth + " points!";
          
        } else {
          speakOutput = audio + "You just used " + sessionAttributes.player.POWER_ATK + " doing a total of " + sessionAttributes.player.POWER_DMG + " damage to " + sessionAttributes.computer.Name + "! They now have " + sessionAttributes.computersHealth + " points left!";
          
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
        await usePowerAttack(handlerInput, sessionAttributes.computer, "computer");
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
      await healthBar(handlerInput);
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
console.log("IN FIGHT END---->>>>");

    if (sessionAttributes.computerWin === false && sessionAttributes.playerWin === false) {
      speakOutput =  "You just used the " +sessionAttributes.playerMoveData.Name + " move and your opponent used "+ sessionAttributes.computerMoveData.Name + " and it ended in a tie, you will get them next time! Say, lets fight again or you can say, view my stats.";
      displayOutput = "Wow, it was a tie, you will get them next time!";
      bgColor = "#eeeeee";
      color = "#0E2773";
    } else if (sessionAttributes.playerWin === false) {
      speakOutput = "You just used the " +sessionAttributes.playerMoveData.Name + " move and your opponent used "+ sessionAttributes.computerMoveData.Name + " and sorry to say, but you lost, there is always next time! Say, lets fight again to try one more time";
      displayOutput = "Sorry, but you lost, there is always next time!";
      bgColor = "#BF1736";
      color = "#0E2773";
    } else if (sessionAttributes.computerWin === false) {
      speakOutput = "You just used the " +sessionAttributes.playerMoveData.Name + " move and your opponent used "+ sessionAttributes.computerMoveData.Name + ". The results are in, you won! Say, lets fight again to play another round.";
      displayOutput = "Nice you won! Want to try again?";
      bgColor = "#0E2773";
      color = "#BF1736";
    }
    if (helpers.supportsAPL(handlerInput)) {
      var bgImage = sessionAttributes.bgImageFighting;
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
                "message": displayOutput,
                
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
    var speakOutput;
    let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "moveList";
console.log("IN MOVE LIST---->>>>");
    if(sessionAttributes.previousIntent === "practiceRoundIntent"){
      speakOutput = await moveListSpeak(handlerInput) + " Now try saying one of the attack moves you haven't done?";
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
                  "powerPlayer": sessionAttributes.practicePlayer.PWR_IMG,
                  "powerComputer": sessionAttributes.practiceComputer.PWR_IMG,
                  "powerName": sessionAttributes.practicePlayer.Name,
                  "moveList": await moveList(handlerInput)
  
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
    }else{
      speakOutput = await moveListSpeak(handlerInput) + " Say a move or the name of the move to get back to the fight.";
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
                  "moveList": await moveList(handlerInput)
  
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
    speakOutput = "The stats for " + playerName + " are the following: " + statsObject.speakOutput + ". Say lets fight to pick your character. ";
    var helpHints = ["Did you know there is a store, say what can I buy.","Have you play for a bit if so check out the leaderboards by saying rankings or leaderboards.",
    "Did you know there is a move list just ask for it, after you picked your character.", "Are you ready to rumble, if so say lets fight or pick character." ];
    
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
                "primaryText": statsObject.score + statsObject.count + statsObject.statString,
                "hintText": await helpers.randomNoRepeats(helpHints)

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
      return LaunchRequestHandler.handle(handlerInput);
    }
    var statsObject = await statsData(handlerInput);
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "standings";
    
    var theBase = "appoBlEf8I1VQdU3r";
    var playerData = await helpers.httpGet(theBase,"&filterByFormula=HighestScoreLevel%3E0&maxRecords=10","PlayerCharts");
    var playerRecords = playerData.records;
    var playersString="";
    var playersString2="";
    var theNumber = 1;
    for (var i in playerRecords) {
      
      if(playerRecords[i].fields.HighestScoreLevel === statsObject.highestScoreLevel){
      playersString2 += theNumber + ". " + playerRecords[i].fields.userID +": " +playerRecords[i].fields.HighestScore + " Level: "+playerRecords[i].fields.HighestScoreLevel + "<br>";
      }
      if(playerRecords[i].fields.HighestScoreLevel){
        playersString += theNumber + ". " + playerRecords[i].fields.userID +": " +playerRecords[i].fields.HighestScore + " Level: "+playerRecords[i].fields.HighestScoreLevel + "<br>";
        
        speakOutput += theNumber + ". " + playerRecords[i].fields.userID +": " +playerRecords[i].fields.HighestScore + ", Level: "+playerRecords[i].fields.HighestScoreLevel +' ';
      }   
      theNumber = theNumber + 1;
      }
      var helpHints = ["Scroll to the left to see another leaderboard. ","Would you like to level up faster checkout our store by saying, what can I buy.",
"Did you know there is a move list just ask for it, after you picked your character.", "Are you ready to rumble, if so say lets fight or pick character." ];
      speakOutput += "If you would like to fight just say, let's fight.";
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
                "textbox2": playersString2,
                "hintText": await helpers.randomNoRepeats(helpHints)
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
    var charactersArray = sessionAttributes.timedCharacterArray;

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

    character = await characterFilter(character);
    character = helpers.capitalize_Words(character);
    if(sessionAttributes.previousIntent === "useExperiencePack"){

    }
    var stringAdd = "If you have any left you can say use than the type experiance pack or you can select your character by saying , pick character.";
    if (sessionAttributes.expPack === "copper") {
      if (attributes.hasOwnProperty("copperXP") || attributes.copperXP === 0) {
        speakOutput = "I am sorry you need to buy some experience packs. Is there anything else you would like to do like pick character to fight or look at your stats?";
      } else {
        attributes.copperXP = parseInt(attributes.copperXP) - 1;
        attributes.characters[character].charExp = parseInt(attributes.characters[character].charExp) + 200;
        speakOutput = "I have added two hundred experience points to " + character + '! You have ' + attributes.copperXP + ' copper experience packs left. ' + stringAdd;
      }
    } else if (sessionAttributes.expPack === "silver") {
      if (!attributes.hasOwnProperty("silverXP") || attributes.silverXP === 0) {
        speakOutput = "I am sorry you need to buy some experience packs. Is there anything else you would like to do like pick character to fight or look at your stats?";
      } else {
        attributes.silverXP = parseInt(attributes.silver) - 1;
        attributes.characters[character].charExp = parseInt(attributes.characters[character].charExp) + 350;
        speakOutput = "I have added three hundred and fifty experience points to " + character + '! You have ' + attributes.silverXP + ' silver experience packs left. ' + stringAdd;
      }
    } else if (sessionAttributes.expPack === "gold") {
      if (!attributes.hasOwnProperty("goldXP") || attributes.goldXP === 0) {
        speakOutput = "I am sorry you need to buy some experience packs. Is there anything else you would like to do like pick character to fight or look at your stats?";
      } else {
        attributes.goldXP = parseInt(attributes.goldXP) - 1;
        attributes.characters[character].charExp = parseInt(attributes.characters[character].charExp) + 500;
        speakOutput = "I have added five hundred experience points to " + character + '! You have ' + attributes.goldXP + ' gold experience packs left. ' + stringAdd;
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
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "listOfISPs";
    return ms.getInSkillProducts(locale)
      .then(async function checkForProductAccess(result) {
          const products = getAllProducts(result.inSkillProducts);
          if (products && products.length > 0) {
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
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var attributes = await getAttributes(handlerInput);
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "BuyIntent";
    var speakOutput = "";

    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const locale = handlerInput.requestEnvelope.request.locale;
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
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();
    const productId = handlerInput.requestEnvelope.request.payload.productId;
    var attributes = await getAttributes(handlerInput);
    var speakOutput;
    return ms.getInSkillProducts(locale).then(async function (res) {
      let product = res.inSkillProducts.find(record => record.productId == productId);
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
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
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
  async handle(handlerInput) {

    var helpHints = ["If you wish to look at your stats just say my stats or statistics.","Have you play for a bit if so check out the leaderboards by saying rankings or leaderboards.",
"Did you know there is a move list just ask for it, after you picked your character.", "Are you ready to rumble, if so say lets fight or pick character." ];
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "helpIntent";
    var speakOutput;
    if(sessionAttributes.previousIntent === "moveList"){
      speakOutput = "Having trouble on knowing what to do? Just say a move name or the move itself, if you don't know the move you may say, move list.";
    }else if(sessionAttributes.previousIntent === "fightEnd"){
      speakOutput = "You can now look at the stats or leaderboards, since you are done fighting. Just say, stats or leaderboards.";
    }else{
      speakOutput = await helpers.randomNoRepeats(helpHints);
    }

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
  async handle(handlerInput) {
    var goodbyes = ["Don't ever tell anyone anything. If you do, you start missing everybody.","Bye Felicia!","It is so hard to leave—until you leave. And then it is the easiest thing in the world","Later Gator, after awhile crocodile",
"Adios amigos!","Thanks for coming, come back soon!","I'll see you in another life. When we are both cats.","You've changed me forever. And I'll never forget you.","This is not a goodbye, this is a thank you."];

    const speakOutput = await helpers.randomNoRepeats(goodbyes);
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
    console.log("<<<SESSION ENDED>>>>>");
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
    console.log("<=== handler/error.js ===>");
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
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.previousIntent = sessionAttributes.currentIntent;
    sessionAttributes.currentIntent = "AMAZON.FallbackIntent";
    const speakOutput = "Fallback Intent";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};


exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    NameIntentHandler,
    PracticeRoundIntentHandler,
    CharactersSelectionScreenHandler,
    CharactersSelectionScreenTwoHandler,
    CharacterSelectedHandler,
    RandomSelectedHandler,
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

getRandomPowerImage = async (records) => {
  var imageArray = [];
  for (var i = 0; i < records.length;) {
    imageArray.push(records[i].fields.PWR_IMG);
    i++;
  }
  var powersImage = await helpers.randomNoRepeats(imageArray);
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
    character = await characterFilter(character);
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
    sessionAttributes.player = await findCharacterInData(characters, character);
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
    character = await characterFilter(character);
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
    sessionAttributes.computer = await findCharacterInData(characters, character);
    sessionAttributes.computersHealth = 200;
    sessionAttributes.enemyPower = character;
  }
};
characterFilter = async (character) => {
  if(character === "randle" || character === "randel" || character==="randy"){
    character = "Randell";
  }else if (character === "mean" || character === "electric") {
    character = "Electric Mean";
  } else if (character === "lars" || character === "thundersquat" || character === "thunder" || character === "Lars") {
    character = "Lars Thundersquat";
  } else if (character === "ss" || character === "sharpie" || character === "sharp" || character === "sharpy") {
    character = "Sharpie Sharp";
  }else if (character === "chairity" || character === "chairty" || character === "charitie") {
    character = "Charity";
  }else if (character === "lillieth" || character === "lilleth" || character === "lillath" || character === "lilliath") {
    character = "Lillith";
  }else {
    character = character;
  }
  return character;
};
findCharacterInData = async (characters, character) => {
  for (var i = 0; i < characters.length;) {
    if (characters[i].fields.Name === character) {
      return characters[i].fields;
    }
    i++;
  }
};
findMoveInData = async (player, move) => {
  var moveStats;
  if (player.ATK_LT_COMBO === move ||player.ATK_LT_NAME === move) {
    moveStats = {
      Name: player.ATK_LT_NAME,
      Damage: player.ATK_LT_DMG,
      DodgeRating: player.ATK_LT_DBRATING
    };

    return moveStats;
  } else if (player.ATK_LT_COMBO2 === move||player.ATK_LT_NAME2 === move) {
    moveStats = {
      Name: player.ATK_LT_NAME2,
      Damage: player.ATK_LT_DMG2,
      DodgeRating: player.ATK_LT_DBRATING2
    };
    return moveStats;
  } else if (player.ATK_HV_COMBO === move||player.ATK_HV_NAME === move) {
    moveStats = {
      Name: player.ATK_HV_NAME,
      Damage: player.ATK_HV_DMG,
      DodgeRating: player.ATK_HV_DBRATING
    };
    return moveStats;
  } else if (player.ATK_HV_COMBO2 === move||player.ATK_HV_NAME2 === move) {
    moveStats = {
      Name: player.ATK_HV_NAME2,
      Damage: player.ATK_HV_DMG2,
      DodgeRating: player.ATK_HV_DBRATING2
    };
    return moveStats;
  } else if (player.ATK_BLK_COMBO === move||player.ATK_BLK_NAME === move) {
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
  var moveData = await findMoveInData(player, move);
  var attributes = await getAttributes(handlerInput);
  if (attributes.characters[sessionAttributes.playerPower].hasOwnProperty("attackDamageIncrease")) {
  var updateDamage = moveData.Damage  * attributes.characters[sessionAttributes.playerPower].attackDamageIncrease;
  moveData.Damage = updateDamage.toFixed();
  sessionAttributes.playerMoveData = moveData;
  }else{
    sessionAttributes.playerMoveData = moveData;
  }
  var didTheyDodge = await dodgeRating(moveData);
  if (didTheyDodge) {
    sessionAttributes.didCompDodge = didTheyDodge;
  } else {
    sessionAttributes.didCompDodge = false;
    await health(handlerInput, "player", moveData);
  }
  
  await powersAttackMove(handlerInput, "player");
};

fightingComputer = async (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if (sessionAttributes.compPowerAttackAvail === true) return;
  var computer = sessionAttributes.computer;
  var compMove = await randomizeComputerAttack(computer);
  var moveData = await findMoveInData(computer, compMove);
  var didTheyDodge = await dodgeCompRating(moveData);
  if (didTheyDodge) {
    sessionAttributes.didPlayerDodge = didTheyDodge;
  } else {
    sessionAttributes.didPlayerDodge = false;
    await health(handlerInput, "computer", moveData);
  }
  sessionAttributes.computerMoveData = moveData;
  await powersAttackMove(handlerInput, "computer");
};

playerBlocked = async (handlerInput, move) => {
  if (move === "blocked" || move === "dodge" || move === "duck" || move === "dip" || move === "dive") {
    move = "block";
  }
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  var compMove = await randomizeComputerAttack(sessionAttributes.computer);
  var moveCompData = await findMoveInData(sessionAttributes.computer, compMove);
  var moveData = await findMoveInData(sessionAttributes.player, move);
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
health = async (handlerInput, whosTurn, moveData) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if (whosTurn === "player") {
      sessionAttributes.computersHealth = (parseInt(sessionAttributes.computersHealth) - parseInt(moveData.Damage));
  } else if (whosTurn === "computer") {
    sessionAttributes.playersHealth = (parseInt(sessionAttributes.playersHealth) - parseInt(moveData.Damage));
  }

};

dodgeRating = async (moveData) => {
  let theDodgeRating = moveData.DodgeRating;
  let randomNumberTen = Math.floor(Math.random() * (5 * 100 - 1 * 100) + 1 * 100) / (1 * 100);
  if (theDodgeRating >= randomNumberTen) {
    return true;
  } else return false;
};
dodgeCompRating = async (moveData) => {
  let theDodgeRating = moveData.DodgeRating;
  let randomNumberTen = Math.floor(Math.random() * (5 * 100 - 1 * 100) + 1 * 100) / (1 * 100);
  if (theDodgeRating >= randomNumberTen) {
    return true;
  } else return false;
};

randomizeComputerAttack = async (computer) => {
  let combos = ["ATK_LT_COMBO", "ATK_LT_COMBO2", "ATK_HV_COMBO", "ATK_HV_COMBO2"];
  var theCombo = await helpers.randomNoRepeats(combos);
  console.log(theCombo);
  if (computer.hasOwnProperty(theCombo)) {
    var theAttack = computer[theCombo];
    return theAttack;
  }
};
powersAttackMove = async (handlerInput, whosTurn) => {
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
usePowerAttack = async (handlerInput, player, whosTurn) => {
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

healthBar = async (handlerInput) => {
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

moveList = async (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if(sessionAttributes.previousIntent === "practiceRoundIntent"){
    let ltName = sessionAttributes.practicePlayer.ATK_LT_NAME;
  let ltCombo = sessionAttributes.practicePlayer.ATK_LT_COMBO;
  let ltName2 = sessionAttributes.practicePlayer.ATK_LT_NAME2;
  let ltCombo2 = sessionAttributes.practicePlayer.ATK_LT_COMBO2;
  let hvName = sessionAttributes.practicePlayer.ATK_HV_NAME;
  let hvCombo = sessionAttributes.practicePlayer.ATK_HV_COMBO;
  let hvName2 = sessionAttributes.practicePlayer.ATK_HV_NAME2;
  let hvCombo2 = sessionAttributes.practicePlayer.ATK_HV_COMBO2;
  let theList = `<b>${ltName}</b>: ${ltCombo} <br><b>${ltName2}</b>: ${ltCombo2} <br><b>${hvName}</b>: ${hvCombo} <br><b>${hvName2}</b>: ${hvCombo2}<br><b>Dodge:</b> dodge`;
  return theList;
  }else{
    let ltName = sessionAttributes.player.ATK_LT_NAME;
  let ltCombo = sessionAttributes.player.ATK_LT_COMBO;
  let ltName2 = sessionAttributes.player.ATK_LT_NAME2;
  let ltCombo2 = sessionAttributes.player.ATK_LT_COMBO2;
  let hvName = sessionAttributes.player.ATK_HV_NAME;
  let hvCombo = sessionAttributes.player.ATK_HV_COMBO;
  let hvName2 = sessionAttributes.player.ATK_HV_NAME2;
  let hvCombo2 = sessionAttributes.player.ATK_HV_COMBO2;
  let theList = `<b>${ltName}</b>: ${ltCombo} <br><b>${ltName2}</b>: ${ltCombo2} <br><b>${hvName}</b>: ${hvCombo} <br><b>${hvName2}</b>: ${hvCombo2}<br><b>Dodge:</b> dodge`;
  return theList;
  }
};
moveListSpeak = async (handlerInput) => {
  let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  if(sessionAttributes.previousIntent === "practiceRoundIntent"){
    let ltName = sessionAttributes.practicePlayer.ATK_LT_NAME;
  let ltCombo = sessionAttributes.practicePlayer.ATK_LT_COMBO;
  let ltName2 = sessionAttributes.practicePlayer.ATK_LT_NAME2;
  let ltCombo2 = sessionAttributes.practicePlayer.ATK_LT_COMBO2;
  let hvName = sessionAttributes.practicePlayer.ATK_HV_NAME;
  let hvCombo = sessionAttributes.practicePlayer.ATK_HV_COMBO;
  let hvName2 = sessionAttributes.practicePlayer.ATK_HV_NAME2;
  let hvCombo2 = sessionAttributes.practicePlayer.ATK_HV_COMBO2;
  let theList = `The move list for ${sessionAttributes.practicePlayer.Name} is the following: ${ltName}:<break strength="strong"/> ${ltCombo}; ${ltName2}:<break strength="strong"/> ${ltCombo2}; ${hvName}:<break strength="strong"/> ${hvCombo}; ${hvName2}:<break strength="strong"/> ${hvCombo2}. Lastly, you can also<break strength="strong"/> dodge.`;
  return theList;
  }else{
    let ltName = sessionAttributes.player.ATK_LT_NAME;
  let ltCombo = sessionAttributes.player.ATK_LT_COMBO;
  let ltName2 = sessionAttributes.player.ATK_LT_NAME2;
  let ltCombo2 = sessionAttributes.player.ATK_LT_COMBO2;
  let hvName = sessionAttributes.player.ATK_HV_NAME;
  let hvCombo = sessionAttributes.player.ATK_HV_COMBO;
  let hvName2 = sessionAttributes.player.ATK_HV_NAME2;
  let hvCombo2 = sessionAttributes.player.ATK_HV_COMBO2;
  let theList = `The move list for ${sessionAttributes.player.Name} is the following: ${ltName}:<break strength="strong"/> ${ltCombo}; ${ltName2}:<break strength="strong"/> ${ltCombo2}; ${hvName}:<break strength="strong"/> ${hvCombo}; ${hvName2}:<break strength="strong"/> ${hvCombo2}. Lastly, you can also<break strength="strong"/> dodge.`;
  return theList;
  }
  
};

calculateStats = async (handlerInput) => {
  var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
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
  var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
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
  var base = new Airtable({
    apiKey: variables.ApiAirtable
  }).base('appoBlEf8I1VQdU3r');

  var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
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
var highestCountName;
for(i in scoreObj){
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
              resolve(records[0]);
          });
  });

  return stats;
};