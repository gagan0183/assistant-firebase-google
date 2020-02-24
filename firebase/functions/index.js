'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const { BasicCard, SignIn, Image } = require('actions-on-google');
const jwt = require('jsonwebtoken');
 
process.env.DEBUG = 'dialogflow:debug'; 

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  console.log('Dialogflow agent parameters: ' + agent.parameters);
 
  function signIn(agent) {
    let conv = agent.conv();
    conv.ask(new SignIn());
    agent.add(conv);
  }

  function getSignIn(agent) {
    let conv = agent.conv();
    const user = jwt.decode(conv.request.user.idToken);
    console.log('user', user);
    if (user) {
      if (conv !== null && conv.surface.capabilities.has('actions.capability.SCREEN_OUTPUT')) {
        conv.ask(`Hi ${user.given_name}. You are logged in. Here are the details.`);
        conv.ask(new BasicCard({
          title: `${user.given_name}`,
          image: new Image({
            url: user.picture,
            alt: 'Image'
          }),
          text: `You can access the details now`
        }));
      }
      else if (conv !== null && conv.surface.capabilities.has('actions.capability.AUDIO_OUTPUT')) {
        conv.ask(`Hi ${user.given_name}. You are logged in`);
      }  
    } else {
      conv.close('Permission denied by user');
    }
    agent.add(conv);
  }

  let intentMap = new Map();
  intentMap.set('ask-for-signin', signIn);
  intentMap.set('get-signin', getSignIn);
  agent.handleRequest(intentMap);
});
