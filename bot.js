
// - Requires -

const TG = require( 'telegram-bot-api' )
const del = require('del');
const cv = require( 'opencv4nodejs' );
const PNG = require( 'pngjs' ).PNG;

var fs = require( 'fs' );
var pathJoin = require( 'path' ).join;
const { spawn } = require( 'child_process' );


// - Global variables -

var CONFIG_PATH = "./config/config.json";
var serverConfig = null;
var TRANSLATION_PATH = "./config/translations/";
var translation = null;
var LANGUAGES_CODES_PATH = "./config/translations/languageCodes.json";
var languagesCodes = null;

// App

var app = null;
var httpServer = null;
//var wss = null;

var isAppEnding = false;


// Telegram

var telegramAPI = null;
var telegramMessageProvider = null;
var privateChatId = null;
var mainMenuShown = false;
var menusEnabled = false;
var menuLastMessageId = null;
var menuLastMessageIdAdditionalText = null;
var menusByName = null;
var numVideosUploading = 0;

const USER_IDLE = 0;
const USER_ASK_NUMBER_OF_CAMERAS = 1;
var userResponseState = USER_IDLE;

// Cameras

var cameraIsRunning = false;
var cameraIsClosing = false;
var cameraCloseCallback = null;
var cameras = null;
var numVideosWriting = 0;

var gaussianBlurSize = new cv.Size( 5, 5 );
var pngSaveOptions = { colorType: 6 };

var exitAction = null;
const EXIT_NO_ACTION = 0;
const EXIT_ERROR = 1;
const EXIT_REBOOTING = 2;
const EXIT_POWER_OFF = 3;

// - Main code -

initServer();

// - End of main code -


// - Functions -

function initServer() {

	process.on( "SIGINT", function() {

		console.log( "  SIGINT Signal Received, shutting down" );

		beginAppTermination( EXIT_NO_ACTION );

	} );

	// Load config
	serverConfig = loadFileJSON( CONFIG_PATH, "utf8" );
	if ( serverConfig === null ) {

		console.log( "Error loading config file EnsaimediaConfig.json. Please check its syntax." );
		process.exit( 0 );

	}

	languagesCodes = loadFileJSON( LANGUAGES_CODES_PATH, "utf8" );
	if ( languagesCodes === null ) {

		console.log( "Error loading languages codes file: " + LANGUAGES_CODES_PATH + ". Please check its syntax." );
		process.exit( 0 );

	}
	languagesCodes.sort();

	loadTranslation();

	createCameras();

	createMenus();

	startTelegram( () => {

		sendTextMessage( "ℹ️ " + translation[ "Telegram bot has started." ] );

		turnOnCameras( ( success ) => {

			menusEnabled = true;

			if ( success ) sendTextMessage( "✅" + translation[ "Cameras have started successfully" ] + "✅" );
			else sendTextMessage( "🛑" + translation[ "Some camera/s could not be started. Pleache check the cable connections and restart cameras." ] + "🛑" );

		} );

	} );

}

function createMenus() {

	menusByName = { };

	createMenu( translation[ "Main menu" ], "", 1,

		function () {

			var menuLabels = [ ];

			for ( var i = 0, il = serverConfig.numberOfCameras; i < il; i ++ ) {

				menuLabels.push( translation[ "Snapshot" ] + " Cam" + ( i + 1  ) );

			}

			menuLabels.push( translation[ "Configuration" ] );

			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			mainMenuShown = true;

			if ( optionIndex < serverConfig.numberOfCameras ) {

				var iCamera = optionIndex;

				captureAndSendStillImage( iCamera );

				deleteMenuLastMessage();

			}
			else {

				switch ( optionLabel ) {

					case translation[ "Configuration" ]:
						deleteMenuLastMessage();
						sendMenu( menusByName[ translation[ "Configuration menu" ] ] );
						break;

					default:
						// Nothing to do
						break;
				}

			}

		}
	);

	createMenu( translation[ "Configuration menu" ], "", 1,

		function () {

			var menuLabels = [ ];

			if ( cameraIsRunning ) menuLabels.push( translation[ "Turn off cameras" ] );
			else menuLabels.push( translation[ "Turn on cameras" ] );
			menuLabels.push( translation[ "Change number of cameras" ] );
			if ( serverConfig.showRestartAppOption ) menuLabels.push( translation[ "Restart computer" ] );
			menuLabels.push( translation[ "Shut down computer" ] );
			if ( serverConfig.showUpdateSystemOption )menuLabels.push( translation[ "Update system" ] );
			menuLabels.push( translation[ "Delete videos" ] );
			menuLabels.push( translation[ "Change language" ] );
			menuLabels.push( translation[ "Return to main menu" ] );

			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			mainMenuShown = true;

			switch ( optionLabel ) {

				case translation[ "Turn off cameras" ]:
					deleteMenuLastMessage();
					sendMenu( menusByName[ translation[ "Confirm turn off cameras?" ] ] );
					break;

				case translation[ "Turn on cameras" ]:
					deleteMenuLastMessage();
					turnOnCameras( ( success ) => {

						if ( success ) sendTextMessage( "✅" + translation[ "Cameras have started successfully" ] + "✅" );
						else sendTextMessage( "🛑" + translation[ "Some camera/s could not be started. Pleache check the cable connections and restart cameras." ] + "🛑" );

					} );
					break;

				case translation[ "Change number of cameras" ]:
					deleteMenuLastMessage();
					userResponseState = USER_ASK_NUMBER_OF_CAMERAS;
					sendTextMessage( translation[ "Connect the new cameras or disconnect the ones you will not use, and enter the new number of cameras." ] );
					break;

				case translation[ "Restart computer" ]:
					if ( ! serverConfig.showRestartAppOption ) return;
					deleteMenuLastMessage();
					sendMenu( menusByName[ translation[ "Confirm restart computer?" ] ] );
					break;

				case translation[ "Shut down computer" ]:
					deleteMenuLastMessage();
					sendMenu( menusByName[ translation[ "Confirm shut down computer?" ] ] );
					break;

				case translation[ "Update system" ]:
					if ( ! serverConfig.showUpdateSystemOption ) return;
					deleteMenuLastMessage();
					if ( ( numVideosUploading > 0 ) || ( numVideosWriting > 0 ) ) {

						sendTextMessage( "ℹ️ " + translation[ "The system cannot be updated right now because there are videos being recorded at this moment. Please try again later." ] );
						return;

					}
					sendMenu( menusByName[ translation[ "Confirm update system?" ] ] );
					break;

				case translation[ "Delete videos" ]:
					deleteMenuLastMessage();
					if ( ( numVideosUploading > 0 ) || ( numVideosWriting > 0 ) ) {

						sendTextMessage( "ℹ️ " + translation[ "Cannot delete videos because a/some video/s are being recorded at this time. Please try again later." ] );
						return;

					}
					sendMenu( menusByName[ translation[ "Confirm delete videos and images?" ] ] );
					break;

				case translation[ "Change language" ]:
					deleteMenuLastMessage();
					sendMenu( menusByName[ translation[ "Change language" ] ] );
					break;

				case translation[ "Return to main menu" ]:
					deleteMenuLastMessage();
					showMainMenu();
					break;
				default:
					// Nothing to do
					break;
			}

		}
	);

	createYesNoMenu( translation[ "Confirm turn off cameras?" ], "", translation[ "Yes, turn off cameras" ], () => {

		turnOffCameras( () => {

			sendTextMessage( "ℹ️ " + translation[ "Cameras has shut down successfully" ] );

		} );

	}, translation[ "No" ], showMainMenu );

	createYesNoMenu( translation[ "Confirm restart computer?" ], "", translation[ "Yes, restart computer" ], () => {

		menusEnabled = false;
		sendTextMessage( "ℹ️ " + translation[ "Restarting computer..." ] );
		setTimeout( beginAppTermination, 1000, EXIT_REBOOTING );

	}, "No", showMainMenu );

	createYesNoMenu( translation[ "Confirm shut down computer?" ], "", translation[ "Yes, shut down computer" ], () => {

		menusEnabled = false;
		sendTextMessage( "ℹ️ " + translation[ "The computer will now shut down. When the green LED stops flashing, you can unplug it from the power." ] );
		setTimeout( beginAppTermination, 1000, EXIT_POWER_OFF );

	}, translation[ "No" ], showMainMenu );

	createYesNoMenu( translation[ "Confirm update system?" ], "", translation[ "Yes, update" ], updateSystem, translation[ "No" ], showMainMenu );

	createYesNoMenu( translation[ "Confirm delete videos and images?" ], "", translation[ "Yes, delete data" ], () => {

		if ( ( numVideosUploading > 0 ) || ( numVideosWriting > 0 ) ) {

			sendTextMessage( "ℹ️ " + translation[ "Cannot delete videos because a/some video/s are being recorded at this time. Please try again later." ] );
			return;

		}

		deleteAllFiles( () => {

			getDiskUsage( function ( totalVideos, totalImages, percentUsed ) {

				sendTextMessage( "ℹ️ " + translation[ "Videos and images have been deleted." ] + "\n" + getInfoString( totalVideos, totalImages, percentUsed ) );

			} );

		} );

	}, translation[ "No" ], showMainMenu );

	createMenu( translation[ "Change language" ], "", 1,

		function () {

			var menuLabels = [ ];

			for ( var i = 0, il = languagesCodes.length; i < il; i ++ ) menuLabels.push( translation[ languagesCodes[ i ] + "Flag" ] + translation[ languagesCodes[ i ] ] );
			menuLabels.push( "Return to main menu" );


			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			deleteMenuLastMessage();

			if ( optionIndex < languagesCodes.length ) {

				serverConfig.languageCode = languagesCodes[ optionIndex ];
				saveConfig();
				loadTranslation();
				createMenus();
				sendTextMessage( translation[ "Language has been changed to " ] +
					translation[ languagesCodes[ optionIndex ] + "Flag" ] +
					translation[ languagesCodes[ optionIndex ] ] );

			}
			else {

				showMainMenu();

			}

		}

	);

}

function loadTranslation() {

	translation = loadFileJSON( TRANSLATION_PATH + serverConfig.languageCode + ".json", serverConfig.translationEncodingAlias );

	if ( ! translation ) {

		console.log( "Error: translation invalid for language code (please check syntax): " + serverConfig.languageCode );
		beginAppTermination( EXIT_ERROR );
		return;

	}

}

function startTelegram( onStarted ) {

	privateChatId = parseInt( loadFile( "./config/chat_id" ) );

	telegramAPI = new TG( {
		token: loadFile( "./config/token" )
	} );

	telegramMessageProvider = new TG.GetUpdateMessageProvider();

	telegramAPI.setMessageProvider( telegramMessageProvider );

	telegramAPI.start()
	.then( () => {

		console.log( "Telegram API is started" );

		onStarted();

	} )
	.catch( err => {

		console.error( "Telegram API error: " + err );

	} );

	// Receive messages via event callback
	telegramAPI.on( "update", processTelegramUpdate );

	//telegramAPI.getMe().then(console.log).catch(console.error);

}

function stopTelegram() {

	if ( telegramAPI ) telegramAPI.stop();

}

function processTelegramUpdate( update ) {

	//console.log( update );

	if ( update.message ) {

		var message = update.message;

		if ( ! checkPrivateMessage( message ) ) return;

		parseUserInput( message.text );

	}
	else if ( update.callback_query ) {

		if ( ! checkPrivateMessage( update.callback_query.message ) ) return;

		if ( ! mainMenuShown ) return;

		// User has selected a menu option

		var menuName = update.callback_query.message.text;
		var optionIndex = parseInt( update.callback_query.data );

		var menu = menusByName[ menuName ];

		if ( ! menu ) {

			console.log( "Error: menu not found: " + menuName );
			console.log( "Menus:" );
			console.log( menusByName );
			return;

		}

		if ( menu && menu.enabled && menu.menuFunction ) {

			var optionLabel = menu.menuLabelsFunction()[ optionIndex ]

			//console.log( "Executing option: " + optionLabel );

			if ( optionLabel ) menu.menuFunction( optionIndex, optionLabel );

		}

	}

}

function createMenu( name, additionalText, optionsPerRow, menuLabelsFunction, menuFunction ) {

	// 'menuOptionsLabels' is an array of string labels
	// 'options' is an array of functions

	var menu = {
		name: name,
		additionalText: additionalText ? additionalText : "",
		enabled: true,
		optionsPerRow: optionsPerRow,
		menuLabelsFunction: menuLabelsFunction,
		menuFunction: menuFunction
	};

	menusByName[ name ] = menu;

	return menu;

}

function createYesNoMenu( name, additionalText, yesLabel, yesFunction, noLabel, noFunction ) {

	createMenu( name, additionalText, 2,

		function () {

			var menuLabels = [ ];

			menuLabels.push( yesLabel );
			menuLabels.push( noLabel );

			return menuLabels;

		},
		function ( optionIndex, optionLabel ) {

			deleteMenuLastMessage();

			switch ( optionLabel ) {

				case yesLabel:
					if ( yesFunction ) yesFunction();
					break;

				case noLabel:
					if ( noFunction ) noFunction();
					break;

				default:
					// Nothing to do
					break;
			}

		}
	);

}

function deleteMenuLastMessage() {

	if ( menuLastMessageId !== null ) {

		deleteTextMessage( menuLastMessageId );
		menuLastMessageId = null;

	}

	if ( menuLastMessageIdAdditionalText !== null ) {

		deleteTextMessage( menuLastMessageIdAdditionalText );
		menuLastMessageIdAdditionalText = null;

	}

}

function showMainMenu() {

	getDiskUsage( function ( totalVideos, totalImages, percentUsed ) {

		deleteMenuLastMessage();
		var mainMenu = menusByName[ translation[ "Main menu" ] ];
		mainMenu.additionalText = getInfoString( totalVideos, totalImages, percentUsed );
		mainMenuShown = true;
		sendMenu( mainMenu );

	} );

}

function checkPrivateMessage( message ) {

	if ( ! message ) return false;

	if ( ( message.chat.id !== privateChatId ) && ( privateChatId !== undefined ) ) {

		if ( serverConfig.intruderAlert ) {

			var intruderAlertMessage = translation[ "‼‼🛑Intruder alert!!!!🛑‼‼\nSomeone has tried to use this Telegram bot." ] + "\n" +
				"nick: " + message.from.username +
				"\nname: " + message.from.first_name +
				"\nlast name:" + message.from.last_name +
				"\nforwarded:" + ( !! message.forward_from ) +
				"\ntext: " + message.text;

			console.log( intruderAlertMessage );

			// Send intruder alert message
			sendTextMessage( intruderAlertMessage );

			// Send some info to the intruder
			sendTextMessage( "Hello! 👋\nThis is a personal bot for domotic use.\nFor more info please visit the project home at Github:\nhttps://github.com/yomboprime/TeleHomeGuard", message.chat.id );

		}

		return false;

	}
	else if ( privateChatId === undefined ) {

		console.log( "Nick: " + message.from.username + ", Name: " + message.from.first_name + "\nuser id: " + message.chat.id );
		return false;

	}

	return true;

}

function parseUserInput( text ) {

	if ( text > 100 ) return;

	switch ( userResponseState ) {

		case USER_IDLE:
			userResponseState = USER_IDLE;
			showMainMenu();
			break;

		case USER_ASK_NUMBER_OF_CAMERAS:
console.log( "RESPONSE: " + text );
			userResponseState = USER_IDLE;
			changeNumCameras( parseInt( text ) );
			break;

		default:
			// Nothing to do
			break;
	}

}

function sendTextMessage( text, chat_id ) {

	telegramAPI.sendMessage( {
		chat_id: chat_id === undefined ? privateChatId : chat_id,
		text: text,
		parse_mode: 'Markdown'
	} ).catch( console.error );

}

function deleteTextMessage( message_id, chat_id ) {

	telegramAPI.deleteMessage( {
		chat_id: chat_id === undefined ? privateChatId : chat_id,
		message_id: message_id
	} ).catch( console.error );

}

function sendMenu( menu ) {

	if ( ! menusEnabled ) return;

	var options = [ ];
	var labels = menu.menuLabelsFunction();
	var iColumn = 0;
	var row = [ ];
	for ( var i = 0; i < labels.length; i ++ ) {

		var option = {
			text: labels[ i ],
			callback_data: "" + i
		};

		row[ iColumn ] = option;

		iColumn ++;
		if ( iColumn >= menu.optionsPerRow ) {

			iColumn = 0;
			options.push( row );
			row = [ ];

		}

	}

	telegramAPI.sendMessage( {
		chat_id: privateChatId,
		text: menu.name,
		parse_mode: 'Markdown',
		reply_markup: {
			inline_keyboard: options
		}
	} ).then( ( message1 ) => {

		menuLastMessageId = message1.message_id;

		if ( menu.additionalText ) {

			telegramAPI.sendMessage( {
				chat_id: privateChatId,
				text: menu.additionalText,
				parse_mode: 'Markdown',
			} ).then( ( message2 ) => {

				menuLastMessageIdAdditionalText = message2.message_id;

			} ).catch( console.error );
		}

	} ).catch( console.error );

}

function sendVideoFile( caption, videoPath, onSent ) {

	telegramAPI.sendVideo( {
		caption: caption,
		chat_id: privateChatId,
		video: fs.createReadStream( videoPath )
	} ).then( onSent ).catch( console.error );

}

function sendPhoto( caption, imagePath, disable_notification, onSent ) {

	telegramAPI.sendPhoto( {
		caption: caption,
		chat_id: privateChatId,
		photo: fs.createReadStream( imagePath ),
		disable_notification: "" + disable_notification
	} ).then( onSent ).catch( console.error );

}

function loadFileJSON( path, encoding ) {

	try {

		return JSON.parse( loadFile( path, encoding ) );

	}
	catch ( e ) {

		return null;

	}

}

function loadFile( path, encoding ) {

	try {

		return fs.readFileSync( path, encoding ? encoding : undefined );

	}
	catch ( e ) {

		return null;

	}

}

function saveConfig() {

	fs.writeFileSync( CONFIG_PATH, JSON.stringify( serverConfig, null, 4 ), "latin1" );

}

function createCameras() {

	cameras = [ ];

	for ( var i = 0, numCameras = serverConfig.numberOfCameras; i < numCameras; i ++ ) {

		cameras[ i ] = {
			cap: null,
			lastMat: null,
			prevGrayMat: null,
			lastFrameWasMotion: false,
			numFramesToBegin: 0,
			numFramesLeftToEnd: 0,
			timer: 0,
			uploadingVideo: false,
			numFrames: 0,
			videoName: null,
			videoPath: null
		};

	}

}

function turnOnCameras( callback ) {

	if ( cameraIsRunning ) {

		callback( true );
		return;

	}

	if ( cameraIsClosing ) {

		callback( false );
		return;

	}

	function initCamera( cameraIndex ) {

		var camera = cameras[ cameraIndex ];

		if ( ! camera.cap ) return;

		// Set frame rate
		camera.cap.set( cv.CAP_PROP_FPS, serverConfig.camerasFPS );
		var realFPS = camera.cap.get( cv.CAP_PROP_FPS );
		console.log( "Wanted FPS: " + serverConfig.camerasFPS + ", real FPS: " + realFPS );

		// Start capturing
		camera.cap.readAsync( ( err, frameMat ) => {

			processFrame( cameraIndex, err, frameMat );

		} );

	}

	var success = true;
	for ( var iCamera = 0, numCameras = serverConfig.numberOfCameras; iCamera < numCameras; iCamera ++ ) {

		var c = cameras[ iCamera ];

		c.timer = 0;
		c.numFrames = 0;

		try {
			c.cap = new cv.VideoCapture( /*"/dev/video" +*/ iCamera );
		}
		catch ( e ) {
			console.log( "Camera" + ( iCamera + 1 ) + " could not be started." );
			sendTextMessage( "Camera" + ( iCamera + 1 ) + translation[ " could not be started." ] );
			c.cap = null;
			success = false;
		}

	}

	setTimeout( () => {

		cameraIsRunning = true;

		for ( var iCamera = 0, numCameras = serverConfig.numberOfCameras; iCamera < numCameras; iCamera ++ ) {

			initCamera( iCamera );

		}

		callback( success );

	}, 1000 );

}

function turnOffCameras( callback ) {

	if ( ( ! cameraIsRunning ) || cameraIsClosing ) {

		callback( true );
		return;

	}

	cameraIsClosing = true;
	cameraCloseCallback = callback;

	for ( var i = 0, numCameras = serverConfig.numberOfCameras; i < numCameras; i ++ ) {

		if ( cameras[ i ].cap ) {

			if ( cameras[ i ].timer > 0 ) numVideosWriting --;

			onCameraClosed( i, null );

		}

		cameras[ i ].timer = 0;

	}

}

function changeNumCameras( newNumCameras ) {

	if ( isNaN( newNumCameras ) || ( ! Number.isInteger( newNumCameras ) ) || ( newNumCameras < 1 ) ) {

		userResponseState = USER_ASK_NUMBER_OF_CAMERAS;
		sendTextMessage( translation[ "You must enter the number of cameras, an integer greater or equal than 1." ] );
		return;

	}

	userResponseState = USER_IDLE;

	turnOffCameras( () => {


		setTimeout( () => {

			serverConfig.numberOfCameras = newNumCameras;
			saveConfig();
			createCameras();


			sendTextMessage( "ℹ️ " + translation[ "The number of cameras has been changed to " ] + newNumCameras + ". " + translation[ "Surveillance system off, restarting it..." ] );

			turnOnCameras( ( success ) => {

				if ( success ) sendTextMessage( "✅" + translation[ "Cameras have started successfully" ] + "✅" );
				else sendTextMessage( "🛑" + translation[ "Some camera/s could not be started. Pleache check the cable connections and restart cameras." ] + "🛑" );

			} );

		}, 1500 );

	} );

}

function onCameraClosed( cameraIndex, err ) {

	if ( err ) console.log( "Camera error (index=" + cameraIndex + "): " + err );

	var c = cameras[ cameraIndex ];

	c.cap.release();
	c.cap = null;
	c.lastMat = null;
	c.prevGrayMat = null;
	c.numFrames = 0;

	if ( cameraIsClosing ) {

		var numCamsClosed = 0;
		var numCameras = serverConfig.numberOfCameras;
		for ( var i = 0; i < numCameras; i ++ ) {

			if ( ! cameras[ i ].cap ) numCamsClosed ++;

		}

		if ( numCamsClosed === numCameras ) {

			cameraIsClosing = false;
			cameraIsRunning = false;
			if ( numVideosWriting !== 0 ) console.log( "ASSERT1 numVideosWriting !== 0" );

			var c = cameraCloseCallback;
			cameraCloseCallback = null;
			if ( c ) c();

		}

	}
	else {

		console.log( "Error: Camera" + ( cameraIndex + 1 ) + " ended abnormally." );
		sendTextMessage( translation[ "‼¡Error!‼ The camera: " ] + "Camera" + ( cameraIndex + 1 ) + translation[ " has closed unexpectedly. Please restart the cameras or the computer to try to solve it. If it doesn't, please check the cable connections and try again." ] );

	}

}

function processFrame( cameraIndex, err, newframeMat ) {

	if ( err ) {

		onCameraClosed( cameraIndex, err );
		return;

	}

	var camera = cameras[ cameraIndex ];

	if ( camera.cap === null ) return;

	if ( isAppEnding || cameraIsClosing ) {

		onCameraClosed( cameraIndex, null );
		return;

	}

	if ( camera.timer > 0 ) {

		// Camera is writing to disk

		if ( ( new Date() ).getTime() > camera.timer ) {

			// End of video
			compressAndSendVideo( cameraIndex );

		}
		else {

			// Store frame

			camera.numFrames ++;
			var n = camera.numFrames;
			var frameFileName = ( n ) + ".png";
			var m = 1000000;
			while ( n < m ) {

				frameFileName = "0" + frameFileName;
				m /= 10;

			}

			var framePath = pathJoin( camera.videoPath, frameFileName );
			fs.writeFile( framePath, pngFromMat( newframeMat ), () => {} );

		}

	}

	detectMotion( cameraIndex, newframeMat );

	// Request next frame
	camera.cap.readAsync( ( err, frameMat1 ) => {

		processFrame( cameraIndex, err, frameMat1 );

	} );

}

function startRecordingCamera( cameraIndex ) {

	getLocaleDate( ( date ) => {

		if ( ( ! cameraIsRunning ) || cameraIsClosing ) {

			console.log( "startRecordingCamera: Can't record, camera system is shut down. (cameraIndex = " + cameraIndex + ")" );
			return;

		}

		var camera = cameras[ cameraIndex ];

		if ( ! camera.cap ) {

			console.log( "startRecordingCamera: Can't record, the camera is shut down. (cameraIndex = " + cameraIndex + ")" );
			return;

		}

		if ( camera.timer > 0 ) {

			console.log( "startRecordingCamera: Camera is already recording. (cameraIndex = " + cameraIndex + ")" );
			return;

		}

		if ( camera.uploadingVideo ) {

			console.log( "startRecordingCamera: Camera is uploading video. (cameraIndex = " + cameraIndex + ")" );
			return;

		}

		var c = camera;
		c.numFrames = 0;
		c.lastMat = null;
		c.prevGrayMat = null;
		c.numFramesToBegin = 5;
		c.numFramesLeftToEnd = serverConfig.numFramesAfterMotion;
		c.timer = ( new Date() ).getTime() + serverConfig.maxVideoDurationSeconds * 1000;
		numVideosWriting ++;

		// Compute video name and path

		var videoName = date;
		var cameraPath = pathJoin( getCameraPath( cameraIndex ), "temp", videoName );

		c.videoName = videoName;
		c.videoPath = cameraPath;

		fs.mkdirSync( cameraPath, { recursive: true } );

	} );

}

function stopRecordingCamera( cameraIndex ) {

	if ( ( ! cameraIsRunning ) || cameraIsClosing ) {

		console.log( "stopRecordingCamera: Can't stop, camera system is shut down. (cameraIndex = " + cameraIndex + ")" );
		return;

	}

	var camera = cameras[ cameraIndex ];

	if ( ! camera.cap ) {

		console.log( "stopRecordingCamera: The camera is shut down. (cameraIndex = " + cameraIndex + ")" );
		return;

	}

	if ( camera.timer === 0 ) {

		console.log( "stopRecordingCamera: Camera is already stopped. (cameraIndex = " + cameraIndex + ")" );
		return;

	}

	camera.timer = 0;
	camera.lastFrameWasMotion = false;
	numVideosWriting --;

}

function getCameraPath( cameraIndex ) {

	return pathJoin( serverConfig.captureVideosPath, "Camera" + ( cameraIndex + 1 ) );

}

function compressAndSendVideo( cameraIndex, stopRecording ) {

	// Stop video capture
	stopRecordingCamera( cameraIndex );

	var camera = cameras[ cameraIndex ];

	if ( camera.numFrames === 0 ) return;

	var framesPath = camera.videoPath;
	var cameraVideoName = camera.videoName;
	var videoFilePath = pathJoin( getCameraPath( cameraIndex ), cameraVideoName + ".MTS" );

	// Use ffmpeg to compress the frame images into a mp4 video file
	execProgram( null, "ffmpeg", [ "-r", "" + serverConfig.camerasFPS, "-i", pathJoin( framesPath, "%7d.png" ), videoFilePath ], ( code, output, error ) => {

		var videoCaption = "Camera" + ( cameraIndex + 1 ) + " " + cameraVideoName;

		sendTextMessage( translation[ "Uploading video" ] + " " + videoCaption );

		//console.log( "Uploading video " + videoCaption );

		camera.uploadingVideo = true;

		sendVideoFile( translation[ "Video from " ] + videoCaption, videoFilePath, () => {

			camera.uploadingVideo = false;

			// Delete frames
			del( [ framesPath ], { force: true } ).then( () => {

				// Restart video capture
				if ( ! stopRecording ) startRecordingCamera( cameraIndex );

			} );

		} );

	} );

}

function detectMotion( cameraIndex, newframeMat ) {

	var camera = cameras[ cameraIndex ];

	var rows = newframeMat.rows;
	var cols = newframeMat.cols;

	camera.lastMat = newframeMat;

	var prevGrayMat = camera.prevGrayMat;
	var isPrevGray = true;
	if ( ! prevGrayMat ) {

		prevGrayMat = new cv.Mat( rows, cols, cv.CV_8U );
		camera.prevGrayMat = prevGrayMat;
		isPrevGray = false;

	}

	// Convert image to gray
	var currGrayMat = newframeMat.cvtColor( cv.COLOR_BGR2GRAY );

	// Smooth
	var blurredMat = currGrayMat.gaussianBlur( gaussianBlurSize, 0, cv.BORDER_DEFAULT );

	// Subtract images, obtain absolute difference
	var differenceMat = blurredMat.absdiff( prevGrayMat );

	// Save gray mat as previous frame
	blurredMat.copyTo( camera.prevGrayMat );

	if ( ! isPrevGray ) return;

	// Threshold
	var thresholdMat = differenceMat.threshold( serverConfig.pixelDifferenceThreshold, 255, 0 );

	// Count pixels
	var numPixelsInMotion = cv.countNonZero( thresholdMat );

	// Determine if there is motion
	var thereIsMotion = numPixelsInMotion > ( ( rows * cols ) * serverConfig.motionDetectionPercent / 100 );

	// Skip bad initial frames (let camera focus)
	if ( thereIsMotion && camera.numFramesToBegin > 0 ) {
		camera.numFramesToBegin --;
		return;
	}

	//console.log( "thereIsMotion: " + thereIsMotion + ", % = " + Math.round( 100 * numPixelsInMotion / ( rows * cols ) ) );

	// Take action

	if ( camera.lastFrameWasMotion && thereIsMotion && ( ! camera.uploadingVideo ) && ( camera.timer === 0 ) ) {

		sendTextMessage( translation[ "‼‼🛑Alert!!!!🛑‼‼\nMotion detected in cameras. Sending video/s shortly..." ] );

		startRecordingCamera( cameraIndex );

	}
	else if ( ( ! camera.lastFrameWasMotion ) && ( ! thereIsMotion ) && ( camera.timer > 0 ) ) {

		if ( camera.numFramesLeftToEnd > 0 ) {

			camera.numFramesLeftToEnd --;

		}
		else {

			compressAndSendVideo( cameraIndex, true );

		}

	}

	if ( thereIsMotion ) camera.numFramesLeftToEnd = serverConfig.numFramesAfterMotion;
	camera.lastFrameWasMotion = thereIsMotion;

}

function captureAndSendStillImage( cameraIndex, onSent ) {

	if ( ( ! cameraIsRunning ) || cameraIsClosing ) {

		sendTextMessage( translation[ "You must turn on the cameras before capturing an image." ] );
		return;

	}

	if ( ! cameras[ cameraIndex ].lastMat ) {

		sendTextMessage( "ℹ️ " + translation[ "The image could not be captured. Please restart the cameras and try again." ] );
		return;

	}

	// Send the last image from the camera

	var imagePath = pathJoin( serverConfig.captureStillImagesPath, "Camera" + ( cameraIndex + 1 ) );

	fs.mkdirSync( imagePath, { recursive: true } );
	imagePath = pathJoin( imagePath, "still-" + ( new Date() ).getTime() + ".png" );

	fs.writeFileSync( imagePath, pngFromMat( cameras[ cameraIndex ].lastMat ) );

	getLocaleDate( ( date ) => {

		sendPhoto( translation[ "Photo from " ] + "Camera" + ( cameraIndex + 1 ) + " " + date, imagePath, true, onSent ? onSent : function () { } );

	} );

}

function pngFromMat( mat ) {

	/*
	var png = new PNG( {
		width: mat.cols,
		height: mat.rows,
		bitDepth: 8,
		colorType: 6
	} );

	var sd = mat.getData();
	var dd = png.data;
	var pd = 0;
	for ( var i = 0, l = sd.length; i < l; i +=3 ) {

		dd[ pd ++ ] = sd[ i + 2 ];
		dd[ pd ++ ] = sd[ i + 1 ];
		dd[ pd ++ ] = sd[ i ];
		dd[ pd ++ ] = 255;

	}

	return PNG.sync.write( png, pngSaveOptions );
	*/

	return cv.imencode( '.png', mat );

}

function getInfoString( totalVideos, totalImages, percentUsed ) {

	var s = translation[ "Disk usage: Videos: " ] + totalVideos + translation[ ", images: " ] + totalImages + translation[ ". Percentage of disk full: " ] + percentUsed + " %";

	if ( percentUsed > 85 ) {

		s += "\n" + translation[ "‼🛑Warning🛑‼ Disk space is low, you should delete the files." ];

	}

	if ( cameraIsRunning ) s += "\n✅" + translation[ "The surveillance system is on." ] + "✅";
	else s += "\n🛑" + translation[ "The surveillance system is off." ] + "🛑";

	return s;

}

function getDiskUsage( callback ) {

	// callback receives ( totalVideos, totalImages, percentUsed ) human readable disk usage string of videos and images, and percent of disk full

	function getDirectoryUsage( path, callbackDir ) {

		// callback receives ( used, totalUsed ) human readable disk usage string and total used bytes

		execProgram( null, "du", [ "-hs", path ], ( code, output, error ) => {

			output = output.split( "\t" )[ 0 ];

			var bytes = 0;
			var quantity = parseInt( output.substring( 0, output.length - 1 ) );

			var mult = output.slice( -1 );
			switch ( mult ) {

				case 'T':
					bytes = quantity * 1000000000000;
					break;

				case 'G':
					bytes = quantity * 1000000000;
					break;

				case 'M':
					bytes = quantity * 1000000;
					break;


				case 'K':
					bytes = quantity * 1000;
					break;

				default:
					bytes = quantity;
					break;
			}

			callbackDir( output, bytes );

		} );

	}

	getDirectoryUsage( serverConfig.captureVideosPath, ( totalVideos, videoBytes ) => {

		if ( videoBytes === null ) return;

		getDirectoryUsage( serverConfig.captureStillImagesPath, ( totalImages, imagesBytes ) => {

			if ( imagesBytes === null ) return;

			var total = videoBytes + imagesBytes;

			var percentUsed = Math.round( 1000 * ( total / serverConfig.diskQuota ) ) / 10;

			callback( totalVideos, totalImages, percentUsed );

		} );

	} );

}

function updateSystem() {

	if ( ( numVideosUploading > 0 ) || ( numVideosWriting > 0 ) ) {

		sendTextMessage( "ℹ️ " + translation[ "No se puede actualizar el sistema porque se está/n grabando vídeo/s en ste momento. Inténtalo más tarde." ] );
		return;

	}

	menusEnabled = false;
	sendTextMessage( "ℹ️ " + translation[ "Updating operating system..." ] );

	execProgram( null, "sudo", [ "apt", "-y", "update" ], ( code1, output1, error1 ) => {

		if ( code1 ) {

			sendTextMessage( translation[ "Error: " ] + error1 );
			sendTextMessage( "‼🛑" + translation[ "Error while updating operating system" ] + "🛑‼" );
			menusEnabled = true;
			return;

		}

		sendTextMessage( "ℹ️ " + translation[ "Installing updates..." ] );

		execProgram( null, "sudo", [ "apt", "-y", "upgrade" ], ( code2, output2, error2 ) => {

			if ( code2 ) {

				sendTextMessage( translation[ "Error: " ] + error2 );
				sendTextMessage( "‼🛑" + translation[ "Error while installing updates" ] + "🛑‼" );
				menusEnabled = true;
				return;

			}

			sendTextMessage( "ℹ️ " + translation[ "Updating application..." ] );

			execProgram( null, "git", [ "pull", "origin", "master" ], ( code3, output3, error3 ) => {

				if ( code3 ) {

					sendTextMessage( "Error: " + error3 );
					sendTextMessage( "‼🛑" + translation[ "Error while updating application" ] + "🛑‼" );
					menusEnabled = true;
					return;

				}

				sendTextMessage( "ℹ️ " + translation[ "Installing application updates..." ] );

				execProgram( null, "npm", [ "install" ], ( code4, output4, error4 ) => {

					if ( code4 ) {

						sendTextMessage( translation[ "Error: " ] + error4 );
						sendTextMessage( "‼🛑" + translation[ "Error while installing application updates" ] + "🛑‼" );
						menusEnabled = true;
						return;

					}

					sendTextMessage( "✅ " + translation[ "The system has been updated successfully. Restarting computer..." ] + " ✅" );

					setTimeout( beginAppTermination, 1000, EXIT_REBOOTING );

				}, true );

			}, true );

		}, true );

	}, true );

}

function execProgram( cwd, program, args, callback, cancelOutput ) {

	var p;

	if ( cwd ) p = spawn( program, args, { cwd: cwd } );
	else p = spawn( program, args );

	var output = "";
	var error = "";

	p.stdout.on( 'data', ( data ) => {

		if ( ! cancelOutput ) output += data;

	} );

	p.stderr.on( 'data', ( data ) => {

		error += data;

	} );

	p.on( 'exit', ( code, signal ) => {

		if ( callback ) {

			callback( code, output, error );

		}

	} );

}

function getLocaleDate( callback ) {

	execProgram( null, "date", [ ], ( code, output, err ) => {

		callback( output );

	} );

}

function deleteAllFiles( callback ) {

	del( [ serverConfig.captureVideosPath + '*', serverConfig.captureStillImagesPath + '*' ], { force: true } ).then( callback );

}

function beginAppTermination( action ) {

	exitAction = action;

	if ( cameraIsRunning ) {

		isAppEnding = true;

		turnOffCameras( () => {

			finish();

		} );

	}
	else {

		finish();

	}

}

function finish() {

	stopTelegram();

	function salute( err ) {

		if ( ! err ) console.log( "Application terminated successfully. Have a nice day." );
		else console.log( "Application terminated With error. Have a nice day." );

	}

	switch ( exitAction ) {

		case EXIT_NO_ACTION:
			salute( false );
			process.exit( 0 );
			break;

		case EXIT_ERROR:
			salute( true );
			execProgram( null, "sudo", [ "shutdown", "now" ], null );
			break;

		case EXIT_REBOOTING:
			salute( false );
			execProgram( null, "sudo", [ "reboot" ], null );
			break;

		case EXIT_POWER_OFF:
			salute( false );
			process.exit( 0 );
			break;

		default:
			console.log( "Unknown exit code." );
			salute( false );
			process.exit( 0 );
			break;

	}

}
