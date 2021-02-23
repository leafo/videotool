import * as React from 'react'

const classNames = require("classnames");

export class SegmentRangeInput extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {}
  }

  onChange(e) {
    this.setState({
      editing: true,
      editingValue: e.target.value
    })
  }

  onBlur(e) {
    this.commitChange()
  }

  commitChange() {
    if (this.state.editing) {
      // try to parse the editing value, otherwise give up
      let value = Number.parseFloat(this.state.editingValue)

      if (!Number.isNaN(value)) {
        value = Math.min(this.props.duration, Math.max(0, value))

        // cap to the right size
        this.props.updateValue(value)
        this.props.setCurrentTime(value)
      }
      this.setState({
        editing: false
      })
    }
  }

  onKeyDown(e) {
    let delta
    switch (e.keyCode) {
      case 13: // enter
        this.commitChange()
        break
      case 27: // escape
        this.setState({
          editing: false
        })
        break
      case 38: // up
        if (e.shiftKey) {
          delta = 10/60
        } else {
          delta = 1
        }
        break
      case 40: // down
        if (e.shiftKey) {
          delta = -10/60
        } else {
          delta = -1
        }
        break
    }

    if (delta != null) {
      let newTime = this.props.value + delta
      this.props.updateValue(newTime)
      this.props.setCurrentTime(newTime)
      e.preventDefault()
    }
  }

  onMouseDown(e) {
    if (e.altKey) {
      this.startDrag(e)
      this.inputRef.current.focus()
      e.preventDefault()
    }
  }

  startDrag(e) {
    let multiplier = 1
    if (e.shiftKey) {
      multiplier = 5
    }

    let getValue = e => {
      let delta = this.state.dragStartY - e.clientY
      return this.state.dragStartValue + delta * 1/60 * multiplier
    }

    let windowUpListener = e => {
      this.unbindWindowListener()
      this.setState({
        editingValue: getValue(e)
      }, () => this.commitChange())
    }

    let windowMoveListener = e => {
      e.preventDefault()
      let value = getValue(e)

      this.props.setCurrentTime(value)
      this.setState({
        editingValue: value
      })
    }

    window.addEventListener('mouseup', windowUpListener)
    window.addEventListener('mousemove', windowMoveListener)

    this.setState({
      editing: true,
      dragStartValue: this.props.value,
      dragStartX: e.clientX,
      dragStartY: e.clientY,
      windowMoveListener,
      windowUpListener,
    })
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


  onFocus() {
    this.props.setCurrentTime(this.props.value)
  }

  render() {
    return <input
      ref={this.inputRef ||= React.createRef()}
      class={classNames("segment_range_input", this.props.class, {
        is_invalid: this.props.isInvalid,
        editing: this.state.editing
      })}
      type="text"
      value={ this.state.editing ? this.state.editingValue : this.props.value }
      onChange={this._onChange ||= this.onChange.bind(this)}
      onKeyDown={this._onKeyDown ||= this.onKeyDown.bind(this)}
      onFocus={this._onFocus ||= this.onFocus.bind(this)}
      onBlur={this._onBlur ||= this.onBlur.bind(this)}
      onMouseDown={this._onMouseDown ||= this.onMouseDown.bind(this)}
    />
  }
}

