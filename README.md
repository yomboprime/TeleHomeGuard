
For an English version of this README, go here: [README_en](README_en.md)

# TeleHomeGuard

Software de vigilancia con cámaras basado en Telegram para las notificaciones y envío de vídeos y fotos.

Características:

- Varias cámaras USB.
- Detección de movimiento, envía notificaciones y grabación contínua (partida en vídeos de hasta 5 minutos)
- Captura de fotos instantáneas.
- Envío de mensajes de voz desde Telegram para que los reproduzca por altavoces.
- Menú completo
- Apagado y puesta en marcha de las cámaras desde Telegram.
- Reiniciar, apagar y actualizar el ordenador y la aplicación desde Telegram.
- Gratuito y sin servidor local.
- Funciona en Raspberry Pi.

## Sistemas operativos soportados

Aunque este software se ha testado sólo en GNU/Linux (amd64 y arm64), todas las dependencias son multiplataforma, por lo que debería ir bien en otros sistemas. Sin embargo, las opciones "Reiniciar ordenador" y "Actualizar sistema" no funcionarán en sistemas "no *nix".

En otros sistemas operativos tendrás que instalar nodejs con npm, la librería OpenCV y la de Git por separado. Después, continúa por el paso "Descargar este repositorio e instalar dependencias"

## Hardware soportado

Probado en un PC potente y en una Raspberry Pi 4 de 4 GB.

La/s cámara/s pueden ser USB2 o USB3.

## Instalacion en PC

Sigue las instrucciones para Raspberry Pi, aunque el sistema operativo puede ser cualquier distro de GNU/Linux.

## Instalacion en Raspberry Pi 2, 3 y 4

Instala Raspberry OS. Configura un password nuevo de sistema y la WiFi, a no ser que conectes por cable Ethernet:

	https://ubuntu.com/download/raspberry-pi

Instalar requerimientos (tardará un rato). Ejecuta en la consola:

	$ sudo apt update
	$ sudo apt install build-essential cmake npm nodejs git libavformat-dev v4l-utils ffmpeg libv4l-0

Descargar este repositorio e instalar dependencias (el último comando tardará otro buen rato):

	$ git clone https://github.com/yomboprime/TeleHomeGuard.git
	$ cd TeleHomeGuard
	$ mkdir capture
	$ mkdir stillImages
	$ npm install

Hacer que el programa se ejecute al iniciar el ordenador (opcional):

- Primero mira si ya existe el fichero rc.local:

	```ls /etc/rc.local```

- Si no existe, copia el del repositorio:

	```$ sudo cp config/rc.local /etc```

- Si sí existe, copia el contenido de ```config/rc.local``` (excepto la primera línea) al final del fichero ```/etc/rc.local```

Finalmente, crea el fichero de configuración en ```TeleHomeGuard/config/config.json``` con este contenido:

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
		"enableVoicePlayback": true,
		"intruderAlert": true,
		"showRestartAppOption": true,
		"showUpdateSystemOption": true
	}

En este fichero puedes cambiar algunas opciones que no aparecen en el menú de Telegram (necesita reiniciar el programa) Por ejemplo, puedes cambiar el valor de "diskQuota" (cuota de disco), por defecto en 50 gigabytes (pensado para una MicroSD de 64 gb en la Pi)

## Configuración del hardware

Simplemente conecta las cámaras USB al ordenador del bot.

## Ejecución del bot manualmente

Si has configurado el bot para que se ejecute al inicio (ver instrucciones de instalación), al encender el ordenador comenzará por sí solo. Sin embargo, la primera ejecución debes hacerla manualmente para obtener tu id de Telegram, como se explica en la siguiente sección "Configuracion del bot de Telegram"

El programa del bot necesita acceso a internet para Telegram pero no crea ningún servidor (no abre puertos)

El bot estará accesible en Telegram mientras el programa esté ejecutando.

Para ejecutarlo:

	$ cd TeleHomeGuard
	$ npm start

Para terminar el bot desde la consola, pulsa ```Control + C```

## Configuracion del bot de Telegram

Se puede usar cualquier cliente de Telegram para acceder al bot. Puedes instalar la app de Telegram en tu móvil o en PC:

	https://telegram.org

Primero debes crear un bot de Telegram (Se hace abriendo un privado con BotFather y enviandole comandos):

	https://core.telegram.org/bots/api

Es conveniente que deshabilites (si no lo está ya) la capacidad del bot para pertenecer a grupos.

Cuando tengas el token de acceso del bot, crea el fichero ```TeleHomeGuard/config/token``` (sin extensión) y copia el token en él. Mantén este token bien guardado, porque da acceso completo al bot (pero no a tu cuenta de Telegram) No necesitas volver a cambiar el token a menos que creas que alguien lo ha podido obtener.

Una vez tengas el bot creado:

- Ejecuta el programa del bot manualmente como se explica en la sección anterior.
- Abre una conversación privada de Telegram con él y pulsa el botón start. En la consola verás una línea indicando tu nick y nombre, y lo que interesa, que es tu número de usuario de Telegram.
- Crea el fichero ```TeleHomeGuard/config/chat_id``` (sin extensión) y copia tu número de usuario en él. Esto sirve para que solo tú puedas acceder al bot. Reinicia el programa y ya estará listo para usar.

## Uso del bot de Telegram

Para acceder al bot simplemente verás en tu conversación privada con él las notificaciones. Cuando haya movimiento en una cámara se te enviará una notificación y luego el vídeo, de hasta 5 minutos. Se enviarán vídeos de forma contínua hasta que no haya movimiento, por lo que esta aplicación no es útil para poner las cámaras en exteriores, donde el movimiento del follaje podría hacer la detección inútil.

Además de las notificaciones, el bot cuenta con un menú muy completo. Para acceder al menú simplemente escribe un mensaje, puede ser tan solo una letra. Te aparecerá el menú principal:

	- Instantánea Cam1
	- Configuración

Además se te mostrará un texto indicando el porcentaje de disco usado, y si el sistema de vigilancia está activado.

Si tienes más cámaras saldrán opciones para tomar instantáneas en cada una de ellas.

El menú de configuración tiene estas opciones:

- Apagar cámaras / Encender cámaras

	Con esta opción puedes desactivar la vigilancia por ejemplo al llegar a casa.

- Cambiar número de cámaras

	Sigue las intrucciones para cambiar el número de cámaras conectadas, es muy fácil.

- Cambiar resolución de las cámaras

	Sigue las intrucciones para cambiar la resolución, es muy fácil.

- Cambiar Fotogramas Por Segundo

	Sigue las intrucciones para cambiar los FPS, es muy fácil.


- Reiniciar ordenador

	Por si surge algún problema, esta opción puede recuperar el funcionamiento del sistema. Para que funcione esta opción es necesario que el usuario sea sudoer. (esto es cierto por defecto en la Raspberry).

- Apagar ordenador

	Deberás usar siempre esta opción antes de desenchufar la Raspberry de la corriente. La aternativa es apagar el programa con ```Control + C``` si se está ejecutando manualmente y tienes acceso por teclado directo.
	Para que funcione esta opción, el programa debe ejecutarse al inicio como está explicado en la instalación, y el usuario ha de ser sudoer (esto es cierto por defecto en la Raspberry). Si no, simplemente terminará el programa.

- Actualizar sistema

	Es conveniente actualizar el sistema regularmente. Esto actualizará también la aplicación desde Github.com
	Para que funcione esta opción es necesario que el usuario sea sudoer (esto es cierto por defecto en la Raspberry).

- Borrar vídeos

	Cuando veas que el porcentaje de disco usado (mostrado en el menú principal) se hace alto, deberías usar esta opción para borrar vídeos e imágenes para liberarlo.

- Cambiar idioma

	De momento disponibles inglés y español. Traducciones a otros idiomas son bienvenidas, ver la sección más abajo, "Traducciones a otros idiomas"

Puedes conectar un altavoz a la Pi, y al enviarle al bot un mensaje de voz lo reproducirá y te notificará cuándo ha teminado de reproducir.

## Traducciones a otros idiomas

Para añadir un nuevo idioma a la aplicación sigue estos pasos:

- Edita el fichero de texto ```config/translations/languageCodes.json``` y añade el código del idioma que vas a añadir. La lista de códigos de idioma está aquí:

	https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2

	Recuerda que el código ha de ir entre comillas en el fichero. Y si no es el último de la lista, debe tener una coma después de cerrar las comillas.

- Copia el fichero ```config/translations/en.json``` al mismo directorio, renombrándolo a ```<código de idioma>.json```, poniendo el código del nuevo idioma. (Alternativamente puedes copiar otro fichero de traducción si te es más fácil traducir desde ese idioma)

- Edita el fichero que acabas de crear. En cada línea del fichero hay una frase en inglés (entre comillas), una separación de dos puntos y espacio, y finalmente la frase traducida (entre comillas). Tan solo tienes que traducir la frase de la derecha en cada línea al nuevo idioma. Por favor, sigue estas observaciones:

	- Respeta la puntuación al principio y al final de la frase. Si hay un espacio, un punto, o dos puntos, o nada, manten esa puntuación.
	- Mantén los emojis como están, a no ser que estés haciendo un fichero personalizado que no piensas contribuir.
	- Puedes usar un chequeador de ficheros JSON online para verificar que no te falta alguna coma, etc.

- Haz un "pull request" en este proyecto de Github con los dos ficheros cambiados (puedes hacerlo desde la web) Indica en la descripción del pull request el nombre del idioma (al menos en inglés)

