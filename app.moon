lapis = require "lapis"
socket = require "socket"

import assert_error, capture_errors, respond_to from require "lapis.application"

capture_errors_json = (fn) ->
  capture_errors fn, => {
    json: { errors: @errors }, status: 500
  }

import to_json, from_json, trim from require "lapis.util"

import types from require "tableshape"

import printable_character from require "lapis.util.utf8"

truncate_response = do
  import P, Cs from require "lpeg"
  Cs (printable_character + P(1) / "")^-100

extract_formats = types.partial {
  formats: types.array_of types.one_of {
    -- ignore the audio formats
    types.partial {
      vcodec: "none"
    }

    types.scope types.partial({
      format_id: types.any\tag "format_id"
      format: types.any\tag "format"
      format_note: types.any\tag "format_note"
      width: types.any\tag "width"
      height: types.any\tag "height"
      fps: types.any\tag "fps"
      vcodec: types.any\tag "vcodec"
      acodec: types.any\tag "acodec"
      container: types.any\tag "container"
      ext: types.any\tag "ext"
      protocol: types.any\tag "protocol"
    }), {
      tag: "formats[]"
    }
  }
}

CACHE_DURATION = 60*60*24 -- 1 day
CACHE_DURATION_SHORT = 60*60 -- 1 hour
MAX_TIMEOUT = 10*60*1000 -- 10 minutes
MAX_DOWNLOAD_SIZE = 1024*1024*1000 -- 1000mb

content_type_for_format = (format) ->
  switch format.ext
    when "webm"
      "video/webm"
    when "mp4"
      "video/mp4"
    else
      "application/octet-stream"

-- this gets the formats through the cache server
get_formats = (video_id) ->
  config = require("lapis.config").get!
  uri = "http://127.0.0.1:#{config.port}/youtube/#{video_id}/formats"

  http = require "resty.http"
  httpc = http.new!
  httpc\set_timeout MAX_TIMEOUT

  res, err = assert httpc\request_uri uri, {
    method: "GET"
    keepalive: false
  }

  if res.status == 200
    from_json(res.body).formats
  else
    nil, "failed to download formats: #{res.status}"

get_source = (video_id) ->
  config = require("lapis.config").get!
  uri = "http://127.0.0.1:#{config.port}/youtube/#{video_id}/source"

  http = require "resty.http"
  httpc = http.new!
  httpc\set_timeout MAX_TIMEOUT

  res, err = assert httpc\request_uri uri, {
    method: "GET"
    keepalive: false
  }

  if res.status == 200
    res.body, from_json res.headers["X-Format"]
  else
    nil, "failed to download formats: #{res.status}"

download_video = (video_id, preferred_formats={}) ->
  formats, err = get_formats video_id
  unless formats
    return nil, "failed to fetch formats for video: #{err}"

  local format

  -- see if we can find the format we want
  for fid in *preferred_formats
    for f in *formats
      if tostring(fid) == tostring(f.format_id)
        format = f
        break

    break if format

  unless format
    return nil, "failed to find a format to download, maybe the video isn't ready yet?"

  shell = require "resty.shell"
  full_url = "https://www.youtube.com/watch?v=#{video_id}"

  args = {
    "youtube-dl", "-f", format.format_id, full_url, "-o", "-"
  }

  import notice from require "lapis.logging"
  notice "DOWNLOADING VIDEO: #{table.concat args, " "}"
  start_time = socket.gettime!

  ok, stdout, stderr, reason, status = shell.run args, nil, MAX_TIMEOUT, MAX_DOWNLOAD_SIZE

  elapsed = socket.gettime! - start_time

  notice "DOWNLOAD COMPLETE: [#{"%.2fs"\format(elapsed)}] ok: #{ok}, stdout: #{#(stdout or "")}"

  unless ok
    stderr_summary = if stderr
      trim truncate_response\match stderr

    return nil, "failed to download video: #{reason} - #{stderr_summary}"

  stdout, format

class extends lapis.Application
  handle_error: (err, trace) =>
    -- block any caching from happening
    if @res.headers["X-Accel-Expires"]
      @res.headers["X-Accel-Expires"] = "0"

    super err, trace

  "/": capture_errors_json =>
    formats = get_formats "FLi0St-B8vw"
    json: formats

  "/youtube/:video_id/formats": capture_errors_json =>
    shell = require "resty.shell"
    full_url = "https://www.youtube.com/watch?v=#{@params.video_id}"

    ok, stdout, stderr, reason, status = shell.run {"youtube-dl", "--dump-json", full_url}, nil, 5*1000, 1024*1024

    stderr_summary = trim truncate_response\match stderr

    unless ok
      return status: 500, json: {
        errors: {"failed to extract format"}

        stderr: stderr_summary
        :status
        reason: reason or "unknown failure"
      }

    res = from_json stdout

    {
      json: assert extract_formats res
      headers: {
        "X-Accel-Expires": CACHE_DURATION_SHORT
      }
    }

  "/youtube/:video_id/preview": capture_errors_json respond_to {
    GET: =>
      content, format = assert_error download_video @params.video_id, {
        134 -- 360p the smallest non-dash mp4, no-audio
        18 -- 360p another small non-dash mp4, audio
        133 -- 426x240 mp4 DASH
        242 -- 426x240 webm DASH
        22 -- 720p no-audio, non-dash
        299 -- 1080p60 audio, non-dash the full size video
      }

      content, {
        layout: false
        content_type: content_type_for_format format
        headers: {
          "X-Format": to_json format
          "X-Accel-Expires": CACHE_DURATION
        }
      }
  }

  -- the source file is what we use to clip the final output
  "/youtube/:video_id/source": capture_errors_json respond_to {
    GET: =>
      content, format = assert_error download_video @params.video_id, {
        299 -- 1080p60 mp4 no-audio non-dash
        303 -- 1080p60 webm no-audio DASH (slow)
        298 -- 720p60 mp4 no-audio DASH (slow)
        302 -- 720p60 webm no-audio DASH (slow)
      }

      content, {
        layout: false
        content_type: content_type_for_format format
        headers: {
          "X-Format": to_json format
          "X-Accel-Expires": CACHE_DURATION
        }
      }
  }



  -- ffmpeg -i in.mkv -vf "select='between(t\,5\,6)+between(t\,60\,61)', setpts=N/FRAME_RATE/TB" -an out.mp4
  --
  --
  -- ffmpeg \
  --   -ss 5.0 -to 6.0 -i in.mkv \
  --   -ss 60.0 -to 61.0 -i in.mkv \
  --   -filter_complex '[0:v][1:v]concat=n=2:v=1[outv]' \
  --   -map '[outv]' \
  --   out2.mp4

  "/youtube/:video_id/slice/:ranges": capture_errors_json respond_to {
    GET: =>
      -- source_bytes, format = assert_error get_source @params.video_id
      config = require("lapis.config").get!
      source_uri = "http://127.0.0.1:#{config.port}/youtube/#{@params.video_id}/source"

      shell = require "resty.shell"

      parse_ranges = do
        import R, P, C, Ct from require "lpeg"
        range_value = R"09"^1 * (P"." * R"09" * R"09"^-1)^-1
        range = Ct C(range_value) * P"-" * C(range_value)
        Ct range * (P"," * range)^0 * -1

      ranges = assert_error parse_ranges\match(@params.ranges), "failed to parse ranges: #{@params.ranges}"

      generate_filter = (ranges, args={}) ->
        local max_time

        for idx, {start, stop} in ipairs ranges
          start_num = tonumber start
          stop_num = tonumber stop
          assert_error start_num < stop_num, "range is not valid, start is at or before stop"

          if max_time
            assert_error start_num >= max_time, "range is not valid, ranges must be in time order and not overlap"

          max_time = stop_num

          table.insert args, "-ss"
          table.insert args, start
          table.insert args, "-to"
          table.insert args, stop
          table.insert args, "-i"
          table.insert args, source_uri

        -- add filter mapping
        table.insert args, "-filter_complex"
        table.insert args, "#{table.concat ["[#{idx-1 }:v]" for idx in ipairs ranges]}concat=n=#{#ranges}:v=1[outv]"

        args

      args = {"ffmpeg"}

      generate_filter ranges, args

      for a in *{
        -- this can't be combined with filter_complex
        -- "-vf", "scale=w=256:h=144:force_original_aspect_ratio=decrease"

        "-map", "[outv]"
        "-vcodec", "h264"
        "-crf", "18"
        "-movflags", "frag_keyframe+empty_moov" -- this allows us to pipe the output
        "-f", "mp4"
        "-an"
        "-"
      }
        table.insert args, a

      import notice from require "lapis.logging"
      notice "TRANSCODING VIDEO: #{table.concat args, " "}"

      start_time = socket.gettime!

      ok, stdout, stderr, reason, status = shell.run args, nil, MAX_TIMEOUT, MAX_DOWNLOAD_SIZE

      elapsed = socket.gettime! - start_time

      notice "TRANSCODING COMPLETE: [#{"%.2fs"\format(elapsed)}] ok: #{ok}, stdout: #{#(stdout or "")}"

      unless ok
        stderr_summary = if stderr
          trim truncate_response\match stderr

        return status: 500, json: {
          errors: {"failed to transcode"}
          :ok
          :stderr
          :reason
          :status
        }

      stdout, {
        layout: false
        content_type: "video/mp4"
      }
  }
