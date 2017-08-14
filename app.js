'use strict';
const http = require('http');
const config = require('./config');
const SLACK_TOKEN = config.slack_token;
const BOT_TOKEN = config.bot_token;
const WATSON_UN = config.watson_un;
const WATSON_PW = config.watson_pw;
const createSlackEventAdapter = require('@slack/events-api').createSlackEventAdapter;
const slackEvents = createSlackEventAdapter(SLACK_TOKEN);
const IncomingWebhook = require('@slack/client').IncomingWebhook;
const webhookUrl = config.webhook_url;
const webhook = new IncomingWebhook(webhookUrl);
const port = 3000;

const interactiveMessages  = require('@slack/interactive-messages');
// Initialize using verification token from environment variables
const slackMessages = interactiveMessages.createMessageAdapter(SLACK_TOKEN);

// init express
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Watson natural language processing for bot's response
const NaturalLanguageUnderstanding = require('watson-developer-cloud/natural-language-understanding/v1');
const natural_language_understanding = new NaturalLanguageUnderstanding({
  'username': WATSON_UN,
  'password': WATSON_PW,
  'version_date': '2017-02-27'
});

// let rtm = new RtmClient(bot_token);
let channel = 'C6GN4GYGM';
let botConnected = false;

let nluOptions = {
  'features': {
    'entities': {
      'limit': 3
    },
    'concepts': {
      'limit': 3
    }
  }
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false  }));
app.use('/slack/events', slackEvents.expressMiddleware());
app.use('/slack/actions', slackMessages.expressMiddleware());

// const RtmClient = require('@slack/client').RtmClient;
// const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload
// rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
//     rtmStartData.channels.forEach((c)=>{
//         if (c.is_member && c.name ==='testing_frogai') { channel = c.id }
//     })
//     console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
// });

// // you need to wait for the client to fully connect before you can send messages
// rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, ()=>{
//     rtm.sendMessage("i'm connected!", channel);
//     botConnected = true;
// });

// rtm.start();

let concepts;
let message;
let match;
const re = /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])?/

// Attach listeners to events by Slack Event "type". See: https://api.slack.com/events/message.im
slackEvents.on('message', (event) => {
    
    // check to see if we're listening to the right channel
    if (event.channel == channel){
        if (event != undefined && event.text != undefined && event.text.match(re) != undefined){
            let url = event.text.match(re)[0];
            console.log(url)
            // let url = event.message.attachments[0].from_url;
            nluOptions.url = url;
            natural_language_understanding.analyze(nluOptions, (err, response)=>{
                if (err){
                    console.log(err)
                }
                else {
                    concepts = ''
                    response.entities.forEach((e)=>{
                        concepts += e.text + ', '
                    });
                    response.concepts.forEach((c, index)=>{
                        if (index != response.concepts.length - 1){
                            concepts += c.text + ', '
                        }else {
                            concepts += 'and ' + c.text + '.'
                        }
                    });

                    console.log(concepts);

                    message = {
                        "text": "Hey there! Looks like someone sent an article about " + concepts,
                        "attachments": [
                            {
                                "text": "Would you like frog's AI to learn from this article?",
                                "fallback": "You are unable to train me",
                                "callback_id": "train_me",
                                "color": "#3AA3E3",
                                "attachment_type": "default",
                                "actions": [
                                    {
                                        "name": "training",
                                        "text": "Yes",
                                        "type": "button",
                                        "value": url
                                    },
                                    {
                                        "name": "training",
                                        "text": "No thanks",
                                        "type": "button",
                                        "value": "no"
                                    }
                                ]
                            }
                        ]
                    }

                    webhook.send(message, (err, header, statusCode, body)=> {
                      if (err) {
                        console.log('Error:', err);
                      } else {
                        console.log('Received', statusCode, 'from Slack');
                      }
                    });

                    // rtm.sendMessage(message, channel);
                }
            });
        }
    }
});

// Handle errors (see `errorCodes` export)
slackEvents.on('error', console.error);

slackMessages.action('train_me', (payload) => {
    // `payload` is JSON that describes an interaction with a message.
    console.log(`The user ${payload.user.name} in team ${payload.team.domain} pressed the ${payload.actions[0].name} button`);

    // The `actions` array contains details about the specific action (button press, menu selection, etc.)
    const action = payload.actions[0];
    console.log(`The button had name ${action.name} and value ${action.value}`);

    // You should return a JSON object which describes a message to replace the original.
    // Note that the payload contains a copy of the original message (`payload.original_message`).
    let replacement = payload.original_message;
    // Typically, you want to acknowledge the action and remove the interactive elements from the message
    replacement.text =`Got it, thanks @${payload.user.name}!`;
    delete replacement.attachments;
    return replacement;
});

// Start a basic HTTP server
// slackEvents.start(port).then(() => {
//   console.log(`server listening on port ${port}`);
// });

// Start the express application
http.createServer(app).listen(port, () => {
  console.log(`server listening on port ${port}`);
});
