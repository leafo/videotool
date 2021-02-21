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
    if (this.state.windowListener) {
      window.removeEventListener('mouseup', this.state.windowListener)
      this.setState({ windowListener: null })
    }
  }

  updateValue(clientX, clientY) {
    let ref = this.scrubberRef.current
    if (!ref) return

    let rect = ref.getBoundingClientRect()

    let p = (clientX - rect.left) / rect.width
    p = Math.max(0, Math.min(1, p))

    console.log("updateValue", p)
  }

  createMouseUpListener() {
    if (this.state.windowListener) {
      console.warning("mouse up listenter already set")
      return
    }

    let windowListener = e => {
      this.updateValue(e.clientX, e.clientY)
      this.unbindWindowListener()
      this.setState({ moveListener: null })
    }

    window.addEventListener('mouseup', windowListener)
    return windowListener
  }

  startDrag (e) {
    this.updateValue(e.clientX, e.clientY)

    this.setState({
      windowListener: this.createMouseUpListener(),
      moveListener: e => {
        e.preventDefault()
        this.updateValue(e.clientX, e.clientY)
      }
    })
  }

  render() {
    this.scrubberRef ||= React.createRef()

    return <div
      ref={this.scrubberRef}
      class={classNames("scrubber", {
        listening: !!this.state.windowListener
      })}
      onMouseDown={e => {
        e.preventDefault()
        this.startDrag(e)
      }}
      onMouseMove={this.state.moveListener}
    ></div>
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
      segments: this.state.segments([start, stop])
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
    let slice = segments.map(([start, stop]) => `${start}-${stop}`).join(",")
    return `/youtube/${this.state.videoID}/slice/${slice}`
  }

  setTime(time) {
    let video = this.videoRef.current
    if (video) {
      video.currentTime = time
    }
  }

  render() {
    this.videoRef ||= React.createRef()
    this._setTime ||= this.setTime.bind(this)

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
        currentTime={this.currentTime}
        duration={this.state.duration}
      />

      <div class="playback_controls">
        <button type="button" onClick={e => {
          let video = this.videoRef.current
          video.currentTime += 1
        }}>Add Second</button>
        {" "}
        <code class="current_time">
          {this.state.currentTime}
          /
          {this.state.duration}
        </code>

        <fieldset>
          <legend>Segments</legend>
          <ul>
            {this.state.segments.map(([start,stop]) =>
              <li>
                <code>{start}</code> —
                <code>{stop}</code>
              </li>
            )}
          </ul>

        </fieldset>

        <fieldset>
          <legend>Render</legend>

          <button type="button" onClick={e => {
            alert("not yet...")
          }}>Render</button>

          {" "}

          <code>{this.renderURL()}</code>
        </fieldset>
      </div>

    </div>;
  }
}

ReactDOM.render(<Main />, document.getElementById("body"))

