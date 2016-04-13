'use strict';

/**
 * Entry point for the sample video player which uses media element for
 * rendering video streams.
 *
 * @param {!HTMLMediaElement} mediaElement for video rendering.
 */
var Player = function(mediaElement) {
  this.castPlayer_ = null;
  this.mediaElement_ = mediaElement;
  this.receiverManager_ = cast.receiver.CastReceiverManager.getInstance();
  this.receiverManager_.onSenderConnected = function(event) {
    console.log('Sender Connected');
  };
  this.receiverManager_.onSenderDisconnected =
      this.onSenderDisconnected.bind(this);
  this.mediaManager_ = new cast.receiver.MediaManager(this.mediaElement_);
  this.receiverStreamManager_ =
      new google.ima.cast.ReceiverStreamManager(this.mediaElement_);
  //var onStreamDataReceived = this.onStreamDataReceived.bind(this);
  this.onStreamDataReceived = this.onStreamDataReceived.bind(this);
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
        this.onStreamDataReceived(streamUrl);
      },
      false);
  this.receiverStreamManager_.addEventListener(
      google.ima.cast.StreamEvent.Type.ERROR,
      function(event) {
        console.log("Got an error: " +event.getData().errorMessage);
      },
      false);
  this.mediaManager_.onLoad = this.onLoad.bind(this);
};


/**
 * Starts receiver manager which tracks playback of the stream.
 */
Player.prototype.start = function() {
  this.receiverManager_.start();
};

/**
 * Called when a sender disconnects from the app.
 * @param {cast.receiver.CastReceiverManager.SenderDisconnectedEvent} event
 */
Player.prototype.onSenderDisconnected = function(event) {
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
 * Called when we receive a LOAD message from the sender.
 * @param {!cast.receiver.MediaManager.Event} event The load event.
 */
Player.prototype.onLoad = function(event) {
  console.log("gvd onload")
  var imaRequestData = event.data.media.customData;
  var streamRequest = new google.ima.cast.StreamRequest();
  streamRequest.assetKey = imaRequestData.assetKey;
  streamRequest.attemptPreroll = imaRequestData.attemptPreroll;
  streamRequest.adTagParameters = imaRequestData.adTagParameters;
  console.log("gvd onload about to request stream")
  this.receiverStreamManager_.requestStream(streamRequest);
};


/**
 * Loads stitched ads+content stream.
 * @param {!string} url of the stream.
 */
Player.prototype.onStreamDataReceived = function(url) {
  var self = this;
  var host = new cast.player.api.Host({
    'url': url,
    'mediaElement': this.mediaElement_
  });
  var self = this;
  host.processMetadata = function(type, data, timestamp) {
    self.receiverStreamManager_.processMetadata(type, data, timestamp);
  };
  this.castPlayer_ = new cast.player.api.Player(host);
  this.castPlayer_.load(cast.player.api.CreateHlsStreamingProtocol(host));
};
