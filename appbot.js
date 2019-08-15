const express = require('express')
const bodyParser = require('body-parser')
const request = require('request');
const hdb = require('hdb');

const app = express()
const port = 8083
app.use(bodyParser.json())

//https://appnode-demo-p2000517229trial.cfapps.eu10.hana.ondemand.com/


function HanaDB() {
	var client = hdb.createClient({
		host: '',
		port: 30015,
		user: '',
		password: ''
	});
	client.on('error', function(err) {
		console.error('Network connection error', err);
	});
	return client;
}
let dbclient = null;

function sendTextReply(res, msg) {
    res.send({
        replies: [{
            type: 'text',
            content: msg
        }],
        conversation: {
            memory: {
                key: "Null"
            }
        }
    });
};

function sendQuickReply(res, msg, memkey) {
    res.send({
		replies: [{
			type: "quickReplies",
            content: {
				title: msg,
				buttons: [{ title: "Yes", value: "Yes" }, { title: "No", value: "No"} ]
			}
        }],
        conversation: {
			memory: {
				key: memkey
            }
        }
    });
};

function sendButtonReply(res, msg, title, linkvalue) {
    res.send({
        replies: [{
			type: 'buttons',
            content: {
				title: msg,
				buttons: [
				{
				  title: title,
				  type: "web_url",
				  value: linkvalue
				}
			  ]
			}
        }],
        conversation: {
			memory: {
				key: "Null"
            }
        }
    });
};

app.post('/', (req, res) => {

    let slug = req.body.nlp.intents[0].slug;
    console.log("slug: " + slug);

    //Question: Show me top 10 routes with high actual variances 
	if (slug === "routes_variances") {

        let entities = req.body.nlp.entities;
		let number = 0;
        if(entities.hasOwnProperty("number")) {
			number = entities.number[0].scalar;
		}
        let hav = entities.hav[0].value;

		if(number > 0) {
			dbclient.connect(function(err) {
				if (err) {
					return console.error('Connect error', err);
				}
				dbclient.exec('select top ' + number + ' ROUTE_NUMBER from "_SYS_BIC"."DEV.PREDICTIVE_POC.SHIPMENT_LEAD_TIME.INTEGRATION/CV_060_SHIPMENT_LEAD_TIME_PHASE_2"', function(err, rows) {
					dbclient.end();
					if (err) {
						sendTextReply("Execute error: " + err);
					} else {
						let msg = "";				
						for (let i = 0; i < rows.length; i++) {
							msg = msg + rows[i].ROUTE_NUMBER + ", ";
						}
						msg = msg.substring(0, msg.length - 2);

						sendQuickReply(res, "Here is the list: " + msg + ".\n\nWould you like me to take you to the dashboard ?", "routes_variances");
					}
				});
			});
		}        
    } 

	//Question: Show me predictions for the route 
	else if(slug === "routes_prediction") {
		sendTextReply(res, "Here is the comparison for the first leg lead time :Estimated Vs Predicted");
	}

	//Question: What are the factors that were used for prediction ? 
	else if(slug === "factors_prediction") {
		sendQuickReply(res, "Destination, Shipment Quantity in SKU, LC Plant, Brand Leg 1 Lane e.g. \"Freiburg im Breisgau-Memphis\",  \"Freiburg-Genk\", \"Freiburg in Breisgau-Budaors\", Leg 1 Forwarded from HC e.g. \"DHL Global Forwarding\", Year End Flag.\n\nWould you like to update the route master ?", "factors_prediction");
	}

	//Postback for Yes / No quick reply
	else if(slug === "yesno") {
		if(req.body.conversation.memory.key === "routes_variances") {
			if(req.body.nlp.source === "Yes") {
				sendButtonReply(res, "Open SAC dashboard", "SAC Dashboard", "https://www.google.com");
			}

			if(req.body.nlp.source === "No") {
				sendTextReply(res, "What else I can help you with ?");
			}
		}

		if(req.body.conversation.memory.key === "factors_prediction") {
			if(req.body.nlp.source === "Yes") {
				sendButtonReply(res, "Open ZPMON", "ZPMON", "https://www.google.com");
			}

			if(req.body.nlp.source === "No") {
				sendTextReply(res, "What else I can help you with ?");
			}
		}
	} 
})

app.post('/errors', (req, res) => {
    console.log(req.body)
    res.send()
})

app.get('/', (req, res) => {
    console.log(req.body)
    res.send("OK")
})


function Main() {
    app.listen(port, () => {
        console.log('Server is running on port ' + port)
    })
	dbclient = HanaDB();
}
Main();



/*
dbclient = HanaDB();
dbclient.connect(function(err) {
			if (err) {
				return console.error('Connect error', err);
			}
			dbclient.exec('select top 5 ROUTE_NUMBER from "_SYS_BIC"."DEV.PREDICTIVE_POC.SHIPMENT_LEAD_TIME.INTEGRATION/CV_060_SHIPMENT_LEAD_TIME_PHASE_2"', function(err, rows) {
				dbclient.end();
				if (err) {
					return console.error('Execute error:', err);
				}
				//console.log('Results:', rows);
				//console.log('length:', rows.length);

				let msg = "";
				
				for (let i = 0; i < rows.length; i++) {
					msg = msg + rows[i].ROUTE_NUMBER + ", ";
				}
				msg = msg.substring(0, msg.length - 2);
				console.log(msg);
			});
		});
		*/
