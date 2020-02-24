// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

var admin = require("firebase-admin");

var serviceAccount = require("./config/sign-voice-firebase-adminsdk-jjf2z-2ad2682b60.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://sign-voice.firebaseio.com"
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  console.log('Dialogflow agent parameters: ' + agent.parameters);
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  function musicvote(agent) {
    let conv = agent.conv();
    let endconvers = false;
    let responseText = '';
    let singer = agent.parameters['Singer'];
    console.log('Singer ' + singer);
    if (singer) {
      console.log('in if');
      let artistName = singer.replace(' ', '').toLowerCase();
      let currentArtist = admin.database().ref().child('/artists/'+ artistName);
      console.log('currentArtist', currentArtist);
      currentArtist.once('value', function (snapshot) {
        if (snapshot.exists() && snapshot.hasChild('votes')) {
          let obj = snapshot.val();
          console.log('obj', obj);
          currentArtist.update({
            votes: obj.votes + 1
          });
        } else {
          currentArtist.set({
            votes: 1,
            singer: singer
          });
        }
      });
      responseText = 'Thanks for voting';
    } else {
      console.log('in else');
      if (conv.data.voteFallback === undefined) {
        conv.data.voteFallback = 0;
      }
      conv.data.voteFallback++;
      console.log(conv.data.voteFallback);
      console.log('endconvers', endconvers);

      if (conv.data.voteFallback > 2) {
        responseText = 'Thanks for voting. Your vote was refuse. Please try later';
        endconvers = true;
      } else {
        responseText = request.body.queryResult.fulfillmentText;
      }
    }

    console.log('responseText', responseText);
    if (endconvers) {
      conv.close(responseText);
    } else {
      conv.ask(responseText);
    }
    agent.add(conv);
  }

  async function voteresults(agent) {
    let voteResultsRef = admin.database().ref('artists').orderByChild('votes');

    let results = [];
    await voteResultsRef.once('value').then(snapshot => {
      snapshot.forEach(childSnapshot => {
        let value = childSnapshot.val();
        results.push(value);
      });
    }).then(() => {
      results.reverse();
    });

    agent.add('Vote results are process');
  }

  // agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  // agent.add(new Card({
  // 	title: `Title: this is a card title`,
  //     imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //     text: `This is the body text of a card.  You can even use line\n  breaks and emoji! `,
  //     buttonText: 'This is a button',
  //     buttonUrl: 'https://assistant.google.com/'
  // })
  // );
  // agent.add(new Suggestion(`Quick Reply`));
  // agent.add(new Suggestion(`Suggestion`));
  // agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});

  // // Uncomment and edit to make your own intent handler
  // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function yourFunctionHandler(agent) {
  //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
  //   agent.add(new Card({
  //       title: `Title: this is a card title`,
  //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
  //       buttonText: 'This is a button',
  //       buttonUrl: 'https://assistant.google.com/'
  //     })
  //   );
  //   agent.add(new Suggestion(`Quick Reply`));
  //   agent.add(new Suggestion(`Suggestion`));
  //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
  // }

  // // Uncomment and edit to make your own Google Assistant intent handler
  // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
  // // below to get this function to be run when a Dialogflow intent is matched
  // function googleAssistantHandler(agent) {
  //   let conv = agent.conv(); // Get Actions on Google library conv instance
  //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
  //   agent.add(conv); // Add Actions on Google library responses to your agent's response
  // }
  // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
  // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('music vote', musicvote);
  intentMap.set('vote results', voteresults);
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
