import { Slack } from "./slack/types/index.d";
import { SlackHandler } from "./SlackHandler";
import { SlashCommandFunctionResponse } from "./SlashCommandHandler";
import { OAuth2Handler } from "./OAuth2Handler";
import { SlackWebhooks } from "./SlackWebhooks";
import { DuplicateEventError } from "./CallbackEventHandler";
import { CustomImageSearchClient, ImageItem } from "./CustomImageSearchClient";
import { CloudinaryClient, UploadResponse } from "./CloudinaryClient";
import { SlackApiClient, File, NotInChannelError } from "./SlackApiClient";
// import * from "apps-script-jobqueue";

type TextOutput = GoogleAppsScript.Content.TextOutput;
type HtmlOutput = GoogleAppsScript.HTML.HtmlOutput;
type DoPost = GoogleAppsScript.Events.DoPost;
type DoGet = GoogleAppsScript.Events.DoGet;
type Commands = Slack.SlashCommand.Commands;

const asyncLogging = (): void => {
  JobBroker.consumeAsyncJob((parameter: Record<string, any>) => {
    console.info(JSON.stringify(parameter));
  }, "asyncLogging");
};

const properties = PropertiesService.getScriptProperties();
const CLIENT_ID: string = properties.getProperty("CLIENT_ID") || "";
const CLIENT_SECRET: string = properties.getProperty("CLIENT_SECRET") || "";
let handler: OAuth2Handler;

const handleCallback = (request: DoGet): HtmlOutput => {
  initializeOAuth2Handler();
  return handler.authCallback(request);
};

function initializeOAuth2Handler(): void {
  handler = new OAuth2Handler(
    CLIENT_ID,
    CLIENT_SECRET,
    PropertiesService.getUserProperties(),
    handleCallback.name
  );
}

/**
 * Authorizes and makes a request to the Slack API.
 * @param {DoGet} request
 * @returns {HtmlOutput}
 */
function doGet(request: DoGet): HtmlOutput {
  initializeOAuth2Handler();

  // Clear authentication by accessing with the get parameter `?logout=true`
  if (request.parameter.hasOwnProperty("logout")) {
    handler.clearService();
    const template = HtmlService.createTemplate(
      'Logout<br /><a href="<?= requestUrl ?>" target="_blank">refresh</a>.'
    );
    template.requestUrl = handler.requestURL;
    return HtmlService.createHtmlOutput(template.evaluate());
  }

  if (handler.verifyAccessToken()) {
    return HtmlService.createHtmlOutput("OK");
  } else {
    const template = HtmlService.createTemplate(
      'RedirectUri:<?= redirectUrl ?> <br /><a href="<?= authorizationUrl ?>" target="_blank">Authorize</a>.'
    );
    template.authorizationUrl = handler.authorizationUrl;
    template.redirectUrl = handler.redirectUri;
    return HtmlService.createHtmlOutput(template.evaluate());
  }
}

const VERIFICATION_TOKEN: string =
  properties.getProperty("VERIFICATION_TOKEN") || "";

/**
 * execute post method.
 * @param {DoPost} e
 * @returns {TextOutput}
 */
function doPost(e: DoPost): TextOutput {
  initializeOAuth2Handler();
  const slackHandler = new SlackHandler(VERIFICATION_TOKEN);

  slackHandler.addCommandListener(
    e.parameter.command ?? "/lgtm",
    executeSlashCommand
  );

  try {
    const process = slackHandler.handle(e);

    if (process.performed && process.output) {
      return process.output;
    }
  } catch (exception) {
    if (exception instanceof DuplicateEventError) {
      return ContentService.createTextOutput();
    } else {
      JobBroker.enqueueAsyncJob(asyncLogging, {
        message: exception.message,
        stack: exception.stack
      });
      throw exception;
    }
  }

  throw new Error(`No performed handler, request: ${JSON.stringify(e)}`);
}

function executeSlashCommand(commands: Commands): SlashCommandFunctionResponse {
  const locale = getLocale(commands.user_id);

  switch (commands.text) {
    case "":
    case "help":
      return createUsageResponse(commands.command, locale);
    default:
      JobBroker.enqueueAsyncJob(executeCommandLgtm, { commands, locale });

      switch (locale) {
        case "ja-JP":
          return {
            response_type: "ephemeral",
            text: "しばらくお待ちください。"
          };
        case "en-US":
        default:
          return {
            response_type: "ephemeral",
            text: "Please wait."
          };
      }
  }
}

function getLocale(user_id: string): string | undefined {
  const client = new SlackApiClient(handler.token);
  const user = client.usersInfo(user_id);

  return user.locale;
}

function createUsageResponse(
  command: string,
  locale?: string
): SlashCommandFunctionResponse {
  switch (locale) {
    case "ja-JP":
      return {
        response_type: "ephemeral",
        text: `*使い方*\n* ${command} [url|検索ワード]\n* ${command} help`
      };
    case "en-US":
    default:
      return {
        response_type: "ephemeral",
        text: `*Usage*\n* ${command} [url|word]\n* ${command} help`
      };
  }
}

const executeCommandLgtm = (): void => {
  initializeOAuth2Handler();
  JobBroker.consumeAsyncJob(
    ({ commands, locale }: { commands: Commands; locale: string }) => {
      try {
        const match = commands.text.match(
          new RegExp("((https?|ftp)(://[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+))")
        );

        let url = match
          ? match[0]
          : pickupImage(executeSearch(commands.text, locale)).link;
        const upload = transformLgtm(url);
        const file = fileUpload(
          commands.channel_id,
          upload.secure_url,
          upload.original_filename,
          upload.format,
          `Source: ${url}`,
          `![LGTM](${url})`
        );
        // Timestamp for initial_comment on file upload
        const ts = file.shares.public[commands.channel_id][0].ts;
        url = file.url_private;

        try {
          url = createExternalLink(file.id);
        } catch (e) {
          console.warn("createExternalLinkb fail.", e);
        }

        changeFileComment(commands.channel_id, ts, `![LGTM](${url})`);

        // delete LGTM (original) image
        createCloudinaryClient().destroy(upload.public_id);
      } catch (e) {
        const webhook = new SlackWebhooks(commands.response_url);
        if (e instanceof NotInChannelError) {
          const botUserId = getBotUserId();
          webhook.invoke({
            response_type: "ephemeral",
            text: `Invite <@${botUserId}> to join #${commands.channel_name}\n\`/invite <@${botUserId}> #${commands.channel_name}\`⏎`
          });
        } else {
          webhook.invoke({
            response_type: "ephemeral",
            text: "Oops! Something went wrong. :sob:"
          });
          console.trace()
          console.error(
            `message: ${e.message}, stack: ${JSON.stringify(e.stack)}`
          );
        }
      }
    },
    "executeCommandLgtm"
  );
};

function getBotUserId(): string {
  return new SlackApiClient(handler.token).authTest().user_id;
}

function changeFileComment(channel_id: string, ts: string, comment: string) {
  new SlackApiClient(handler.token).chatUpdate(channel_id, ts, comment);
}

const USER_TOKEN: string = properties.getProperty("USER_TOKEN") || "";

function createExternalLink(fileID: string): string {
  const client = new SlackApiClient(USER_TOKEN);
  const file = client.filesSharedPublicURL(fileID);

  const pubSecret = file.permalink_public.split("-").pop();

  return `${file.url_private}?pub_secret=${pubSecret}`;
}

const CLOUDINARY_CLOUD_NAME =
  properties.getProperty("CLOUDINARY_CLOUD_NAME") || "";
const CLOUDINARY_API_KEY = properties.getProperty("CLOUDINARY_API_KEY") || "";
const CLOUDINARY_API_SECRET =
  properties.getProperty("CLOUDINARY_API_SECRET") || "";

function createCloudinaryClient(): CloudinaryClient {
  return new CloudinaryClient(
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET
  );
}

function transformLgtm(url: string): UploadResponse {
  const origin = createCloudinaryClient().upload(url, {
    transformation: "c_limit,w_400,h_400",
    colors: true
  });

  const color = complementaryColor(origin.colors?.flat()[0]);

  const transformation = `co_rgb:ffff,l_text:Helvetica_70_bold_underline_letter_spacing_30:LGTM/co_gray,e_shadow,x_5,y_5/fl_layer_apply/g_center,y_50,co_rgb:${color},l_text:arial_25:Looks%20good%20to%20me,o_90`;

  origin.secure_url = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformation}/${origin.public_id}.${origin.format}`;

  return origin;
}

function complementaryColor(color: string): string {
  const rgb = color
    .slice(1)
    .match(/.{2}/g)
    ?.map<number>(c => parseInt(c, 16));

  if (rgb) {
    const sum = Math.max(...rgb) + Math.min(...rgb);
    return rgb
      .map(c => (sum - c).toString(16))
      .map(c => ("00" + c).slice(-2))
      .join("");
  }

  return "ffffff";
}

function fileUpload(
  channels: string,
  url: string,
  filename: string,
  filetype: string,
  title: string,
  initial_comment: string
): File {
  const client = new SlackApiClient(handler.token);
  const blob = UrlFetchApp.fetch(url).getBlob();

  return client.filesUpload(
    channels,
    blob,
    filename,
    filetype,
    title,
    initial_comment
  );
}

const GOOGLE_API_KEY = properties.getProperty("GOOGLE_API_KEY") || "";
const CUSTOM_SEARCH_ENGINE_ID =
  properties.getProperty("CUSTOM_SEARCH_ENGINE_ID") || "";
const SEARCH_RIGHTS =
  properties.getProperty("SEARCH_RIGHTS") ||
  "(cc_publicdomain|cc_attribute|cc_sharealike|cc_nonderived)";

function executeSearch(word: string, locale: string): ImageItem[] {
  const cient = new CustomImageSearchClient(
    GOOGLE_API_KEY,
    CUSTOM_SEARCH_ENGINE_ID,
    locale,
    SEARCH_RIGHTS
  );

  return cient.search(word);
}

function pickupImage(images: ImageItem[]): ImageItem {
  const pickup: number = Math.floor(Math.random() * images.length);
  return images[pickup];
}

export { doPost, executeSlashCommand, executeCommandLgtm };
