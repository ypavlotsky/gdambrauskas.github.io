
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
this.setByteOrder(ByteReader.BIG_ENDIAN);
}

/**
* Motorola, 0x1234 is [0x12, 0x34]
* @const
* @type {number}
*/
ByteReader.BIG_ENDIAN = 1;

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

    /**
     * Extracts all ID3v2 frames from given bytebuffer.
     * @param {File} file File being parsed.
     * @param {ByteReader} reader Reader to use for metadata extraction.
     */
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

    /**
     * Adds 'description' object to metadata.
     * 'description' used to unify different parsers and make
     * metadata parser-aware.
     * Description is array if value-type pairs. Type should be used
     * to properly format value before displaying to user.
     */
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


 rawId3 = new byte[] { 73, 68, 51, 4, 0, 0, 0, 0, 0, 41, 84, 88, 88, 88, 0, 0, 0, 31,
        0, 0, 3, 0, 109, 100, 105, 97, 108, 111, 103, 95, 86, 73, 78, 68, 73, 67, 79, 49, 53, 50,
        55, 54, 54, 52, 95, 115, 116, 97, 114, 116, 0 };