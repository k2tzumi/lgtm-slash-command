[![clasp](https://img.shields.io/badge/built%20with-clasp-4285f4.svg)](https://github.com/google/clasp)
![ci](https://github.com/k2tzumi/lgtm-slash-command/workflows/ci/badge.svg)

What is this?
==============================

 This bot executes the slack slash command and generates LGTM images.  
 This bot runs as a web app within a Google app script.  
You can make this bot work by registering it as a request URL for the [Slack API](https://api.slack.com/apps) slash command.
 
Slack slash command
--------------------

* When creating LGTM images  
```
/lgtm [word|url]
```


REQUIREMENTS
--------------------
- `npm`
- [clasp](https://github.com/google/clasp)
`npm install -g @google/clasp`
- [apps-script-jobqueue](https://github.com/k2tzumi/apps-script-jobqueue)
- `make`
- GAS Library
  - [OAuth2](https://github.com/googleworkspace/apps-script-oauth2)
  - [JobBroker](https://github.com/k2tzumi/apps-script-jobqueue)
- [Cloudinary](https://cloudinary.com/)  
Note: You want to use either CLOUDINARY for the convert images processing.  
Cloudinary provides free starter account, to get yours signup [here](https://cloudinary.com/invites/lpov9zyyucivvxsnalc5/w9frhigoqsj7nhf3umug).

USAGE
--------------------

To use it, you need to set up Google apps scripts, Custom Search API, Cloudinary and Slack API.

### Install Google apps scripts

1. Enable Google Apps Script API  
https://script.google.com/home/usersettings
2. make push  
3. make deploy  
4. Grant the necessary privileges  
make open  
Publish > Deploy as web app.. > Update  
Grant access

The URL of the current web app after deployment will be used as the request URL for the OAuth authentication screen and Slack message action.

### Register with the Slack API

* Create New App  
https://api.slack.com/apps  
Please make a note of `App Credentials` displayed after registration.

### Setting Script properties

In order to run the application and change its behavior, you need to set the following Google Apps scripts property.

|Property name|Required|Setting Value|Description|
|--|--|--|--|
|VERIFICATION_TOKEN|○|Basic Information > App Credentials > Verification Token|A token that easily authenticates the source of a hooked request|
|CLIENT_ID|○|Basic Information > App Credentials > Client ID|Use with OAuth|
|CLIENT_SECRET|○|Basic Information > App Credentials > Client Secret|Use with OAuth|
|USER_TOKEN|-|Basic Information > App Credentials > Client Secret|Specify if you want the URL of the uploaded file to be an external public link.|
|GOOGLE_API_KEY|○|[Create Credentials](https://console.cloud.google.com/apis/credentials)||
|CUSTOM_SEARCH_ENGINE_ID|○|Enabling the Custom Search API. Getting the Custom Search Engine (CSE)||
|SEARCH_RIGHTS||https://wiki.creativecommons.org/wiki/CC_Search_integration#Google_Web_Search
default: `(cc_publicdomain|cc_attribute|cc_sharealike|cc_nonderived)`|Specify the license of the search image|
|CLOUDINARY_API_KEY|○|[Settings > Security](https://cloudinary.com/console/lui/settings/security)|Access Keys: API Key|
|CLOUDINARY_API_SECRET|○|[Settings > Security](https://cloudinary.com/console/lui/settings/security)|Access Keys: API Secret|

1. Open Project  
`$ make open`
2. Add Scirpt properties  
File > Project properties > Scirpt properties > Add row  
Setting Property & Value

### OAuth Authentication

#### Settings OAuth & Permissions

* Redirect URLs  
`Add New Redirect URL` > Add Redirect URL  > `Save URLs`  
ex) https://script.google.com/macros/s/miserarenaiyo/usercallback  
You can check the Redirect URL in the following way. The `RedirectUri` of the displayed page.  
`$ make application`  
* Bot Token Scopes  
Click `Add an OAuth Scope` to select the following permissions  
  * [commands](https://api.slack.com/scopes/commands)
  * [users:read](https://api.slack.com/scopes/users:read)
  * [chat:write](https://api.slack.com/scopes/chat:write)
  * [files:write](https://api.slack.com/scopes/files:write)


* Install App to Workspace  
You must specify a destination channel that bot can post to as an app.

### Install App to Workspace

1. Open web application  
`$ make application`  
The browser will be launched with the following URL:  
example) https://script.google.com/macros/s/miserarenaiyo/exec  
2. Click `Authorize.`  
You must specify a destination channel that bot can post to as an app.
3. Click `Allow`  
The following message is displayed when OAuth authentication is successful  
```
Success!
Setting EventSubscriptions
Setting Slash Commands
Setting Interactivity & Shortcuts
```
When prompted, click the `Setting Slash Commands` to set up an Slash Commands.  


### Settings Slash Commands

* Create New Command  
Setting Request URL.  
For example) https://script.google.com/macros/s/miserarenaiyo/exec  
