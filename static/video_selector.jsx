import * as React from 'react'

const classNames = require("classnames");

const YOUTUBE_PATTERN = /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube(?:\-nocookie)?\.com\S*[^\w\-\s])([\w\-]{11})/i

export class VideoSelector extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {}
  }

  onChange(e) {
    let value = e.target.value

    this.setState({
      value,
      isInvalid: value != "" && !value.match(YOUTUBE_PATTERN)
    })
  }

  commitChange() {
    if (!this.state.value) return

    let match = this.state.value.match(YOUTUBE_PATTERN)
    if (match) {
      let previousVideoID = this.state.videoID
      this.setState({
        lastValue: this.state.value || "",
        videoID: match[1],
      })

      if (previousVideoID != match[1]) {
        this.props.onVideoID(match[1])
      }
    }
  }

  onKeyDown(e) {
    switch (e.keyCode) {
      case 13: // enter
        this.commitChange()
        break
      case 27: // escape
        this.setState({
          value: this.state.lastValue || ""
        })

        break
    }
  }

  onBlur(e) {
    this.commitChange()
  }

  formatsURL() {
    return `/youtube/${this.state.videoID}/formats`
  }

  render() {
    return <section class="video_selector">
      <input
        onChange={this._onChange ||= this.onChange.bind(this)}
        onKeyDown={this._onKeyDown ||= this.onKeyDown.bind(this)}
        onBlur={this._onBlur ||= this.onBlur.bind(this)}
        placeholder="Select Video: YouTube video URL"
        class={classNames("video_selector_input", {
          is_invalid: this.state.isInvalid,
          unchanged: (this.state.lastValue || "") == (this.state.value || "")
        })}
        value={this.state.value}
        type="text"
        />

      {this.state.videoID ?
        <a title="See available formats" target="_blank" href={this.formatsURL()}>
          <code>{this.state.videoID}</code>
        </a>
        : null
      }

    </section>
  }
}
