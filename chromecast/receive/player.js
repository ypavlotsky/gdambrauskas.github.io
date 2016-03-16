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
        try {
          console.log("gvd RECEIVED google.ima.cast.StreamEvent.Type.LOADED 2 event.getData() "+JSON.stringify(event.getData()));
        }catch(e){
          console.log("gvd errrrrrrrrrrrr "+e);
        }
        var streamUrl = event.getData().url;// gvd check fields in this, better to expose as public api etc
        var subtitles = event.getData().subtitles;
        console.log("gvd lading video with streamUrl0 "+streamUrl + " subtitle "+subtitles)
        var mediaInfo = {};
        mediaInfo.contentId = streamUrl;
        mediaInfo.contentType = 'application/x-mpegurl';
        self.loadStitchedVideo_(streamUrl);
      },
      false);
  var streamRequest = new google.ima.cast.StreamRequest();
  // optional api key
   streamRequest.apiKey = '1v6tep0t3q0l59ud1qap9olkbj';
  // asset key is required for live streams.
  streamRequest.assetKey = 'F-Aj4thaSC6yxrLIVITt1A';
  // gvd rus stream streamRequest.assetKey = 'sN_IYUG8STe1ZzhIIE_ksA';
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
  console.log('gvd receiver stream manager end of constructor')
};


example.Player.prototype.start = function() {
  this.receiverManager_.start();
  console.log('gvd started receiver manager')
};

/**
 * Called when the player is ready. We initialize the UI for the launching
 * and idle screens.
 *
 * @private
 */
example.Player.prototype.onReady_ = function() {
  console.log('onReady');
  // gvd
  var streamRequest = new google.ima.cast.StreamRequest();
  // optional api key
  // streamRequest.apiKey = '1v6tep0t3q0l59ud1qap9olkbj';
  // asset key is required for live streams.
  // streamRequest.assetKey = 'F-Aj4thaSC6yxrLIVITt1A';
  streamRequest.assetKey = 'sN_IYUG8STe1ZzhIIE_ksA';  // gvd rus stream
  streamRequest.assetType = google.ima.cast.StreamRequest.AssetType.EVENT;
  streamRequest.attemptPreroll = false;
  streamRequest.customParameters = 'bar=0&foo=1';
  //this.receiverStreamManager_.addEventListener(type, func, false)
  console.log('gvd about to make request')
  this.receiverStreamManager_.requestStream(streamRequest);
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
  this.load(new cast.receiver.MediaManager.LoadInfo( // gvd check out how this is used!
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
  console.log('onLoad_');
  var self = this;
  var media = info.message.media || {};
  console.log("gvd info  "+media.customData.foo)
  var contentType = media.contentType;
  console.log("gvd info  contentType "+contentType);
};


function gvdrequeststream(m) {
  var streamRequest = new google.ima.cast.StreamRequest();
  streamRequest.apiKey = '1v6tep0t3q0l59ud1qap9olkbj';
  streamRequest.assetKey = 'F-Aj4thaSC6yxrLIVITt1A';
  streamRequest.assetType = google.ima.cast.StreamRequest.AssetType.EVENT;
  streamRequest.attemptPreroll = true;
  streamRequest.customParameters = 'bar=0&foo=1';
  console.log('gvd 0000 streamRequest.apiKey ['+streamRequest.apiKey+']')
  console.log(streamRequest)
  m.requestStream(streamRequest);
}

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
  /* gvd
  host.processMetadata = function(type, data, timestamp) {
    console.log("gvd entry for metadata "+String.fromCharCode.apply(null, data))
    self.receiverStreamManager_.processMetadata(type, data, timestamp);
  };
  */
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