import React, { Component } from 'react'
import { StyleSheet, ToastAndroid, Alert } from 'react-native'
import MapView from 'react-native-maps'
import BluetoothSerial from 'react-native-bluetooth-serial'
// import reactMixin from 'react-mixin'
// import TimerMixin from 'react-timer-mixin';

export default class efloat extends Component {
  constructor (props) {
    super(props)

    const initialCoords = {
      latitude: 54.6872,
      longitude: 25.2797,
    }

    this.state = {
      isEnabled: false,
      connected: false,
      device: null,

      caught: false,
      lights: false,

      marker: null,
      region: {
        ...initialCoords,
        ...this.deltas(initialCoords)
      }
    }
  }

  componentWillMount () {
    Promise.all([
      BluetoothSerial.isEnabled(),
      BluetoothSerial.list()
    ])
    .then((values) => {
      const [ isEnabled, devices ] = values

      devices.forEach(device => {
        if (device.name === 'aFloat') this.connect(device)
      })
      this.setState({ isEnabled })
    })

    BluetoothSerial.on('bluetoothEnabled', () => this.alert('Bluetooth enabled'))
    BluetoothSerial.on('bluetoothDisabled', () => this.alert('Bluetooth disabled'))
    BluetoothSerial.on('error', (err) => this.alert(`Error: ${err.message}`))
    BluetoothSerial.on('connectionLost', () => {
      if (this.state.device) {
        this.alert(`Connection to device ${this.state.device.name} has been lost`)
      }
      this.setState({ connected: false })
    })

    BluetoothSerial.on('data', (message) => this.parseMessage(message.data))
  }

  render() {
    const { latitude, longitude, marker, region } = this.state

    return (
      <MapView
        style={{flex: 1}}
        initialRegion={region}
      >
        { marker &&
            <MapView.Marker
              coordinate={marker}
              title={'Pludė'}
              description={'Spausk junginėt lempas'}
              onCalloutPress={this.toggleLights}
            />
        }
      </MapView>
    );
  }

  deltas ({ latitude, longitude }) {
    return {
      latitudeDelta: 0.0122,
      longitudeDelta: 0.0121,
    }
  }

  alert (message) {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }

  write (message) {
    BluetoothSerial.write(message).catch((err) => this.alert(err.message))
  }

  connect (device) {
    BluetoothSerial.connect(device.id)
      .then((res) => {
        this.alert(`Connected to ${device.name}`)
        this.setState({ device, connected: true })

        BluetoothSerial.subscribe("a*6f")
      })
      .catch((err) => {
        this.alert(err.message)

        setTimeout(() => {
          this.alert('Reconnecting...')
          this.connect(device)
        }, 1000)
      })
  }

  parseMessage (data) {
    const [caughtState, coordinates] = data.trim().split("\n")
    let newState = {}

    if (caughtState) {
      const caught = caughtState.split(',')[1][0] === '1'

      if (caught !== this.state.caught) {
        newState.caught = caught

        if (caught && !this.activeAlert) {
          this.activeAlert = Alert.alert(
            'Fish caught!',
            'Go fetch!',
            [{
              text: 'Got it!',
              onPress: () => {
                this.activeAlert = null;
                this.write('R')
              }
            }],
            { cancelable: false }
          )
        }
      }
    }

    if (coordinates) {
      const components = coordinates.split(',')
      const latitude = parseFloat(components[1]) / 100,
            longitude = parseFloat(components[3]) / 100;

      let markerState = {}
      const latLng = { latitude, longitude }

      Object.assign(markerState, { marker: latLng })
      if (!this.state.marker) Object.assign(markerState, { region: Object.assign(latLng, this.deltas(latLng)) })

      Object.assign(newState, markerState)
    }

    this.setState(newState)
  }

  toggleLights = () => {
    if (this.state.lights) {
      this.write('-')
      this.setState({ lights: false })
    } else {
      this.write('+')
      this.setState({ lights: true })
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

// reactMixin(efloat.prototype, TimerMixin);