cast.receiver.logger.setLevelValue(0);
console.log('receiver: player script loaded');
window.mediaElement = document.getElementById('media');
window.mediaElement.autoplay = true;

window.mediaElement.addEventListener('pause', onPause);
window.mediaElement.addEventListener('play', onPlay);

var castPlayer;

function onPause() {
  if (castPlayer.getState().underflow) {
    // video is paused because of buffering
    // handing buffering event here
    console.log('receiver: media paused, buffering');
  } else {
    // video is paused for the other reason.
    console.log('receiver: media paused, some other reason');
  }
}

function onPlay() {
  // Now buffering ends.
}

window.mediaManager = new cast.receiver.MediaManager(window.mediaElement);
window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
window.castReceiverManager.start();

window.castReceiverManager.onSenderDisconnected = function() {
  window.close();
}

window.splashImg = document.getElementById('splash');

var origOnLoad = window.mediaManager.onLoad.bind(window.mediaManager);
var origOnLoadEvent;
window.mediaManager.onLoad = function(event) {
  console.log('receiver: window.mediaManager.onLoad');
  origOnLoadEvent = event;
  window.splashImg.style.display = 'none';
  window.mediaElement.style.display = 'block';
  
  protocolFunc = cast.player.api.CreateHlsStreamingProtocol;
  var url = 'http://gvabox.com/html5/sanils/mock_preroll/playlist.m3u8';//info.message.media.contentId;
  url = 'http://www.gvabox.com/truman/media/star_trek/master_dec.m3u8';
  url = 'http://gvabox.com/html5/sanils/mock_live/playlist.m3u8';
  console.log('loadVideo_: using MPL');
  var host = new cast.player.api.Host({
    'url': url,
    'mediaElement': window.mediaElement
  });
  host.processMetadata = function(type,data,timestamp) {
    console.log('process meta: '+type+ ' ' +data +' '+timestamp);
  }
  // When MPL is used, buffering status should be detected by
  // getState()['underflow]'
  // why remove if never added???
  //window.mediaElement.removeEventListener('stalled', this.onBuffering_);
  //window.mediaElement.removeEventListener('waiting', this.onBuffering_);
  castPlayer = new cast.player.api.Player(host);
  castPlayer.load(protocolFunc(host), Infinity);
  
  
  // gvd initIMA();
}

var origOnEnded, origOnSeek;

var adDisplayContainer, adsLoader, adsManager;

function initIMA() {
  adDisplayContainer = new google.ima.AdDisplayContainer(document.getElementById('adContainer'), window.mediaElement);
  adDisplayContainer.initialize();
  adsLoader = new google.ima.AdsLoader(adDisplayContainer);
  adsLoader.addEventListener(google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED, onAdsManagerLoaded, false);
  adsLoader.addEventListener(google.ima.AdErrorEvent.Type.AD_ERROR, onAdError, false);
  var adsRequest = new google.ima.AdsRequest();
  adsRequest.adTagUrl = 'http://pubads.g.doubleclick.net/gampad/ads?sz=1280x720&iu=/6062/static_display_ads_workshop_march_2015&ciu_szs&impl=s&gdfp_req=1&env=vp&output=xml_vast2&unviewed_position_start=1&url=[referrer_url]&description_url=[description_url]&correlator=[timestamp]';
  adsRequest.linearAdSlotWidth = window.mediaElement.width;
  adsRequest.linearAdSlotHeight = window.mediaElement.height;
  adsRequest.nonLinearAdSlotWidth = window.mediaElement.width;
  adsRequest.nonLinearAdSlotHeight = window.mediaElement.height / 3;
  adsLoader.requestAds(adsRequest);
}

function onAdsManagerLoaded(adsManagerLoadedEvent) {
  // Get the ads manager.
  adsManager = adsManagerLoadedEvent.getAdsManager(
      window.mediaElement);  // should be set to the content video element

  // Add listeners to the required events.
  adsManager.addEventListener(
      google.ima.AdErrorEvent.Type.AD_ERROR,
      onAdError);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
      onContentPauseRequested);
  adsManager.addEventListener(
      google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
      onContentResumeRequested);

  try {
    // Initialize the ads manager. Ad rules playlist will start at this time.
    adsManager.init(640, 360, google.ima.ViewMode.NORMAL);
    // Call play to start showing the ad. Single video and overlay ads will
    // start at this time; the call will be ignored for ad rules.
    adsManager.start();
  } catch (adError) {
    // An error may be thrown if there was a problem with the VAST response.
    mediaElement.play();
  }
}

function onAdError(adErrorEvent) {
  // Handle the error logging.
  if (adsManager) {
    adsManager.destroy();
  }
  origOnLoad(origOnLoadEvent);
}
    
function onContentPauseRequested() {
  origOnEnded = window.mediaManager.onEnded.bind(window.mediaManager);
  window.mediaManager.onEnded = function(event) {};
  origOnSeek = window.mediaManager.onSeek.bind(window.mediaManager);
  window.mediaManager.onSeek = function(event) {
    var requestId = event.data.requestId;
    window.mediaManager.broadcastStatus(true, requestId);
  }
}
    
function onContentResumeRequested() {
  window.mediaManager.onEnded = origOnEnded;
  window.mediaElement.addEventListener('playing', function() {
    var mediaInfo = window.mediaManager.getMediaInformation();
    mediaInfo.duration = window.mediaElement.duration;
    window.mediaManager.setMediaInformation(mediaInfo);
  });
  window.mediaManager.onSeek = origOnSeek;
  origOnLoad(origOnLoadEvent);
}