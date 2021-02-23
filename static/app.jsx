import * as React from 'react'
import * as ReactDOM from 'react-dom'

import {Scrubber} from "./scrubber"
import {SegmentRangeInput} from "./segment_range_input"
import {VideoSelector} from "./video_selector"

const classNames = require("classnames");

class Main extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      resolution: "1280x720",
      quality: "25",
      videoID: null,
      currentTime: 0,
      segments: [],
      history: []
    }
  }

  setVideoID(videoID) {
    let oldObjectURL = this.state.videoObjectURL

    this.setState({
      loading: true,
      currentTime: 0,
      segments: [],
      history: [],
      errors: false,
      videoObjectURL: null,
      videoID,
    }, () => {
      if (oldObjectURL) {
        URL.revokeObjectURL(oldObjectURL)
      }

      // buffer the entire video into memory up front to make seeking performant
      fetch(this.previewURL()).then((res) => {
        let contentType = res.headers.get('content-type')
        if (contentType == "application/json") {
          // there was an error processing the result
          res.json().then((obj) => {
            console.log(obj)
            this.setState({
              errors: obj.errors,
              loading: false
            })
          })
        } else {
          res.arrayBuffer().then(buffer => {
            let blob = new Blob([buffer])
            let objectURL = URL.createObjectURL(blob)
            this.setState({
              videoObjectURL: objectURL,
              loading: false
            })
          })
        }
      })
    })
  }

  getNearestSegment() {
    return this.sortSegments().reverse().find(s => this.state.currentTime >= s[0])
  }

  makeHistory() {
    let history = this.state.history.concat([
      this.state.segments
    ])

    // truncate if too long
    while (history.length > 50) {
      history.shift()
    }

    return history
  }

  undo() {
    let history = this.state.history.slice()
    let segments = history.pop()
    this.setState({ history, segments })
  }

  pushSegment(start, stop) {
    this.setState({
      history: this.makeHistory(),
      segments: this.state.segments.concat([
        [start, stop]
      ])
    })
  }

  updateSegment(toUpdate, start, stop) {
    this.setState({
      history: this.makeHistory(),
      segments: this.state.segments.map(s => {
        if (s == toUpdate) {
          return [start, stop]
        } else {
          return s
        }
      })
    })
  }

  removeSegment(idx) {
    this.setState({
      history: this.makeHistory(),
      segments: this.state.segments.filter((s, i) => i != idx)
    })
  }

  sortSegments() {
    let copy = this.state.segments.slice()
    copy.sort((a,b) => a[0] - b[0])
    return copy
  }

  previewURL() {
    return `/youtube/${this.state.videoID}/preview-transcode`
  }

  renderURL() {
    let segments = this.sortSegments()
    let slice = segments.map(([start, stop]) => `${start.toFixed(2)}-${stop.toFixed(2)}`).join(",")
    return `/youtube/${this.state.videoID}/slice/${slice}/${this.state.resolution}/${this.state.quality}`
  }

  setTime(time) {
    let video = this.videoRef.current
    if (video) {
      if (!video.paused) {
        video.pause()
      }
      video.currentTime = time
    }
  }

  togglePlay() {
    let video = this.videoRef.current
    if (video) {
      if (video.paused) {
        video.play()
      } else {
        video.pause()
      }
    }
  }

  render() {
    this.videoRef ||= React.createRef()
    this._setTime ||= this.setTime.bind(this)
    this._togglePlay ||= this.togglePlay.bind(this)

    let nearestSegment = this.getNearestSegment()

    return <div class="video_editor">
      <VideoSelector onVideoID={this._setVideoID ||= this.setVideoID.bind(this)} />

      <ul class="errors">{(this.state.errors || []).map(e => 
        <li>{e}</li>
      )}</ul>

      <section class="top_split">
        <video
          class={classNames("video_preview", {
            loading: this.state.loading
          })}
          src={this.state.videoObjectURL}
          key={this.state.videoObjectURL || "empty-video"}
          onDurationChange={e => {
            this.setState({
              duration: e.target.duration
            })
          }}

          onTimeUpdate={e => {
            this.setState({
              currentTime: e.target.currentTime
            })
          }}
          ref={this.videoRef} />

        <section class="instructions">
          <div>
            <strong>With scrubber selected</strong>
            <p>Clicking and dragging will navigate video.</p>
            <ul>
              <li><code>Space</code> — Toggle play/pause</li>
              <li><code>Right</code> — Move ~10 frames ahead</li>
              <li><code>Left</code> — Move ~10 frames back</li>
              <li><code>Up</code> — Move 1 second ahead</li>
              <li><code>Down</code> — Move 1 second back</li>
              <li><code>i</code> — Insert new segment at current time</li>
              <li><code>s</code> — Set the end position of current segment to current time</li>
            </ul>
          </div>
          <div>
            <strong>With segment input selected</strong>
            <p>Hold <code>Alt</code> and click and drag to nudge the value. Hold shift to move faster.</p>

            <ul>
              <li><code>Up</code> — Update 1 second ahead</li>
              <li><code>Down</code> — Update 1 second back</li>
              <li><code>Shift + Up</code> — Update ~10 frames ahead</li>
              <li><code>Shift + Down</code> — Update ~10 frames back</li>
            </ul>
          </div>
        </section>
      </section>

      <Scrubber
        segments={this.state.segments}
        setCurrentTime={this._setTime}
        togglePlay={this._togglePlay}
        currentTime={this.state.currentTime}
        duration={this.state.duration}
        insertSegment={this._insertSegment ||= () => {
          this.pushSegment(this.state.currentTime, this.state.currentTime + 2)
        }}
        setStop={this._setStop ||= () => {
          let nearestSegment = this.getNearestSegment()
          if (nearestSegment) {
            this.updateSegment(nearestSegment, nearestSegment[0], this.state.currentTime)
          }
        }}
      />

      <div class="playback_controls">
        <code class="current_time">
          {this.state.currentTime} / {this.state.duration || "∅"}
        </code>
      </div>

      <fieldset>
        <legend>Segments</legend>
        <div>
          <button
            type="button"
            onClick={e => {
              this.pushSegment(this.state.currentTime, this.state.currentTime + 2)
            }}
          >New Segment</button>

          {" "}

          <button
            type="button"
            disabled={this.state.history.length == 0}
            onClick={e => { this.undo() }}
          >Undo</button>
        </div>

        <ul class="segment_list">
          {this.state.segments.map((segment, idx) =>
            <li class={classNames("segment_row", {
              nearest: segment == nearestSegment
            })}>
              <button
                title="Store current time to start"
                type="button"
                onClick={e =>
                  this.updateSegment(segment, this.state.currentTime, segment[1])
                }
              >⇘</button>
              <SegmentRangeInput
                value={segment[0]}
                class="start"
                isInvalid={segment[0] >= segment[1] || segment[0] > this.state.duration}
                setCurrentTime={this._setTime}
                duration={this.state.duration}
                updateValue={v => this.updateSegment(segment, v, segment[1])}
              />
              <span>—</span>
              <button
                title="Store current time to end"
                type="button"
                onClick={e =>
                  this.updateSegment(segment, segment[0], this.state.currentTime)
                }
              >⇘</button>
              <SegmentRangeInput
                value={segment[1]}
                class="stop"
                setCurrentTime={this._setTime}
                isInvalid={segment[0] >= segment[1] || segment[0] > this.state.duration}
                duration={this.state.duration}
                updateValue={v => this.updateSegment(segment, segment[0], v)}
              />
              {" "}
              <button type="button" onClick={e => this.removeSegment(idx)}>Remove</button>
              <div class="spacer"></div>
              <code class="duration">
                {Math.max(0, segment[1] - segment[0]).toFixed(2)}
              </code>
            </li>
          )}
        </ul>

      </fieldset>

      <fieldset>
        <legend>Render</legend>

        <section class="render_options">
          <label>
            Resolution
            <select value={this.state.resolution} onChange={e => this.setState({ resolution: e.target.value })}>
              <option>256x144</option>
              <option>640x360</option>
              <option>960x540</option>
              <option>1280x720</option>
              <option>1920x1080</option>
            </select>
          </label>
          {" "}
          <label title="Lower is better quality, higher filesize. 0 is lossless">
            Quality
            <select value={this.state.quality} onChange={e => this.setState({ quality: e.target.value})}>
              {[...Array(51).keys()].map( (i) =>
                <option value={i}>{i}</option>
              )}
            </select>
          </label>
        </section>

        {
          this.state.segments.length ?
            <code>
              <a target="_blank" href={this.renderURL()}>{this.renderURL()}</a>
            </code>
          : <em>Create at least one segment to render</em>
        }
      </fieldset>
    </div>;
  }
}

ReactDOM.render(<Main />, document.getElementById("body"))

