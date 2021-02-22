import * as React from 'react'
import * as ReactDOM from 'react-dom'

const classNames = require("classnames");

class Scrubber extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {}
  }

  componentWillUnmount() {
    // remove the window listener if it's there
    this.unbindWindowListener()
  }

  unbindWindowListener() {
    if (this.state.windowMoveListener) {
      window.removeEventListener('mousemove', this.state.windowMoveListener)
      window.removeEventListener('mouseup', this.state.windowUpListener)

      this.setState({
        windowMoveListener: null,
        windowUpListener: null
      })
    }
  }

  updateValue(clientX, clientY) {
    let ref = this.scrubberRef.current
    if (!ref) return

    let rect = ref.getBoundingClientRect()

    let p = (clientX - rect.left) / rect.width
    p = Math.max(0, Math.min(1, p))

    if (this.props.setCurrentTime && this.props.duration != null) {
      let newTime = p * this.props.duration
      this.props.setCurrentTime(newTime)
      this.setState({
        _lastSelectedTime: newTime
      })
    }
  }

  createMouseUpListener() {
    if (this.state.windowListener) {
      console.warning("mouse up listenter already set")
      return
    }

    return windowListener
  }

  startDrag (e) {
    this.updateValue(e.clientX, e.clientY)
    this.scrubberRef.current.focus()

    let windowUpListener = e => {
      this.updateValue(e.clientX, e.clientY)
      this.unbindWindowListener()
    }

    let windowMoveListener = e => {
      e.preventDefault()
      this.updateValue(e.clientX, e.clientY)
    }

    window.addEventListener('mouseup', windowUpListener)
    window.addEventListener('mousemove', windowMoveListener)

    this.setState({
      windowUpListener,
      windowMoveListener
    })
  }

  isDragging() {
    return !!this.state.windowMoveListener
  }

  render() {
    this.scrubberRef ||= React.createRef()

    let currentTime = null
    let segments = null

    if (this.props.duration != null) {
      // if we are dragging then use the active selection to make it feel smoother
      let p = 0
      if (this.isDragging() && this.state._lastSelectedTime != null) {
        p = this.state._lastSelectedTime / this.props.duration
      } else {
        p = this.props.currentTime / this.props.duration
      }

      currentTime = <div class="current_time" style={{
        left: `${p * 100}%`
      }}></div>

      segments = this.props.segments.map(([start, stop], idx) =>
        <div class="segment" key={`segment-${idx}`} style={{
          left: `${start / this.props.duration * 100}%`,
          width: `${(stop - start) / this.props.duration * 100}%`
        }}></div>
      )
    }

    return <div
      tabIndex="0"
      ref={this.scrubberRef}
      class={classNames("scrubber", {
        dragging: this.isDragging()
      })}
      onMouseDown={e => {
        e.preventDefault()
        this.startDrag(e)
      }}
      onKeyDown={e => {
        let delta
        switch (e.keyCode) {
          case 32:
            this.props.togglePlay()
            break
          case 37: // left
            delta = -1
            break
          case 39: // right
            delta = 1
            break
          case 38: // up
            delta = 60
            break
          case 40: // down
            delta = -60
            break
        }

        if (delta != null) {
          let frameTime = 1/60
          this.props.setCurrentTime(this.props.currentTime + frameTime * delta)
        }
      }}
    >
      {currentTime}
      {segments}
    </div>
  }
}


class Main extends React.Component {
  componentDidMount() {
    // try to load the entire video from url
    fetch(this.previewURL()).then((res) => res.arrayBuffer()).then((res) => {
      let blob = new Blob([res])
      let objectURL = URL.createObjectURL(blob)
      this.videoRef.current.src = objectURL
      this.setState({
        ready: true
      })
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      videoID: "FLi0St-B8vw",
      currentTime: 0,
      segments: []
    }
  }

  pushSegment(start, stop) {
    this.setState({
      segments: this.state.segments.concat([
        [start, stop]
      ])
    })
  }

  updateSegment(idx, start, stop) {
    this.setState({
      segments: this.state.segments.map((s, i) => {
        if (i == idx) {
          return [start, stop]
        } else {
          return s
        }
      })
    })
  }

  removeSegment(idx) {
    this.setState({
      segments: this.state.segments.filter((s, i) => i != idx)
    })
  }

  sortSegments() {
    let copy = this.state.segments.slice()
    copy.sort((a,b) => a[0] - b[0])
    return copy
  }

  previewURL() {
    return `/youtube/${this.state.videoID}/preview`
  }

  renderURL() {
    let segments = this.sortSegments()
    let slice = segments.map(([start, stop]) => `${start.toFixed(2)}-${stop.toFixed(2)}`).join(",")
    return `/youtube/${this.state.videoID}/slice/${slice}`
  }

  setTime(time) {
    let video = this.videoRef.current
    if (video) {
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

    return <div class="video_editor">
      <video
        class="video_preview"
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

      <Scrubber
        segments={this.state.segments}
        setCurrentTime={this._setTime}
        togglePlay={this._togglePlay}
        currentTime={this.state.currentTime}
        duration={this.state.duration}
      />

      <div class="playback_controls">
        <code class="current_time">
          {this.state.currentTime}
          /
          {this.state.duration}
        </code>
      </div>

      <fieldset>
        <legend>Segments</legend>
        <button
          type="button"
          onClick={e => {
            this.pushSegment(this.state.currentTime, this.state.currentTime + 2)
          }}
        >New Segment</button>

        <ul>
          {this.state.segments.map(([start,stop], idx) =>
            <li>
              <code>{start}</code> —
              <code>{stop}</code>
              {" "}
              <button type="button" onClick={e => this.removeSegment(idx)}>Remove</button>
            </li>
          )}
        </ul>

      </fieldset>

      <fieldset>
        <legend>Render</legend>
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

