//javascript/closure/crypt/crypt.js
/*
goog.require('goog.crypt');
obff.common.Reader.prototype.readUtf8String = function(byteCount) {
  if (byteCount == null || byteCount < 0) {
    throw Error('Could not read UTF-8 String: Byte count was not provided.');
  }
  if (byteCount == 0) {
    return '';
  }
  var bytes = this.readUint8Array(byteCount);
  return goog.crypt.utf8ByteArrayToString(bytes);
};
*/

/**
 * Converts a UTF-8 byte array to JavaScript's 16-bit Unicode.
 * @param {Uint8Array|Array<number>} bytes UTF-8 byte array.
 * @return {string} 16-bit Unicode string.
 */
utf8ByteArrayToString = function(bytes) {
  var out = [], pos = 0, c = 0;
  while (pos < bytes.length) {
    var c1 = bytes[pos++];
    if (c1 < 128) {
      out[c++] = String.fromCharCode(c1);
    } else if (c1 > 191 && c1 < 224) {
      var c2 = bytes[pos++];
      out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
    } else {
      var c2 = bytes[pos++];
      var c3 = bytes[pos++];
      out[c++] = String.fromCharCode(
          (c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
    }
  }
  return out.join('');
};

function log(msg) {
  console.log("gvd msg: "+msg);
}


var ima = ima || {};
ima.chromecast = ima.chromecast || {};


ima.chromecast.TxxxFrameParser = function(byteReader) {
  this.byteReader = byteReader;
}

ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_ISO_8859_1 = 0;
ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_16 = 1;
ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_16BE = 2;
ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_8 = 3;

ima.chromecast.TxxxFrameParser.prototype.parse = function() {
  var id3Size = this.parseId3Header_();
  while (id3Size > 0) {
    var byte1 = this.byteReader.readUnsignedByte();
    var byte2 = this.byteReader.readUnsignedByte();
    var byte3 = this.byteReader.readUnsignedByte();
    var byte4 = this.byteReader.readUnsignedByte();
    var frameId = String.fromCharCode(byte1) + String.fromCharCode(byte2) +
        String.fromCharCode(byte3) + String.fromCharCode(byte4);
    var frameSize = this.byteReader.readSynchSafeInt32();
    if (frameSize <= 1) {
      break;
    }
    // Skip frame flags.
    this.skipBytes_(2);
    if ('TXXX' == frameId) {
      var encoding = this.byteReader.readUnsignedByte();
      log('encoding '+encoding)
      var frameDataView = new DataView(this.byteReader.readBytes(frameSize - 1).buffer);
      // frame has description and value.
      var firstTerminatingNullIndex = this.byteReader.indexOfTerminatingNull(frameDataView, 0, encoding);
      var description = this.readString_(frameDataView, 0, firstTerminatingNullIndex,  encoding);
      log('desciprtion '+description)
      var valueStartIndex = firstTerminatingNullIndex + this.delimiterLength(encoding);
      var value = this.readString_(frameDataView, valueStartIndex, frameDataView.byteLength,  encoding);
      log('value '+value)
    } else {
      // Don't care about other tags.
      this.skipBytes_(frameSize - 1); 
    }
    id3Size -= frameSize + 10 /* header size */;
  }
}

ima.chromecast.TxxxFrameParser.prototype.parseId3Header_ = function() {
  var byte1 = this.byteReader.readUnsignedByte();
  var byte2 = this.byteReader.readUnsignedByte();
  var byte3 = this.byteReader.readUnsignedByte();
  var identifier = String.fromCharCode(byte1) + String.fromCharCode(byte2) + String.fromCharCode(byte3);
  if ('ID3' != identifier) {
    throw Error("Unexpected ID3 file identifier");
  }
  
  // Skip version, this parser handles version that our ad insertion system
  // produces.
  this.skipBytes_(2);
  var flags = this.byteReader.readUnsignedByte();
  var id3Size = this.byteReader.readSynchSafeInt32();
  
  // Check if extended header is present.
  if ((flags & 0x2) != 0) {
    var extendedHeaderSize = this.byteReader.readSynchSafeInt32();
    if (extendedHeaderSize > 4) {
      this.byteReader.skipBytes_(extendedHeaderSize - 4);
    }
    id3Size -= extendedHeaderSize;
  }

  // Check if footer presents.
  if ((flags & 0x8) != 0) {
    id3Size -= 10;
  }
  return id3Size;
}

ima.chromecast.TxxxFrameParser.prototype.readString_ = function(view, startIndex, terminatorIndex, encoding) {
  switch (encoding) {
    case ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_ISO_8859_1:
      return this.readNullTerminatedString_(view, startIndex);

    case ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_16:
    case ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_16BE:
      return this.readNullTerminatedStringUTF16_(view, startIndex);

    case ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_8:
      return this.readNullTerminatedStringUTF8_(view, startIndex, terminatorIndex); 
    default: 
      return '';
  }
};

ima.chromecast.TxxxFrameParser.prototype.delimiterLength = function(encoding) {
  return (encoding == ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_ISO_8859_1
      || encoding == ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_8) ? 1 : 2;
}

ima.chromecast.TxxxFrameParser.prototype.readNullTerminatedStringUTF16_ = function(view, startIndex) {
  var bytes = this.byteReader.readNullTerminatedBytesUTF16(view, startIndex);
  return String.fromCharCode.apply(null, bytes);
};

ima.chromecast.TxxxFrameParser.prototype.readNullTerminatedStringUTF8_ = function(view, startIndex, terminatorIndex) {
  return utf8ByteArrayToString(new Uint8Array(view.buffer.slice(startIndex, terminatorIndex)));
};
