// This should be your webook URL from Slack Incoming Webhooks
const webhookUrl = process.env.SLACK_WEBHOOK_URL;

const https = require("https");

function postRequest(data) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const options = {
      host: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Log the data being sent to Slack
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        console.log('Slack response body:', responseBody);
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error(`Slack request error log: ${JSON.stringify(responseBody)}`);
          return reject(`Slack request failed with status code: ${res.statusCode}`);
        }
        resolve(`Slack status: ${res.statusCode}`);
      });
    });

    req.on('error', (e) => {
      reject(`Request failed: ${e.message}`);
    });

    req.write(JSON.stringify(data));
    req.end();
  })
}

exports.handler = async (event) => {
  try {
    // Defensive checks to avoid undefined errors
    if (!event.Records || !event.Records[0]?.Sns?.Message) {
      console.error("Missing SNS Message in event");
      return;
    }

    const snsMessageRaw = event.Records[0].Sns.Message;
    const timestamp = new Date(event.Records[0].Sns.Timestamp).getTime() / 1000;

    const message = typeof snsMessageRaw === "string"
      ? snsMessageRaw.replace(/^"|"$/g, "") // remove leading/trailing quotes if needed
      : JSON.stringify(snsMessageRaw);

    let color = "info";
    if (message.includes("FAILED")) {
      color = "danger";
    } else if (message.includes("SUCCEED")) {
      color = "good";
    }

    const slackMessage = {
      attachments: [
        {
          color,
          text: message,
          ts: timestamp,
        },
      ],
    };

    const result = await postRequest(slackMessage);
    console.log("Slack notification sent:", result);

  } catch (err) {
    console.error("Lambda Error:", err);
  }
}
