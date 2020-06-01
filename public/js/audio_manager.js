import config from "../client_config.mjs";
import fetch from "node-fetch";
import log from "./logger.js";

export class AudioManager {

    constructor() {
        this.audioFiles = {};

        // TODO - consider using service workers to fulfill this.
        this.setupAudio()
            .then(() => log("Successfully loaded audio files.", "info"))
            .catch(e => log("Failed to setup audio due to cause: " + e, "error"));
    }

     /* Background music supplied by Eva – 失望した: https://youtu.be/jVTsD4UPT-k, 
     * License: Creative Commons Attribution 3.0 - http://bit.ly/RFP_CClicense. 
     * Collision sound: @Shades https://opengameart.org/content/8-bit-sound-effect-pack-vol-001 
     * Jump sounds: @Damaged Panda https://opengameart.org/content/100-plus-game-sound-effects-wavoggm4a **/

    // This function should load all audio files. 
    async setupAudio() {
        fetch("http://" + config.address + ":" + config.port + '/audio',{
            method: "GET", 
            credentials:"omit"
        }).then(response => {
            if (response.status === 200 && response.ok) {
                response.json().then(data => {
                    data["message"].forEach(file => {
                        let audio = new Audio(file.substring(file.indexOf("public")));
                        audio.volume = 0.4;
                        this.audioFiles[file.substring(file.lastIndexOf("/") + 1, file.lastIndexOf("."))] = audio;
                    });

                    this.setupEventListeners();
                }).catch(err => {
                    // this behaviour is expected during test, as node doesn't have Audio objects.
                    if (err.message !== "Audio is not defined") log(err.message, "error");
                });
            } else {
                throw Error("Resolving audio files failed with status code: " + response.status);
            }
        }).catch(err => {
            log("Error encountered when retrieving audio files: " + err.message, "error");
        });
    }

    setupEventListeners() {
        // pause brackground music when the user leaves the tab. other audio files are short lived so don't require this.
        document.addEventListener("visibilitychange", () => {
            try {
                if (document.hidden) {
                    this.audioFiles["backgroundMain"].pause();
                } else  {
                    this.audioFiles["backgroundMain"].play();
                }
            } catch (NoSuchAudioException) {
                logger.log("Unable to change state of audio due to: " + NoSuchAudioException, "error");
            }
        }, false);

        // loop the background music
        this.audioFiles["backgroundMain"].addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
          }, false);
    }
    
    playAudio(file, volume = 0.4) {
        let audio = this.audioFiles[file], _this = this;
    
        try {
            audio.volume = volume;
            if (!audio.paused) return;
            audio.play().then(() => {
                return;
            }).catch(function(PlaybackException) {
                log('Audio failed to play due to cause: ' + PlaybackException, "error");
                _this.retryPlayback(file); 
            });
        } catch (NoSuchAudioException) {
            log("Could not find audio object '" + file + "' with cause: " + NoSuchAudioException, "debug");
            // asynchronous AJAX request may not have finished, so retry quietly.
            _this.retryPlayback(file);
        }
    }
    
    retryPlayback(file, currentInvocation = 0) {
        let audio, maxInvocations = 10, _this = this;
        setTimeout(() => {
            // if the file was retrieved, then it can be played.
            if (audio = _this.audioFiles[file]) _this.playAudio(file);
            else if (currentInvocation < maxInvocations) _this.retryPlayback(file, currentInvocation + 1);
        }, 3000);  
    }
}