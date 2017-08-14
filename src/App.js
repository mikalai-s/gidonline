import React, { Component } from 'react';
import './App.css';

import debounce from 'lodash.debounce';
import axios from 'axios';

import SimpleLoadingBar from 'react-simple-loading-bar';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      source: 'http://gidonline.club/2017/08/ves-etot-mir/',
      result: null,
      status: {
        busy: false,
        error: {
          message: null,
          details: null,
          detailsShown: false
        }
      }
    };
  }

  handleLinkChange = debounce(() => {
    axios(`/api/parse?url=${escape(this.state.source)}`)
      .then(r => {
        this.setState({
          result: r.data,
          status: {
            error: null,
            busy: false
          }
        });
      })
      .catch(e => {
        this.setState({
          status: {
            error: {
              message: (e.response.data && e.response.data.error) || e.toString(),
              details: (e.response.data && e.response.data.details),
              detailsShown: false
            },
            busy: false
          }
        });
      });
  }, 1000);

  onLinkChange(event) {
    this.setState({
      source: event.target.value,
      result: null,
      status: {
        busy: true
      }
    });
    this.handleLinkChange();
  }

  render() {
    const links = this.state.result || [];
    const errorMessage = this.state.status.error && this.state.status.error.message;
    return (
      <div className="App">
        <SimpleLoadingBar activeRequests={this.state.status.busy ? 1 : 0}></SimpleLoadingBar>
        Paste a movie link from <br />
        <a href="http://gidonline.club" target="_blank" rel="noopener noreferrer">http://gidonline.club</a>
        <br/>
        <br/>
        <input type="text" value={this.state.source} onChange={this.onLinkChange.bind(this)} />
        <ul className="center">
          {links && (
            links.map(l => (
              <li key={l.type}>
                {l.data && (
                  <div>
                    {l.type}:
                    <ul>
                      {l.data.map(i => (
                        <li key={i.title}><a href={i.url}>{i.title}</a></li>
                      ))}
                    </ul>
                  </div>
                )}
                {!l.data && (
                  <a href={l.url}>{l.type}</a>
                )}
              </li>
            ))
          )}
        </ul>
        {errorMessage && (
          <div className="error"><br/>{errorMessage}</div>
        )}
      </div>
    );
  }
}

export default App;
