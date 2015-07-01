
var ima = ima || {};
ima.chromecast = ima.chromecast || {};

ima.chromecast.ByteReader = function(data/*Uint8Array*/) {
  this.data = data;
  this.position = 0;
  this.limit = data.length;
}

/**
 * Moves the reading offset by {@code bytes}.
 *
 * @throws IllegalArgumentException Thrown if the new position is neither in nor at the end of the
 *     array.
 */
ima.chromecast.ByteReader.prototype.skipBytes = function(skipNumberOfBytes) {
  this.setPosition(this.position + skipNumberOfBytes);
}

/** Reads the next byte as an unsigned value. */
ima.chromecast.ByteReader.prototype.readUnsignedByte = function() {
  return this.data[this.position++] & 0xFF;
}

/**
 * Sets the reading offset in the array.
 *
 * @param position Byte offset in the array from which to read.
 * @throws IllegalArgumentException Thrown if the new position is neither in nor at the end of the
 *     array.
 */
ima.chromecast.ByteReader.prototype.setPosition = function(newPosition) {
  if (newPosition < 0 || newPosition >= this.limit) {
    throw new Error("Invalid read");
  }
  this.position = newPosition;
}

/**
 * Reads the next {@code length} bytes into {@code buffer} at {@code offset}.
 *
 */
ima.chromecast.ByteReader.prototype.readBytes = function(bytesCount) {
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
ima.chromecast.ByteReader.prototype.readSynchSafeInt32 = function() {
  var byte1 = this.readUnsignedByte();
  var byte2 = this.readUnsignedByte();
  var byte3 = this.readUnsignedByte();
  var byte4 = this.readUnsignedByte();
  return (byte1 << 21) | (byte2 << 14) | (byte3 << 7) | byte4;
}

ima.chromecast.ByteReader.indexOfTerminatingNull = function(view, startIndex) {
  for (var i = startIndex; i < view.byteLength; i++) {
    if (view.getUint8(i) == 0) {
      return i;
    }
  }
  return -1;
};

ima.chromecast.ByteReader.indexOfTerminatingNullUTF16 = function(view, startIndex) {
  for (var i = startIndex; i < view.byteLength; i++) {
    if (view.getUint16(i) == 0) {
      return i;
    }
  }
  return -1;
};

ima.chromecast.ByteReader.readNullTerminatedBytesUTF16 = function(view, startIndex) {
  var byte;
  var bytes = [];
  for (var i = startIndex; i < view.byteLength; i +=2) {
    var byte = dataView.getUint16(pos + i);
    if (byte == 0) {
      break;
    }
    bytes.push(byte);
  }
  return bytes;
};