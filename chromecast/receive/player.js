'use strict';

var Player = function(mediaElement) {
  this.castPlayer_ = null;
  this.mediaElement_ = mediaElement;
  cast.player.api.setLoggerLevel(cast.player.api.LoggerLevel.DEBUG);
  cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);
  this.receiverManager_ = cast.receiver.CastReceiverManager.getInstance();
  this.receiverManager_.onSenderConnected = function(event) {
    console.log('Sender Connected');
  };
  this.receiverManager_.onSenderDisconnected =
      this.onSenderDisconnected_.bind(this);
  this.mediaManager_ = new cast.receiver.MediaManager(this.mediaElement_);
  this.receiverStreamManager_ =
    new google.ima.cast.ReceiverStreamManager(this.mediaElement_,
        this.mediaManager_);
  var self = this;
  this.receiverStreamManager_.addEventListener(
      google.ima.cast.StreamEvent.Type.LOADED,
      function(event) {
        var streamUrl = event.getData().url;
        // Each element in subtitles array is an object with url and language
        // properties. Example of a subtitles array with 2 elements:
        // {
        //   "url": "http://www.sis.com/1234/subtitles_en.ttml",
        //   "language": "en"
        // }, {
        //   "url": "http://www.sis.com/1234/subtitles_fr.ttml",
        //   "language": "fr"
        // }
        var subtitles = event.getData().subtitles;
        var mediaInfo = {};
        mediaInfo.contentId = streamUrl;
        mediaInfo.contentType = 'application/x-mpegurl';
        self.onStreamLoaded(streamUrl);
      },
      false);
  this.receiverStreamManager_.addEventListener(
    google.ima.cast.StreamEvent.Type.ERROR,
    function(event) {
      console.log("Got an error: " +event.getData().errorMessage);
    },
    false);

  /**
   * The original load callback.
   * @private {?function(cast.receiver.MediaManager.Event)}
   */
  this.onLoadOrig_ =
      this.mediaManager_.onLoad.bind(this.mediaManager_);
  this.mediaManager_.onLoad = this.onLoad_.bind(this);
};


Player.prototype.start = function() {
  this.receiverManager_.start();
};

/**
 * Called when a sender disconnects from the app.
 *
 * @param {cast.receiver.CastReceiverManager.SenderDisconnectedEvent} event
 * @private
 */
Player.prototype.onSenderDisconnected_ = function(event) {
  console.log('onSenderDisconnected');
  // When the last or only sender is connected to a receiver,
  // tapping Disconnect stops the app running on the receiver.
  if (this.receiverManager_.getSenders().length === 0 &&
      event.reason ===
          cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER) {
    this.receiverManager_.stop();
  }
};

/**
 * Called when we receive a LOAD message. Calls load().
 *
 * @see Player#load
 * @param {cast.receiver.MediaManager.Event} event The load event.
 * @private
 */
Player.prototype.onLoad_ = function(event) {
  this.load(new cast.receiver.MediaManager.LoadInfo(
      /** @type {!cast.receiver.MediaManager.LoadRequestData} */ (event.data),
      event.senderId));
};

/**
 * Loads the given data. Request comes from sender app.
 *
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load request info.
 * @export
 */
Player.prototype.load = function(info) {
  var media = info.message.media || {};
  var contentType = media.contentType;
  var streamRequest = new google.ima.cast.StreamRequest();
  streamRequest.assetKey = media.customData.assetKey;
  streamRequest.streamType = media.customData.streamType;
  // If the stream is live
  streamRequest.streamType = google.ima.cast.StreamRequest.StreamType.EVENT;
  // If it is video on demand, use CONTENT
  // streamRequest.streamType =
  //     google.ima.cast.StreamRequest.StreamType.CONTENT;
  streamRequest.contentSourceId = 'contentid';
  streamRequest.videoId = 'vid';
  streamRequest.attemptPreroll = media.customData.attemptPreroll;
  streamRequest.adTagParameters = media.customData.adTagParameters;
  this.receiverStreamManager_.requestStream(streamRequest);
};


/**
 * Load stitched ads+video stream.
 *
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load request info.
 * @return {boolean} Whether the media was preloaded.
 * @private
 */
Player.prototype.onStreamLoaded = function(url) {
  console.log("gvd onStreamLoaded");
  var self = this;
  var host = new cast.player.api.Host({
    'url': url,
    'mediaElement': this.mediaElement_
  });
  var self = this;
  host.processMetadata = function(type, data, timestamp) {
    console.log("gvd entry for metadata "+String.fromCharCode.apply(null, data))
    self.receiverStreamManager_.processMetadata(type, data, timestamp);
  };
  // gvd host.onError = loadErrorCallback;
  this.castPlayer_ = new cast.player.api.Player(host);
  this.castPlayer_.load(cast.player.api.CreateHlsStreamingProtocol(host));
};