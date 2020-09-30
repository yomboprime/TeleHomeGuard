
# TeleHomeGuard

Surveillance software based on Telegram for notifications and sending videos and photos.

Characteristics:

	- Several USB cameras.
	- Motion detection, sends notifications and continuous recording (divided in video files of up to 5 minutes each)
	- Instant Snapshots.
	- Turn on and off the cameras from Telegram.
	- Restart, power off and update system and program from Telegram.
	- Free and without local server.
	- Works in Raspberry Pi.

## Supported operatin systems

Though this software has been tested only in GNU/Linux (amd64 and arm64), all dependencies are multiplatform, so it should work on other systems. However, the "Restart computer" and "Update system" options will not work on "non *nix" systems.

In other operating systems you will have to install nodejs with npm, the OpenCV library and Git separately. After that, continue with the step "Download this repository and install dependencies".

## Supported hardware

This software has been tested on a powerful PC and on a Raspberry Pi 4 GB.

The camera/s can be USB2 or USB3.

## PC Installlation

Follow the instructions for Raspberry Pi, and the operating system can be any GNU/Linux distro.

## Raspberry Pi 2, 3, and 4 Installation

Instala Raspberry OS. Configure the password and WiFi (unless you are connecting via Ethernet cable):

	https://ubuntu.com/download/raspberry-pi

Install requirements (it will take a while) Execute in the console this commands:

	$ sudo apt update
	$ sudo apt install build-essential cmake npm nodejs git libavformat-dev v4l-utils ffmpeg libv4l-0

Download this repository and install dependencies (the last command will take a while)

	$ git clone https://github.com/yomboprime/TeleHomeGuard.git
	$ cd TeleHomeGuard
	$ mkdir capture
	$ mkdir stillImages
	$ npm install

Make the program start at system init (optional):

First check if the file ```/etc/rc.local``` already exists:

		ls /etc/rc.local

	If it doesn't exist, copy the one from the repository:

		$ sudo cp config/rc.local /etc

	If it does exist, copy the contents of ```config/rc.local``` (except the first line) to the end of the file ```/etc/rc.local```

Finally, create the configuration file TeleHomeGuard/config/config.json and copy this conmtents to it:

	{
		"languageCode": "es",
		"translationEncodingAlias": "utf8",
		"numberOfCameras": 1,
		"camerasFPS": 10,
		"maxVideoDurationSeconds": 300,
		"numFramesAfterMotion": 50,
		"motionDetectionPercent": 1.2,
		"pixelDifferenceThreshold": 12,
		"captureVideosPath": "./capture/",
		"captureStillImagesPath": "./stillImages/",
		"diskQuota": 50000000000,
		"intruderAlert": true,
		"showRestartAppOption": true,
		"showUpdateSystemOption": true
	}

In this file you can change some opions which are not in the Telegram main menu (this needs the program to b restarted). For example, you can change the "diskQuota" value, by default set to 50 gigabytes (this limit is adequate for a 64 gb MicroSD in the Raspberry)

## Hardware configuration

Simply plug the USB cameras to the computer that contains the bot program.

## Manually running the Telegram bot

If you have configured the bot to start automatically when the system starts (see installation instructions), you can power the computer and after initialization it will start sending notifications. However, the first time you should run the program manually, to obtain your Telegram id, as is explained in the next section "Using the Telegram bot"

The bot program needs Internet access for Telegram, but it won't create a server (it doesn't open ports)

Th bot will be accessible from Telegram clients while the program is running.

To run it do the following:

	$ cd TeleHomeGuard
	$ npm start

To stop the bot from console, press ```Control + C```

# Using the Telegram bot

You can use any Telegram client to access the bot. You can install the Telegram mobile app or in your PC:

	https://telegram.org

First you must create a Telegram bot (it is done by opening a private chat with BotFather and sending it commands)

	https://core.telegram.org/bots/api

It is convenient that you disable (if it is not already) the bot ability to join Telegram groups.

Once you have the access token for the bot, create the file ```TeleHomeGuard/config/token```(without extension) and copy the token in it. Keep the token safely stored, because it gives full access to the bot API (but not to your Telegram account) You don't need to change the token again unless you feel its security has been compomised.

Once you have the bot created:

	- Run the bot program manually as described in the previous section.
	- Open a private chat with the bot and press the start button. In the console you will see a line indicating your Telegram nick and name, and what is worth, your Telegram id number.
	- Create the file ```TeleHomeGuard/config/chat_id``` (without extension) and copy your Telegram id in it, so only you can access the Telegram bot. Restart the program and it is ready for use.

To access the bot, you simply will see the notifications in your private chat with the bot. When there is motion in the cameras you will receive a notification and the video file/s, up tyo 5 minutes each. While there is motion the videos will be sent continuously, so this program is not useful for exterior environments, where the vegetation or climate could make the detection unusable.

Besides the notifications, the bot has also a complete menu. To access it, simply send a text message to the bot (whatever message, for example a single letter is enough) The main menu will show:

	- Snapshot Cam1
	- Configuration

Also, a text with disk usage information and wether the cameras are ON, will be shown.

If you have more than one camera, you will get options for a snapshot in each of them.

The configuration menu has this options:

	- Turn off cameras / Turn on cameras

		With this option you can turn off the surveillance, for example when you arrive home.

	- Change number of cameras

		Follow the on-screen instructions, it is very easy.

	- Restart computer

		If something goes wrong, this option can recover the system remotely. For this option to work, the user needs to be a sudoer. (That's true by default in the Raspberry)

	- Shut down computer

		You will need to use this option always to shut down the raspberry properly and remove the power from it. The alternative is to press ```Control + C``` if the program is run manually and you have a keyboard connected.
		For this option to work, the program will need to be started automatically as described in the installation instructions, and the user needs to be a sudoer. (That's true by default in the Raspberry) If not, the program will terminate and the computer will not shut off.

	- Update system

		It is convenient to update the system regularly. This will also update the program from Github.com
		For this option to work, the user needs to be a sudoer. (That's true by default in the Raspberry)

	- Delete videos

		When you see the disk usage percent is too high, you can use this option to delete all videos and images.

	- Change language

		The currently available languages are English and Spanish. Translations to other languages is welcome, see next section.

## Translations to other languages

To add a new language to the application, please follow these steps:

	- Edit the file ```config/translations/languageCodes.json``` and add the two-letter code of the language you are adding. The list of language codes is here:

		https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2

		Remember that the code must go in quotation marks. And if it is not the last one, it must have a comma after closing the quotation marks.

	- Copy the file ```config/translations/en.json``` to the same directory, renaming it to ```<language code>.json```, writing in the new language code. (Alternatively you can copy another translation file if you find more easy to translate from that other language)

	- Edit the file you just created. In each line there is an English phrase (in quotation marks), a separation of a colon and a space ```:```, and then the translated phrase (in quotation marks). You just have to translate the last phrase in each line to the new language. Please, follow these observations:

		- Respect the punctuation at the begginning and at the end of the phrase. If there is a point, a space, or nothing, keep it.
		- Keep the emojis as they are, unless you are making a customization that you don't plan to contribute.
		- You can use an online JSON checker to check the syntax.

	- Make a pull request on this Github repository with the two changed files (you can do it from the web interface) Indicate the name of the new language in the pull request description.
