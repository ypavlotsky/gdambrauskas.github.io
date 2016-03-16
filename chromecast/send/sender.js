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


/**
 * Initialize Cast media player API. Either successCallback and errorCallback
 * will be invoked once the API has finished initialization. The sessionListener
 * and receiverListener may be invoked at any time afterwards, and possibly
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
  var apiConfig = new chrome.cast.ApiConfig(sessionRequest,
                                            this.sessionListener.bind(this),
                                            this.receiverListener.bind(this),
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

/**
 * @param {!Object} e A new session
 */
Sender.prototype.sessionListener = function(e) {
  console.log('gvd session listener')
  if (!this.session) {
    this.session = e;
    this.session.addUpdateListener(this.sessionUpdateListener.bind(this));
  }
}


Sender.prototype.onRequestSessionSuccess = function(e) {
  console.log("Successfully created session: " + e.sessionId);
  this.session = e;
  this.loadMedia();
}


/**
 * @param {string} e Receiver availability
 * This indicates availability of receivers but
 * does not provide a list of device IDs
 */
Sender.prototype.receiverListener = function(e) {
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
Sender.prototype.sessionUpdateListener = function(isAlive) {
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
 * Loads media into a running receiver application
 * @param {Number} mediaIndex An index number to indicate current media content
 */
Sender.prototype.loadMedia = function() {
  if (!this.session) {
    console.log('no session');
    return;
  }

  var streamRequest = {};
  // optional api key
  // streamRequest.apiKey = '1v6tep0t3q0l59ud1qap9olkbj';
  // asset key is required for live streams.
  // streamRequest.assetKey = 'F-Aj4thaSC6yxrLIVITt1A';
  streamRequest.assetKey = 'sN_IYUG8STe1ZzhIIE_ksA';
  streamRequest.assetType = 'event';
  streamRequest.attemptPreroll = false;
  streamRequest.adTagParameters = 'bar=0&foo=1';
  var mediaInfo = new chrome.cast.media.MediaInfo(streamRequest.assetKey);
  mediaInfo.customData = streamRequest;

  mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
  mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
  mediaInfo.contentType = 'application/x-mpegurl';

  var request = new chrome.cast.media.LoadRequest(mediaInfo);
  request.autoplay = this.autoplay;
  request.currentTime = 0;
  this.session.loadMedia(request,
                         this.onMediaDiscovered.bind(this, 'loadMedia'),
                         this.onLoadMediaError.bind(this));
};

/**
 * Callback function for loadMedia success
 * @param {Object} mediaSession A new media object.
 */
Sender.prototype.onMediaDiscovered = function(how, mediaSession) {
  console.log('media discovered');
  console.log('gvd '+how);
  this.currentMediaSession = mediaSession;
};

/**
 * Callback function when media load returns error
 */
Sender.prototype.onLoadMediaError = function(e) {
  console.log('media error');
};


window.Sender = Sender;
})();
