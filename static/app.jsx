
import * as React from 'react'
import * as ReactDOM from 'react-dom'

const video_id = "FLi0St-B8vw"

const preview_url = `/youtube/${video_id}/preview`

class Main extends React.Component {
  componentDidMount() {
    // try to load the entire video from url
    fetch(preview_url).then((res) => res.arrayBuffer()).then((res) => {
      let blob = new Blob([res])
      let object_url = URL.createObjectURL(blob)
      this.video_ref.current.src = object_url
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      current_time: 0
    }
  }

  render() {
    this.video_ref ||= React.createRef()

    return <div>
      <video
        onTimeUpdate={e => {
          this.setState({
            current_time: e.target.currentTime
          })
        }}
        controls ref={this.video_ref} />

      <div class="playback_controls">
        <button onClick={e => {
          let video = this.video_ref.current
          video.currentTime += 1
        }}>Add Second</button>
        {" "}
        <code class="current_time">
          {this.state.current_time}
        </code>
      </div>

    </div>;
  }
}

ReactDOM.render(<Main />, document.getElementById("body"))

