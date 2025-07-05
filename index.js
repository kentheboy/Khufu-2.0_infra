// This should be your webook URL from Slack Incoming Webhooks
const webhookUrl = process.env.SLACK_WEBHOOK_URL || process.argv[3];

const https = require("https");

function postRequest(data) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const options = {
      host: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };

    // Log the data being sent to Slack
    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.error(
            `Slack request error log: \n${JSON.stringify(responseBody)}`
          );
          return reject(
            `Slack request failed with status code: ${res.statusCode}`
          );
        }
        resolve(`Slack status: ${res.statusCode}`);
      });
    });

    req.on("error", (e) => {
      reject(`Request failed: ${e.message}`);
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

function messageBuilder(event) {
  const snsMessageRaw = JSON.parse(event.Records[0].Sns.Message);
  const timestamp = new Date(event.Records[0].Sns.Timestamp).getTime() / 1000;

  console.log("Row message:", JSON.stringify(snsMessageRaw));
  
  const branch = snsMessageRaw.detail.branchName;
  const status = snsMessageRaw.detail.jobStatus;
  let link;
  if (!branch) {
    link = `https://${process.env.WEB_DOMAIN}`;
  } else {
    if (branch === "develop") {
        link = `https://dev.${process.env.WEB_DOMAIN}`;
    } else {
        link = `https://${branch}.${snsMessageRaw.detail.appId}.amplifyapp.com`;
    }    
  }

  let message = null;
  switch (status) {
    case "STARTED":
      message = {
        attachments: [
          {
            color: "#439FE0",
            pretext: "Release Started",
            title: "Deployment Notification",
            text: `Branch: ${branch}\nStatus: STARTED\n${link}`,
            ts: timestamp
          }
        ]
      };
      return message;
    case "FAILED":
      message = {
        attachments: [
          {
            color: "danger",
            pretext: "⚠️ Release Failed",
            title: "Deployment Notification",
            text: `Branch: ${branch}\nStatus: FAILED\n${link}`,
            fields: [
              {
                title: "Error Details",
                value: `\`\`\`${JSON.stringify(snsMessageRaw)}\`\`\``,
                short: false
              }
            ],
            ts: timestamp
          }
        ]
      };
      return message;
    case "SUCCEED":
      message = {
        attachments: [
          {
            color: "good",
            pretext: "✅ Release Succeeded 🎉 1️⃣⬆️",
            title: "Deployment Notification",
            text: `Branch: ${branch}\nStatus: SUCCEED\n${link}`,
            ts: timestamp
          }
        ]
      };
      return message;
    default:
      return { text: "Build status unknown" };
  }
}

exports.handler = async (event) => {
  try {
    // Defensive checks to avoid undefined errors
    if (!event.Records || !event.Records[0]?.Sns?.Message) {
      console.error("Missing SNS Message in event");
      return;
    }

    const slackMessage = await messageBuilder(event);

    const result = await postRequest(slackMessage);
    console.log("Slack notification sent:", result);
  } catch (err) {
    console.error("Lambda Error:", err);
  }
};
