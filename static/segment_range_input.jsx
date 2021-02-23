import * as React from 'react'

const classNames = require("classnames");

export class SegmentRangeInput extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {}
  }

  onChange(e) {
    let value = e.target.value
    this.props.updateValue(value)
    this.props.setCurrentTime(newTime)
  }

  onKeyDown(e) {
    let delta
    switch (e.keyCode) {
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

  onFocus() {
    this.props.setCurrentTime(this.props.value)
  }

  render() {
    return <input
      class={classNames("segment_range_input", this.props.class, {
        is_invalid: this.props.isInvalid
      })}
      type="text"
      value={this.props.value}
      onChange={this._onChange ||= this.onChange.bind(this)}
      onKeyDown={this._onKeyDown ||= this.onKeyDown.bind(this)}
      onFocus={this._onFocus ||= this.onFocus.bind(this)}
      />
  }
}

