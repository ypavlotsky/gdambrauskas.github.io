(function() {
  'use strict';

var Sender = function() {
  // A boolean to indicate availability of receivers
  this.receiversAvailable_ = false;
  // chrome.cast.media.Media object
  this.currentMediaSession = null;
  // chrome.cast.Session object
  this.session = null;
  this.initializeSender();
};


Sender.SAMPLE_ASSET_KEY = '0-QkebeWTPmf7FbbxzcHCw';
Sender.SAMPLE_AD_TAG_PARAMS = {bar: 0, foo: 1};


/**
 * Initialize Cast media player API. Either successCallback and errorCallback
 * will be invoked once the API has finished initialization. The onSessionInit
 * and receiverInit may be invoked at any time afterwards, and possibly
 * more than once.
 */
Sender.prototype.initializeSender = function() {
  if (!chrome.cast || !chrome.cast.isAvailable) {
    setTimeout(this.initializeSender.bind(this), 1000);
    return;
  }
  var applicationID = 'BC48F4DE';
  var autoJoinPolicy = chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED;
  var sessionRequest = new chrome.cast.SessionRequest(applicationID);
  var apiConfig =new chrome.cast.ApiConfig(sessionRequest,
                                            this.onSessionInit.bind(this),
                                            this.onReceiverInit.bind(this),
                                            autoJoinPolicy);
  chrome.cast.initialize(apiConfig,
                         this.onInitSuccess.bind(this),
                         this.onError.bind(this));
};


/**
 * Callback function for init success
 */
Sender.prototype.onInitSuccess = function() {
  console.log('init success');
  this.launchApp();
};


/**
 * Generic error callback function
 */
Sender.prototype.onError = function() {
  console.log('error');
};


Sender.prototype.onSessionInit = function(e) {
  if (!this.session) {
    this.session = e;
    this.session.addUpdateListener(this.onSessionUpdate.bind(this));
  }
};


Sender.prototype.onRequestSessionSuccess = function(e) {
  console.log("Successfully created session: " + e.sessionId);
  this.session = e;
  this.loadMedia();
};


/**
 * Callback when receiver is available..
 * @param {string} e Receiver availability.
 */
Sender.prototype.onReceiverInit = function(e) {
  if( e === 'available' ) {
    this.receiversAvailable_ = true;
    console.log('receiver found');
  }
  else {
    console.log('receiver list empty');
  }
};


/**
 * Session update listener
 */
Sender.prototype.onSessionUpdate = function(isAlive) {
  if (!isAlive) {
    this.session = null;
    clearInterval(this.timer);
  }
};


/**
 * Requests that a receiver application session be created or joined. By
 * default, the SessionRequest passed to the API at initialization time is used;
 * this may be overridden by passing a different session request in
 * opt_sessionRequest.
 */
Sender.prototype.launchApp = function() {
  console.log('launching app...');
  chrome.cast.requestSession(
      this.onRequestSessionSuccess.bind(this),
      this.onLaunchError.bind(this));
  if( this.timer ) {
    clearInterval(this.timer);
  }
};


/**
 * Callback function for launch error
 */
Sender.prototype.onLaunchError = function() {
  console.log('launch error');
};


/**
 * Loads media into a running receiver application.
 */
Sender.prototype.loadMedia = function() {
  if (!this.session) {
    console.log('no session');
    return;
  }

  var streamRequest = {};
  streamRequest.assetKey = Sender.SAMPLE_ASSET_KEY;
  streamRequest.attemptPreroll = false;
  streamRequest.adTagParameters = Sender.SAMPLE_AD_TAG_PARAMS;
  var mediaInfo = new chrome.cast.media.MediaInfo(streamRequest.assetKey);
  mediaInfo.customData = streamRequest;
  mediaInfo.contentType = 'application/x-mpegurl';

  var request = new chrome.cast.media.LoadRequest(mediaInfo);
  request.currentTime = 0;
  this.session.loadMedia(request,
      this.onMediaDiscovered.bind(this, 'loadMedia'),
      this.onLoadMediaError.bind(this));
};


/**
 * Callback function for loadMedia success.
 */
Sender.prototype.onMediaDiscovered = function(how, mediaSession) {
  this.currentMediaSession = mediaSession;
};


/**
 * Callback function when media load returns error
 */
Sender.prototype.onLoadMediaError = function(e/*chrome.cast.Error*/) {
  console.log('media error: ' + e.code + " " +e.description);
};


window.Sender = Sender;
})();
