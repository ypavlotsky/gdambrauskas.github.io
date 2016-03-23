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
  this.receiverManager_.onSenderConnected = function(event) {
    console.log('Received Sender Connected event: ' + event.data);
  };
  this.receiverManager_.onSenderDisconnected =
      this.onSenderDisconnected_.bind(this);

  // cast.receiver.MediaManager
  this.mediaManager_ = new cast.receiver.MediaManager(this.mediaElement_);
  // google.ima.cast.ReceiverStreamManager
  this.receiverStreamManager_ =
    new google.ima.cast.ReceiverStreamManager(this.mediaElement_,
                                              this.mediaManager_);
  var self = this;
  this.receiverStreamManager_.addEventListener(
      google.ima.cast.StreamEvent.Type.LOADED,
      function(event) {
        var streamUrl = event.getData().url;// gvd check fields in this, better to expose as public api etc
        // gvd using alex stream to check if stalling dissapears
        streamUrl = "http://truman-qa.sandbox.google.com/ssai/event/X2trRZ7lQ_yiyG_ymZHMlA/master.m3u8";
        var subtitles = event.getData().subtitles;
        console.log("gvd lading video with streamUrl0 "+streamUrl + " subtitle "+subtitles)
        var mediaInfo = {};
        mediaInfo.contentId = streamUrl;
        mediaInfo.contentType = 'application/x-mpegurl';
        self.loadStitchedVideo_(streamUrl);
      },
      false);

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


example.Player.prototype.start = function() {
  this.receiverManager_.start();
};

/**
 * Called when a sender disconnects from the app.
 *
 * @param {cast.receiver.CastReceiverManager.SenderDisconnectedEvent} event
 * @private
 */
example.Player.prototype.onSenderDisconnected_ = function(event) {
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
 * @see example.Player#load
 * @param {cast.receiver.MediaManager.Event} event The load event.
 * @private
 */
example.Player.prototype.onLoad_ = function(event) {
  console.log('onLoad_');
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
example.Player.prototype.load = function(info) {
  var media = info.message.media || {};
  var contentType = media.contentType;
  var streamRequest = new google.ima.cast.StreamRequest();
  streamRequest.assetKey = media.customData.assetKey;
  streamRequest.streamType = media.customData.streamType;
  streamRequest.attemptPreroll = media.customData.attemptPreroll;
  streamRequest.adTagParameters = media.customData.adTagParameters;
  console.log('received data from the sender, streamType ' +
      streamRequest.streamType);
  this.receiverStreamManager_.requestStream(streamRequest);
};


/**
 * Load stitched ads+video stream.
 *
 * @param {!cast.receiver.MediaManager.LoadInfo} info The load request info.
 * @return {boolean} Whether the media was preloaded
 * @private
 */
example.Player.prototype.loadStitchedVideo_ = function(url) {
  console.log("gvd loadStitchedVideo_");
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
  this.player_ = new cast.player.api.Player(host);
  this.player_.load(cast.player.api.CreateHlsStreamingProtocol(host));
  // gvd this.loadMediaManagerInfo_(info, !!protocolFunc);
};

/**
 * Called when we receive a EDIT_TRACKS_INFO message.
 *
 * @param {!cast.receiver.MediaManager.Event} event The editTracksInfo event.
 * @private
 */
example.Player.prototype.onEditTracksInfo_ = function(event) {
  console.log('onEditTracksInfo');
  this.onEditTracksInfoOrig_(event);

  // If the captions are embedded or ttml we need to enable/disable tracks
  // as needed (vtt is processed by the media manager)
  if (!event.data || !event.data.activeTrackIds || !this.textTrackType_) {
    return;
  }
  var mediaInformation = this.mediaManager_.getMediaInformation() || {};
  var type = this.textTrackType_;
  if (type == 'ttml') {
    // The player_ may not have been created yet if the type of media did
    // not require MPL. It will be lazily created in processTtmlCues_
//    if (this.player_) {
//      this.player_.enableCaptions(false, cast.player.api.CaptionsType.TTML);
//    }
//    this.processTtmlCues_(event.data.activeTrackIds,
//        mediaInformation.tracks || []);
  } else if (type == 'embedded') {
//    this.player_.enableCaptions(false);
//    this.processInBandTracks_(event.data.activeTrackIds);
//    this.player_.enableCaptions(true);
  }
};