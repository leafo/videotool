import * as React from 'react'

const classNames = require("classnames");

export class Scrubber extends React.PureComponent {
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
    >
      {currentTime}
      {segments}
    </div>
  }
}
