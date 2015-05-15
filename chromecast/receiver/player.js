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
    console.log('process meta type: '+type+ ' data ' +data +' timestamp '+timestamp);
    var str = String.fromCharCode.apply(null, data);
    console.log('string '+str)
  }
  // When MPL is used, buffering status should be detected by
  // getState()['underflow]'
  // why remove if never added???
  //window.mediaElement.removeEventListener('stalled', this.onBuffering_);
  //window.mediaElement.removeEventListener('waiting', this.onBuffering_);
  castPlayer = new cast.player.api.Player(host);
  console.log('receiver: loading url '+url);
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

//Copyright (c) 2012 The Chromium Authors. All rights reserved.
//Use of this source code is governed by a BSD-style license that can be
//found in the LICENSE file.

/**
* @constructor
* @param {ArrayBuffer} arrayBuffer An array of buffers to be read from.
* @param {number=} opt_offset Offset to read bytes at.
* @param {number=} opt_length Number of bytes to read.
*/
function ByteReader(arrayBuffer, opt_offset, opt_length) {
opt_offset = opt_offset || 0;
opt_length = opt_length || (arrayBuffer.byteLength - opt_offset);
this.view_ = new DataView(arrayBuffer, opt_offset, opt_length);
this.pos_ = 0;
this.seekStack_ = [];
this.setByteOrder(ByteReader.BIG_ENDIAN);
}

//Static constants and methods.

/**
* Intel, 0x1234 is [0x34, 0x12]
* @const
* @type {number}
*/
ByteReader.LITTLE_ENDIAN = 0;
/**
* Motorola, 0x1234 is [0x12, 0x34]
* @const
* @type {number}
*/
ByteReader.BIG_ENDIAN = 1;

/**
* Seek relative to the beginning of the buffer.
* @const
* @type {number}
*/
ByteReader.SEEK_BEG = 0;
/**
* Seek relative to the current position.
* @const
* @type {number}
*/
ByteReader.SEEK_CUR = 1;
/**
* Seek relative to the end of the buffer.
* @const
* @type {number}
*/
ByteReader.SEEK_END = 2;

/**
* Throw an error if (0 > pos >= end) or if (pos + size > end).
*
* Static utility function.
*
* @param {number} pos Position in the file.
* @param {number} size Number of bytes to read.
* @param {number} end Maximum position to read from.
*/
ByteReader.validateRead = function(pos, size, end) {
if (pos < 0 || pos >= end)
 throw new Error('Invalid read position');

if (pos + size > end)
 throw new Error('Read past end of buffer');
};

/**
* Read as a sequence of characters, returning them as a single string.
*
* This is a static utility function.  There is a member function with the
* same name which side-effects the current read position.
*
* @param {DataView} dataView Data view instance.
* @param {number} pos Position in bytes to read from.
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @return {string} Read string.
*/
ByteReader.readString = function(dataView, pos, size, opt_end) {
ByteReader.validateRead(pos, size, opt_end || dataView.byteLength);

var codes = [];

for (var i = 0; i < size; ++i)
 codes.push(dataView.getUint8(pos + i));

return String.fromCharCode.apply(null, codes);
};

/**
* Read as a sequence of characters, returning them as a single string.
*
* This is a static utility function.  There is a member function with the
* same name which side-effects the current read position.
*
* @param {DataView} dataView Data view instance.
* @param {number} pos Position in bytes to read from.
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @return {string} Read string.
*/
ByteReader.readNullTerminatedString = function(dataView, pos, size, opt_end) {
ByteReader.validateRead(pos, size, opt_end || dataView.byteLength);

var codes = [];

for (var i = 0; i < size; ++i) {
 var code = dataView.getUint8(pos + i);
 if (code == 0) break;
 codes.push(code);
}

return String.fromCharCode.apply(null, codes);
};

/**
* Read as a sequence of UTF16 characters, returning them as a single string.
*
* This is a static utility function.  There is a member function with the
* same name which side-effects the current read position.
*
* @param {DataView} dataView Data view instance.
* @param {number} pos Position in bytes to read from.
* @param {boolean} bom True if BOM should be parsed.
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @return {string} Read string.
*/
ByteReader.readNullTerminatedStringUTF16 = function(
 dataView, pos, bom, size, opt_end) {
ByteReader.validateRead(pos, size, opt_end || dataView.byteLength);

var littleEndian = false;
var start = 0;

if (bom) {
 littleEndian = (dataView.getUint8(pos) == 0xFF);
 start = 2;
}

var codes = [];

for (var i = start; i < size; i += 2) {
 var code = dataView.getUint16(pos + i, littleEndian);
 if (code == 0) break;
 codes.push(code);
}

return String.fromCharCode.apply(null, codes);
};

/**
* @const
* @type {Array.<string>}
* @private
*/
ByteReader.base64Alphabet_ =
 ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/').
 split('');

/**
* Read as a sequence of bytes, returning them as a single base64 encoded
* string.
*
* This is a static utility function.  There is a member function with the
* same name which side-effects the current read position.
*
* @param {DataView} dataView Data view instance.
* @param {number} pos Position in bytes to read from.
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @return {string} Base 64 encoded value.
*/
ByteReader.readBase64 = function(dataView, pos, size, opt_end) {
ByteReader.validateRead(pos, size, opt_end || dataView.byteLength);

var rv = [];
var chars = [];
var padding = 0;

for (var i = 0; i < size; /* incremented inside */) {
 var bits = dataView.getUint8(pos + (i++)) << 16;

 if (i < size) {
   bits |= dataView.getUint8(pos + (i++)) << 8;

   if (i < size) {
     bits |= dataView.getUint8(pos + (i++));
   } else {
     padding = 1;
   }
 } else {
   padding = 2;
 }

 chars[3] = ByteReader.base64Alphabet_[bits & 63];
 chars[2] = ByteReader.base64Alphabet_[(bits >> 6) & 63];
 chars[1] = ByteReader.base64Alphabet_[(bits >> 12) & 63];
 chars[0] = ByteReader.base64Alphabet_[(bits >> 18) & 63];

 rv.push.apply(rv, chars);
}

if (padding > 0)
 rv[rv.length - 1] = '=';
if (padding > 1)
 rv[rv.length - 2] = '=';

return rv.join('');
};

/**
* Read as an image encoded in a data url.
*
* This is a static utility function.  There is a member function with the
* same name which side-effects the current read position.
*
* @param {DataView} dataView Data view instance.
* @param {number} pos Position in bytes to read from.
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @return {string} Image as a data url.
*/
ByteReader.readImage = function(dataView, pos, size, opt_end) {
opt_end = opt_end || dataView.byteLength;
ByteReader.validateRead(pos, size, opt_end);

// Two bytes is enough to identify the mime type.
var prefixToMime = {
 '\x89P' : 'png',
 '\xFF\xD8' : 'jpeg',
 'BM' : 'bmp',
 'GI' : 'gif'
};

var prefix = ByteReader.readString(dataView, pos, 2, opt_end);
var mime = prefixToMime[prefix] ||
   dataView.getUint16(pos, false).toString(16);  // For debugging.

var b64 = ByteReader.readBase64(dataView, pos, size, opt_end);
return 'data:image/' + mime + ';base64,' + b64;
};

//Instance methods.

/**
* Return true if the requested number of bytes can be read from the buffer.
*
* @param {number} size Number of bytes to read.
* @return {boolean} True if allowed, false otherwise.
*/
ByteReader.prototype.canRead = function(size) {
return this.pos_ + size <= this.view_.byteLength;
};

/**
* Return true if the current position is past the end of the buffer.
* @return {boolean} True if EOF, otherwise false.
*/
ByteReader.prototype.eof = function() {
return this.pos_ >= this.view_.byteLength;
};

/**
* Return true if the current position is before the beginning of the buffer.
* @return {boolean} True if BOF, otherwise false.
*/
ByteReader.prototype.bof = function() {
return this.pos_ < 0;
};

/**
* Return true if the current position is outside the buffer.
* @return {boolean} True if outside, false if inside.
*/
ByteReader.prototype.beof = function() {
return this.pos_ >= this.view_.byteLength || this.pos_ < 0;
};

/**
* Set the expected byte ordering for future reads.
* @param {number} order Byte order. Either LITTLE_ENDIAN or BIG_ENDIAN.
*/
ByteReader.prototype.setByteOrder = function(order) {
this.littleEndian_ = order == ByteReader.LITTLE_ENDIAN;
};

/**
* Throw an error if the reader is at an invalid position, or if a read a read
* of |size| would put it in one.
*
* You may optionally pass opt_end to override what is considered to be the
* end of the buffer.
*
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
*/
ByteReader.prototype.validateRead = function(size, opt_end) {
if (typeof opt_end == 'undefined')
 opt_end = this.view_.byteLength;

ByteReader.validateRead(this.pos_, size, opt_end);
};

/**
* @param {number} width Number of bytes to read.
* @param {boolean=} opt_signed True if signed, false otherwise.
* @param {number=} opt_end Maximum position to read from.
* @return {string} Scalar value.
*/
ByteReader.prototype.readScalar = function(width, opt_signed, opt_end) {
var method = opt_signed ? 'getInt' : 'getUint';

switch (width) {
 case 1:
   method += '8';
   break;

 case 2:
   method += '16';
   break;

 case 4:
   method += '32';
   break;

 case 8:
   method += '64';
   break;

 default:
   throw new Error('Invalid width: ' + width);
   break;
}

this.validateRead(width, opt_end);
var rv = this.view_[method](this.pos_, this.littleEndian_);
this.pos_ += width;
return rv;
};

/**
* Read as a sequence of characters, returning them as a single string.
*
* Adjusts the current position on success.  Throws an exception if the
* read would go past the end of the buffer.
*
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @return {string} String value.
*/
ByteReader.prototype.readString = function(size, opt_end) {
var rv = ByteReader.readString(this.view_, this.pos_, size, opt_end);
this.pos_ += size;
return rv;
};


/**
* Read as a sequence of characters, returning them as a single string.
*
* Adjusts the current position on success.  Throws an exception if the
* read would go past the end of the buffer.
*
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @return {string} Null-terminated string value.
*/
ByteReader.prototype.readNullTerminatedString = function(size, opt_end) {
var rv = ByteReader.readNullTerminatedString(this.view_,
                                            this.pos_,
                                            size,
                                            opt_end);
this.pos_ += rv.length;

if (rv.length < size) {
 // If we've stopped reading because we found '0' but didn't hit size limit
 // then we should skip additional '0' character
 this.pos_++;
}

return rv;
};


/**
* Read as a sequence of UTF16 characters, returning them as a single string.
*
* Adjusts the current position on success.  Throws an exception if the
* read would go past the end of the buffer.
*
* @param {boolean} bom True if BOM should be parsed.
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @return {string} Read string.
*/
ByteReader.prototype.readNullTerminatedStringUTF16 =
 function(bom, size, opt_end) {
var rv = ByteReader.readNullTerminatedStringUTF16(
   this.view_, this.pos_, bom, size, opt_end);

if (bom) {
 // If the BOM word was present advance the position.
 this.pos_ += 2;
}

this.pos_ += rv.length;

if (rv.length < size) {
 // If we've stopped reading because we found '0' but didn't hit size limit
 // then we should skip additional '0' character
 this.pos_ += 2;
}

return rv;
};


/**
* Read as an array of numbers.
*
* Adjusts the current position on success.  Throws an exception if the
* read would go past the end of the buffer.
*
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @param {function(new:Array.<*>)=} opt_arrayConstructor Array constructor.
* @return {Array.<*>} Array of bytes.
*/
ByteReader.prototype.readSlice = function(size, opt_end,
                                       opt_arrayConstructor) {
this.validateRead(size, opt_end);

var arrayConstructor = opt_arrayConstructor || Uint8Array;
var slice = new arrayConstructor(
   this.view_.buffer, this.view_.byteOffset + this.pos_, size);
this.pos_ += size;

return slice;
};

/**
* Read as a sequence of bytes, returning them as a single base64 encoded
* string.
*
* Adjusts the current position on success.  Throws an exception if the
* read would go past the end of the buffer.
*
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @return {string} Base 64 encoded value.
*/
ByteReader.prototype.readBase64 = function(size, opt_end) {
var rv = ByteReader.readBase64(this.view_, this.pos_, size, opt_end);
this.pos_ += size;
return rv;
};

/**
* Read an image returning it as a data url.
*
* Adjusts the current position on success.  Throws an exception if the
* read would go past the end of the buffer.
*
* @param {number} size Number of bytes to read.
* @param {number=} opt_end Maximum position to read from.
* @return {string} Image as a data url.
*/
ByteReader.prototype.readImage = function(size, opt_end) {
var rv = ByteReader.readImage(this.view_, this.pos_, size, opt_end);
this.pos_ += size;
return rv;
};

/**
* Seek to a give position relative to opt_seekStart.
*
* @param {number} pos Position in bytes to seek to.
* @param {number=} opt_seekStart Relative position in bytes.
* @param {number=} opt_end Maximum position to seek to.
*/
ByteReader.prototype.seek = function(pos, opt_seekStart, opt_end) {
opt_end = opt_end || this.view_.byteLength;

var newPos;
if (opt_seekStart == ByteReader.SEEK_CUR) {
 newPos = this.pos_ + pos;
} else if (opt_seekStart == ByteReader.SEEK_END) {
 newPos = opt_end + pos;
} else {
 newPos = pos;
}

if (newPos < 0 || newPos > this.view_.byteLength)
 throw new Error('Seek outside of buffer: ' + (newPos - opt_end));

this.pos_ = newPos;
};

/**
* Seek to a given position relative to opt_seekStart, saving the current
* position.
*
* Recover the current position with a call to seekPop.
*
* @param {number} pos Position in bytes to seek to.
* @param {number=} opt_seekStart Relative position in bytes.
*/
ByteReader.prototype.pushSeek = function(pos, opt_seekStart) {
var oldPos = this.pos_;
this.seek(pos, opt_seekStart);
// Alter the seekStack_ after the call to seek(), in case it throws.
this.seekStack_.push(oldPos);
};

/**
* Undo a previous seekPush.
*/
ByteReader.prototype.popSeek = function() {
this.seek(this.seekStack_.pop());
};

/**
* Return the current read position.
* @return {number} Current position in bytes.
*/
ByteReader.prototype.tell = function() {
return this.pos_;
};

/**
 * ID3 parser.
 *
 */
function Id3Parser() {
  
}

/**
 * Output a log message.
 * @param {...(Object|string)} var_args Arguments.
 */
Id3Parser.prototype.log = function(msg) {
  console.log('receiver: ' + msg);
};


/**
 * Reads synchsafe integer.
 * 'SynchSafe' term is taken from id3 documentation.
 *
 * @param {ByteReader} reader Reader to use.
 * @param {number} length Rytes to read.
 * @return {number} Synchsafe value.
 * @private
 */
Id3Parser.readSynchSafe_ = function(reader, length) {
  var rv = 0;

  switch (length) {
    case 4:
      rv = reader.readScalar(1, false) << 21;
    case 3:
      rv |= reader.readScalar(1, false) << 14;
    case 2:
      rv |= reader.readScalar(1, false) << 7;
    case 1:
      rv |= reader.readScalar(1, false);
  }

  return rv;
};

/**
 * Reads 3bytes integer.
 *
 * @param {ByteReader} reader Reader to use.
 * @return {number} Uint24 value.
 * @private
 */
Id3Parser.readUInt24_ = function(reader) {
  return reader.readScalar(2, false) << 16 | reader.readScalar(1, false);
};

/**
 * Reads string from reader with specified encoding
 *
 * @param {ByteReader} reader Reader to use.
 * @param {number} encoding String encoding.
 * @param {number} size Maximum string size. Actual result may be shorter.
 * @return {string} String value.
 * @private
 */
Id3Parser.prototype.readString_ = function(reader, encoding, size) {
  switch (encoding) {
    case Id3Parser.v2.ENCODING.ISO_8859_1:
      return reader.readNullTerminatedString(size);

    case Id3Parser.v2.ENCODING.UTF_16:
      return reader.readNullTerminatedStringUTF16(true, size);

    case Id3Parser.v2.ENCODING.UTF_16BE:
      return reader.readNullTerminatedStringUTF16(false, size);

    case Id3Parser.v2.ENCODING.UTF_8:
      // TODO: implement UTF_8.
      this.log('UTF8 encoding not supported, used ISO_8859_1 instead');
      return reader.readNullTerminatedString(size);

    default: {
      this.log('Unsupported encoding in ID3 tag: ' + encoding);
      return '';
    }
  }
};


/**
 * Reads text frame from reader.
 *
 * @param {ByteReader} reader Reader to use.
 * @param {number} majorVersion Major id3 version to use.
 * @param {Object} frame Frame so store data at.
 * @param {number} end Frame end position in reader.
 * @private
 */
Id3Parser.prototype.readTextFrame_ = function(reader,
                                              majorVersion,
                                              frame,
                                              end) {
  frame.encoding = reader.readScalar(1, false, end);
  frame.value = this.readString_(reader, frame.encoding, end - reader.tell());
};

/**
 * Reads user defined text frame from reader.
 *
 * @param {ByteReader} reader Reader to use.
 * @param {number} majorVersion Major id3 version to use.
 * @param {Object} frame Frame so store data at.
 * @param {number} end Frame end position in reader.
 * @private
 */
Id3Parser.prototype.readUserDefinedTextFrame_ = function(reader,
                                                         majorVersion,
                                                         frame,
                                                         end) {
  frame.encoding = reader.readScalar(1, false, end);

  frame.description = this.readString_(
      reader,
      frame.encoding,
      end - reader.tell());

  frame.value = this.readString_(
      reader,
      frame.encoding,
      end - reader.tell());
};

/**
 * Reads string from reader with specified encoding
 *
 * @param {ByteReader} reader Reader to use.
 * @param {number} majorVersion Major id3 version to use.
 * @return {Object} Frame read.
 * @private
 */
Id3Parser.prototype.readFrame_ = function(reader, majorVersion) {
  if (reader.eof())
    return null;

  var frame = {};

  reader.pushSeek(reader.tell(), ByteReader.SEEK_BEG);

  var position = reader.tell();

  frame.name = (majorVersion == 2) ? reader.readNullTerminatedString(3) :
                                     reader.readNullTerminatedString(4);

  if (frame.name == '')
    return null;

  this.log('Found frame ' + (frame.name) + ' at position ' + position);

  switch (majorVersion) {
    case 2:
      frame.size = Id3Parser.readUInt24_(reader);
      frame.headerSize = 6;
      break;
    case 3:
      frame.size = reader.readScalar(4, false);
      frame.headerSize = 10;
      frame.flags = reader.readScalar(2, false);
      break;
    case 4:
      frame.size = Id3Parser.readSynchSafe_(reader, 4);
      frame.headerSize = 10;
      frame.flags = reader.readScalar(2, false);
      break;
  }

  this.log('Found frame [' + frame.name + '] with size [' + frame.size + ']');

  if (Id3Parser.v2.HANDLERS[frame.name]) {
    Id3Parser.v2.HANDLERS[frame.name].call(
        this,
        reader,
        majorVersion,
        frame,
        reader.tell() + frame.size);
  } else if (frame.name.charAt(0) == 'T' || frame.name.charAt(0) == 'W') {
    this.readTextFrame_(
        reader,
        majorVersion,
        frame,
        reader.tell() + frame.size);
  }

  reader.popSeek();

  reader.seek(frame.size + frame.headerSize, ByteReader.SEEK_CUR);

  return frame;
};

/**
 * @param {File} file File object to parse.
 * @param {Object} metadata Metadata object of the file.
 * @param {function(Object)} callback Success callback.
 * @param {function(string)} onError Error callback.
 */
Id3Parser.prototype.parse = function(file, metadata, callback, onError) {
  var self = this;


    /**
     * Check if passed array of 10 bytes contains ID3 header.
     * @param {File} file File to check and continue reading if ID3
     *     metadata found.
     * @param {ByteReader} reader Reader to fill with stream bytes.
     */
  /*
    function checkId3v2(file, reader) {
      if (reader.readString(3) == 'ID3') {
        this.logger.vlog('id3v2 found');
        var id3v2 = metadata.id3v2 = {};
        id3v2.major = reader.readScalar(1, false);
        id3v2.minor = reader.readScalar(1, false);
        id3v2.flags = reader.readScalar(1, false);
        id3v2.size = Id3Parser.readSynchSafe_(reader, 4);

        MetadataParser.readFileBytes(file, 10, 10 + id3v2.size,
            this.nextStep, this.onError);
      } else {
        this.finish();
      }
    },
*/
    /**
     * Extracts all ID3v2 frames from given bytebuffer.
     * @param {File} file File being parsed.
     * @param {ByteReader} reader Reader to use for metadata extraction.
     */
  /*
    function extractFrames(file, reader) {
      var id3v2 = metadata.id3v2;

      if ((id3v2.major > 2) &&
          (id3v2.flags & Id3Parser.v2.FLAG_EXTENDED_HEADER != 0)) {
        // Skip extended header if found
        if (id3v2.major == 3) {
          reader.seek(reader.readScalar(4, false) - 4);
        } else if (id3v2.major == 4) {
          reader.seek(Id3Parser.readSynchSafe_(reader, 4) - 4);
        }
      }

      var frame;

      while (frame = self.readFrame_(reader, id3v2.major)) {
        metadata.id3v2[frame.name] = frame;
      }

      this.nextStep();
    },
*/
    /**
     * Adds 'description' object to metadata.
     * 'description' used to unify different parsers and make
     * metadata parser-aware.
     * Description is array if value-type pairs. Type should be used
     * to properly format value before displaying to user.
     */
  /*
    function prepareDescription() {
      var id3v2 = metadata.id3v2;

      if (id3v2['APIC'])
        metadata.thumbnailURL = id3v2['APIC'].imageUrl;
      else if (id3v2['PIC'])
        metadata.thumbnailURL = id3v2['PIC'].imageUrl;

      metadata.description = [];

      for (var key in id3v2) {
        if (typeof(Id3Parser.v2.MAPPERS[key]) != 'undefined' &&
            id3v2[key].value.trim().length > 0) {
          metadata.description.push({
            key: Id3Parser.v2.MAPPERS[key],
            value: id3v2[key].value.trim()
          });
        }
      }
    }
    */
};


/**
 * Id3v2 constants.
 * @type {Object.<*>}
 */
Id3Parser.v2 = {
  FLAG_EXTENDED_HEADER: 1 << 5,

  ENCODING: {
    /**
     * ISO-8859-1 [ISO-8859-1]. Terminated with $00.
     *
     * @const
     * @type {number}
     */
    ISO_8859_1: 0,


    /**
     * [UTF-16] encoded Unicode [UNICODE] with BOM. All
     * strings in the same frame SHALL have the same byteorder.
     * Terminated with $00 00.
     *
     * @const
     * @type {number}
     */
    UTF_16: 1,

    /**
     * UTF-16BE [UTF-16] encoded Unicode [UNICODE] without BOM.
     * Terminated with $00 00.
     *
     * @const
     * @type {number}
     */
    UTF_16BE: 2,

    /**
     * UTF-8 [UTF-8] encoded Unicode [UNICODE]. Terminated with $00.
     *
     * @const
     * @type {number}
     */
    UTF_8: 3
  },
  HANDLERS: {
    //User defined text information frame
    TXX: Id3Parser.prototype.readUserDefinedTextFrame_,
    //User defined URL link frame
    WXX: Id3Parser.prototype.readUserDefinedTextFrame_,

    //User defined text information frame
    TXXX: Id3Parser.prototype.readUserDefinedTextFrame_,

    //User defined URL link frame
    WXXX: Id3Parser.prototype.readUserDefinedTextFrame_,

    //User attached image
    PIC: Id3Parser.prototype.readPIC_,

    //User attached image
    APIC: Id3Parser.prototype.readAPIC_
  },
  MAPPERS: {
    TALB: 'ID3_ALBUM',
    TBPM: 'ID3_BPM',
    TCOM: 'ID3_COMPOSER',
    TDAT: 'ID3_DATE',
    TDLY: 'ID3_PLAYLIST_DELAY',
    TEXT: 'ID3_LYRICIST',
    TFLT: 'ID3_FILE_TYPE',
    TIME: 'ID3_TIME',
    TIT2: 'ID3_TITLE',
    TLEN: 'ID3_LENGTH',
    TOWN: 'ID3_FILE_OWNER',
    TPE1: 'ID3_LEAD_PERFORMER',
    TPE2: 'ID3_BAND',
    TRCK: 'ID3_TRACK_NUMBER',
    TYER: 'ID3_YEAR',
    WCOP: 'ID3_COPYRIGHT',
    WOAF: 'ID3_OFFICIAL_AUDIO_FILE_WEBPAGE',
    WOAR: 'ID3_OFFICIAL_ARTIST',
    WOAS: 'ID3_OFFICIAL_AUDIO_SOURCE_WEBPAGE',
    WPUB: 'ID3_PUBLISHERS_OFFICIAL_WEBPAGE'
  }
};