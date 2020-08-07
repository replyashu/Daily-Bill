'use strict';
const AWS = require('aws-sdk');
const Alexa = require("alexa-sdk");
const lambda = new AWS.Lambda();
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const uuid = require('uuid');
exports.handler = function(event, context, callback) {
const alexa = Alexa.handler(event, context);
alexa.appId = "amzn1.ask.skill.6da75d9d-b687-4663-acdc-9bee50a29b4f";
alexa.registerHandlers(handlers);
alexa.execute();
};

var amount = 0;
var category = "";

const handlers = {
'LaunchRequest': function() {
this.emit(':ask', 'Hey there and Welcome to Daily Bills. I can do a couple of things: Add an bill, delete an bill, get bills and update bill. Let me know how I can help', 'Please say that again?');
},
'Unhandled': function() {
this.emit('AMAZON.HelpIntent');
},
'AddExpense': function() {
 amount = this.event.request.intent.slots.Amount.value;
 category = this.event.request.intent.slots.Category.value;
var timestamp = new Date().getTime();
var userId = this.event.context.System.user.userId;
if ((typeof(amount) != "undefined") || (typeof(category) != "undefined")) {
console.log("\n\nLoading handler\n\n");
const dynamodbParams = {
TableName: process.env.DYNAMODB_TABLE_EXPENSES,
Item: {
id: uuid.v4(),
userId: userId,
amount: amount,
category: category,
createdAt: timestamp,
updatedAt: timestamp,
},
};
const params = {
TableName: process.env.DYNAMODB_TABLE_EXPENSES,
FilterExpression: 'category = :this_category',
ExpressionAttributeValues: {
':this_category': category
}
};
console.log('Attempting to get bill', params);
dynamoDb.scan(params).promise()
.then(data => {
console.log('Got bill: ' + JSON.stringify(data), params);
const self = this;
const item = data.Items[0];
if (!item) {
dynamoDb.put(dynamodbParams).promise()
.then(data => {
console.log('Bill added: ', dynamodbParams);
this.emit(':ask', 'Added Rs' + amount + ' for ' + category + '. You can check an bill, delete a bill or update one. You choose.');
})
.catch(err => {
console.error(err);
this.emit(':tell', 'Hey, hey, hey, we have a problem.');
});
} else {
this.emit(':ask', 'A bill already exists for ' + category + ' .Perhaps you would like to update the bill?')
}
})
}
},
'GetExpense': function() {
var category = this.event.request.intent.slots.Category.value;
if ((typeof(category) != "undefined")) {
console.log("\n\nLoading handler\n\n");
const params = {
TableName: process.env.DYNAMODB_TABLE_EXPENSES,
FilterExpression: 'category = :this_category',
ExpressionAttributeValues: {
':this_category': category
}
};
console.log('Attempting to get bill', params);
const self = this;
dynamoDb.scan(params, function(err, data) {
const item = data.Items[0];
if (!item) {
self.emit(':ask', 'Sorry, We cant find that bill. Try again with another bill or add a new one.');
}
if (item) {
console.log("DEBUG:  Getitem worked. ");
self.emit(':ask', 'You put down Rs' + data.Items[0].amount + ' for ' + data.Items[0].category + '. Is there anything else I can help with?');
}
});
} else {
this.emit('NoMatch')
}
},
'DeleteExpense': function() {
var category = this.event.request.intent.slots.Category.value;
const {
userId
} = this.event.session.user;
console.log(userId)
console.log(category)
if ((typeof(category) != "undefined")) {
console.log("\n\nLoading handler\n\n");
const params = {
TableName: process.env.DYNAMODB_TABLE_EXPENSES,
FilterExpression: 'category = :this_category',
ExpressionAttributeValues: {
':this_category': category
}
};
console.log('Attempting to get bill', params);
dynamoDb.scan(params).promise()
.then(data => {
console.log('Got bill: ' + JSON.stringify(data), params);
const self = this;
const item = data.Items[0];
if (!item) {
self.emit(':ask', 'Sorry, We cant delete bill because it does not exist. Try again with another bill or add a new one.');
}
if (item) {
console.log('Attempting to delete data', data);
const newparams = {
TableName: process.env.DYNAMODB_TABLE_EXPENSES,
Key: {
id: data.Items[0].id,
createdAt: data.Items[0].createdAt
}
};
console.log(newparams)
dynamoDb.delete(newparams, function(err, data) {
if (err) {
console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
self.emit(':tell', 'Oopsy daisy, something went wrong.');
} else {
console.log("DEBUG:  deleteItem worked. ");
self.emit(':ask', 'So, i have deleted the bill with category ' + category + ' . Wanna do anything else?');
}
});
}
})
}
},
'UpdateExpense': function() {
var category = this.event.request.intent.slots.Category.value;
var amount = this.event.request.intent.slots.Amount.value;
console.log(category)
console.log(amount)
if ((typeof(category) != "undefined") || (typeof(amount) != "undefined")) {
console.log("\n\nLoading handler\n\n");
const params = {
TableName: process.env.DYNAMODB_TABLE_EXPENSES,
FilterExpression: 'category = :this_category',
ExpressionAttributeValues: {
':this_category': category
}
};
console.log('Attempting to get bill', params);
dynamoDb.scan(params).promise()
.then(data => {
console.log('Got bill: ' + JSON.stringify(data), params);
const self = this;
let newamount;
const item = data.Items[0];
if (!item) {
self.emit(':ask', 'Sorry, we cant update that bill because it does not exist. Try again with another bill or add a new one.');
}
if (item) {
console.log('Attempting to update data', data);
newamount = parseInt(amount, 10) + parseInt(data.Items[0].amount, 10)
console.log(newamount)
const newparams = {
TableName: process.env.DYNAMODB_TABLE_EXPENSES,
Key: {
id: data.Items[0].id,
createdAt: data.Items[0].createdAt
},
UpdateExpression: "set amount = :newamount",
ExpressionAttributeValues: {
":newamount": newamount,
},
ReturnValues: "UPDATED_NEW"
};
console.log(newparams)
dynamoDb.update(newparams, function(err, data) {
if (err) {
console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
self.emit(':tell', 'Oopsy daisy, Beda gark, something went wrong.');
} else {
console.log("DEBUG:  updateItem worked. ");
self.emit(':ask', 'Bill ' + category + ' has been updated to Rs' + newamount + ' . Wanna do anything else?');
}
});
}
})
}
},
'AMAZON.YesIntent': function() {
this.emit('Prompt');
},
'AMAZON.NoIntent': function() {
this.emit('AMAZON.StopIntent');
},
'AMAZON.RepeatIntent': function() {
this.emit(':ask', 'Hey there and Welcome to Daily Bills. I can do a couple of things: Add an bill, delete an bill, get bills and update bill. Let me know how I can help', 'Please say that again?');
},
'AMAZON.StartOverIntent': function() {
this.response.shouldEndSession(false, "What bill do you want to add today?");
},
'Prompt': function() {
console.log(category)
console.log(amount)
if ((typeof(category) != "undefined") || (typeof(amount) != "undefined")) {
console.log("\n\nLoading handler\n\n");
const params = {
TableName: process.env.DYNAMODB_TABLE_EXPENSES,
FilterExpression: 'category = :this_category',
ExpressionAttributeValues: {
':this_category': category
}
};
console.log('Attempting to get bill', params);
dynamoDb.scan(params).promise()
.then(data => {
console.log('Got bill: ' + JSON.stringify(data), params);
const self = this;
let newamount;
const item = data.Items[0];
if (!item) {
self.emit(':ask', 'Sorry, we cant update that bill because it does not exist. Try again with another bill or add a new one.');
}
if (item) {
console.log('Attempting to update data', data);
newamount = parseInt(amount, 10) + parseInt(data.Items[0].amount, 10)
console.log(newamount)
const newparams = {
TableName: process.env.DYNAMODB_TABLE_EXPENSES,
Key: {
id: data.Items[0].id,
createdAt: data.Items[0].createdAt
},
UpdateExpression: "set amount = :newamount",
ExpressionAttributeValues: {
":newamount": newamount,
},
ReturnValues: "UPDATED_NEW"
};
console.log(newparams)
dynamoDb.update(newparams, function(err, data) {
if (err) {
console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
self.emit(':tell', 'Oopsy daisy, Beda gark, something went wrong.');
} else {
console.log("DEBUG:  updateItem worked. ");
self.emit(':ask', 'Bill ' + category + ' has been updated to Rs' + newamount + ' . Wanna do anything else?');
}
});
}
})
}
},
'PromptGet': function() {
this.emit(':ask', 'Please tell me what bill you would like to check', 'Please say that again?');
},
'NoMatch': function() {
this.emit(':ask', 'Sorry, I couldn\'t understand.', 'Please say that again?');
},
'AMAZON.HelpIntent': function() {
const speechOutput = 'This skill helps you in keeping the track of your bills.You can say "1000 for Travel" to add a bill or "paid bill for travel" to delete the existing bill. which one would you like to do?';
const reprompt = 'Say hello, to hear me speak.';
this.response.speak(speechOutput).listen(reprompt);
this.emit(':responseReady');
},
'AMAZON.CancelIntent': function() {
this.response.speak('Goodbye!');
this.emit(':responseReady');
},
'AMAZON.StopIntent': function() {
this.response.speak('See you later!');
this.emit(':responseReady');
}
};