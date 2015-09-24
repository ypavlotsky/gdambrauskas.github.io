'use strict';

/**
 * Creates the namespace
 */
var example = example || {};

example.Player = function(mediaElement) {
  cast.player.api.setLoggerLevel(cast.player.api.LoggerLevel.DEBUG);
  cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);
  // cast.player.api.Player
  this.player_ = null;
  // HTMLMediaElement
  this.mediaElement_ = mediaElement;
  // cast.receiver.CastReceiverManager
  this.receiverManager_ = cast.receiver.CastReceiverManager.getInstance();
  this.receiverManager_.onReady = this.onReady_.bind(this);
  this.receiverManager_.onSenderDisconnected =
      this.onSenderDisconnected_.bind(this);

  /**
   * The remote media object.
   * @private {cast.receiver.MediaManager}
   */
  this.mediaManager_ = new cast.receiver.MediaManager(this.mediaElement_);
  this.receiverStreamManager_ =
    new google.ima.cast.ReceiverStreamManager(this.mediaElement_,
                                              this.mediaManager_);
  var self = this;
  this.receiverStreamManager_.addEventListener(
      google.ima.cast.StreamEvent.Type.STREAM_INITIALIZED,
      function(event) {
        console.log("gvd RECEIVED google.ima.cast.StreamEvent.Type.STREAM_INITIALIZED ")
        console.log(event.type)
        console.log(event.getData())
        var streamUrl = event.getData().streamUrl;
        var subtitles = event.getData().subtitles;
        console.log("gvd lading video with streamUrl0 "+streamUrl)
        var mediaInfo = {};
        mediaInfo.contentId = streamUrl;
        // gvd mediaInfo.metadata = {};
        // mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
        mediaInfo.contentType = 'application/x-mpegurl';
        console.log("gvd lading video with streamUrl1 "+streamUrl)
        self.loadStitchedVideo_(mediaInfo);
        /*
         Object
         streamUrl: "http://truman-qa.sandbox.google.com/ssai/master/event/nSDLa3IJTLCecel2IaECyA/session/05222fd5-aed3-4652-ab43-74077295a810/master.m3u8"subtitles: Array[0]
         */
        // gvd self.onReceiverStreamManagerEvent_(),
      },
      false);
  var streamRequest = new google.ima.cast.StreamRequest();
  streamRequest.apiKey = 'apiKey';
  streamRequest.assetKey = 'nSDLa3IJTLCecel2IaECyA';
  streamRequest.assetType = google.ima.cast.StreamRequest.AssetType.EVENT;
  streamRequest.attemptPreroll = false;
  streamRequest.customParameters = 'bar=0&foo=1';
  //this.receiverStreamManager_.addEventListener(type, func, false)
  //this.receiverStreamManager_.requestStream(streamRequest);

  /**
   * The original load callback.
   * @private {?function(cast.receiver.MediaManager.Event)}
   */
  this.onLoadOrig_ =
      this.mediaManager_.onLoad.bind(this.mediaManager_);
  this.mediaManager_.onLoad = this.onLoad_.bind(this);

  /**
   * The original editTracksInfo callback
   * @private {?function(!cast.receiver.MediaManager.Event)}
   */
  this.onEditTracksInfoOrig_ =
      this.mediaManager_.onEditTracksInfo.bind(this.mediaManager_);
  this.mediaManager_.onEditTracksInfo = this.onEditTracksInfo_.bind(this);

};

/**
 * Called when the player is ready. We initialize the UI for the launching
 * and idle screens.
 *
 * @private
 */
example.Player.prototype.onReady_ = function() {
  this.log_('onReady');
};

/**
 * Called when a sender disconnects from the app.
 *
 * @param {cast.receiver.CastReceiverManager.SenderDisconnectedEvent} event
 * @private
 */
example.Player.prototype.onSenderDisconnected_ = function(event) {
  this.log_('onSenderDisconnected');
  // When the last or only sender is connected to a receiver,
  // tapping Disconnect stops the app running on the receiver.
  if (this.receiverManager_.getSenders().length === 0 &&
      event.reason ===
          cast.receiver.system.DisconnectReason.REQUESTED_BY_SENDER) {
    this.receiverManager_.stop();
  }
};