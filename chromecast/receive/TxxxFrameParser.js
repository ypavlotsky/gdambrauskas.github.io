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

ima = {};
ima.chromecast = {};

ima.chromecast.TxxxFrameParser = function(data/*Uint8Array*/) {
  this.data = data;
  this.position = 0;
  this.limit = data.length;
}

ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_ISO_8859_1 = 0;
ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_16 = 1;
ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_16BE = 2;
ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_8 = 3;

ima.chromecast.TxxxFrameParser.prototype.parse = function() {
  var id3Size = this.parseId3Header_();
  while (id3Size > 0) {
    var byte1 = this.readUnsignedByte_();
    var byte2 = this.readUnsignedByte_();
    var byte3 = this.readUnsignedByte_();
    var byte4 = this.readUnsignedByte_();
    var frameId = String.fromCharCode(byte1) + String.fromCharCode(byte2) +
        String.fromCharCode(byte3) + String.fromCharCode(byte4);
    var frameSize = this.readSynchSafeInt32();
    if (frameSize <= 1) {
      break;
    }
    // Skip frame flags.
    this.skipBytes_(2);
    if ('TXXX' == frameId) {
      var encoding = this.readUnsignedByte_();
      var frameDataView = new DataView(this.readBytes(frameSize - 1).buffer);
      // frame has description and value.
      var firstTerminatingNullIndex = this.indexOfTerminatingNull_(frameDataView, 0, encoding);
      var description = this.readString_(frameDataView, 0, firstTerminatingNullIndex,  encoding);
      var valueStartIndex = firstTerminatingNullIndex + this.delimiterLength(encoding);
      var value = this.readString_(frameDataView, valueStartIndex, frameDataView.byteLength,  encoding);
    } else {
      // Don't care about other tags.
      this.skipBytes_(frameSize - 1); 
    }
    id3Size -= frameSize + 10 /* header size */;
  }
}

ima.chromecast.TxxxFrameParser.prototype.parseId3Header_ = function() {
  var byte1 = this.readUnsignedByte_();
  var byte2 = this.readUnsignedByte_();
  var byte3 = this.readUnsignedByte_();
  var identifier = String.fromCharCode(byte1) + String.fromCharCode(byte2) + String.fromCharCode(byte3);
  if ('ID3' != identifier) {
    throw Error("Unexpected ID3 file identifier");
  }
  
  // Skip version, this parser handles version that our ad insertion system
  // produces.
  this.skipBytes_(2);
  var flags = this.readUnsignedByte_();
  var id3Size = this.readSynchSafeInt32();
  
  // Check if extended header is present.
  if ((flags & 0x2) != 0) {
    var extendedHeaderSize = this.readSynchSafeInt32();
    if (extendedHeaderSize > 4) {
      this.skipBytes_(extendedHeaderSize - 4);
    }
    id3Size -= extendedHeaderSize;
  }

  // Check if footer presents.
  if ((flags & 0x8) != 0) {
    id3Size -= 10;
  }
  return id3Size;
}

/**
 * Moves the reading offset by {@code bytes}.
 *
 * @throws IllegalArgumentException Thrown if the new position is neither in nor at the end of the
 *     array.
 */
ima.chromecast.TxxxFrameParser.prototype.skipBytes_ = function(skipNumberOfBytes) {
  this.setPosition(this.position + skipNumberOfBytes);
}

/** Reads the next byte as an unsigned value. */
ima.chromecast.TxxxFrameParser.prototype.readUnsignedByte_ = function() {
  return this.data[this.position++] & 0xFF;
}

/**
 * Sets the reading offset in the array.
 *
 * @param position Byte offset in the array from which to read.
 * @throws IllegalArgumentException Thrown if the new position is neither in nor at the end of the
 *     array.
 */
ima.chromecast.TxxxFrameParser.prototype.setPosition = function(newPosition) {
  if (newPosition < 0 || newPosition >= this.limit) {
    throw new Error("Invalid read");
  }
  this.position = newPosition;
}

/**
 * Reads the next {@code length} bytes into {@code buffer} at {@code offset}.
 *
 */
ima.chromecast.TxxxFrameParser.prototype.readBytes = function(bytesCount) {
  var buffer = new ArrayBuffer(bytesCount);
  var read = new Uint8Array(buffer);
  var j = 0;
  for (var i = this.position; i < (this.position + bytesCount); i++) {
    read[j++] = this.data[i];
  }
  return read;
}

/**
 * Reads a Synchsafe integer. Synchsafe integers keep the highest bit of every
 * byte zeroed. A 32 bit synchsafe integer can store 28 bits of information.
 *
 * @return The parsed value.
 */
ima.chromecast.TxxxFrameParser.prototype.readSynchSafeInt32 = function() {
  var byte1 = this.readUnsignedByte_();
  var byte2 = this.readUnsignedByte_();
  var byte3 = this.readUnsignedByte_();
  var byte4 = this.readUnsignedByte_();
  return (byte1 << 21) | (byte2 << 14) | (byte3 << 7) | byte4;
}

ima.chromecast.TxxxFrameParser.prototype.readString_ = function(view, startIndex, terminatorIndex, encoding) {
  switch (encoding) {
    case ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_ISO_8859_1:
      return readNullTerminatedString(view, startIndex);

    case ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_16:
    case ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_16BE:
      return this.readNullTerminatedStringUTF16_(view, startIndex);

    case ima.chromecast.TxxxFrameParser.ID3_TEXT_ENCODING_UTF_8:
      return utf8ByteArrayToString(new Uint8Array(view.buffer.slice(startIndex, terminatorIndex)));
       
    default: 
      return '';
  }
};

ima.chromecast.TxxxFrameParser.prototype.delimiterLength(int encodingByte) {
  return (encodingByte == this.ID3_TEXT_ENCODING_ISO_8859_1
      || encodingByte == this.ID3_TEXT_ENCODING_UTF_8) ? 1 : 2;
}

ima.chromecast.TxxxFrameParser.prototype.indexOfTerminatingNull_ = function(view, startIndex) {
  for (var i = startIndex; i < view.byteLength; i++) {
    if (view.getUint8(i) == 0) {
      return i;
    }
  }
  return -1;
};

ima.chromecast.TxxxFrameParser.prototype.readNullTerminatedStringUTF16_ = function(view, startIndex) {
  var code;
  var codes = [];
  for (var i = startIndex; i < view.byteLength; i +=2) {
    var code = dataView.getUint16(pos + i);
    if (code == 0) break;
    codes.push(code);
  }
  return String.fromCharCode.apply(null, codes);
};

ima.chromecast.TxxxFrameParser.prototype.indexOfTerminatingNullUTF16_ = function(view, startIndex) {
  for (var i = startIndex; i < view.byteLength; i++) {
    if (view.getUint16(i) == 0) {
      return i;
    }
  }
  return -1;
};